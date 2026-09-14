// OSA-53: FIRMS source-clock freshness tests.
// Validates the fetchedAt validation, clockMissing stale signal,
// and future-clock rejection in firmsHeatmap.js getStats/update.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
