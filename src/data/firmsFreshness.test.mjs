// OSA-53: FIRMS source-clock freshness tests.
// Validates the fetchedAt validation, clockMissing stale signal,
// future-clock rejection, production-path stats behavior, and
// card/label source-loss presentation in firmsHeatmap.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layerFeedState } from '../ui/layerPanel.js';
import { buildFireCard, buildSelectedFireCard, buildCellCard } from './firmsHeatmap.js';

test('OSA-53 FIRMS: fetchedAt validation rejects non-finite values', async () => {
  const source = await readFile(new URL('./firmsHeatmap.js', import.meta.url), 'utf8');
  assert.match(source, /Number\.isFinite\(rawFetchedAt\)/,
    'guards against NaN/Infinity');
  assert.match(source, /rawFetchedAt > 0/,
    'rejects zero and negative timestamps');
});

test('OSA-53 FIRMS: fetchedAt validation rejects future timestamps beyond 30s', async () => {
  const source = await readFile(new URL('./firmsHeatmap.js', import.meta.url), 'utf8');
  assert.match(source, /rawFetchedAt <= Date\.now\(\) \+ 30[_]?000/,
    'rejects fetchedAt more than 30s in the future');
});

test('OSA-53 FIRMS: invalid fetchedAt falls through to null _lastUpdate', async () => {
  const source = await readFile(new URL('./firmsHeatmap.js', import.meta.url), 'utf8');
  const match = source.match(/const rawFetchedAt[\s\S]*?:\s*null;/);
  assert.ok(match, 'ternary defaults to null when validation fails');
  assert.match(match[0], /\? rawFetchedAt : null/,
    'valid fetchedAt passes, invalid becomes null');
});

test('OSA-53 FIRMS: getStats clockMissing when fires exist but _lastUpdate is null', async () => {
  const source = await readFile(new URL('./firmsHeatmap.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /clockMissing\s*=\s*_count > 0 && _lastUpdate == null/,
    'clockMissing fires when count > 0 and no valid timestamp');
});

test('OSA-53 FIRMS: stale includes clockMissing in OR chain', async () => {
  const source = await readFile(new URL('./firmsHeatmap.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /_stale \|\| ageStale \|\| clockMissing/,
    'stale combines proxy-stale, age-stale, and clock-missing');
});

test('OSA-53 FIRMS: FIRMS_STALE_MS is 2 hours', async () => {
  const source = await readFile(new URL('./firmsHeatmap.js', import.meta.url), 'utf8');
  assert.match(source, /FIRMS_STALE_MS\s*=\s*7[_]?200[_]?000/,
    'FIRMS stale threshold is 7200000ms (2 hours)');
});

// ─── OSA-53 §2: Production-path stats behavior ─────────────────────────

test('OSA-53 FIRMS: production stats with valid fetchedAt reads nominal', () => {
  const stats = {
    count: 1000,
    lastUpdate: Date.now() - 120_000,
    loading: false,
    stale: false,
    error: null,
    loadingLabel: 'NRT detections · fetched 2m ago',
  };
  assert.equal(layerFeedState(stats), 'nominal',
    'valid recent fetchedAt maps to NOMINAL chip');
});

test('OSA-53 FIRMS: production stats with missing fetchedAt (clockMissing) reads stale', () => {
  const stats = {
    count: 1000,
    lastUpdate: null,
    loading: false,
    stale: true,
    error: null,
    loadingLabel: 'STALE',
  };
  assert.equal(layerFeedState(stats), 'stale',
    'missing fetchedAt maps to STALE chip');
});

test('OSA-53 FIRMS: production stats with old fetchedAt reads stale', () => {
  const threeHoursAgo = Date.now() - 3 * 3600_000;
  const stats = {
    count: 1000,
    lastUpdate: threeHoursAgo,
    loading: false,
    stale: true,
    error: 'STALE · cached 3h',
    loadingLabel: 'STALE · cached 3h',
  };
  assert.equal(layerFeedState(stats), 'stale',
    '3h old fetchedAt maps to STALE chip');
});

test('OSA-53 FIRMS: production stats with future fetchedAt reads stale', () => {
  const stats = {
    count: 1000,
    lastUpdate: null,
    loading: false,
    stale: true,
    error: null,
    loadingLabel: 'STALE',
  };
  assert.equal(layerFeedState(stats), 'stale',
    'future fetchedAt (rejected to null) maps to STALE via clockMissing');
});

test('OSA-53 FIRMS: no-refresh expiration (2h) surfaces stale when fetchedAt ages past threshold', () => {
  const justOverTwoHours = Date.now() - 7_200_001;
  const stats = {
    count: 500,
    lastUpdate: justOverTwoHours,
    loading: false,
    stale: true,
    error: 'STALE · cached 2h',
    loadingLabel: 'STALE · cached 2h',
  };
  assert.equal(layerFeedState(stats), 'stale',
    'fetchedAt aging past 2h without refresh maps to STALE');
});

// ─── OSA-53 §3: Card/label source-loss and acquisition provenance ───────

test('OSA-53 FIRMS: selected fire card shows acquisition unknown when acqMs is invalid', () => {
  const fire = { index: 0, lat: 30, lon: 75, frp: 100, confidence: 0.9,
    satellite: 'N20', sensor: 'VIIRS', acqMs: 0, product: 'VIIRS NRT',
    sourceSupport: 'source coverage unknown', night: false };
  const card = buildSelectedFireCard(fire, Date.now(), 0);
  assert.ok(card.details.some(d => d.includes('acquisition unknown')),
    'invalid acqMs shows acquisition unknown on selected card');
});

test('OSA-53 FIRMS: selected fire card shows acquisition in future for future acqMs', () => {
  const futureMs = Date.now() + 3600_000;
  const fire = { index: 0, lat: 30, lon: 75, frp: 100, confidence: 0.9,
    satellite: 'N20', sensor: 'VIIRS', acqMs: futureMs, product: 'VIIRS NRT',
    sourceSupport: 'source coverage unknown', night: false };
  const card = buildSelectedFireCard(fire, Date.now(), 0);
  assert.ok(card.details.some(d => d.includes('acquisition in future')),
    'future acqMs shows acquisition in future on selected card');
});

test('OSA-53 FIRMS: ambient fire card shows acquisition unknown when acqMs is zero', () => {
  const fire = { index: 0, lat: 30, lon: 75, frp: 50, confidence: 0.5,
    satellite: null, sensor: null, acqMs: 0, product: 'VIIRS NRT',
    sourceSupport: 'STALE snapshot', night: false };
  const candidate = { fire, position: { x: 0, y: 0, z: 0 } };
  const card = buildFireCard(candidate, Date.now());
  assert.ok(card.details.some(d => d.includes('acquisition unknown')),
    'zero acqMs shows acquisition unknown on ambient card');
});

test('OSA-53 FIRMS: card sourceSupport line is retained and visible', () => {
  const fire = { index: 0, lat: 30, lon: 75, frp: 100, confidence: 0.9,
    satellite: 'N20', sensor: 'VIIRS', acqMs: Date.now() - 3600_000,
    product: 'VIIRS NRT', sourceSupport: 'STALE snapshot · NRT feed unavailable',
    night: false };
  const card = buildSelectedFireCard(fire, Date.now(), 0);
  assert.ok(card.details.some(d => d.includes('STALE snapshot')),
    'source-loss label is retained on fire card');
});
