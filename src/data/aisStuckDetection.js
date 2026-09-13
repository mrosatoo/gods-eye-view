/**
 * Low-SOG / dwell candidate heuristic (Phase A — Level 1 semantic ladder).
 *
 * Evaluates AIS vessel positions for low speed-over-ground within fixed
 * chokepoint bounding boxes. No ML, no upstream service, no signal to
 * Conf/Sit/Edge. Purely visual for human thesis formation.
 *
 * Labels: "low SOG candidate" or "reported at anchor" — never "stuck",
 * "blocked", "queue", or "congestion".
 */

import { CHOKEPOINT_BOUNDING_BOXES } from '../thesisDefaults.js';

const LOW_SOG_THRESHOLD_KN = 0.5;
// Product freshness bound, not a validated disruption threshold.
export const CANDIDATE_MAX_AGE_MS = 5 * 60 * 1000;
const CLUSTER_SOG_THRESHOLD_KN = 1.0;
const CLUSTER_MIN_VESSELS = 5;
const CLUSTER_RADIUS_NM = 2;
const NM_TO_DEG_LAT = 1 / 60;

const SENTINEL_SPEEDS = new Set([511, 102.3]);

function isValidSpeed(sog) {
  if (sog === null || sog === undefined) return false;
  if (typeof sog !== 'number' || !Number.isFinite(sog)) return false;
  if (sog < 0) return false;
  if (SENTINEL_SPEEDS.has(sog)) return false;
  return true;
}

function isInBoundingBox(lat, lon, box) {
  return lat >= box.sw.lat && lat <= box.ne.lat
    && lon >= box.sw.lon && lon <= box.ne.lon;
}

function findChokepointRegion(lat, lon) {
  for (const [id, box] of Object.entries(CHOKEPOINT_BOUNDING_BOXES)) {
    if (isInBoundingBox(lat, lon, box)) return id;
  }
  return null;
}

function haversineNm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(a)) * 3440.065;
}

/**
 * Evaluate vessels for low-SOG candidate status.
 *
 * @param {Array<Object>} vessels - Array of vessel objects with at minimum:
 *   { mmsi, lat, lon, sog, navStatus, sourceTimestamp, receiptTimestamp }
 * @param {Object} [options]
 * @param {boolean} [options.globallyTruncated] - Whether the input was globally capped
 * @returns {{ candidates: Map<string, Object>, clusters: Array<Object> }}
 */
export function evaluateLowSog(vessels, { globallyTruncated = false, nowMs = Date.now() } = {}) {
  const candidates = new Map();
  const regionVessels = new Map();

  const byMmsi = new Map();
  for (const v of vessels) {
    const key = String(v.mmsi);
    const ts = typeof v.sourceTimestamp === 'string' ? Date.parse(v.sourceTimestamp) : NaN;
    const prev = byMmsi.get(key);
    if (!prev || (Number.isFinite(ts) && (!Number.isFinite(prev._ts) || ts > prev._ts))) {
      byMmsi.set(key, Object.assign({}, v, { _ts: ts }));
    }
  }

  for (const v of byMmsi.values()) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) continue;

    const region = findChokepointRegion(v.lat, v.lon);
    if (!region) continue;

    const sourceMs = typeof v.sourceTimestamp === 'string'
      ? Date.parse(v.sourceTimestamp) : NaN;
    const ageMs = nowMs - sourceMs;
    const qualityReason = !Number.isFinite(sourceMs) ? 'unknown_source_time'
      : ageMs < 0 ? 'future_source_time'
      : ageMs > CANDIDATE_MAX_AGE_MS ? 'stale_source_time' : null;
    if (qualityReason) {
      candidates.set(String(v.mmsi), {
        candidateType: null, sogKn: null, region, qualityReason,
        sourceTimestamp: v.sourceTimestamp ?? null,
        receiptTimestamp: v.receiptTimestamp ?? null,
      });
      continue;
    }

    if (!regionVessels.has(region)) regionVessels.set(region, []);
    regionVessels.get(region).push(v);

    if (!isValidSpeed(v.sog)) {
      if (v.sog === null || v.sog === undefined) {
        candidates.set(String(v.mmsi), {
          candidateType: null,
          sogKn: null,
          sourceTimestamp: v.sourceTimestamp ?? null,
          receiptTimestamp: v.receiptTimestamp ?? null,
          qualityReason: 'missing_speed',
          region,
        });
      } else {
        candidates.set(String(v.mmsi), {
          candidateType: null,
          sogKn: null,
          sourceTimestamp: v.sourceTimestamp ?? null,
          receiptTimestamp: v.receiptTimestamp ?? null,
          qualityReason: 'sentinel_speed',
          region,
        });
      }
      continue;
    }

    let candidateType = null;

    if (v.navStatus === 1) {
      candidateType = 'reported_anchor';
    } else if (v.sog < LOW_SOG_THRESHOLD_KN) {
      candidateType = 'low_sog';
    }

    if (candidateType) {
      candidates.set(String(v.mmsi), {
        candidateType,
        sogKn: v.sog,
        sourceTimestamp: v.sourceTimestamp ?? null,
        receiptTimestamp: v.receiptTimestamp ?? null,
        qualityReason: null,
        region,
      });
    }
  }

  const clusters = [];

  for (const [regionId, rv] of regionVessels) {
    const slowSeen = new Set();
    const slowVessels = rv.filter((v) => {
      if (!isValidSpeed(v.sog) || v.sog >= CLUSTER_SOG_THRESHOLD_KN) return false;
      const key = String(v.mmsi);
      if (slowSeen.has(key)) return false;
      slowSeen.add(key);
      return true;
    });

    if (slowVessels.length < CLUSTER_MIN_VESSELS) continue;

    const seen = new Set();
    for (let i = 0; i < slowVessels.length; i++) {
      if (seen.has(i)) continue;
      const group = [i];
      seen.add(i);

      for (let j = i + 1; j < slowVessels.length; j++) {
        if (seen.has(j)) continue;
        const dist = haversineNm(
          slowVessels[i].lat, slowVessels[i].lon,
          slowVessels[j].lat, slowVessels[j].lon,
        );
        if (dist <= CLUSTER_RADIUS_NM) {
          group.push(j);
          seen.add(j);
        }
      }

      const mmsis = new Set(group.map((idx) => String(slowVessels[idx].mmsi)));
      if (mmsis.size >= CLUSTER_MIN_VESSELS) {
        let sumLat = 0;
        let sumLon = 0;
        for (const idx of group) {
          sumLat += slowVessels[idx].lat;
          sumLon += slowVessels[idx].lon;
        }
        clusters.push({
          count: mmsis.size,
          centerLat: sumLat / group.length,
          centerLon: sumLon / group.length,
          regionId,
          truncated: globallyTruncated,
        });
      }
    }
  }

  return { candidates, clusters };
}

export function candidateLabel(info) {
  if (!info || !info.candidateType) return null;
  if (info.candidateType === 'reported_anchor') return 'Reported at anchor';
  if (info.candidateType === 'low_sog') {
    const sog = info.sogKn != null ? ` · SOG ${info.sogKn.toFixed(1)} kn` : '';
    return `Low SOG candidate${sog}`;
  }
  return null;
}

export function clusterLabel(cluster) {
  const region = cluster.regionId.charAt(0).toUpperCase() + cluster.regionId.slice(1);
  const trunc = cluster.truncated ? ' · partial data' : '';
  return `${region}: ${cluster.count} low-SOG candidates${trunc}`;
}

export { CHOKEPOINT_BOUNDING_BOXES, LOW_SOG_THRESHOLD_KN, CLUSTER_RADIUS_NM };
