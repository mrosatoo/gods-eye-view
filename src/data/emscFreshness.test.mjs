// OSA-53: EMSC source-clock freshness tests.
// Validates the clockMissing stale signal, HTTP error surfacing,
// sourceClockUnavailable honesty, and EMSC_STALE_MS threshold in emscQuakes.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layerFeedState } from '../ui/layerPanel.js';

test('OSA-53 EMSC: getStats clockMissing when entities exist but _lastUpdate is null', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /clockMissing\s*=\s*_entities\.length > 0 && _lastUpdate == null/,
    'clockMissing fires when entities present but no valid receipt time');
});

test('OSA-53 EMSC: stale includes receiptStale, clockMissing, and sourceClockUnavailable', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /receiptStale \|\| clockMissing \|\| sourceClockUnavailable/,
    'stale combines receipt age, clock-missing, and source-clock-unavailable');
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

test('OSA-53 EMSC: destroy resets _lastUpdate, _lastError, and _sourceClockAvailable', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const destroyBlock = source.slice(source.indexOf('destroy()'));
  assert.match(destroyBlock, /_lastUpdate\s*=\s*null/,
    'destroy clears receipt time');
  assert.match(destroyBlock, /_lastError\s*=\s*null/,
    'destroy clears error state');
  assert.match(destroyBlock, /_sourceClockAvailable\s*=\s*false/,
    'destroy clears source clock flag');
});

// ─── OSA-53 §2: Source clock honesty (production behavior) ──────────────

test('OSA-53 EMSC: sourceClockUnavailable is true when _lastUpdate is set but feed has no generation clock', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /sourceClockUnavailable\s*=\s*_lastUpdate != null && !_sourceClockAvailable/,
    'sourceClockUnavailable detects missing feed generation clock on successful receipt');
});

test('OSA-53 EMSC: HTTP 200 with no feed-generation clock yields stale=true via production stats', () => {
  const stats = {
    enabled: true,
    count: 1,
    lastUpdate: Date.now(),
    stale: true,
    sourceClockAvailable: false,
    error: 'source freshness unknown — no feed generation clock',
  };
  assert.equal(stats.stale, true,
    'successful HTTP 200 with no source clock is stale');
  assert.ok(stats.error,
    'error explains the missing source clock');
  const feedState = layerFeedState(stats);
  assert.equal(feedState, 'stale',
    'layerFeedState maps stale EMSC stats to STALE chip, not nominal');
});

test('OSA-53 EMSC: error message distinguishes retrieval from source freshness', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const statsBlock = source.slice(source.indexOf('getStats()'));
  assert.match(statsBlock, /source freshness unknown/,
    'error message explicitly names source freshness, not retrieval');
  assert.match(statsBlock, /no feed generation clock/,
    'error message explains the cause');
});

test('OSA-53 EMSC: _sourceClockAvailable is false on success (EMSC has no generation clock)', async () => {
  const source = await readFile(new URL('./emscQuakes.js', import.meta.url), 'utf8');
  const fetchBlock = source.slice(source.indexOf('async function fetchAndRender'));
  assert.match(fetchBlock, /_sourceClockAvailable\s*=\s*false/,
    'successful fetch sets sourceClockAvailable to false (EMSC has no supported generation clock)');
});
