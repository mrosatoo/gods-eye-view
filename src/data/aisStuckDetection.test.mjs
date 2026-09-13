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
test('newer fast report supersedes older slow report for same MMSI (MF-4 §9)', () => {
  const oldSlow = { mmsi: '111', lat: 26, lon: 56, sog: 0.1,
    sourceTimestamp: new Date(nowMs - 60000).toISOString() };
  const newFast = { mmsi: '111', lat: 26, lon: 56, sog: 5.0,
    sourceTimestamp: new Date(nowMs - 1000).toISOString() };
  const r1 = evaluateLowSog([oldSlow, newFast], { nowMs });
  assert.equal(r1.candidates.has('111'), false, 'newer fast report removes slow candidate');
  const r2 = evaluateLowSog([newFast, oldSlow], { nowMs });
  assert.equal(r2.candidates.has('111'), false, 'reversed order: same result');
});
test('older slow + newer fast reports for five MMSIs yield no cluster (MF-4 §9)', () => {
  const mixed = [];
  for (let i = 0; i < 5; i++) {
    mixed.push({ mmsi: String(100 + i), lat: 26.5, lon: 56.5, sog: 0.1,
      sourceTimestamp: new Date(nowMs - 60000).toISOString() });
    mixed.push({ mmsi: String(100 + i), lat: 26.5, lon: 56.5, sog: 5.0,
      sourceTimestamp: new Date(nowMs - 1000).toISOString() });
  }
  const { candidates, clusters } = evaluateLowSog(mixed, { nowMs });
  for (let i = 0; i < 5; i++) {
    assert.equal(candidates.has(String(100 + i)), false, `vessel ${100 + i} not a candidate`);
  }
  assert.deepEqual(clusters, [], 'no cluster from vessels that are now fast');
});
test('older fast + newer slow keeps slow candidate (legitimate slow-down)', () => {
  const oldFast = { mmsi: '222', lat: 26, lon: 56, sog: 5.0,
    sourceTimestamp: new Date(nowMs - 60000).toISOString() };
  const newSlow = { mmsi: '222', lat: 26, lon: 56, sog: 0.1,
    sourceTimestamp: new Date(nowMs - 1000).toISOString() };
  const r = evaluateLowSog([oldFast, newSlow], { nowMs });
  assert.equal(r.candidates.get('222')?.candidateType, 'low_sog');
});
