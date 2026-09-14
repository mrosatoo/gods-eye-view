import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DisruptionStripController, renderDisruptionStrip } from './disruptionStrip.js';
import { aggregateDisruptionContext } from '../data/disruptionContext.js';

function mockDataManager({ enabled = true, stats = {}, records = [] } = {}) {
  const module = {
    getStats() { return { enabled, count: 0, ...stats }; },
    getAnalystRecords() { return records; },
  };
  return {
    layers: new Map([['ais-live-vessels', { module, enabled }]]),
    isEnabled(id) {
      const entry = this.layers.get(id);
      return entry ? entry.enabled : false;
    },
  };
}

test('_getAisData returns null for source loss (enabled, count=0, stale, error)', () => {
  const dm = mockDataManager({
    enabled: true,
    stats: { count: 0, stale: true, error: 'source lost' },
  });
  const ctrl = new DisruptionStripController({ dataManager: dm });
  const result = ctrl._getAisData();
  assert.equal(result, null);
});

test('_getAisData returns null for disabled layer', () => {
  const dm = mockDataManager({ enabled: false });
  const ctrl = new DisruptionStripController({ dataManager: dm });
  const result = ctrl._getAisData();
  assert.equal(result, null);
});

test('_getAisData returns null for enabled+stale+count=0 (unavailable status)', () => {
  const dm = mockDataManager({
    enabled: true,
    stats: { count: 0, stale: true, status: 'unavailable' },
  });
  const ctrl = new DisruptionStripController({ dataManager: dm });
  const result = ctrl._getAisData();
  assert.equal(result, null);
});

test('_getAisData returns vessels for healthy enabled layer with count > 0', () => {
  const now = new Date();
  const dm = mockDataManager({
    enabled: true,
    stats: { count: 5, stale: false, error: null },
    records: [
      { mmsi: '111', lat: 26, lon: 56, speedKts: 0.1, navStatus: null, sourceTimestamp: now.toISOString() },
    ],
  });
  const ctrl = new DisruptionStripController({ dataManager: dm });
  const result = ctrl._getAisData();
  assert.ok(result);
  assert.equal(result.vessels.length, 1);
  assert.equal(result.vessels[0].mmsi, '111');
  assert.equal(result.vessels[0].sog, 0.1);
});

test('source loss AIS renders as source_unavailable in aggregate context', () => {
  const context = aggregateDisruptionContext({
    fires: null,
    quakeFeatures: null,
    aisVessels: null,
    headlines: null,
  });
  assert.equal(context.ais.status, 'source_unavailable');
});

test('renderDisruptionStrip shows STALE badge for stale source', () => {
  const context = aggregateDisruptionContext({
    fires: null,
    quakeFeatures: null,
    aisVessels: [
      { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: new Date(Date.now() - 400_000).toISOString() },
    ],
    chokepoint: 'hormuz',
    headlines: null,
  });
  assert.equal(context.ais.status, 'stale');
});
