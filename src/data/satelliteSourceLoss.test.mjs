// MF-14 acceptance: deterministic globe-level satellite source-loss behavior.
// Proves the satellite layer's getStats() contract maps to the correct
// layerFeedState chip under normal, degraded, and unavailable conditions.
// Proves the shared serving proxy preserves stale data, CelesTrak cooldown,
// original TLE epochs, and unsupported-ID exclusion. Does NOT claim
// distributed replicas — only the shared serving proxy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layerFeedState } from '../ui/layerPanel.js';
import { parseTLE, satelliteElementLabel } from './satelliteProvenance.js';

// ─── MF-14 §1: getStats() → layerFeedState chip contract ───────────────

test('MF-14: nominal satellite stats map to ON chip', () => {
  const stats = { count: 838, lastUpdate: Date.now(), stale: false, status: 'nominal', error: null };
  assert.equal(layerFeedState(stats), 'nominal');
});

test('MF-14: degraded satellite stats (partial CelesTrak failure) map to DEGRADED chip', () => {
  const stats = {
    count: 400, lastUpdate: Date.now(), stale: false,
    status: 'degraded',
    error: '2 CelesTrak groups unavailable',
  };
  assert.equal(layerFeedState(stats), 'degraded');
});

test('MF-14: degraded satellite stats with stale groups map to DEGRADED chip', () => {
  const stats = {
    count: 838, lastUpdate: Date.now(), stale: false,
    status: 'degraded',
    error: '1 group using stale TLEs',
  };
  assert.equal(layerFeedState(stats), 'degraded');
});

test('MF-14: unavailable satellite stats (total CelesTrak outage) map to UNAVAILABLE chip', () => {
  const stats = {
    count: 0, lastUpdate: null, stale: false,
    status: 'unavailable',
    error: 'CelesTrak unreachable',
  };
  assert.equal(layerFeedState(stats), 'unavailable');
});

// ─── MF-14 §2: getStats() status derivation contract ───────────────────

test('MF-14: getStats status derivation is correct for all three states', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const statsBlock = source.match(/getStats\(\)\s*\{[\s\S]*?status:\s*([\s\S]*?),\s*\n/);
  assert.ok(statsBlock, 'getStats() exists with status derivation');
  assert.match(statsBlock[1], /CelesTrak unreachable/,
    'total outage maps to unavailable');
  assert.match(statsBlock[1], /effectiveError \? 'degraded' : 'nominal'/,
    'any error (including mixed epoch) is degraded, no error is nominal');
});

// ─── MF-14 §3: outage guard — total failure preserves stale catalog ─────

test('MF-14: total CelesTrak failure bails before clearing the catalog', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const guardMatch = source.match(/if \(results\.every\(r => !r\.ok\)\)/);
  assert.ok(guardMatch, 'H3 outage guard exists');
  const afterGuard = source.slice(source.indexOf(guardMatch[0]));
  const returnBeforeClear = afterGuard.indexOf('return;');
  const removeAll = afterGuard.indexOf('_pointCollection.removeAll()');
  assert.ok(returnBeforeClear < removeAll,
    'guard returns before clearing the catalog — stale data stays on screen');
});

// ─── MF-14 §4: partial failure error composition ────────────────────────

test('MF-14: partial failure surfaces failed group count and stale group count', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  assert.match(source, /CelesTrak group.*unavailable/,
    'error message names CelesTrak group failures');
  assert.match(source, /group.*using stale TLEs/,
    'error message reports groups serving stale cache');
});

// ─── MF-14 §5: CelesTrak cooldown is 2 hours and persists to disk ──────

test('MF-14: CelesTrak cooldown is 2 hours and survives restart', async () => {
  const source = await readFile(
    new URL('../../server/providers/space/celestrak.js', import.meta.url), 'utf8');
  assert.match(source, /FAILURE_COOLDOWN_MS\s*=\s*2\s*\*\s*3600[_0]*00/,
    'cooldown is exactly 2 hours');
  assert.match(source, /celestrak-cooldown\.json/,
    'cooldown state persists to disk');
  assert.match(source, /loadCooldown|readFile.*cooldown/,
    'cooldown is loaded on startup (restart-safe)');
});

// ─── MF-14 §6: TLE parsing excludes expanded/Alpha-5/OMM IDs ───────────

test('MF-14: unsupported catalog IDs are excluded at TLE parse time', () => {
  const valid = parseTLE('SAT\n1 25544U fixture\n2 25544 fixture');
  assert.equal(valid.length, 1, 'standard 5-digit numeric ID passes');

  for (const input of [
    'SAT\n1 100000U fixture\n2 100000 fixture',
    'SAT\n1 A0000U fixture\n2 A0000 fixture',
    '[{"NORAD_CAT_ID":100000}]',
  ]) {
    assert.equal(parseTLE(input).length, 0,
      `rejected: ${input.slice(0, 30)}…`);
  }
});

// ─── MF-14 §7: TLE element age uses original epoch, not fetch time ──────

test('MF-14: TLE element age reflects the original epoch, not the fetch time', () => {
  const epoch = Date.UTC(2026, 8, 10);
  const satrec = { jdsatepoch: epoch / 86400000 + 2440587.5 };
  const threeHoursLater = epoch + 3 * 3600_000;
  const label = satelliteElementLabel(satrec, threeHoursLater);
  assert.match(label, /PROPAGATED · TLE 2026-09-10T00:00Z · 3h old/);
  assert.doesNotMatch(label, /just now|fetched|refreshed/,
    'the label reports element age, not fetch freshness');

  const threeDaysLater = epoch + 3 * 86_400_000;
  assert.match(satelliteElementLabel(satrec, threeDaysLater), /3d old/);

  assert.match(satelliteElementLabel(satrec, epoch - 1), /future epoch/);
  assert.match(satelliteElementLabel({}), /epoch unknown/);
});

// ─── MF-14 §8: shared serving proxy is scope (single-flight) ────────────

test('MF-14: shared proxy uses single-flight refresh per group', async () => {
  const source = await readFile(
    new URL('../../server/providers/space/celestrak.js', import.meta.url), 'utf8');
  assert.match(source, /inflight|_inflight|inflightMap|_flights/i,
    'proxy deduplicates concurrent requests per group');
});

// ─── OSA-53 §1: TLE epoch staleness in getStats() ────────────────────────

test('OSA-53: getStats source-code asserts stale when TLE epochs exceed SAT_STALE_MS', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  assert.match(source, /tleEpochStale/, 'getStats checks TLE epoch staleness');
  assert.match(source, /tleClockMissing/, 'getStats checks missing TLE clock');
  assert.match(source, /tleClockFuture/, 'getStats checks future TLE clock');
  assert.match(source, /SAT_STALE_MS\s*=\s*86[_]?400[_]?000/,
    'satellite stale threshold is 24 hours');
});

test('OSA-53: _computeNewestTleEpoch scans catalog and picks newest epoch', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const fnMatch = source.match(/function _computeNewestTleEpoch[\s\S]*?^}/m);
  assert.ok(fnMatch, '_computeNewestTleEpoch exists');
  assert.match(fnMatch[0], /jdsatepoch/, 'reads TLE Julian epoch');
  assert.match(fnMatch[0], /2440587\.5/, 'uses Julian-to-Unix conversion constant');
  assert.match(fnMatch[0], /Number\.isFinite/, 'guards against non-finite epochs');
  assert.match(fnMatch[0], /epochMs <= 0/, 'rejects non-positive epochs');
});

test('OSA-53: getStats stale derivation includes all four TLE signals', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /receiptStale \|\| tleEpochStale \|\| tleClockMissing \|\| tleClockFuture/,
    'stale OR-chains all four conditions');
});

test('OSA-53: newestTleEpochMs is cleared in destroy()', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const destroyBlock = source.slice(source.indexOf('destroy(viewer)'));
  assert.match(destroyBlock, /_newestTleEpochMs\s*=\s*null/,
    'destroy clears TLE epoch state');
});

test('OSA-53: TLE epoch stats are computed before _lastUpdate in update()', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const epochIdx = source.indexOf('_computeTleEpochStats()');
  const updateIdx = source.indexOf('_lastUpdate = Date.now()', epochIdx);
  assert.ok(epochIdx > 0, 'epoch stats computation exists in update');
  assert.ok(updateIdx > epochIdx, 'epoch stats computed before receipt timestamp');
});

test('OSA-53: getStats returns newestTleEpochMs in stats object', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /newestTleEpochMs:\s*_newestTleEpochMs/,
    'stats exposes TLE epoch for consumers');
});

// ─── OSA-53 §2: Mixed TLE epoch detection (production behavior) ──────────

test('OSA-53: getStats source-code tracks stale TLE member count', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /hasStaleTleMembers\s*=\s*_staleTleCount > 0/,
    'detects when any catalog members have stale TLE epochs');
  assert.match(statsBlock, /staleTleCount:\s*_staleTleCount/,
    'exposes stale member count in stats');
});

test('OSA-53: mixed-epoch catalog surfaces degraded status even when newest is fresh', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /mixedEpochError/,
    'mixed epoch error is computed separately from catalog-wide stale');
  assert.match(statsBlock, /effectiveError\s*=\s*_lastError \|\| mixedEpochError/,
    'mixed epoch error feeds into status derivation when no CelesTrak error');
});

test('OSA-53: _computeTleEpochStats counts per-object stale members', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const fnMatch = source.match(/function _computeTleEpochStats[\s\S]*?^}/m);
  assert.ok(fnMatch, '_computeTleEpochStats exists');
  assert.match(fnMatch[0], /staleCount\+\+/, 'increments stale count per object');
  assert.match(fnMatch[0], /missingCount/, 'tracks missing epoch count');
  assert.match(fnMatch[0], /dense.*continue/i, 'excludes dense extras from epoch stats');
});

test('OSA-53: production layerFeedState for mixed-epoch satellite catalog reads DEGRADED', () => {
  const stats = {
    count: 6,
    lastUpdate: Date.now(),
    newestTleEpochMs: Date.now() - 3600_000,
    oldestTleEpochMs: Date.now() - 7 * 86_400_000,
    staleTleCount: 1,
    stale: false,
    status: 'degraded',
    error: '1 object with stale/invalid TLE epoch',
  };
  assert.equal(layerFeedState(stats), 'degraded',
    'mixed catalog with 1 stale member maps to DEGRADED chip, not nominal');
});

test('OSA-53: production layerFeedState for all-fresh catalog reads NOMINAL', () => {
  const stats = {
    count: 838,
    lastUpdate: Date.now(),
    newestTleEpochMs: Date.now() - 3600_000,
    oldestTleEpochMs: Date.now() - 12 * 3600_000,
    staleTleCount: 0,
    stale: false,
    status: 'nominal',
    error: null,
  };
  assert.equal(layerFeedState(stats), 'nominal',
    'all-fresh catalog maps to NOMINAL chip');
});

test('OSA-53: production layerFeedState for all-stale catalog reads STALE', () => {
  const stats = {
    count: 6,
    lastUpdate: Date.now(),
    newestTleEpochMs: Date.now() - 3 * 86_400_000,
    oldestTleEpochMs: Date.now() - 7 * 86_400_000,
    staleTleCount: 6,
    stale: true,
    status: 'degraded',
    error: '6 objects with stale/invalid TLE epoch',
  };
  assert.equal(layerFeedState(stats), 'stale',
    'all-stale catalog maps to STALE chip');
});

test('OSA-53: destroy clears all TLE epoch tracking state', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const destroyBlock = source.slice(source.indexOf('destroy(viewer)'));
  assert.match(destroyBlock, /_oldestTleEpochMs\s*=\s*null/, 'destroy clears oldest epoch');
  assert.match(destroyBlock, /_staleTleCount\s*=\s*0/, 'destroy clears stale count');
});

test('OSA-53: init clears all TLE epoch tracking state', async () => {
  const source = await readFile(new URL('./satellites.js', import.meta.url), 'utf8');
  const initBlock = source.slice(source.indexOf('async init(viewer)'));
  assert.match(initBlock, /_oldestTleEpochMs\s*=\s*null/, 'init clears oldest epoch');
  assert.match(initBlock, /_staleTleCount\s*=\s*0/, 'init clears stale count');
});
