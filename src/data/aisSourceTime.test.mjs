import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingestAisStreamEnvelope, aisStreamRows, readAisTrack } from '../../server/providers/vessels/ais-store.js';

test('AIS store preserves unknown observation clocks instead of laundering receipt time', () => {
  for (const [i, time] of [undefined, 'bad', '2026-09-13 16:00:00 +0000 UTC'].entries()) {
    const mmsi = String(987654320 + i);
    assert.equal(ingestAisStreamEnvelope({ MessageType: 'PositionReport',
      MetaData: { MMSI: mmsi, time_utc: time, latitude: 26, longitude: 56 },
      Message: { PositionReport: { UserID: Number(mmsi), Latitude: 26, Longitude: 56, Sog: 0.1 } } }), true);
    const row = aisStreamRows(50000).find(row => row.mmsi === mmsi);
    assert.equal(row.last_position_UTC, i < 2 ? null : '2026-09-13T16:00:00.000Z');
    if (i < 2) {
      assert.equal(row.last_position_epoch, null);
      assert.equal(readAisTrack(mmsi).length, 0);
    }
  }
});
