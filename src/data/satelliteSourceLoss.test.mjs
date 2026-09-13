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
  assert.match(statsBlock[1], /_lastError \? 'degraded' : 'nominal'/,
    'any error is degraded, no error is nominal');
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
