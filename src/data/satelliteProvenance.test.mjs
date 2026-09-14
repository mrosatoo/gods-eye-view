import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTLE, satelliteElementLabel, satelliteTleEpochMs, isTleEpochStale } from './satelliteProvenance.js';

test('numeric TLE catalog IDs are supported; expanded, Alpha-5, mismatched and OMM inputs are excluded', () => {
  const tle = (a, b = a) => `SAT\n1 ${a}U fixture\n2 ${b} fixture`;
  assert.equal(parseTLE(tle('25544')).length, 1);
  assert.equal(parseTLE(tle('99999')).length, 1);
  for (const input of [tle('100000'), tle('A0000'), tle('25544', '25545'), '[{"NORAD_CAT_ID":100000}]']) {
    assert.equal(parseTLE(input).length, 0);
  }
});

test('element age increases without a fetch and never becomes a propagation observation', () => {
  const epoch = Date.UTC(2026, 8, 10);
  const satrec = { jdsatepoch: epoch / 86400000 + 2440587.5 };
  assert.match(satelliteElementLabel(satrec, epoch + 3 * 3600000), /PROPAGATED · TLE 2026-09-10T00:00Z · 3h old/);
  assert.doesNotMatch(satelliteElementLabel(satrec, epoch + 3 * 3600000), /STALE/,
    'fresh 3h TLE does not show STALE');
  assert.match(satelliteElementLabel(satrec, epoch + 3 * 86400000), /3d old/);
  assert.match(satelliteElementLabel(satrec, epoch + 3 * 86400000), /STALE/,
    '3d old TLE shows STALE');
  assert.match(satelliteElementLabel(satrec, epoch - 1), /future epoch/);
  assert.match(satelliteElementLabel(satrec, epoch - 1), /STALE/,
    'future epoch TLE shows STALE');
  assert.match(satelliteElementLabel({}), /epoch unknown/);
  assert.match(satelliteElementLabel({}), /STALE/,
    'unknown epoch TLE shows STALE');
});

test('satelliteTleEpochMs extracts and validates epoch', () => {
  const epoch = Date.UTC(2026, 8, 10);
  const satrec = { jdsatepoch: epoch / 86400000 + 2440587.5 };
  assert.equal(satelliteTleEpochMs(satrec), epoch);
  assert.equal(satelliteTleEpochMs({}), null);
  assert.equal(satelliteTleEpochMs(null), null);
});

test('isTleEpochStale identifies stale, fresh, missing, and future epochs', () => {
  const now = Date.UTC(2026, 8, 14, 13, 0, 0);
  const freshEpoch = now - 3600_000;
  const staleEpoch = now - 2 * 86_400_000;
  const futureEpoch = now + 3600_000;
  const makeSatrec = (epochMs) => ({ jdsatepoch: epochMs / 86400000 + 2440587.5 });

  assert.equal(isTleEpochStale(makeSatrec(freshEpoch), now), false, '1h old is fresh');
  assert.equal(isTleEpochStale(makeSatrec(staleEpoch), now), true, '2d old is stale');
  assert.equal(isTleEpochStale(makeSatrec(futureEpoch), now), true, 'future is stale');
  assert.equal(isTleEpochStale({}, now), true, 'missing epoch is stale');
  assert.equal(isTleEpochStale(null, now), true, 'null satrec is stale');
});
