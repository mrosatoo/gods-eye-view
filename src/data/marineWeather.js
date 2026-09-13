/**
 * Open-Meteo marine weather forecast panel (Phase A — P2 Research Intake).
 *
 * Source: Open-Meteo marine API — keyless, model-derived forecasts.
 * Labels: "Marine forecast · Open-Meteo [model] · init [datetime]"
 * Never: "current sea conditions" — model forecast, not observation.
 *
 * Registry entry: { id: 'marine-weather', enabled: false }
 */

import * as Cesium from 'cesium';
import { CHOKEPOINT_BOUNDING_BOXES } from '../thesisDefaults.js';

const REFRESH_MS = 6 * 60 * 60 * 1000;

const CHOKEPOINT_COORDS = Object.freeze(
  Object.fromEntries(
    Object.entries(CHOKEPOINT_BOUNDING_BOXES).map(([id, box]) => [
      id,
      { lat: (box.sw.lat + box.ne.lat) / 2, lon: (box.sw.lon + box.ne.lon) / 2 },
    ]),
  ),
);

let _viewer = null;
let _enabled = false;
let _entities = [];
let _refreshTimer = null;

function clearEntities() {
  for (const e of _entities) {
    try { _viewer?.entities.remove(e); } catch { /* cleanup */ }
  }
  _entities = [];
}

function formatWaveLabel(chokepoint, data) {
  const name = chokepoint.charAt(0).toUpperCase() + chokepoint.slice(1);
  if (data.error) return `${name}: Marine forecast unavailable`;

  const wh = data.waveHeight != null ? `${data.waveHeight.toFixed(1)}m` : '—';
  const wp = data.wavePeriod != null ? `${data.wavePeriod.toFixed(0)}s` : '—';
  const sh = data.swellHeight != null ? `${data.swellHeight.toFixed(1)}m` : '—';
  const model = data.modelName || 'unknown';
  const init = data.modelInitTime || 'unknown';

  return `${name} · Wave ${wh} / ${wp} · Swell ${sh}\nMarine forecast · Open-Meteo ${model} · init ${init}`;
}

async function fetchAndRender() {
  clearEntities();
  if (!_viewer || !_enabled) return;

  for (const [chokepoint, coords] of Object.entries(CHOKEPOINT_COORDS)) {
    try {
      const res = await fetch(
        `/api/marine-weather?lat=${coords.lat}&lon=${coords.lon}`,
        { signal: AbortSignal.timeout(15000) },
      );
      const data = res.ok ? await res.json() : { error: 'fetch_failed' };

      const entity = _viewer.entities.add({
        name: `marine-${chokepoint}`,
        position: Cesium.Cartesian3.fromDegrees(coords.lon, coords.lat + 0.5, 100),
        label: {
          text: formatWaveLabel(chokepoint, data),
          font: '10px JetBrains Mono, monospace',
          fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2000000),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.82)'),
          backgroundPadding: new Cesium.Cartesian2(8, 5),
        },
        properties: { layerId: 'marine-weather', chokepoint },
      });
      _entities.push(entity);
    } catch { /* silent failure per chokepoint */ }
  }
}

const marineWeather = {
  id: 'marine-weather',
  name: 'Marine Weather Forecast',
  icon: '🌊',
  source: 'Open-Meteo Marine',
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
  destroy() { this.disable(); _viewer = null; },
  getStats() { return { enabled: _enabled, forecasts: _entities.length }; },
};

export default marineWeather;
