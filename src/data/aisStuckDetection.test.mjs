import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLowSog, candidateLabel, CANDIDATE_MAX_AGE_MS } from './aisStuckDetection.js';

const nowMs = Date.parse('2026-09-13T17:00:00Z');
const vessel = { mmsi: '123456789', lat: 26, lon: 56, sog: 0.1,
  sourceTimestamp: new Date(nowMs).toISOString() };
function evaluate(overrides = {}, clock = nowMs) {
  return evaluateLowSog([{ ...vessel, ...overrides }], { nowMs: clock }).candidates.get(vessel.mmsi);
}
test('only fresh source observations support candidates; receipt cannot repair time', () => {
  for (const timestamp of [null, '', 'bad', new Date(nowMs + 1).toISOString(),
    new Date(nowMs - CANDIDATE_MAX_AGE_MS - 1).toISOString()]) {
    const info = evaluate({ sourceTimestamp: timestamp, receiptTimestamp: new Date(nowMs).toISOString() });
    assert.equal(info.candidateType, null);
    assert.ok(info.qualityReason);
  }
  assert.equal(evaluate({}, nowMs + CANDIDATE_MAX_AGE_MS).candidateType, 'low_sog');
  assert.equal(evaluate({}, nowMs + CANDIDATE_MAX_AGE_MS + 1).candidateType, null);
});
test('one observation never claims dwell; missing/sentinel speed and threshold stay excluded', () => {
  assert.equal(candidateLabel(evaluate()), 'Low SOG candidate · SOG 0.1 kn');
  for (const sog of [null, undefined, 511, 102.3, -1, NaN, '0']) {
    assert.equal(evaluate({ sog }).candidateType, null);
  }
  assert.equal(evaluate({ sog: 0.5 }), undefined);
  assert.equal(candidateLabel(evaluate({ navStatus: 1 })), 'Reported at anchor');
});
test('stale observations cannot form clusters even with fresh receipt clocks', () => {
  const vessels = Array.from({ length: 5 }, (_, i) => ({ ...vessel, mmsi: String(i),
    sourceTimestamp: new Date(nowMs - CANDIDATE_MAX_AGE_MS - 1).toISOString() }));
  assert.deepEqual(evaluateLowSog(vessels, { nowMs }).clusters, []);
});
test('duplicate MMSI reports do not inflate cluster count (MF-4)', () => {
  const dupes = Array.from({ length: 5 }, () => ({ ...vessel }));
  const { clusters } = evaluateLowSog(dupes, { nowMs });
  assert.deepEqual(clusters, [], 'five copies of one MMSI must not create a cluster');
});
