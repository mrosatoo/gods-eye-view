import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTLE, satelliteElementLabel } from './satelliteProvenance.js';

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
  assert.match(satelliteElementLabel(satrec, epoch + 3 * 86400000), /3d old/);
  assert.match(satelliteElementLabel(satrec, epoch - 1), /future epoch/);
  assert.match(satelliteElementLabel({}), /epoch unknown/);
});
