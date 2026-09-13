/**
 * NWS Weather Alerts layer — US energy infrastructure (Phase A — P2).
 *
 * Source: NWS api.weather.gov — keyless GeoJSON, US territories only.
 * Coverage: US Gulf states + Atlantic coast for energy relevance.
 * Labels: "NWS [severity] · [event] · [headline]"
 * Never: coverage outside US = explicit gap, not "no alerts globally".
 *
 * Registry entry: { id: 'nws-alerts', enabled: false }
 */

import * as Cesium from 'cesium';

const REFRESH_MS = 5 * 60 * 1000;

let _viewer = null;
let _enabled = false;
let _entities = [];
let _refreshTimer = null;

function severityColor(severity) {
  if (severity === 'Extreme') return Cesium.Color.fromCssColorString('rgba(255, 0, 0, 0.5)');
  if (severity === 'Severe') return Cesium.Color.fromCssColorString('rgba(255, 145, 0, 0.5)');
  if (severity === 'Moderate') return Cesium.Color.fromCssColorString('rgba(255, 215, 0, 0.4)');
  return Cesium.Color.fromCssColorString('rgba(0, 229, 255, 0.3)');
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
    const res = await fetch('/api/nws-alerts?area=TX,LA,MS,AL,FL', {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const features = data?.features || [];
    const now = Date.now();

    for (const f of features) {
      const props = f.properties || {};

      if (props.expires && new Date(props.expires).getTime() < now) continue;

      const geom = f.geometry;
      if (!geom) continue;

      const severity = props.severity || 'Unknown';
      const event = props.event || 'Weather Alert';
      const headline = props.headline || '';
      const sent = props.sent ? new Date(props.sent).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '';

      if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0]?.[0];
        if (!coords || coords.length < 3) continue;

        let sumLat = 0, sumLon = 0;
        for (const c of coords) { sumLon += c[0]; sumLat += c[1]; }
        const cLat = sumLat / coords.length;
        const cLon = sumLon / coords.length;

        const entity = _viewer.entities.add({
          name: `nws-${props.id || Math.random()}`,
          position: Cesium.Cartesian3.fromDegrees(cLon, cLat),
          point: {
            pixelSize: 8,
            color: severityColor(severity),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: `NWS ${severity} · ${event}\n${sent}`,
            font: '10px JetBrains Mono, monospace',
            fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 10),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2000000),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.82)'),
            backgroundPadding: new Cesium.Cartesian2(6, 4),
          },
          properties: { layerId: 'nws-alerts', severity, event },
        });
        _entities.push(entity);
      }
    }
  } catch { /* silent failure */ }
}

const nwsAlerts = {
  id: 'nws-alerts',
  name: 'NWS Weather Alerts (US)',
  icon: '🌪️',
  source: 'NWS api.weather.gov',
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
  getStats() { return { enabled: _enabled, alerts: _entities.length }; },
};

export default nwsAlerts;
