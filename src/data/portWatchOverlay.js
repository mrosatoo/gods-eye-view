/**
 * PortWatch daily activity overlay (Phase A — P0).
 *
 * Fetches /api/portwatch?chokepoint=<name> and renders dated activity
 * data per chokepoint. Labels per Lenkung: "daily activity / PortWatch dated",
 * never "live congestion" or "queue time".
 *
 * Registry entry: { id: 'portwatch', enabled: false }
 */

import * as Cesium from 'cesium';
import { CHOKEPOINT_BOUNDING_BOXES } from '../thesisDefaults.js';

const REFRESH_MS = 60 * 60 * 1000;
const CHOKEPOINTS = Object.keys(CHOKEPOINT_BOUNDING_BOXES);

let _viewer = null;
let _enabled = false;
let _entities = [];
let _refreshTimer = null;
let _dataCache = new Map();

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
    const res = await fetch(`/api/portwatch?chokepoint=${encodeURIComponent(chokepoint)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { error: 'upstream_error', fetchedAt: new Date().toISOString() };
    return await res.json();
  } catch {
    return { error: 'fetch_failed', fetchedAt: new Date().toISOString() };
  }
}

function formatLabel(data) {
  if (data.error) {
    if (data.error === 'source_unavailable') {
      return 'PortWatch — Source admission pending';
    }
    return 'PortWatch — Activity data unavailable';
  }
  const name = data.chokepoint
    ? data.chokepoint.charAt(0).toUpperCase() + data.chokepoint.slice(1)
    : 'Unknown';
  const date = data.observationDate || 'date unknown';
  if (data.transitCount == null) {
    return `${name}: Activity data unavailable for this period\nPortWatch dated · ${date}`;
  }
  let line = `${name}: ${data.transitCount} transits/day (${date})`;
  if (data.avgTransitCount != null && data.pctChange != null && data.avgTransitCount > 0) {
    const arrow = data.pctChange < 0 ? '▼' : data.pctChange > 0 ? '▲' : '—';
    line += ` — avg ${data.avgTransitCount} ${arrow} ${Math.abs(data.pctChange).toFixed(0)}%`;
  }
  line += '\nPortWatch — Daily Activity (dated)';
  return line;
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

function renderOverlays() {
  clearEntities();
  if (!_viewer || !_enabled) return;

  for (const [chokepoint, data] of _dataCache) {
    const box = CHOKEPOINT_BOUNDING_BOXES[chokepoint];
    if (!box) continue;
    const center = boxCenter(box);

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
        text: formatLabel(data),
        font: '11px JetBrains Mono, monospace',
        fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        pixelOffset: new Cesium.Cartesian2(0, 0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000),
        showBackground: true,
        backgroundColor: Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.82)'),
        backgroundPadding: new Cesium.Cartesian2(8, 5),
      },
      position: Cesium.Cartesian3.fromDegrees(center.lon, center.lat, 100),
      properties: {
        layerId: 'portwatch',
        chokepoint,
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
    return {
      enabled: _enabled,
      chokepoints: CHOKEPOINTS.length,
      cached: _dataCache.size,
    };
  },
};

export default portWatchOverlay;
