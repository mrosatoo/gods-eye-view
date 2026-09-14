/**
 * EMSC Euro-Med earthquake supplement layer (Phase A — P2 Research Intake).
 *
 * Source: EMSC SeismicPortal FDSN — keyless GeoJSON.
 * Supplements existing USGS layer with faster Euro-Med detection.
 * Labels: "EMSC earthquake · M[mag] · [region] · event [time]"
 *
 * Registry entry: { id: 'emsc-quakes', enabled: false }
 */

import * as Cesium from 'cesium';

const REFRESH_MS = 15 * 60 * 1000;
const EMSC_STALE_MS = 1_800_000;

let _viewer = null;
let _enabled = false;
let _entities = [];
let _refreshTimer = null;
let _lastUpdate = null;
let _lastError = null;

function magColor(mag) {
  if (mag >= 6) return Cesium.Color.fromCssColorString('rgba(255, 61, 0, 0.7)');
  if (mag >= 5) return Cesium.Color.fromCssColorString('rgba(255, 145, 0, 0.6)');
  if (mag >= 4) return Cesium.Color.fromCssColorString('rgba(255, 215, 0, 0.5)');
  return Cesium.Color.fromCssColorString('rgba(0, 229, 255, 0.4)');
}

function formatTime(iso) {
  if (!iso) return 'time unknown';
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  } catch { return 'time unknown'; }
}

function clearEntities() {
  for (const e of _entities) {
    try { _viewer?.entities.remove(e); } catch { /* cleanup */ }
  }
  _entities = [];
}

async function fetchAndRender() {
  clearEntities();
  if (!_viewer || !_enabled) return;

  try {
    const res = await fetch('/api/emsc?minmag=4&limit=100', {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) { _lastError = `EMSC HTTP ${res.status}`; return; }
    const data = await res.json();
    const features = data?.features || [];

    _lastUpdate = Date.now();
    _lastError = null;
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      const props = f.properties || {};
      if (!coords || coords.length < 2) continue;

      const mag = props.mag ?? props.magnitude ?? 0;
      const region = props.flynn_region || props.region || 'Unknown';
      const time = formatTime(props.time || props.lastupdate);

      const entity = _viewer.entities.add({
        name: `emsc-${props.source_id || Math.random()}`,
        position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1], (coords[2] || 0) * -1000),
        point: {
          pixelSize: Math.max(6, mag * 2),
          color: magColor(mag),
          outlineColor: Cesium.Color.fromCssColorString('rgba(0, 229, 255, 0.5)'),
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `EMSC · M${mag.toFixed(1)} · ${region}\n${time}`,
          font: '10px JetBrains Mono, monospace',
          fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 10),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.82)'),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
        },
        properties: { layerId: 'emsc-quakes', mag, region },
      });
      _entities.push(entity);
    }
  } catch { _lastError = 'EMSC fetch error'; }
}

const emscQuakes = {
  id: 'emsc-quakes',
  name: 'EMSC Euro-Med Earthquakes',
  icon: '🌍',
  source: 'EMSC SeismicPortal',
  init(viewer) { _viewer = viewer; },
  enable() {
    _enabled = true;
    fetchAndRender();
    _refreshTimer = setInterval(fetchAndRender, REFRESH_MS);
    return { available: true };
  },
  disable() {
    _enabled = false;
    if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
    clearEntities();
  },
  destroy() { this.disable(); _viewer = null; _lastUpdate = null; _lastError = null; },
  getStats() {
    const now = Date.now();
    const receiptStale = _lastUpdate != null && (now - _lastUpdate) > EMSC_STALE_MS;
    const clockMissing = _entities.length > 0 && _lastUpdate == null;
    const stale = receiptStale || clockMissing;
    return {
      enabled: _enabled,
      count: _entities.length,
      lastUpdate: _lastUpdate,
      stale,
      error: _lastError,
    };
  },
};

export default emscQuakes;
