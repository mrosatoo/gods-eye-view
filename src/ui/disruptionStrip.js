/**
 * Disruption Context strip — single card group in the right context rail.
 *
 * Renders FIRMS energy-corridor fires, USGS quakes, AIS low-SOG candidates,
 * and headline signal into one unified strip. No Conf/Edge wiring.
 * Honest source_unavailable for every missing feed.
 */

import { aggregateDisruptionContext } from '../data/disruptionContext.js';

const REFRESH_INTERVAL_MS = 90_000;
const FETCH_TIMEOUT_MS = 15_000;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function cardIcon(type) {
  switch (type) {
    case 'fire': return 'local_fire_department';
    case 'quake': return 'earthquake';
    case 'ais_candidate': return 'directions_boat';
    case 'ais_cluster': return 'hub';
    case 'headline': return 'newspaper';
    default: return 'info';
  }
}

function sourceLabel(type) {
  switch (type) {
    case 'fire': return 'FIRMS';
    case 'quake': return 'USGS';
    case 'ais_candidate':
    case 'ais_cluster': return 'AIS';
    case 'headline': return 'RSS';
    default: return '';
  }
}

function statusCssClass(status) {
  switch (status) {
    case 'nominal': return 'disruption-status-nominal';
    case 'partial': return 'disruption-status-partial';
    case 'stale': return 'disruption-status-stale';
    case 'source_unavailable': return 'disruption-status-unavailable';
    case 'empty': return 'disruption-status-empty';
    default: return '';
  }
}

function statusText(status) {
  switch (status) {
    case 'nominal': return 'NOMINAL';
    case 'partial': return 'PARTIAL';
    case 'stale': return 'STALE';
    case 'source_unavailable': return 'SOURCES UNAVAILABLE';
    case 'empty': return 'NO SIGNALS';
    default: return 'UNKNOWN';
  }
}

function formatObservedAt(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  const now = Date.now();
  const ageMs = now - d.getTime();
  if (ageMs < 0) return 'future date';
  if (ageMs < 60_000) return 'just now';
  if (ageMs < 3600_000) return `${Math.floor(ageMs / 60_000)}m ago`;
  if (ageMs < 86400_000) return `${Math.floor(ageMs / 3600_000)}h ago`;
  return d.toISOString().slice(0, 10);
}

function renderSectionHeader(title, summary) {
  const row = el('div', 'disruption-section-header');
  row.appendChild(el('span', 'disruption-section-title', title));
  const badge = el('span', `disruption-section-badge ${statusCssClass(summary.status)}`);
  if (summary.status === 'source_unavailable') {
    badge.textContent = 'UNAVAILABLE';
  } else if (summary.status === 'stale') {
    badge.textContent = 'STALE';
  } else if (summary.status === 'empty') {
    badge.textContent = 'NONE';
  } else {
    const count = summary.count ?? summary.candidates ?? 0;
    badge.textContent = String(count);
  }
  row.appendChild(badge);
  const age = formatObservedAt(summary.observedAt);
  if (age) {
    row.appendChild(el('span', 'disruption-section-observed', age));
  }
  return row;
}

function renderCard(card) {
  const row = el('div', 'disruption-card');
  const icon = el('span', 'disruption-card-icon material-symbols-outlined');
  icon.textContent = cardIcon(card.type);
  icon.setAttribute('aria-hidden', 'true');
  row.appendChild(icon);
  const body = el('div', 'disruption-card-body');
  body.appendChild(el('span', 'disruption-card-label', card.label));
  body.appendChild(el('span', 'disruption-card-source', card.source || sourceLabel(card.type)));
  row.appendChild(body);
  return row;
}

function renderUnavailable(label) {
  const row = el('div', 'disruption-card disruption-card-unavailable');
  row.appendChild(el('span', 'disruption-card-label', `${label} — source unavailable`));
  return row;
}

export function renderDisruptionStrip(context) {
  const container = el('div', 'disruption-strip');

  const header = el('div', 'disruption-strip-header');
  header.appendChild(el('strong', 'disruption-strip-title', 'DISRUPTION'));
  const statusEl = el('span', `disruption-strip-status ${statusCssClass(context.status)}`);
  statusEl.textContent = statusText(context.status);
  header.appendChild(statusEl);
  container.appendChild(header);

  const aisScope = context.ais?.chokepoint
    ? `AIS CANDIDATES · ${String(context.ais.chokepoint).toUpperCase()}`
    : 'AIS CANDIDATES · GLOBAL';
  const sections = [
    { key: 'fires', title: 'NRT DETECTIONS', label: 'FIRMS NRT detections' },
    { key: 'quakes', title: 'EARTHQUAKES 24H', label: 'USGS earthquakes' },
    { key: 'ais', title: aisScope, label: 'AIS low-SOG candidates' },
    { key: 'headlines', title: 'HEADLINES', label: 'Headline signal' },
  ];

  for (const section of sections) {
    const summary = context[section.key];
    container.appendChild(renderSectionHeader(section.title, summary));

    if (summary.status === 'source_unavailable') {
      container.appendChild(renderUnavailable(section.label));
    } else if (summary.cards && summary.cards.length > 0) {
      for (const card of summary.cards) {
        container.appendChild(renderCard(card));
      }
    } else {
      const empty = el('div', 'disruption-card disruption-card-empty');
      empty.appendChild(el('span', 'disruption-card-label', `No ${section.title.toLowerCase()} in window`));
      container.appendChild(empty);
    }
  }

  const footer = el('div', 'disruption-strip-footer');
  footer.textContent = context.aggregatedAt
    ? `Aggregated ${new Date(context.aggregatedAt).toLocaleTimeString()} · Lagebild only`
    : 'Lagebild only · never feeds Conf';
  container.appendChild(footer);

  return container;
}

export class DisruptionStripController {
  constructor({ hostElement, dataManager = null, chokepoint = null } = {}) {
    this._host = hostElement;
    this._dataManager = dataManager;
    this._chokepoint = chokepoint;
    this._timer = null;
    this._enabled = false;
    this._lastContext = null;
  }

  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this._refresh();
    this._timer = setInterval(() => this._refresh(), REFRESH_INTERVAL_MS);
  }

  disable() {
    this._enabled = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._host) this._host.innerHTML = '';
  }

  destroy() {
    this.disable();
    this._host = null;
    this._dataManager = null;
  }

  async _refresh() {
    if (!this._enabled || !this._host) return;

    const [fires, quakes, headlines] = await Promise.allSettled([
      this._fetchFires(),
      this._fetchQuakes(),
      this._fetchHeadlines(),
    ]);

    const aisData = this._getAisData();

    const context = aggregateDisruptionContext({
      fires: fires.status === 'fulfilled' ? fires.value : null,
      quakeFeatures: quakes.status === 'fulfilled' ? quakes.value : null,
      aisVessels: aisData?.vessels ?? null,
      chokepoint: aisData?.chokepoint ?? null,
      headlines: headlines.status === 'fulfilled' ? headlines.value : null,
    });

    this._lastContext = context;
    this._host.innerHTML = '';
    this._host.appendChild(renderDisruptionStrip(context));
  }

  async _fetchFires() {
    const res = await fetch('/api/firms', { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.fires ?? null;
  }

  async _fetchQuakes() {
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.features ?? null;
  }

  async _fetchHeadlines() {
    const res = await fetch('/api/regional-brief?lat=26&lon=56', {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.articles ?? null;
  }

  _getAisData() {
    if (!this._dataManager) return null;
    const entry = this._dataManager.layers?.get?.('ais-live-vessels');
    if (!entry) return null;
    const aisModule = entry.module;
    const enabled = this._dataManager.isEnabled('ais-live-vessels');
    if (!enabled) return null;
    if (typeof aisModule?.getAnalystRecords !== 'function') return null;
    const stats = typeof aisModule.getStats === 'function' ? aisModule.getStats() : {};
    if (stats.count === 0 && (stats.stale || stats.error || stats.status === 'unavailable')) {
      return null;
    }
    try {
      const records = aisModule.getAnalystRecords(5000);
      const vessels = records.map((r) => ({
        mmsi: r.mmsi,
        lat: r.lat,
        lon: r.lon,
        sog: r.speedKts ?? null,
        navStatus: r.navStatus ?? null,
        sourceTimestamp: r.sourceTimestamp ?? null,
        receiptTimestamp: null,
      }));
      return { vessels, chokepoint: this._chokepoint ?? null };
    } catch {
      return null;
    }
  }

  getStats() {
    return {
      enabled: this._enabled,
      lastContext: this._lastContext,
    };
  }
}
