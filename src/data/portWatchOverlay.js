/**
 * PortWatch daily activity overlay — honest dated transit data.
 *
 * Fetches /api/portwatch?chokepoint=<name> and renders dated activity
 * per chokepoint. Labels per Lenkung: "daily activity / PortWatch dated",
 * never "live congestion" or "queue time".
 *
 * Four thesis chokepoints get context cards (Hormuz, Suez, Bab, Malacca).
 * Secondary chokepoints (Singapore, Cape) render standard rectangle overlays.
 *
 * Registry entry: { id: 'portwatch', enabled: false }
 */

import * as Cesium from 'cesium';
import { CHOKEPOINT_BOUNDING_BOXES } from '../thesisDefaults.js';

const REFRESH_MS = 60 * 60 * 1000;
const CHOKEPOINTS = Object.keys(CHOKEPOINT_BOUNDING_BOXES);

const THESIS_CHOKEPOINTS = ['hormuz', 'suez', 'bab', 'malacca'];

const CHOKEPOINT_DISPLAY_NAMES = Object.freeze({
  hormuz: 'Strait of Hormuz',
  suez: 'Suez Canal',
  bab: 'Bab el-Mandeb',
  malacca: 'Strait of Malacca',
  singapore: 'Singapore Strait',
  cape: 'Cape of Good Hope',
});

const CHOKEPOINT_CONTEXT = Object.freeze({
  hormuz: 'Oil transit corridor — ~20% global seaborne oil',
  suez: 'Trade corridor — ~12% global trade volume',
  bab: 'Red Sea access gate — links Suez to Indian Ocean',
  malacca: 'Asia trade corridor — ~25% global seaborne trade',
});

let _viewer = null;
let _enabled = false;
let _entities = [];
let _refreshTimer = null;
let _dataCache = new Map();
let _fetchImpl = typeof fetch !== 'undefined' ? fetch : null;

function boxCenter(box) {
  return {
    lat: (box.sw.lat + box.ne.lat) / 2,
    lon: (box.sw.lon + box.ne.lon) / 2,
  };
}

function boxToRectangle(box) {
  return Cesium.Rectangle.fromDegrees(box.sw.lon, box.sw.lat, box.ne.lon, box.ne.lat);
}

async function fetchPortWatch(chokepoint) {
  try {
    const res = await _fetchImpl(`/api/portwatch?chokepoint=${encodeURIComponent(chokepoint)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { chokepoint, error: 'upstream_error', fetchedAt: null };
    return await res.json();
  } catch {
    return { chokepoint, error: 'fetch_failed', fetchedAt: null };
  }
}

function dataAge(data) {
  if (!data.observationDate) return null;
  const obs = new Date(data.observationDate);
  if (isNaN(obs.getTime())) return null;
  const diffMs = Date.now() - obs.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function classifyFreshness(data) {
  if (data.error) return 'unavailable';
  if (!data.observationDate) return 'undated';
  const obs = new Date(data.observationDate);
  if (isNaN(obs.getTime())) return 'undated';
  const diffMs = Date.now() - obs.getTime();
  if (diffMs < 0) return 'stale';
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 2) return 'recent';
  if (days <= 7) return 'dated';
  return 'stale';
}

function formatLabel(data) {
  if (data.error) {
    if (data.error === 'source_unavailable') {
      return 'PortWatch — Source admission pending';
    }
    return 'PortWatch — Activity data unavailable';
  }
  const name = CHOKEPOINT_DISPLAY_NAMES[data.chokepoint] || data.chokepoint || 'Unknown';
  const date = data.observationDate || 'date unknown';
  if (data.transitCount == null) {
    return `${name}: Activity data unavailable for this period\nPortWatch dated · ${date}`;
  }
  let line = `${name}: ${data.transitCount} transits/day`;
  if (data.avgTransitCount != null && data.pctChange != null && data.avgTransitCount > 0) {
    const arrow = data.pctChange < 0 ? '▼' : data.pctChange > 0 ? '▲' : '—';
    line += ` — avg ${data.avgTransitCount} ${arrow} ${Math.abs(data.pctChange).toFixed(0)}%`;
  }
  const age = dataAge(data);
  const ageSuffix = age ? ` (${age})` : '';
  line += `\nPortWatch — dated ${date}${ageSuffix}`;
  return line;
}

function formatContextCard(data) {
  const name = CHOKEPOINT_DISPLAY_NAMES[data.chokepoint] || data.chokepoint;
  const context = CHOKEPOINT_CONTEXT[data.chokepoint] || '';
  const freshness = classifyFreshness(data);

  if (data.error) {
    let status = 'Source admission pending';
    if (data.error === 'fetch_failed') status = 'Data temporarily unavailable';
    if (data.error === 'upstream_error') status = 'Upstream error';
    return `⚓ ${name}\n${context}\n─────\n${status}\nIMF PortWatch · source_unavailable`;
  }

  if (data.transitCount == null) {
    return `⚓ ${name}\n${context}\n─────\nNo transit data for this period\nIMF PortWatch · dated ${data.observationDate || '?'}`;
  }

  let card = `⚓ ${name}\n${context}\n─────\n${data.transitCount} transits/day`;
  if (data.avgTransitCount != null && data.pctChange != null) {
    const arrow = data.pctChange < 0 ? '▼' : data.pctChange > 0 ? '▲' : '—';
    const pctLabel = `${arrow} ${Math.abs(data.pctChange).toFixed(0)}% vs avg (${data.avgTransitCount})`;
    card += `\n${pctLabel}`;
  }
  const age = dataAge(data);
  const freshLabel = freshness === 'recent' ? 'recent' : freshness === 'stale' ? 'STALE' : 'dated';
  card += `\nIMF PortWatch · ${freshLabel} ${data.observationDate || '?'}`;
  if (age && freshness !== 'recent') card += ` (${age})`;
  return card;
}

function fillColor(data) {
  if (data.error || data.transitCount == null) {
    return new Cesium.Color(0.39, 0.55, 0.71, 0.10);
  }
  if (data.pctChange != null && data.pctChange < -10) {
    return Cesium.Color.fromCssColorString('rgba(255, 215, 0, 0.15)');
  }
  return Cesium.Color.fromCssColorString('rgba(100, 140, 180, 0.15)');
}

function borderColor(data) {
  if (data.error || data.transitCount == null) {
    return new Cesium.Color(0.39, 0.55, 0.71, 0.25);
  }
  if (data.pctChange != null && data.pctChange < -10) {
    return Cesium.Color.fromCssColorString('rgba(255, 215, 0, 0.35)');
  }
  return Cesium.Color.fromCssColorString('rgba(100, 140, 180, 0.35)');
}

function contextCardBgColor(data) {
  if (data.error || data.transitCount == null) {
    return Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.88)');
  }
  if (data.pctChange != null && data.pctChange < -10) {
    return Cesium.Color.fromCssColorString('rgba(30, 20, 6, 0.88)');
  }
  return Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.88)');
}

function renderOverlays() {
  clearEntities();
  if (!_viewer || !_enabled) return;

  for (const [chokepoint, data] of _dataCache) {
    const box = CHOKEPOINT_BOUNDING_BOXES[chokepoint];
    if (!box) continue;
    const center = boxCenter(box);
    const isThesis = THESIS_CHOKEPOINTS.includes(chokepoint);

    const entity = _viewer.entities.add({
      name: `portwatch-${chokepoint}`,
      rectangle: {
        coordinates: boxToRectangle(box),
        material: fillColor(data),
        outline: true,
        outlineColor: borderColor(data),
        outlineWidth: 1,
        height: 0,
      },
      label: {
        text: isThesis ? formatContextCard(data) : formatLabel(data),
        font: isThesis ? '11px JetBrains Mono, monospace' : '10px JetBrains Mono, monospace',
        fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, isThesis ? 4500000 : 3000000),
        showBackground: true,
        backgroundColor: contextCardBgColor(data),
        backgroundPadding: new Cesium.Cartesian2(isThesis ? 10 : 8, isThesis ? 7 : 5),
      },
      position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 100),
      properties: {
        layerId: 'portwatch',
        chokepoint,
        isThesisChokepoint: isThesis,
        data,
      },
    });

    _entities.push(entity);
  }
}

function clearEntities() {
  for (const entity of _entities) {
    try { _viewer?.entities.remove(entity); } catch { /* cleanup */ }
  }
  _entities = [];
}

async function refreshAll() {
  const results = await Promise.allSettled(
    CHOKEPOINTS.map(async (cp) => {
      const data = await fetchPortWatch(cp);
      _dataCache.set(cp, data);
    }),
  );
  renderOverlays();
}

function startRefreshLoop() {
  stopRefreshLoop();
  refreshAll();
  _refreshTimer = setInterval(refreshAll, REFRESH_MS);
}

function stopRefreshLoop() {
  if (_refreshTimer) {
    clearInterval(_refreshTimer);
    _refreshTimer = null;
  }
}

const portWatchOverlay = {
  id: 'portwatch',
  name: 'PortWatch — Daily Activity (dated)',
  icon: '⚓',
  source: 'IMF PortWatch',

  init(viewer) {
    _viewer = viewer;
  },

  enable() {
    _enabled = true;
    startRefreshLoop();
    return { available: true };
  },

  disable() {
    _enabled = false;
    stopRefreshLoop();
    clearEntities();
    _dataCache.clear();
  },

  destroy() {
    this.disable();
    _viewer = null;
  },

  getStats() {
    const stats = { enabled: _enabled, chokepoints: CHOKEPOINTS.length, cached: _dataCache.size };
    const freshnessCounts = { recent: 0, dated: 0, stale: 0, unavailable: 0, undated: 0 };
    for (const data of _dataCache.values()) {
      const f = classifyFreshness(data);
      freshnessCounts[f] = (freshnessCounts[f] || 0) + 1;
    }
    stats.freshness = freshnessCounts;
    const usable = freshnessCounts.recent + freshnessCounts.dated + freshnessCounts.stale;
    stats.count = usable;
    stats.status = usable === 0 ? 'unavailable'
      : freshnessCounts.unavailable > 0 || freshnessCounts.undated > 0 ? 'degraded' : 'nominal';
    stats.stale = freshnessCounts.stale > 0 || freshnessCounts.undated > 0;
    stats.error = usable === 0 ? 'PortWatch dated activity unavailable' : null;
    return stats;
  },
};

export default portWatchOverlay;

export {
  THESIS_CHOKEPOINTS,
  CHOKEPOINT_DISPLAY_NAMES,
  CHOKEPOINT_CONTEXT,
  formatLabel,
  formatContextCard,
  fillColor,
  borderColor,
  classifyFreshness,
  dataAge,
  boxCenter,
};

export function _setFetchImplForTest(fn) { _fetchImpl = fn; }
export function _getDataCacheForTest() { return _dataCache; }
export function _setDataCacheForTest(map) { _dataCache = map; }
export function _getEnabledForTest() { return _enabled; }
export function _setEnabledForTest(val) { _enabled = val; }
export function _getEntitiesForTest() { return _entities; }
export function _resetStateForTest() {
  _viewer = null;
  _enabled = false;
  _entities = [];
  _refreshTimer = null;
  _dataCache = new Map();
  _fetchImpl = typeof fetch !== 'undefined' ? fetch : null;
}
