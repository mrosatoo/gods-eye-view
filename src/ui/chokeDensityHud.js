/**
 * Choke Density HUD — per-chokepoint vessel counts and low-SOG candidates.
 *
 * Renders a compact overlay showing vessel density within each thesis
 * chokepoint bounding box. Honest labels: "candidates", never "blocked"
 * or "congested". Cyan/Gold theme per Lenkung.
 */

import { CHOKEPOINT_BOUNDING_BOXES } from '../thesisDefaults.js';

const REFRESH_MS = 5000;
const DISPLAY_CHOKEPOINTS = ['hormuz', 'suez', 'bab', 'malacca'];
const DISPLAY_NAMES = {
  hormuz: 'HORMUZ',
  suez: 'SUEZ',
  bab: 'BAB',
  malacca: 'MALACCA',
};

function isInBoundingBox(lat, lon, box) {
  return lat >= box.sw.lat && lat <= box.ne.lat
    && lon >= box.sw.lon && lon <= box.ne.lon;
}

/**
 * Classify vessels into chokepoint regions and count low-SOG candidates.
 * Pure function — no side effects.
 *
 * @param {Array<Object>} records - Vessel records from getAllPositions or vesselRecords.
 * @param {Function} getLowSogCandidate - (mmsi) => candidate info or null.
 * @returns {Map<string, {total: number, lowSog: number}>}
 */
export function classifyChokepointDensity(records, getLowSogCandidate) {
  const counts = new Map();
  for (const key of DISPLAY_CHOKEPOINTS) {
    counts.set(key, { total: 0, lowSog: 0 });
  }

  for (const record of records) {
    const lat = Number(record.latitude ?? record.lat);
    const lon = Number(record.longitude ?? record.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    for (const key of DISPLAY_CHOKEPOINTS) {
      const box = CHOKEPOINT_BOUNDING_BOXES[key];
      if (!box) continue;
      if (isInBoundingBox(lat, lon, box)) {
        const entry = counts.get(key);
        entry.total += 1;
        const candidate = getLowSogCandidate
          ? getLowSogCandidate(String(record.id ?? record.mmsi))
          : null;
        if (candidate?.candidateType === 'low_sog' || candidate?.candidateType === 'reported_anchor') {
          entry.lowSog += 1;
        }
        break;
      }
    }
  }
  return counts;
}

/**
 * Format chokepoint density data for display.
 * @param {Map<string, {total: number, lowSog: number}>} counts
 * @returns {Array<{key: string, name: string, total: number, lowSog: number}>}
 */
export function formatChokepointRows(counts) {
  return DISPLAY_CHOKEPOINTS.map((key) => {
    const data = counts.get(key) || { total: 0, lowSog: 0 };
    return {
      key,
      name: DISPLAY_NAMES[key] || key.toUpperCase(),
      total: data.total,
      lowSog: data.lowSog,
    };
  });
}

/**
 * Render the choke density HUD into its host element.
 * @param {HTMLElement} host - Container element (#choke-density-hud).
 * @param {Array<{key: string, name: string, total: number, lowSog: number}>} rows
 * @param {{enabled: boolean, feedHealthy: boolean}} options
 */
export function renderChokeDensityHud(host, rows, { enabled = false, feedHealthy = false } = {}) {
  if (!host) return;
  if (!enabled) {
    host.hidden = true;
    return;
  }
  host.hidden = false;

  const totalVessels = rows.reduce((sum, r) => sum + r.total, 0);
  const totalCandidates = rows.reduce((sum, r) => sum + r.lowSog, 0);

  let html = '<div class="choke-hud-header">';
  html += '<span class="choke-hud-title">CHOKE DENSITY</span>';
  if (!feedHealthy) {
    html += '<span class="choke-hud-degraded">FEED DEGRADED</span>';
  }
  html += '</div>';
  html += '<div class="choke-hud-grid">';

  for (const row of rows) {
    const hasCandidates = row.lowSog > 0;
    html += `<div class="choke-hud-row${hasCandidates ? ' choke-hud-row--alert' : ''}">`;
    html += `<span class="choke-hud-region">${row.name}</span>`;
    html += `<span class="choke-hud-count">${row.total}</span>`;
    if (hasCandidates) {
      html += `<span class="choke-hud-candidates">${row.lowSog} low-SOG</span>`;
    } else {
      html += '<span class="choke-hud-candidates choke-hud-candidates--none">--</span>';
    }
    html += '</div>';
  }

  html += '</div>';
  html += '<div class="choke-hud-footer">';
  html += `<span>${totalVessels} vessels in chokepoints</span>`;
  if (totalCandidates > 0) {
    html += `<span class="choke-hud-footer-alert">${totalCandidates} candidate${totalCandidates !== 1 ? 's' : ''}</span>`;
  }
  html += '</div>';

  host.innerHTML = html;
}

/**
 * Create and manage the choke density HUD lifecycle.
 *
 * @param {Object} options
 * @param {Object} options.aisLayer - The AIS live vessels layer instance.
 * @param {HTMLElement} options.host - Container element.
 * @returns {{update: Function, destroy: Function}}
 */
export function createChokeDensityHud({ aisLayer, host }) {
  let timer = null;
  let destroyed = false;

  function getLowSogCandidate(mmsi) {
    if (typeof aisLayer.getAnalystRecords !== 'function') return null;
    return null;
  }

  function update() {
    if (destroyed || !host) return;
    const stats = aisLayer.getStats?.() || {};
    const enabled = stats.count > 0;
    const feedHealthy = !stats.error && !stats.stale;

    if (!enabled) {
      renderChokeDensityHud(host, [], { enabled: false });
      return;
    }

    const positions = aisLayer.getAllPositions?.(12000) || [];
    const counts = classifyChokepointDensity(positions, getLowSogCandidate);
    const rows = formatChokepointRows(counts);
    renderChokeDensityHud(host, rows, { enabled: true, feedHealthy });
  }

  function start() {
    update();
    if (!timer && !destroyed) {
      timer = setInterval(update, REFRESH_MS);
    }
  }

  function destroy() {
    destroyed = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (host) host.hidden = true;
  }

  start();
  return { update, destroy };
}
