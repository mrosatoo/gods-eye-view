/**
 * Thesis defaults — central configuration for the God Eye hedge-fund Lagebild.
 *
 * Layers are ON or OFF by default based on thesis relevance per Lenkung.
 * This module is consumed by firstRunExperience.js and layerState.js.
 */

export const THESIS_LAYER_DEFAULTS = Object.freeze({
  'ais-live-vessels': true,
  earthquakes: true,
  'local-firms': true,
  satellites: true,
  cctv: false,
  traffic: false,
  radio: false,
  bikeshare: false,
  flights: true,
  military: false,
  'military-awareness': false,
  'military-installations': false,
  'rocket-launches': false,
  'telegeography-submarine-cables': false,
  'local-dams': false,
  'local-datacenters': false,
  portwatch: true,
  'gdacs-alerts': false,
  'emsc-quakes': false,
  'nws-alerts': false,
  'marine-weather': false,
});

export const CHOKEPOINT_BOUNDING_BOXES = Object.freeze({
  hormuz:    { sw: { lat: 25.5, lon: 55.5 }, ne: { lat: 27.5, lon: 57.5 } },
  suez:      { sw: { lat: 29.0, lon: 32.0 }, ne: { lat: 31.0, lon: 33.5 } },
  bab:       { sw: { lat: 11.5, lon: 42.5 }, ne: { lat: 13.5, lon: 44.5 } },
  malacca:   { sw: { lat: 1.0,  lon: 100.0 }, ne: { lat: 4.0,  lon: 104.0 } },
  singapore: { sw: { lat: 0.8,  lon: 103.0 }, ne: { lat: 1.8,  lon: 104.5 } },
  cape:      { sw: { lat: -35.5, lon: 17.5 }, ne: { lat: -33.5, lon: 20.5 } },
});

export const REGION_TYPES = Object.freeze({
  hormuz:    'maritime',
  suez:      'maritime',
  bab:       'maritime',
  malacca:   'maritime',
  singapore: 'maritime',
  cape:      'maritime',
  cobalt:    'land',
});

export const SEMANTIC_LADDER_CEILING = 1;
