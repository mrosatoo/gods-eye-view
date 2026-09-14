// OSA-53: EMSC source-clock freshness tests.
// Validates the clockMissing stale signal, HTTP error surfacing,
// and EMSC_STALE_MS threshold in emscQuakes.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('OSA-53 EMSC: getStats clockMissing when entities exist but _lastUpdate is null', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /clockMissing\s*=\s*_entities\.length > 0 && _lastUpdate == null/,
    'clockMissing fires when entities present but no valid receipt time');
});

test('OSA-53 EMSC: stale includes both receiptStale and clockMissing', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /receiptStale \|\| clockMissing/,
    'stale combines receipt age and clock-missing');
});

test('OSA-53 EMSC: EMSC_STALE_MS is 30 minutes', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  assert.match(source, /EMSC_STALE_MS\s*=\s*1[_]?800[_]?000/,
    'EMSC stale threshold is 1800000ms (30 minutes)');
});

test('OSA-53 EMSC: non-OK HTTP response sets _lastError and returns early', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  assert.match(source, /if \(!res\.ok\)\s*\{\s*_lastError\s*=\s*`EMSC HTTP \$\{res\.status\}`;\s*return;\s*\}/,
    'non-OK response surfaces as error and short-circuits');
});

test('OSA-53 EMSC: destroy resets _lastUpdate and _lastError', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const destroyBlock = source.slice(source.indexOf('destroy()'));
  assert.match(destroyBlock, /_lastUpdate\s*=\s*null/,
    'destroy clears receipt time');
  assert.match(destroyBlock, /_lastError\s*=\s*null/,
    'destroy clears error state');
});
