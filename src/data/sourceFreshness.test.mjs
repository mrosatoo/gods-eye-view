import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceFreshness, AIS_POSITION_SLA_MS, AIR_POSITION_SLA_MS, AIS_POSITION_EVICT_MS } from './sourceFreshness.js';
const now = 1_800_000_000_000;
test('freshness expires on observation age without another response', () => {
  for (const sla of [AIS_POSITION_SLA_MS, AIR_POSITION_SLA_MS]) {
    assert.equal(sourceFreshness(now - sla, sla, now).stale, false);
    assert.equal(sourceFreshness(now - sla, sla, now + 1).stale, true);
    assert.match(sourceFreshness(now - 3_600_000, sla, now).label, /3600s · STALE/);
  }
});
test('unknown, invalid and future observation clocks fail closed', () => {
  for (const epoch of [null, undefined, NaN, 0, -1, now + 31_000]) {
    assert.deepEqual(sourceFreshness(epoch, AIR_POSITION_SLA_MS, now), { ageMs: null, stale: true, label: 'AGE UNKNOWN · STALE' });
  }
});
test('AIS eviction threshold is 3× the SLA', () => {
  assert.equal(AIS_POSITION_EVICT_MS, 3 * AIS_POSITION_SLA_MS);
});
