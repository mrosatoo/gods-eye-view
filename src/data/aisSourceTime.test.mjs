import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingestAisStreamEnvelope, aisStreamRows, readAisTrack, AISSTREAM_STALE_MS } from '../../server/providers/vessels/ais-store.js';

function report(mmsi, time, lat = 26, type = 'PositionReport') {
  return { MessageType: type,
    MetaData: { MMSI: mmsi, time_utc: time, latitude: lat, longitude: 56 },
    Message: { [type]: { UserID: Number(mmsi), Latitude: lat, Longitude: 56, Sog: 0.1, Name: 'SHIP' } } };
}

test('live AIS rejects unknown, multi-day, over-SLA and invalid future observation clocks', () => {
  const now = Date.now();
  for (const [i, time] of [undefined, 'bad', new Date(now - 3 * 86400000).toISOString(),
    new Date(now - AISSTREAM_STALE_MS - 1000).toISOString(), new Date(now + 60000).toISOString()].entries()) {
    const mmsi = String(987654320 + i);
    assert.equal(ingestAisStreamEnvelope(report(mmsi, time)), true);
    assert.equal(aisStreamRows(50000).find(row => row.mmsi === mmsi), undefined);
    assert.equal(readAisTrack(mmsi).length, 0);
  }
});

test('live AIS uses source time, ignores replay/static fixes and expires without new traffic', () => {
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  try {
    const mmsi = '987654330';
    const time = new Date(now - 1000).toISOString();
    ingestAisStreamEnvelope(report(mmsi, time));
    ingestAisStreamEnvelope(report(mmsi, new Date(now - 2000).toISOString(), 27));
    ingestAisStreamEnvelope(report(mmsi, new Date(now).toISOString(), 28, 'ShipStaticData'));
    const row = aisStreamRows(50000).find(row => row.mmsi === mmsi);
    assert.equal(row.lat, 26);
    assert.equal(row.last_position_UTC, time);
    now += AISSTREAM_STALE_MS;
    assert.equal(aisStreamRows(50000).find(row => row.mmsi === mmsi), undefined);
  } finally { Date.now = originalNow; }
});
