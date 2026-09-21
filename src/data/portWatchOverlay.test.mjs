// src/data/portWatchOverlay.test.mjs
// Tests for PortWatch daily activity overlay — label formatting, freshness
// classification, context cards, color coding, and test seam wiring.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
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
  _resetStateForTest,
  _getDataCacheForTest,
  _setDataCacheForTest,
  _getEnabledForTest,
  _setEnabledForTest,
} from './portWatchOverlay.js';

import portWatchOverlay from './portWatchOverlay.js';

beforeEach(() => {
  _resetStateForTest();
});

// ── Thesis chokepoints ────────────────────────────────────────────────

test('thesis chokepoints are the four primary maritime chokes', () => {
  assert.deepEqual(THESIS_CHOKEPOINTS, ['hormuz', 'suez', 'bab', 'malacca']);
});

test('every thesis chokepoint has a display name', () => {
  for (const cp of THESIS_CHOKEPOINTS) {
    assert.ok(CHOKEPOINT_DISPLAY_NAMES[cp], `missing display name for ${cp}`);
  }
});

test('every thesis chokepoint has context text', () => {
  for (const cp of THESIS_CHOKEPOINTS) {
    assert.ok(CHOKEPOINT_CONTEXT[cp], `missing context for ${cp}`);
  }
});

test('secondary chokepoints have display names but no context', () => {
  assert.ok(CHOKEPOINT_DISPLAY_NAMES.singapore);
  assert.ok(CHOKEPOINT_DISPLAY_NAMES.cape);
  assert.equal(CHOKEPOINT_CONTEXT.singapore, undefined);
  assert.equal(CHOKEPOINT_CONTEXT.cape, undefined);
});

// ── boxCenter ─────────────────────────────────────────────────────────

test('boxCenter returns midpoint of sw/ne', () => {
  const c = boxCenter({ sw: { lat: 10, lon: 20 }, ne: { lat: 30, lon: 40 } });
  assert.equal(c.lat, 20);
  assert.equal(c.lon, 30);
});

// ── classifyFreshness ─────────────────────────────────────────────────

test('classifyFreshness: error → unavailable', () => {
  assert.equal(classifyFreshness({ error: 'source_unavailable' }), 'unavailable');
});

test('classifyFreshness: no observationDate → undated', () => {
  assert.equal(classifyFreshness({ transitCount: 5 }), 'undated');
  assert.equal(classifyFreshness({ transitCount: 5, observationDate: null }), 'undated');
});

test('classifyFreshness: invalid date → undated', () => {
  assert.equal(classifyFreshness({ transitCount: 5, observationDate: 'not-a-date' }), 'undated');
});

test('classifyFreshness: today → recent', () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(classifyFreshness({ transitCount: 5, observationDate: today }), 'recent');
});

test('classifyFreshness: yesterday → recent', () => {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  assert.equal(classifyFreshness({ transitCount: 5, observationDate: d.toISOString().slice(0, 10) }), 'recent');
});

test('classifyFreshness: 5 days ago → dated', () => {
  const d = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  assert.equal(classifyFreshness({ transitCount: 5, observationDate: d.toISOString().slice(0, 10) }), 'dated');
});

test('classifyFreshness: 10 days ago → stale', () => {
  const d = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  assert.equal(classifyFreshness({ transitCount: 5, observationDate: d.toISOString().slice(0, 10) }), 'stale');
});

// ── dataAge ───────────────────────────────────────────────────────────

test('dataAge: null observationDate → null', () => {
  assert.equal(dataAge({}), null);
  assert.equal(dataAge({ observationDate: null }), null);
});

test('dataAge: invalid date → null', () => {
  assert.equal(dataAge({ observationDate: 'garbage' }), null);
});

test('dataAge: today → "today"', () => {
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(dataAge({ observationDate: today }), 'today');
});

test('dataAge: yesterday → "1 day ago"', () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  assert.equal(dataAge({ observationDate: d.toISOString().slice(0, 10) }), '1 day ago');
});

test('dataAge: 3 days ago → "3 days ago"', () => {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  assert.equal(dataAge({ observationDate: d.toISOString().slice(0, 10) }), '3 days ago');
});

// ── formatLabel ───────────────────────────────────────────────────────

test('formatLabel: source_unavailable shows admission pending', () => {
  const label = formatLabel({ error: 'source_unavailable' });
  assert.ok(label.includes('Source admission pending'));
});

test('formatLabel: fetch_failed shows unavailable', () => {
  const label = formatLabel({ error: 'fetch_failed' });
  assert.ok(label.includes('unavailable'));
});

test('formatLabel: null transitCount shows unavailable for period', () => {
  const label = formatLabel({ chokepoint: 'hormuz', observationDate: '2026-09-01', transitCount: null });
  assert.ok(label.includes('unavailable'));
  assert.ok(label.includes('2026-09-01'));
});

test('formatLabel: valid data shows transit count and dated attribution', () => {
  const label = formatLabel({
    chokepoint: 'hormuz',
    observationDate: '2026-09-10',
    transitCount: 42,
    avgTransitCount: 45,
    pctChange: -6.7,
  });
  assert.ok(label.includes('42 transits/day'));
  assert.ok(label.includes('dated 2026-09-10'));
  assert.ok(label.includes('PortWatch'));
});

test('formatLabel: never contains "live congestion" or "queue time"', () => {
  const variants = [
    { error: 'source_unavailable' },
    { chokepoint: 'suez', transitCount: 50, observationDate: '2026-09-01' },
    { chokepoint: 'hormuz', transitCount: 42, avgTransitCount: 45, pctChange: -15, observationDate: '2026-09-01' },
  ];
  for (const data of variants) {
    const label = formatLabel(data);
    assert.ok(!label.toLowerCase().includes('live congestion'), `label should not contain "live congestion": ${label}`);
    assert.ok(!label.toLowerCase().includes('queue time'), `label should not contain "queue time": ${label}`);
  }
});

test('formatLabel: uses display name not raw chokepoint key', () => {
  const label = formatLabel({ chokepoint: 'hormuz', transitCount: 10, observationDate: '2026-09-01' });
  assert.ok(label.includes('Strait of Hormuz'));
  assert.ok(!label.includes('\nhormuz'));
});

test('formatLabel: decline shows down arrow', () => {
  const label = formatLabel({
    chokepoint: 'suez',
    transitCount: 30,
    avgTransitCount: 50,
    pctChange: -40,
    observationDate: '2026-09-01',
  });
  assert.ok(label.includes('▼'));
});

test('formatLabel: increase shows up arrow', () => {
  const label = formatLabel({
    chokepoint: 'suez',
    transitCount: 60,
    avgTransitCount: 50,
    pctChange: 20,
    observationDate: '2026-09-01',
  });
  assert.ok(label.includes('▲'));
});

// ── formatContextCard ─────────────────────────────────────────────────

test('formatContextCard: thesis chokepoint includes context line', () => {
  const card = formatContextCard({
    chokepoint: 'hormuz',
    transitCount: 42,
    avgTransitCount: 45,
    pctChange: -6.7,
    observationDate: '2026-09-10',
  });
  assert.ok(card.includes('Oil transit corridor'));
  assert.ok(card.includes('Strait of Hormuz'));
  assert.ok(card.includes('42 transits/day'));
});

test('formatContextCard: error shows source_unavailable', () => {
  const card = formatContextCard({ chokepoint: 'suez', error: 'source_unavailable' });
  assert.ok(card.includes('Source admission pending'));
  assert.ok(card.includes('source_unavailable'));
});

test('formatContextCard: fetch_failed shows temporarily unavailable', () => {
  const card = formatContextCard({ chokepoint: 'bab', error: 'fetch_failed' });
  assert.ok(card.includes('temporarily unavailable'));
});

test('formatContextCard: null transitCount shows no transit data', () => {
  const card = formatContextCard({ chokepoint: 'malacca', transitCount: null, observationDate: '2026-09-05' });
  assert.ok(card.includes('No transit data'));
});

test('formatContextCard: never contains "live congestion"', () => {
  const card = formatContextCard({
    chokepoint: 'hormuz',
    transitCount: 42,
    observationDate: '2026-09-10',
  });
  assert.ok(!card.toLowerCase().includes('live congestion'));
  assert.ok(!card.toLowerCase().includes('queue time'));
});

test('formatContextCard: stale data explicitly labeled STALE', () => {
  const d = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const card = formatContextCard({
    chokepoint: 'hormuz',
    transitCount: 42,
    observationDate: d.toISOString().slice(0, 10),
  });
  assert.ok(card.includes('STALE'));
});

test('formatContextCard: recent data labeled recent', () => {
  const today = new Date().toISOString().slice(0, 10);
  const card = formatContextCard({
    chokepoint: 'hormuz',
    transitCount: 42,
    observationDate: today,
  });
  assert.ok(card.includes('recent'));
});

// ── fillColor / borderColor ───────────────────────────────────────────

test('fillColor: error data returns muted blue-grey', () => {
  const c = fillColor({ error: 'source_unavailable' });
  assert.ok(c.alpha < 0.15, 'muted fill expected');
});

test('fillColor: normal data returns blue-grey', () => {
  const c = fillColor({ transitCount: 50, pctChange: 5 });
  assert.ok(c.alpha > 0);
});

test('fillColor: significant decline returns gold', () => {
  const c = fillColor({ transitCount: 30, pctChange: -15 });
  assert.ok(c.red > 0.9, 'gold fill red channel');
});

test('borderColor: error returns low-alpha', () => {
  const c = borderColor({ error: 'fetch_failed' });
  assert.ok(c.alpha <= 0.25);
});

test('borderColor: significant decline returns gold', () => {
  const c = borderColor({ transitCount: 30, pctChange: -15 });
  assert.ok(c.red > 0.9);
});

// ── Module shape ──────────────────────────────────────────────────────

test('portWatchOverlay exports standard layer interface', () => {
  assert.equal(portWatchOverlay.id, 'portwatch');
  assert.equal(typeof portWatchOverlay.init, 'function');
  assert.equal(typeof portWatchOverlay.enable, 'function');
  assert.equal(typeof portWatchOverlay.disable, 'function');
  assert.equal(typeof portWatchOverlay.destroy, 'function');
  assert.equal(typeof portWatchOverlay.getStats, 'function');
});

test('portWatchOverlay.name is honest (never "live congestion")', () => {
  assert.ok(portWatchOverlay.name.includes('dated'));
  assert.ok(!portWatchOverlay.name.toLowerCase().includes('live'));
});

test('portWatchOverlay.source is IMF PortWatch', () => {
  assert.equal(portWatchOverlay.source, 'IMF PortWatch');
});

// ── getStats ──────────────────────────────────────────────────────────

test('getStats: initial state', () => {
  const stats = portWatchOverlay.getStats();
  assert.equal(stats.enabled, false);
  assert.equal(stats.cached, 0);
  assert.ok(stats.chokepoints > 0);
  assert.ok(stats.freshness);
  assert.equal(stats.status, 'unavailable');
});

test('getStats: with cached data reports freshness distribution', () => {
  const cache = new Map();
  cache.set('hormuz', { error: 'source_unavailable' });
  cache.set('suez', { transitCount: 50, observationDate: new Date().toISOString().slice(0, 10) });
  _setDataCacheForTest(cache);
  _setEnabledForTest(true);
  const stats = portWatchOverlay.getStats();
  assert.equal(stats.enabled, true);
  assert.equal(stats.cached, 2);
  assert.equal(stats.freshness.unavailable, 1);
  assert.equal(stats.freshness.recent, 1);
  assert.equal(stats.count, 1);
  assert.equal(stats.status, 'degraded');
});

test('getStats: a cache containing only failed responses is unavailable', () => {
  _setDataCacheForTest(new Map([['hormuz', { error: 'source_unavailable' }]]));
  assert.equal(portWatchOverlay.getStats().status, 'unavailable');
  assert.equal(portWatchOverlay.getStats().count, 0);
});
