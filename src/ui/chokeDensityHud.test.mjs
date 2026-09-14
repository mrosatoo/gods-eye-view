import { describe, it, expect } from 'vitest';
import {
  classifyChokepointDensity,
  formatChokepointRows,
  renderChokeDensityHud,
} from './chokeDensityHud.js';

describe('classifyChokepointDensity', () => {
  it('returns zero counts for empty input', () => {
    const result = classifyChokepointDensity([], null);
    expect(result.get('hormuz').total).toBe(0);
    expect(result.get('suez').total).toBe(0);
    expect(result.get('bab').total).toBe(0);
    expect(result.get('malacca').total).toBe(0);
  });

  it('counts vessels in Hormuz bounding box', () => {
    const records = [
      { id: '1', latitude: 26.5, longitude: 56.5 },
      { id: '2', latitude: 27.0, longitude: 57.0 },
      { id: '3', latitude: 10.0, longitude: 20.0 },
    ];
    const result = classifyChokepointDensity(records, null);
    expect(result.get('hormuz').total).toBe(2);
    expect(result.get('suez').total).toBe(0);
  });

  it('counts vessels in Suez bounding box', () => {
    const records = [
      { id: '1', latitude: 30.0, longitude: 32.5 },
    ];
    const result = classifyChokepointDensity(records, null);
    expect(result.get('suez').total).toBe(1);
  });

  it('counts vessels in Bab bounding box', () => {
    const records = [
      { id: '1', latitude: 12.5, longitude: 43.5 },
    ];
    const result = classifyChokepointDensity(records, null);
    expect(result.get('bab').total).toBe(1);
  });

  it('counts vessels in Malacca bounding box', () => {
    const records = [
      { id: '1', latitude: 2.5, longitude: 102.0 },
    ];
    const result = classifyChokepointDensity(records, null);
    expect(result.get('malacca').total).toBe(1);
  });

  it('counts low-SOG candidates using callback', () => {
    const records = [
      { id: '111', latitude: 26.5, longitude: 56.5 },
      { id: '222', latitude: 26.8, longitude: 56.8 },
    ];
    const getLowSog = (mmsi) => {
      if (mmsi === '111') return { candidateType: 'low_sog', sogKn: 0.2 };
      return null;
    };
    const result = classifyChokepointDensity(records, getLowSog);
    expect(result.get('hormuz').total).toBe(2);
    expect(result.get('hormuz').lowSog).toBe(1);
  });

  it('counts reported_anchor as low-SOG', () => {
    const records = [
      { id: '111', latitude: 30.5, longitude: 32.5 },
    ];
    const getLowSog = () => ({ candidateType: 'reported_anchor' });
    const result = classifyChokepointDensity(records, getLowSog);
    expect(result.get('suez').lowSog).toBe(1);
  });

  it('ignores invalid coordinates', () => {
    const records = [
      { id: '1', latitude: NaN, longitude: 56.5 },
      { id: '2', latitude: 26.5, longitude: undefined },
    ];
    const result = classifyChokepointDensity(records, null);
    expect(result.get('hormuz').total).toBe(0);
  });

  it('assigns vessel to first matching chokepoint only', () => {
    const records = [
      { id: '1', latitude: 26.5, longitude: 56.5 },
    ];
    const result = classifyChokepointDensity(records, null);
    const total = ['hormuz', 'suez', 'bab', 'malacca']
      .reduce((s, k) => s + result.get(k).total, 0);
    expect(total).toBe(1);
  });

  it('works with lat/lon fields (alternative naming)', () => {
    const records = [
      { mmsi: '1', lat: 26.5, lon: 56.5 },
    ];
    const result = classifyChokepointDensity(records, null);
    expect(result.get('hormuz').total).toBe(1);
  });
});

describe('formatChokepointRows', () => {
  it('returns four rows in order', () => {
    const counts = new Map([
      ['hormuz', { total: 10, lowSog: 2 }],
      ['suez', { total: 5, lowSog: 0 }],
      ['bab', { total: 3, lowSog: 1 }],
      ['malacca', { total: 8, lowSog: 0 }],
    ]);
    const rows = formatChokepointRows(counts);
    expect(rows).toHaveLength(4);
    expect(rows[0].key).toBe('hormuz');
    expect(rows[0].name).toBe('HORMUZ');
    expect(rows[0].total).toBe(10);
    expect(rows[0].lowSog).toBe(2);
    expect(rows[1].key).toBe('suez');
    expect(rows[2].key).toBe('bab');
    expect(rows[3].key).toBe('malacca');
  });

  it('returns zero defaults for missing keys', () => {
    const rows = formatChokepointRows(new Map());
    expect(rows).toHaveLength(4);
    expect(rows[0].total).toBe(0);
    expect(rows[0].lowSog).toBe(0);
  });
});

describe('renderChokeDensityHud', () => {
  function makeHost() {
    return { hidden: true, innerHTML: '' };
  }

  it('hides host when not enabled', () => {
    const host = makeHost();
    renderChokeDensityHud(host, [], { enabled: false });
    expect(host.hidden).toBe(true);
    expect(host.innerHTML).toBe('');
  });

  it('shows host when enabled', () => {
    const rows = formatChokepointRows(new Map([
      ['hormuz', { total: 5, lowSog: 1 }],
      ['suez', { total: 3, lowSog: 0 }],
      ['bab', { total: 0, lowSog: 0 }],
      ['malacca', { total: 2, lowSog: 0 }],
    ]));
    const host = makeHost();
    renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: true });
    expect(host.hidden).toBe(false);
    expect(host.innerHTML).toContain('HORMUZ');
    expect(host.innerHTML).toContain('SUEZ');
    expect(host.innerHTML).toContain('BAB');
    expect(host.innerHTML).toContain('MALACCA');
    expect(host.innerHTML).toContain('10 vessels');
    expect(host.innerHTML).toContain('1 low-SOG');
    expect(host.innerHTML).toContain('1 candidate');
  });

  it('shows degraded label when feed is unhealthy', () => {
    const rows = formatChokepointRows(new Map());
    const host = makeHost();
    renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: false });
    expect(host.innerHTML).toContain('FEED DEGRADED');
  });

  it('does not show degraded label when feed is healthy', () => {
    const rows = formatChokepointRows(new Map());
    const host = makeHost();
    renderChokeDensityHud(host, rows, { enabled: true, feedHealthy: true });
    expect(host.innerHTML).not.toContain('FEED DEGRADED');
  });

  it('handles null host gracefully', () => {
    expect(() => renderChokeDensityHud(null, [], {})).not.toThrow();
  });
});
