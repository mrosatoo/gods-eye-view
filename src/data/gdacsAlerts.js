/**
 * GDACS Multi-Hazard alert layer (Phase A — P2 Research Intake).
 *
 * Source: UN JRC GDACS — keyless GeoJSON.
 * Displays: earthquake, tropical cyclone, flood, volcano, wildfire, drought alerts.
 * Labels: "[GDACS alert level] · [event type] · [location]"
 * Never: "confirmed [disaster]", "trade impact: [amount]"
 *
 * Registry entry: { id: 'gdacs-alerts', enabled: false }
 */

import * as Cesium from 'cesium';

const REFRESH_MS = 60 * 60 * 1000;
const EVENT_ICONS = { EQ: '🔴', TC: '🌀', FL: '🌊', VO: '🌋', WF: '🔥', DR: '☀️' };
const EVENT_NAMES = { EQ: 'Earthquake', TC: 'Tropical Cyclone', FL: 'Flood', VO: 'Volcano', WF: 'Wildfire', DR: 'Drought' };

let _viewer = null;
let _enabled = false;
let _entities = [];
let _refreshTimer = null;

function alertColor(level) {
  if (level === 'Red') return Cesium.Color.fromCssColorString('rgba(255, 61, 0, 0.6)');
  if (level === 'Orange') return Cesium.Color.fromCssColorString('rgba(255, 145, 0, 0.6)');
  return Cesium.Color.fromCssColorString('rgba(0, 229, 255, 0.4)');
}

function formatAlertLabel(props) {
  const type = EVENT_NAMES[props.eventtype] || props.eventtype || 'Event';
  const icon = EVENT_ICONS[props.eventtype] || '⚠️';
  const level = props.alertlevel || 'Unknown';
  const name = props.name || props.country || 'Unknown location';
  return `${icon} GDACS ${level} · ${type}\n${name}`;
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
    const res = await fetch('/api/gdacs?types=EQ,TC,FL,VO,WF,DR&alertlevel=orange,red', {
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const features = data?.features || [];

    for (const f of features) {
      const coords = f.geometry?.coordinates;
      const props = f.properties || {};
      if (!coords || coords.length < 2) continue;

      const entity = _viewer.entities.add({
        name: `gdacs-${props.eventid || Math.random()}`,
        position: Cesium.Cartesian3.fromDegrees(coords[0], coords[1]),
        point: {
          pixelSize: props.alertlevel === 'Red' ? 14 : 10,
          color: alertColor(props.alertlevel),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: formatAlertLabel(props),
          font: '10px JetBrains Mono, monospace',
          fillColor: Cesium.Color.fromCssColorString('#e8eaed'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          pixelOffset: new Cesium.Cartesian2(0, 12),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('rgba(6, 14, 22, 0.82)'),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
        },
        properties: { layerId: 'gdacs-alerts', ...props },
      });
      _entities.push(entity);
    }
  } catch { /* fetch failure — silent, stale data stays visible */ }
}

const gdacsAlerts = {
  id: 'gdacs-alerts',
  name: 'GDACS Multi-Hazard Alerts',
  icon: '⚠️',
  source: 'UN JRC GDACS',
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

export default gdacsAlerts;
