import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterEnergyCorridorFires,
  summarizeFires,
  summarizeQuakes,
  summarizeAisCandidates,
  summarizeHeadlines,
  aggregateDisruptionContext,
  resolveObservationStatus,
  ENERGY_CORRIDOR_BOXES,
} from './disruptionContext.js';

test('ENERGY_CORRIDOR_BOXES covers expected regions', () => {
  assert.ok(ENERGY_CORRIDOR_BOXES['gulf-hormuz']);
  assert.ok(ENERGY_CORRIDOR_BOXES['red-sea-bab']);
  assert.ok(ENERGY_CORRIDOR_BOXES['malacca']);
});

test('filterEnergyCorridorFires keeps only fires inside corridor boxes', () => {
  const fires = [
    { lat: 26, lon: 56, frp: 10 },
    { lat: 15, lon: 42, frp: 5 },
    { lat: 50, lon: 10, frp: 20 },
    { lat: 2, lon: 100, frp: 3 },
  ];
  const filtered = filterEnergyCorridorFires(fires);
  assert.equal(filtered.length, 3);
  assert.equal(filtered[0].lon, 56);
  assert.equal(filtered[1].lon, 42);
  assert.equal(filtered[2].lon, 100);
});

test('filterEnergyCorridorFires handles null/empty/invalid input', () => {
  assert.deepEqual(filterEnergyCorridorFires(null), []);
  assert.deepEqual(filterEnergyCorridorFires([]), []);
  assert.deepEqual(filterEnergyCorridorFires([{ lat: NaN, lon: 56 }]), []);
});

test('summarizeFires returns empty for no corridor fires', () => {
  const result = summarizeFires([{ lat: 50, lon: 10, frp: 5 }]);
  assert.equal(result.status, 'empty');
  assert.equal(result.count, 0);
});

test('summarizeFires labels as NRT detection, not fire', () => {
  const fires = [{ lat: 26, lon: 56, frp: 12.5, confidence: 'high' }];
  const result = summarizeFires(fires);
  assert.equal(result.count, 1);
  assert.equal(result.cards[0].type, 'fire');
  assert.ok(result.cards[0].label.startsWith('NRT detection'));
  assert.ok(result.cards[0].label.includes('FRP 12.5'));
  assert.ok(!result.cards[0].label.toLowerCase().includes('fire'));
  assert.equal(result.cards[0].source, 'NASA FIRMS');
});

test('summarizeFires caps at 5 cards', () => {
  const fires = Array.from({ length: 10 }, (_, i) => ({ lat: 26, lon: 56 + i * 0.01, frp: i }));
  assert.equal(summarizeFires(fires).cards.length, 5);
});

test('summarizeQuakes filters to 24h and sorts by magnitude', () => {
  const now = Date.now();
  const features = [
    { properties: { mag: 3.0, time: now - 1000, place: 'A' }, geometry: { coordinates: [10, 20] } },
    { properties: { mag: 5.5, time: now - 2000, place: 'B' }, geometry: { coordinates: [30, 40] } },
    { properties: { mag: 2.0, time: now - 25 * 3600 * 1000, place: 'Old' }, geometry: { coordinates: [0, 0] } },
  ];
  const result = summarizeQuakes(features);
  assert.equal(result.count, 2);
  assert.equal(result.cards[0].label, 'M5.5 — B');
  assert.equal(result.cards[0].source, 'USGS');
});

test('summarizeQuakes returns empty for no features', () => {
  assert.equal(summarizeQuakes([]).status, 'empty');
  assert.equal(summarizeQuakes(null).status, 'empty');
});

test('summarizeAisCandidates finds low-SOG candidates in chokepoints', () => {
  const nowMs = Date.now();
  const vessels = [
    { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: new Date(nowMs).toISOString() },
    { mmsi: '222', lat: 26.1, lon: 56.1, sog: 0.2, sourceTimestamp: new Date(nowMs).toISOString() },
  ];
  const result = summarizeAisCandidates(vessels, 'hormuz');
  assert.equal(result.candidates, 2);
  assert.ok(result.cards.length >= 2);
  assert.equal(result.cards[0].type, 'ais_candidate');
  assert.ok(result.cards[0].label.includes('Low SOG candidate'));
  assert.equal(result.cards[0].source, 'AIS');
});

test('summarizeAisCandidates returns empty for no vessels', () => {
  assert.equal(summarizeAisCandidates([], 'hormuz').status, 'empty');
  assert.equal(summarizeAisCandidates(null, null).status, 'empty');
});

test('summarizeHeadlines caps at 3 and truncates titles', () => {
  const articles = Array.from({ length: 5 }, (_, i) => ({
    title: `Headline ${i}`,
    domain: 'example.com',
    url: `https://example.com/${i}`,
  }));
  const result = summarizeHeadlines(articles);
  assert.equal(result.cards.length, 3);
  assert.equal(result.cards[0].type, 'headline');
});

test('summarizeHeadlines returns empty for null/empty', () => {
  assert.equal(summarizeHeadlines(null).status, 'empty');
  assert.equal(summarizeHeadlines([]).status, 'empty');
});

test('aggregateDisruptionContext marks source_unavailable for null inputs', () => {
  const result = aggregateDisruptionContext();
  assert.equal(result.fires.status, 'source_unavailable');
  assert.equal(result.quakes.status, 'source_unavailable');
  assert.equal(result.ais.status, 'source_unavailable');
  assert.equal(result.headlines.status, 'source_unavailable');
  assert.equal(result.status, 'source_unavailable');
  assert.equal(result.allCards.length, 0);
});

test('aggregateDisruptionContext reports partial when some sources present', () => {
  const now = new Date();
  const acqDate = now.toISOString().slice(0, 10);
  const acqTime = String(now.getUTCHours() * 100 + now.getUTCMinutes());
  const result = aggregateDisruptionContext({
    fires: [{ lat: 26, lon: 56, frp: 10, acqDate, acqTime }],
    quakeFeatures: null,
    aisVessels: null,
    headlines: null,
  });
  assert.equal(result.fires.status, 'nominal');
  assert.equal(result.quakes.status, 'source_unavailable');
  assert.equal(result.status, 'partial');
});

test('aggregateDisruptionContext reports nominal when all sources produce data', () => {
  const now = Date.now();
  const d = new Date(now);
  const acqDate = d.toISOString().slice(0, 10);
  const acqTime = String(d.getUTCHours() * 100 + d.getUTCMinutes());
  const result = aggregateDisruptionContext({
    fires: [{ lat: 26, lon: 56, frp: 10, acqDate, acqTime }],
    quakeFeatures: [
      { properties: { mag: 4.0, time: now - 1000, place: 'Test' }, geometry: { coordinates: [10, 20] } },
    ],
    aisVessels: [
      { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: new Date(now).toISOString() },
    ],
    chokepoint: 'hormuz',
    headlines: [{ title: 'Test headline', domain: 'test.com', publishedAt: new Date(now).toISOString() }],
  });
  assert.equal(result.status, 'nominal');
  assert.ok(result.allCards.length >= 4);
  assert.ok(result.aggregatedAt);
});

test('aggregateDisruptionContext reports empty when sources present but no data', () => {
  const result = aggregateDisruptionContext({
    fires: [],
    quakeFeatures: [],
    aisVessels: [],
    headlines: [],
  });
  assert.equal(result.status, 'empty');
});

test('summarizeFires returns observedAt from parser-shaped acqDate/acqTime', () => {
  const fires = [{ lat: 26, lon: 56, frp: 10, acqDate: '2026-09-14', acqTime: '800' }];
  const result = summarizeFires(fires);
  assert.equal(result.observedAt, '2026-09-14T08:00:00.000Z');
});

test('summarizeFires marks stale when observation > 24h old', () => {
  const old = new Date(Date.now() - 48 * 3600 * 1000);
  const acqDate = old.toISOString().slice(0, 10);
  const acqTime = String(old.getUTCHours() * 100 + old.getUTCMinutes());
  const fires = [{ lat: 26, lon: 56, frp: 10, acqDate, acqTime }];
  const result = summarizeFires(fires);
  assert.equal(result.status, 'stale');
  assert.ok(result.observedAt);
});

test('summarizeFires returns stale when no timestamps present (unknown observation)', () => {
  const fires = [{ lat: 26, lon: 56, frp: 10 }];
  const result = summarizeFires(fires);
  assert.equal(result.observedAt, null);
  assert.equal(result.status, 'stale');
});

test('summarizeQuakes returns observedAt from most recent quake', () => {
  const now = Date.now();
  const features = [
    { properties: { mag: 3.0, time: now - 2000, place: 'A' }, geometry: { coordinates: [10, 20] } },
    { properties: { mag: 5.0, time: now - 1000, place: 'B' }, geometry: { coordinates: [30, 40] } },
  ];
  const result = summarizeQuakes(features);
  assert.ok(result.observedAt);
  assert.ok(Math.abs(Date.parse(result.observedAt) - (now - 1000)) < 2);
});

test('summarizeHeadlines marks stale when publishedAt > 24h old', () => {
  const old = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const articles = [{ title: 'Old news', publishedAt: old }];
  const result = summarizeHeadlines(articles);
  assert.equal(result.status, 'stale');
  assert.ok(result.observedAt);
});

test('summarizeAisCandidates carries observedAt from sourceTimestamp', () => {
  const ts = new Date(Date.now() - 5000).toISOString();
  const vessels = [
    { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: ts },
  ];
  const result = summarizeAisCandidates(vessels, 'hormuz');
  assert.equal(result.observedAt, ts);
});

test('aggregateDisruptionContext reports stale when all sources stale', () => {
  const old = new Date(Date.now() - 48 * 3600 * 1000);
  const acqDate = old.toISOString().slice(0, 10);
  const acqTime = String(old.getUTCHours() * 100 + old.getUTCMinutes());
  const oldIso = old.toISOString();
  const result = aggregateDisruptionContext({
    fires: [{ lat: 26, lon: 56, frp: 10, acqDate, acqTime }],
    quakeFeatures: [],
    aisVessels: [],
    headlines: [{ title: 'Old', publishedAt: oldIso }],
  });
  assert.equal(result.fires.status, 'stale');
  assert.equal(result.headlines.status, 'stale');
  assert.equal(result.status, 'stale');
});

test('aggregateDisruptionContext each source carries observedAt', () => {
  const result = aggregateDisruptionContext();
  assert.equal(result.fires.observedAt, null);
  assert.equal(result.quakes.observedAt, null);
  assert.equal(result.ais.observedAt, null);
  assert.equal(result.headlines.observedAt, null);
});

test('resolveObservationStatus returns stale for null (unknown time)', () => {
  assert.equal(resolveObservationStatus(null), 'stale');
});

test('resolveObservationStatus accepts custom threshold', () => {
  const now = Date.now();
  assert.equal(resolveObservationStatus(now - 200_000, 300_000), 'nominal');
  assert.equal(resolveObservationStatus(now - 301_000, 300_000), 'stale');
});

test('summarizeAisCandidates fresh 300s vessel is nominal', () => {
  const now = Date.now();
  const ts = new Date(now - 200_000).toISOString();
  const vessels = [
    { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: ts },
  ];
  const result = summarizeAisCandidates(vessels, 'hormuz');
  assert.equal(result.status, 'nominal');
  assert.ok(result.candidates >= 1);
});

test('summarizeAisCandidates 301s-old vessel is stale not NONE', () => {
  const now = Date.now();
  const ts = new Date(now - 301_000).toISOString();
  const vessels = [
    { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: ts },
  ];
  const result = summarizeAisCandidates(vessels, 'hormuz');
  assert.equal(result.status, 'stale');
  assert.ok(result.observedAt);
});

test('summarizeAisCandidates unknown sourceTimestamp is stale', () => {
  const vessels = [
    { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: null },
  ];
  const result = summarizeAisCandidates(vessels, 'hormuz');
  assert.equal(result.status, 'stale');
});

test('summarizeAisCandidates future sourceTimestamp is stale', () => {
  const future = new Date(Date.now() + 120_000).toISOString();
  const vessels = [
    { mmsi: '111', lat: 26, lon: 56, sog: 0.1, sourceTimestamp: future },
  ];
  const result = summarizeAisCandidates(vessels, 'hormuz');
  assert.equal(result.status, 'stale');
});

test('summarizeFires uses parser-shaped camelCase fields from firmsCsv', () => {
  const now = new Date();
  const acqDate = now.toISOString().slice(0, 10);
  const acqTime = String(now.getUTCHours() * 100 + now.getUTCMinutes());
  const fires = [{ lat: 26, lon: 56, frp: 10, acqDate, acqTime }];
  const result = summarizeFires(fires);
  assert.equal(result.status, 'nominal');
  assert.ok(result.observedAt);
});
