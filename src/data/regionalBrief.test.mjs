import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRegionalArticles,
  normalizeRegionalPlace,
  normalizeRegionalWeather,
  regionalDistanceM,
  weatherCodeLabel,
} from './regionalBrief.js';

test('normalizes a regional place with stable locality fallback', () => {
  assert.deepEqual(normalizeRegionalPlace({ address: {
    town: 'Davis', state: 'California', country: 'United States', country_code: 'us',
  } }), {
    label: 'Davis, California', locality: 'Davis', region: 'California',
    country: 'United States', countryCode: 'US',
  });
  assert.equal(normalizeRegionalPlace({ address: {} }), null);
});

test('normalizes, deduplicates, and rejects unsafe regional-news rows', () => {
  const articles = normalizeRegionalArticles({ articles: [
    { title: 'Regional update', url: 'https://news.example/one', domain: 'news.example', seendate: '20260722T081500Z' },
    { title: 'Regional   update', url: 'https://news.example/two' },
    { title: 'Unsafe', url: 'javascript:alert(1)' },
    { title: 'Second story', url: 'https://other.example/story', seendate: '2026-07-22T07:00:00Z' },
  ] });
  assert.equal(articles.length, 2);
  assert.equal(articles[0].publishedAt, null);
  assert.equal(articles[0].eventAt, null);
  assert.equal(articles[0].discoveredAt, '2026-07-22T08:15:00.000Z');
  assert.equal(articles[1].domain, 'other.example');
});

test('normalizes weather values and labels WMO conditions', () => {
  const weather = normalizeRegionalWeather({ current: {
    time: '2026-07-22T08:15:00Z', temperature_2m: 21.4, apparent_temperature: 20.8,
    precipitation: 0, cloud_cover: 42, wind_speed_10m: 18.2, wind_direction_10m: 270,
    visibility: 18000, weather_code: 2,
  } });
  assert.equal(weather.temperatureC, 21.4);
  assert.equal(weather.visibilityM, 18000);
  assert.equal(weatherCodeLabel(weather.weatherCode), 'PARTLY CLOUDY');
  assert.equal(normalizeRegionalWeather({ current: {} }), null);
});

test('zone-naive Open-Meteo timestamps are pinned to UTC, zoned ones pass through', () => {
  // Open-Meteo's default payload carries no zone designator; JS would parse it
  // as host-local time, skewing observedAt by the UTC offset.
  const naive = normalizeRegionalWeather({ current: { time: '2026-08-17T00:15', temperature_2m: 20 } });
  assert.equal(naive.observedAt, '2026-08-17T00:15:00.000Z');
  const zoned = normalizeRegionalWeather({ current: { time: '2026-08-17T00:15:00+02:00', temperature_2m: 20 } });
  assert.equal(zoned.observedAt, '2026-08-16T22:15:00.000Z');
  const invalid = normalizeRegionalWeather({ current: { time: 'not-a-time', temperature_2m: 20 } });
  assert.equal(invalid.observedAt, null);
});

test('regional distance handles nearby movement and missing positions', () => {
  const distance = regionalDistanceM(
    { latitude: 38.5, longitude: -121.7 },
    { latitude: 38.6, longitude: -121.7 },
  );
  assert.ok(distance > 11000 && distance < 11200);
  assert.equal(regionalDistanceM(null, null), Infinity);
});

test('rediscovery and syndicated headlines never become fresh events or corroboration', () => {
  const rows = [
    { title: 'Unconfirmed report', url: 'https://original.example/a', seendate: '20200101T000000Z' },
    { title: 'Unconfirmed report', url: 'https://copy.example/a', seendate: '20260913T120000Z' },
  ];
  const articles = normalizeRegionalArticles({ articles: rows });
  assert.equal(articles.length, 2);
  assert.equal(articles[0].headlineFamily, articles[1].headlineFamily);
  assert.deepEqual(articles.map(a => a.url), rows.map(a => a.url));
  for (const article of articles) {
    assert.equal(article.publishedAt, null);
    assert.equal(article.eventAt, null);
    assert.equal(article.verificationStatus, 'unverified');
    assert.equal(article.correctionStatus, 'unknown');
  }
});

test('missing, invalid and zone-naive index clocks remain unknown', () => {
  for (const seendate of [null, 'bad', '20260230T120000Z', '20261301T120000Z', '2026-09-13T12:00:00']) {
    const [article] = normalizeRegionalArticles({ articles: [
      { title: 'Report', url: 'https://example.com/a', seendate },
    ] });
    assert.equal(article.discoveredAt, null);
    assert.equal(article.publishedAt, null);
  }
});
