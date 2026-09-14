import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyChokepointDensity,
  formatChokepointRows,
  renderChokeDensityHud,
} from './chokeDensityHud.js';

test('classifyChokepointDensity returns zero counts for empty input', () => {
  const result = classifyChokepointDensity([], null);
  assert.equal(result.get('hormuz').total, 0);
  assert.equal(result.get('suez').total, 0);
  assert.equal(result.get('bab').total, 0);
  assert.equal(result.get('malacca').total, 0);
});

test('classifyChokepointDensity counts vessels in Hormuz bounding box', () => {
  const records = [
    { id: '1', latitude: 26.5, longitude: 56.5 },
    { id: '2', latitude: 27.0, longitude: 57.0 },
    { id: '3', latitude: 10.0, longitude: 20.0 },
  ];
  const result = classifyChokepointDensity(records, null);
  assert.equal(result.get('hormuz').total, 2);
  assert.equal(result.get('suez').total, 0);
});

test('classifyChokepointDensity counts vessels in Suez bounding box', () => {
  const records = [
    { id: '1', latitude: 30.0, longitude: 32.5 },
  ];
  const result = classifyChokepointDensity(records, null);
  assert.equal(result.get('suez').total, 1);
});

test('classifyChokepointDensity counts vessels in Bab bounding box', () => {
  const records = [
    { id: '1', latitude: 12.5, longitude: 43.5 },
  ];
  const result = classifyChokepointDensity(records, null);
  assert.equal(result.get('bab').total, 1);
});

test('classifyChokepointDensity counts vessels in Malacca bounding box', () => {
  const records = [
    { id: '1', latitude: 2.5, longitude: 102.0 },
  ];
  const result = classifyChokepointDensity(records, null);
  assert.equal(result.get('malacca').total, 1);
});

test('classifyChokepointDensity counts low-SOG candidates using callback', () => {
  const records = [
    { id: '111', latitude: 26.5, longitude: 56.5 },
    { id: '222', latitude: 26.8, longitude: 56.8 },
  ];
  const getLowSog = (mmsi) => {
    if (mmsi === '111') return { candidateType: 'low_sog', sogKn: 0.2 };
    return null;
  };
  const result = classifyChokepointDensity(records, getLowSog);
  assert.equal(result.get('hormuz').total, 2);
  assert.equal(result.get('hormuz').lowSog, 1);
});

test('classifyChokepointDensity counts reported_anchor as low-SOG', () => {
  const records = [
    { id: '111', latitude: 30.5, longitude: 32.5 },
  ];
  const getLowSog = () => ({ candidateType: 'reported_anchor' });
  const result = classifyChokepointDensity(records, getLowSog);
  assert.equal(result.get('suez').lowSog, 1);
});

test('classifyChokepointDensity ignores invalid coordinates', () => {
  const records = [
    { id: '1', latitude: NaN, longitude: 56.5 },
    { id: '2', latitude: 26.5, longitude: undefined },
  ];
  const result = classifyChokepointDensity(records, null);
  assert.equal(result.get('hormuz').total, 0);
});

test('classifyChokepointDensity assigns vessel to first matching chokepoint only', () => {
  const records = [
    { id: '1', latitude: 26.5, longitude: 56.5 },
  ];
  const result = classifyChokepointDensity(records, null);
  const total = ['hormuz', 'suez', 'bab', 'malacca']
    .reduce((s, k) => s + result.get(k).total, 0);
  assert.equal(total, 1);
});

test('classifyChokepointDensity works with lat/lon fields', () => {
  const records = [
    { mmsi: '1', lat: 26.5, lon: 56.5 },
  ];
  const result = classifyChokepointDensity(records, null);
  assert.equal(result.get('hormuz').total, 1);
});

test('formatChokepointRows returns four rows in order', () => {
  const counts = new Map([
    ['hormuz', { total: 10, lowSog: 2 }],
    ['suez', { total: 5, lowSog: 0 }],
    ['bab', { total: 3, lowSog: 1 }],
    ['malacca', { total: 8, lowSog: 0 }],
  ]);
  const rows = formatChokepointRows(counts);
  assert.equal(rows.length, 4);
  assert.equal(rows[0].key, 'hormuz');
  assert.equal(rows[0].name, 'HORMUZ');
  assert.equal(rows[0].total, 10);
  assert.equal(rows[0].lowSog, 2);
  assert.equal(rows[1].key, 'suez');
  assert.equal(rows[2].key, 'bab');
  assert.equal(rows[3].key, 'malacca');
});

test('formatChokepointRows returns zero defaults for missing keys', () => {
  const rows = formatChokepointRows(new Map());
  assert.equal(rows.length, 4);
  assert.equal(rows[0].total, 0);
  assert.equal(rows[0].lowSog, 0);
});

test('formatChokepointRows marks feedAvailable', () => {
  const rows = formatChokepointRows(new Map(), { feedAvailable: false });
  assert.equal(rows[0].feedAvailable, false);
  const available = formatChokepointRows(new Map(), { feedAvailable: true });
  assert.equal(available[0].feedAvailable, true);
});

test('renderChokeDensityHud hides host when not enabled', () => {
  const host = { hidden: true, innerHTML: '' };
  renderChokeDensityHud(host, [], { enabled: false });
  assert.equal(host.hidden, true);
  assert.equal(host.innerHTML, '');
});

test('renderChokeDensityHud shows host when enabled', () => {
  const rows = formatChokepointRows(new Map([
    ['hormuz', { total: 5, lowSog: 1 }],
    ['suez', { total: 3, lowSog: 0 }],
    ['bab', { total: 0, lowSog: 0 }],
    ['malacca', { total: 2, lowSog: 0 }],
  ]));
  const host = { hidden: true, innerHTML: '' };
  renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: true });
  assert.equal(host.hidden, false);
  assert.ok(host.innerHTML.includes('HORMUZ'));
  assert.ok(host.innerHTML.includes('SUEZ'));
  assert.ok(host.innerHTML.includes('BAB'));
  assert.ok(host.innerHTML.includes('MALACCA'));
  assert.ok(host.innerHTML.includes('10 vessels'));
  assert.ok(host.innerHTML.includes('1 low-SOG'));
  assert.ok(host.innerHTML.includes('1 candidate'));
});

test('renderChokeDensityHud shows degraded label when feed is unhealthy', () => {
  const rows = formatChokepointRows(new Map());
  const host = { hidden: true, innerHTML: '' };
  renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: false });
  assert.ok(host.innerHTML.includes('FEED DEGRADED'));
});

test('renderChokeDensityHud does not show degraded label when feed is healthy', () => {
  const rows = formatChokepointRows(new Map());
  const host = { hidden: true, innerHTML: '' };
  renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: true });
  assert.ok(!host.innerHTML.includes('FEED DEGRADED'));
});

test('renderChokeDensityHud handles null host gracefully', () => {
  assert.doesNotThrow(() => renderChokeDensityHud(null, [], {}));
});

test('renderChokeDensityHud shows NO DATA for unavailable feed', () => {
  const rows = formatChokepointRows(new Map(), { feedAvailable: false });
  const host = { hidden: true, innerHTML: '' };
  renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: false });
  assert.ok(host.innerHTML.includes('NO DATA'));
});

test('renderChokeDensityHud shows 0 low-SOG for zero observed candidates', () => {
  const rows = formatChokepointRows(new Map([
    ['hormuz', { total: 5, lowSog: 0 }],
    ['suez', { total: 3, lowSog: 0 }],
    ['bab', { total: 0, lowSog: 0 }],
    ['malacca', { total: 2, lowSog: 0 }],
  ]));
  const host = { hidden: true, innerHTML: '' };
  renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: true });
  assert.ok(host.innerHTML.includes('0 low-SOG'));
  assert.ok(!host.innerHTML.includes('NO DATA'));
});
