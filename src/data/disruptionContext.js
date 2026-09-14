/**
 * Disruption Context aggregation — single panel feeding thesis.
 *
 * Aggregates: FIRMS fires (energy-corridor filter), USGS quakes (24h),
 * AIS stuck/low-SOG candidates at current choke, and headline signal.
 *
 * No Conf/Edge wiring. Honest source_unavailable. No fake precision.
 * Labels per Lenkung: "NRT detection" not "fire", "low SOG candidate"
 * not "stuck", "M5.2" not "major earthquake".
 */

import { CHOKEPOINT_BOUNDING_BOXES } from '../thesisDefaults.js';
import { evaluateLowSog, candidateLabel, clusterLabel } from './aisStuckDetection.js';

const ENERGY_CORRIDOR_BOXES = Object.freeze({
  'gulf-hormuz': { sw: { lat: 24.0, lon: 50.0 }, ne: { lat: 30.0, lon: 60.0 } },
  'red-sea-bab': { sw: { lat: 10.0, lon: 32.0 }, ne: { lat: 30.0, lon: 45.0 } },
  'suez-med':    { sw: { lat: 28.0, lon: 30.0 }, ne: { lat: 32.5, lon: 35.0 } },
  'malacca':     { sw: { lat: -1.0, lon: 98.0 }, ne: { lat: 6.0, lon: 106.0 } },
  'cape':        { sw: { lat: -37.0, lon: 15.0 }, ne: { lat: -32.0, lon: 22.0 } },
});

export { ENERGY_CORRIDOR_BOXES };

function inBox(lat, lon, box) {
  return lat >= box.sw.lat && lat <= box.ne.lat
    && lon >= box.sw.lon && lon <= box.ne.lon;
}

function inAnyEnergyBox(lat, lon) {
  for (const box of Object.values(ENERGY_CORRIDOR_BOXES)) {
    if (inBox(lat, lon, box)) return true;
  }
  return false;
}

export function filterEnergyCorridorFires(fires) {
  if (!Array.isArray(fires)) return [];
  return fires.filter((f) => {
    const lat = Number(f?.lat);
    const lon = Number(f?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) && inAnyEnergyBox(lat, lon);
  });
}

export function summarizeFires(fires) {
  if (!Array.isArray(fires) || fires.length === 0) {
    return { count: 0, cards: [], status: 'empty' };
  }
  const corridorFires = filterEnergyCorridorFires(fires);
  if (corridorFires.length === 0) {
    return { count: 0, cards: [], status: 'empty' };
  }
  const cards = corridorFires.slice(0, 5).map((f) => {
    const frp = Number.isFinite(f.frp) ? ` · FRP ${f.frp.toFixed(1)} MW` : '';
    const conf = typeof f.confidence === 'string' ? ` · ${f.confidence}` : '';
    return {
      type: 'fire',
      label: `NRT detection${frp}${conf}`,
      lat: f.lat,
      lon: f.lon,
      source: 'NASA FIRMS',
    };
  });
  return { count: corridorFires.length, cards, status: 'nominal' };
}

export function summarizeQuakes(features) {
  if (!Array.isArray(features) || features.length === 0) {
    return { count: 0, cards: [], status: 'empty' };
  }
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const recent = features.filter((f) => {
    const t = f?.properties?.time;
    return Number.isFinite(t) && (now - t) < day;
  });
  const sorted = recent.slice().sort((a, b) => (b.properties.mag || 0) - (a.properties.mag || 0));
  const cards = sorted.slice(0, 5).map((f) => {
    const p = f.properties;
    const mag = Number.isFinite(p.mag) ? `M${p.mag.toFixed(1)}` : 'M?';
    const place = typeof p.place === 'string' ? ` — ${p.place}` : '';
    const coords = f.geometry?.coordinates;
    return {
      type: 'quake',
      label: `${mag}${place}`,
      lat: coords?.[1] ?? null,
      lon: coords?.[0] ?? null,
      magnitude: p.mag ?? null,
      source: 'USGS',
    };
  });
  return { count: recent.length, cards, status: 'nominal' };
}

export function summarizeAisCandidates(vessels, chokepoint) {
  if (!Array.isArray(vessels) || vessels.length === 0) {
    return { candidates: 0, clusters: [], cards: [], status: 'empty', chokepoint };
  }
  const { candidates, clusters } = evaluateLowSog(vessels);
  const validCandidates = [...candidates.entries()]
    .filter(([, info]) => info.candidateType != null);
  const cards = validCandidates.slice(0, 5).map(([mmsi, info]) => ({
    type: 'ais_candidate',
    label: candidateLabel(info) || 'AIS candidate',
    mmsi,
    region: info.region,
    source: 'AIS',
  }));
  const clusterCards = clusters.slice(0, 3).map((c) => ({
    type: 'ais_cluster',
    label: clusterLabel(c),
    region: c.regionId,
    count: c.count,
    source: 'AIS',
  }));
  return {
    candidates: validCandidates.length,
    clusters: clusters.length,
    cards: [...cards, ...clusterCards],
    status: validCandidates.length > 0 || clusters.length > 0 ? 'nominal' : 'empty',
    chokepoint,
  };
}

export function summarizeHeadlines(articles) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return { count: 0, cards: [], status: 'empty' };
  }
  const cards = articles.slice(0, 3).map((a) => ({
    type: 'headline',
    label: typeof a.title === 'string' ? a.title.slice(0, 120) : 'Untitled',
    domain: a.domain || a.source || null,
    url: a.url || null,
    publishedAt: a.publishedAt || null,
    source: a.source || a.domain || 'RSS',
  }));
  return { count: articles.length, cards, status: 'nominal' };
}

export function aggregateDisruptionContext({
  fires = null,
  quakeFeatures = null,
  aisVessels = null,
  chokepoint = null,
  headlines = null,
} = {}) {
  const fireSummary = fires != null
    ? summarizeFires(fires)
    : { count: 0, cards: [], status: 'source_unavailable' };
  const quakeSummary = quakeFeatures != null
    ? summarizeQuakes(quakeFeatures)
    : { count: 0, cards: [], status: 'source_unavailable' };
  const aisSummary = aisVessels != null
    ? summarizeAisCandidates(aisVessels, chokepoint)
    : { candidates: 0, clusters: 0, cards: [], status: 'source_unavailable', chokepoint };
  const headlineSummary = headlines != null
    ? summarizeHeadlines(headlines)
    : { count: 0, cards: [], status: 'source_unavailable' };

  const allCards = [
    ...fireSummary.cards,
    ...quakeSummary.cards,
    ...aisSummary.cards,
    ...headlineSummary.cards,
  ];

  const sourceCount = [fireSummary, quakeSummary, aisSummary, headlineSummary]
    .filter((s) => s.status === 'nominal').length;
  const unavailableCount = [fireSummary, quakeSummary, aisSummary, headlineSummary]
    .filter((s) => s.status === 'source_unavailable').length;

  let overallStatus = 'nominal';
  if (unavailableCount === 4) overallStatus = 'source_unavailable';
  else if (sourceCount === 0 && unavailableCount < 4) overallStatus = 'empty';
  else if (unavailableCount > 0) overallStatus = 'partial';

  return {
    fires: fireSummary,
    quakes: quakeSummary,
    ais: aisSummary,
    headlines: headlineSummary,
    allCards,
    status: overallStatus,
    fetchedAt: new Date().toISOString(),
  };
}
