# Triple Brain — Joint Build Spec (God Eye)

**Stand:** 2026-09-13 · **Rev 3** (implementation complete against Astra contracts)  
**Autor:** Claude (Draft) · nach Lenkung Grok · Red-Team Astra  
**Branch:** `cursor/god-eye-owned-basis`  
**Repo:** `mrosatoo/gods-eye-view` (Owned Fork)  
**Arch:** A (locked) — Desk `/god-eye` iframe → GEV `:4173`  
**Red-Team:** [Astra](TRIPLE-BRAIN-JOINT-REDTEAM.md) — findings RT-01–RT-13, MF-1–MF-13 addressed below

---

## 0. Binding CEO Decisions (Lenkung)

These are not suggestions. They override both theses where they conflict.

| # | Decision | Source |
|---|----------|--------|
| 1 | Arch A locked. Desk → GEV `:4173`. Osiris = CSS look-ref only. | Lenkung §Übernehmen |
| 2 | Isolation locked. Never Hatch/Bias/Conf/Edge/Sit/FA. Voice WONTFIX. RECON NEVER. No junk cams default. | Lenkung §Übernehmen |
| 3 | P0 Shipping/Chokepoints + honest AIS. P1 Sats. P2 FIRMS/USGS + claims. P3 Photoreal on demand. | Lenkung §Übernehmen |
| 4 | Truck density + live water: no fantasy layers. Explicit unavailable / baseline-only when source exists. | Lenkung §Übernehmen |
| 5 | Desk LIVE-Badge = Reachability, not world-truth. | Lenkung §Übernehmen |
| 6 | PortWatch: "daily activity / PortWatch dated", never "live queue minutes". Astra labeling wins. | Lenkung §Schnitt |
| 7 | Stuck ships: Claude builds heuristic. Labels = "low SOG / dwell candidate", never "canal blocked". Amber = candidate. | Lenkung §Schnitt |
| 8 | First ship = UX + Heuristic + PortWatch-dated + HUD + DoD. Bounded history = Phase B after Approve #2. | Lenkung §Schnitt |
| 9 | Two region types: maritime (ships) vs land (Cobalt = FIRMS/USGS/gaps, no ship lie). | Lenkung §Schnitt |

**FULL GO (2026-09-13):** Osato authorized finishing God Eye without further permission asks. Claude + Astra + Grok may independently research and propose/integrate public-safe APIs that raise God Eye to hedge-fund grade. Rules: legal/ToS-ok, keyless or existing env key names only, no secrets in git, no RECON/Voice/Hatch/Conf, no fake precision. See Appendix A Research Intake and Appendix B (new) for expanded research.

---

## 1. Opening Click-Path — Definition of Done (< 60 s)

Osato clicks **God Eye View** in the Desk sidebar. Within 60 seconds:

| Second | What happens | Evidence |
|--------|-------------|---------|
| 0–2 | Iframe loads `http://localhost:4173/?welcome=0&v=2&l=a` | `GodEyeClient.tsx` + `god-eye.ts` `GEV_DEFAULT_URL` |
| 2–5 | Esri satellite globe renders (keyless default basemap) | `mapStartup.js` → Esri World Imagery |
| 5–8 | AIS layer auto-on via URL param `l=a` | `layerState.js` v2 codec + `firstRunExperience.js` |
| 8–15 | AIS WebSocket connected, first vessel positions stream | `aisStreamAdapter.js` → `AISSTREAM_API_KEY` → WS |
| 15–20 | FIRMS + Earthquakes toggleable | `localLayers.js` → `firmsHeatmap.js` + `earthquakes.js` |
| 20–30 | Location pill **Hormuz** → fly-to `26.57°N 56.25°E` alt 180 km | `locations.js` `CITY_POIS.hormuz` |
| 30–45 | AIS ships in Strait visible — density readable | `aisLiveVessels.js` render loop |
| 45–55 | Satellites toggle-on → CelesTrak selected TLE catalog + ISS | `satellites.js` + `/api/celestrak` proxy |
| 55–60 | Photoreal on demand: map tray → Ion → zoom | `mapStackController.js` → `CESIUM_ION_TOKEN` |

**Header chip always shows:** *Lagebild only · never feeds Conf*  
**Not required in 60 s:** PortWatch, GDELT brief, Scene Director, CCTV

### Fail States

| Failure | Cause | Recovery |
|---------|-------|----------|
| Empty frame | GEV `:4173` not started / wrong Node version | `nvm use 24.14.0 && npm run dev` |
| AIS silent | `AISSTREAM_API_KEY` missing or WS timeout | Check key; 30 s grace via `AIS_FIRST_CONNECT_GRACE_MS` |
| CelesTrak TLS-EOF | Upstream TLS instability | Proxy has HTTP fallback + disk cache |
| Framing blocked | `GEV_FRAME_ANCESTORS` missing `:3000` | `.env` → `GEV_FRAME_ANCESTORS=http://localhost:3000` |
| AIS live, region empty | Global truncation / no Hormuz reports | **Must show "No observations received in this region" — not "Hormuz clear"** |

---

## 2. Layer Contract: IN / OUT

### IN — Ranked by Thesis Value

#### P0 — Shipping / Chokepoints

| Layer | Status | Source | Build Action |
|-------|--------|--------|-------------|
| AIS Live Vessels | **LIVE** | AISStream WS | Existing — no change |
| Chokepoint Presets | **LIVE** | `locations.js` 6 presets | Existing — no change |
| PortWatch Overlay | **GAP → BUILD** | IMF PortWatch (keyless, daily) | New proxy + layer (§4) |
| Low-SOG Detection | **GAP → BUILD** | Client heuristic on AIS | New module (§5) |

#### P1 — Satellites

| Layer | Status | Source | Build Action |
|-------|--------|--------|-------------|
| CelesTrak Satellites | **LIVE** | CelesTrak TLE (keyless) | Existing — no change |

#### P2 — Disruption Events

| Layer | Status | Source | Build Action |
|-------|--------|--------|-------------|
| FIRMS Active Fires | **LIVE** | NASA FIRMS `/api/firms` | Existing — no change |
| USGS Earthquakes | **LIVE** | USGS `all_day.geojson` M2.5+ | Existing — no change |
| GDACS Multi-Hazard | **GAP → BUILD** | UN JRC GDACS (keyless GeoJSON) | New proxy + alert layer (§4b) |
| EMSC Euro-Med Quakes | **GAP → BUILD** | EMSC SeismicPortal FDSN (keyless GeoJSON) | New supplement layer (§4c) |
| NWS Weather Alerts | **GAP → BUILD** | NWS api.weather.gov (keyless GeoJSON) | New alert layer (§4d) |
| Open-Meteo Marine | **GAP → BUILD** | Open-Meteo marine API (keyless) | New marine forecast panel (§4e) |
| GDELT Brief | **PARTIAL** | GDELT DOC 2.0 (keyless) | Existing brief; claims labeling improvement (§8) |

#### P3 — Photoreal on Demand

| Layer | Status | Source | Build Action |
|-------|--------|--------|-------------|
| Cesium Ion | **LIVE** | `CESIUM_ION_TOKEN` | Existing — no change |
| Esri World Imagery | **LIVE** | Esri (keyless) | Existing — default basemap |

### OUT — Explicit

| What | Why | Lock |
|------|-----|------|
| Bias / Conf / Edge / Sit / FA | Isolation: GEV never feeds decision path | **LOCK** |
| RECON / Scanner / OSINT-Scrape | Offensive tools forbidden | **LOCK** |
| Voice / Mic / AI-HUD-Summary | WONTFIX per Osato gate | **LOCK** |
| iframe `osirisai.live` | Never embed foreign Vercel | **LOCK** |
| Osiris runtime as default embed | Look-ref only | **LOCK** |
| Junk public webcams as default | Not thesis-relevant | **LOCK** |
| Hatch engine code | Do not modify | **LOCK** |
| Secrets in commits | Env names only, never values | **LOCK** |
| GEV → Desk signal bus | No lane-vote / size-hint / conf-write | **LOCK** |
| Truck density gauge | No validated source (§7) | **UNAVAILABLE** |
| Live water stress | No live source; baseline-only if WRI admitted (§7) | **UNAVAILABLE** |
| CCTV packs | Geographic mismatch for chokepoints | OFF default |
| Street traffic (TomTom) | City congestion ≠ oil/metal route | OFF default |
| Radio | Entertainment | OFF default |
| Bikeshare / Space Missions / etc. | Irrelevant to thesis | OFF default |

---

## 3. File List — Existing + New

### Existing Modules (no changes needed for first-ship)

| Module | Path | Function |
|--------|------|----------|
| AIS Adapter | `src/data/aisStreamAdapter.js` | WebSocket to AISStream |
| AIS Renderer | `src/data/aisLiveVessels.js` | Vessel sprites, labels, trails |
| AIS Watchdog | `src/data/aisWatchdog.js` | Connection health, reconnect |
| Vessel Labels | `src/data/vesselLabels.js` | Card rendering, type accent |
| FIRMS Heatmap | `src/data/firmsHeatmap.js` | NASA FIRMS heatmap + cards |
| Earthquakes | `src/data/earthquakes.js` | USGS 24h GeoJSON M2.5+ |
| Satellites | `src/data/satellites.js` | CelesTrak selected TLE catalog |
| Layer State | `src/data/layerState.js` | v2 registry, URL codec |
| Layer Manager | `src/data/manager.js` | Enable/disable orchestration |
| Local Layers | `src/data/localLayers.js` | FIRMS + infrastructure bundle |
| Locations | `src/locations.js` | CITY_POIS incl. chokepoints |
| Map Stack | `src/mapStackController.js` | Esri/Ion/Google switching |
| Map Startup | `src/mapStartup.js` | Cesium viewer bootstrap |
| First-Run | `src/firstRunExperience.js` | Shipping preset, AIS default-on |
| Vite Proxy | `vite.config.js` | `/api/ais-live`, `/api/firms`, `/api/celestrak` |

### New Modules (first-ship build)

| # | Module | Path | Function | Priority |
|---|--------|------|----------|----------|
| N1 | **PortWatch Proxy** | `vite.config.js` (new middleware block) | Read-only proxy to IMF PortWatch, in-memory cache (1h TTL) | P0 |
| N2 | **PortWatch Layer** | `src/data/portWatchOverlay.js` | Dated activity overlay per chokepoint. **Labels per Astra: "daily activity / PortWatch dated"** | P0 |
| N3 | **Low-SOG Heuristic** | `src/data/aisStuckDetection.js` | Client-side SOG heuristic. **Labels per Lenkung: "low SOG / dwell candidate", amber = candidate** | P0 |
| N4 | **Thesis Defaults** | `src/thesisDefaults.js` | Central config: AIS default-on, CCTV/Traffic/Radio default-off, chokepoint presets | P0 |

### New Modules — Research Intake Conditional (post-admission)

| # | Module | Path | Purpose | Priority | Admission Gate |
|---|--------|------|---------|----------|----------------|
| N5 | **GDACS Multi-Hazard** | `src/data/gdacsAlerts.js` + proxy | UN multi-hazard alerts: EQ, TC, FL, VO, WF, DR (§4b) | P2 | Keyless — admitted |
| N6 | **EMSC Euro-Med Quakes** | `src/data/emscQuakes.js` + proxy | FDSN quake supplement — faster Euro-Med detection (§4c) | P2 | Keyless — admitted |
| N7 | **NWS Alerts Layer** | `src/data/nwsAlerts.js` + proxy | US weather alerts for Gulf/port energy exposure (§4d) | P2 | Keyless — admitted |
| N8 | **Open-Meteo Marine** | `src/data/marineWeather.js` + proxy | Route sea state forecasts per chokepoint (§4e) | P2 | Keyless — admitted |
| N9 | **WRI Aqueduct Baseline** | `src/data/waterBaseline.js` | Static Cobalt water-risk context (CC BY 4.0) | P2 | Keyless download — admitted |
| N10 | **GVP Volcanoes** | `src/data/volcanicAlerts.js` | Smithsonian/USGS volcanic activity RSS (weekly) | P2 | Keyless RSS — admitted |
| N11 | **Copernicus Freshness** | `src/data/copernicusFreshness.js` + proxy | Imagery acquisition age metadata (catalogue only) | P1 | RI-07 endpoint validation |
| N12 | **Earthquake Enhancement** | `src/data/earthquakes.js` (modify) | Add source-time vs. updated-time in cards (RT-01) | P2 | Already keyless |

### CSS Changes (Cyan/Gold HUD)

| File | Change |
|------|--------|
| `style.css` (root) | Tokens `--gev-osiris-*` already committed (b8ea4c1) |
| `src/ui/styles/foundation.css` | `--accent` upgrade; `--gev-gold` token |
| `src/ui/styles/layers.css` | AIS label accent → cyan; FIRMS → gold |
| `src/ui/styles/controls.css` | Active chip border cyan |
| `src/ui/styles/command-dock.css` | Dock border cyan glow |
| `src/ui/styles/location.css` | Chokepoint pill gold highlight |

---

## 4. PortWatch — API Contract and UI Copy

### 4.1 Source Contract

**Source:** IMF PortWatch — public portal, daily vessel activity and model-based trade proxies.  
**Measurement type:** Dated activity series (daily or coarser), **not** live queue or instantaneous congestion.  
**Access:** Keyless public portal. Exact dataset schema, field mapping, and automated download permission require source admission (§4.2) before integration ships. See also Astra Research Intake RI-02 in Appendix A.

### 4.2 Source Admission Sequence (must complete before build)

1. Resolve the official published dataset from the portal. Preserve publisher identity and stable dataset/version reference.
2. Inspect schema, units, UTC/day convention, vessel categories, coverage period, revised observations, missing-value conventions.
3. Validate two or more dated observations against the official display for a chosen chokepoint. Check pagination, limits, duplicates, sorting, distinction between zero and missing.
4. Confirm access without a key and the applicable reuse conditions.
5. If access/schema/rights fail, keep an official outbound source link and an explicit integration gap. Never scrape around restrictions or render synthetic numbers.

### 4.3 Proxy Architecture

```
Browser (GEV)
  │
  ├── GET /api/portwatch?chokepoint=hormuz
  │         │
  │    vite.config.js Proxy Middleware
  │    ┌────────────────────────────────┐
  │    │ In-memory cache (1h TTL)       │
  │    │ Upstream: portwatch.imf.org    │
  │    │ Response: JSON activity data   │
  │    │ No auth needed (public API)    │
  │    │ Rate limit: 1 req/choke/hour   │
  │    └────────────────────────────────┘
  │
  └── portWatchOverlay.js
      ├── GeoJSON polygon per chokepoint (hardcoded bounding)
      ├── Color: normal (cyan-dim), activity drop (gold-dim)
      ├── Label: "Hormuz: 14 transits/day (2026-09-10) — avg 18 ▼ 22%"
      └── Click: Detail card (no Conf write)
```

### 4.4 Proxy Contract (`vite.config.js`)

```javascript
// New block after celestrak proxy
// IMF PortWatch proxy — keyless, 1h cache, read-only
server.middlewares.use('/api/portwatch', async (req, res) => {
  // Parse ?chokepoint=hormuz|suez|bab|malacca|singapore|cape
  // In-memory Map<string, {data, ts}>
  // Upstream: https://portwatch.imf.org/api/...
  // Return: {
  //   chokepoint: string,
  //   observationDate: string,        // "2026-09-10" — the date PortWatch measured
  //   transitCount: number | null,    // null = missing, not zero
  //   avgTransitCount: number | null, // comparator period average
  //   pctChange: number | null,       // null if denominator missing
  //   sourceRevision: string | null,  // dataset revision if available
  //   fetchedAt: string               // ISO timestamp when GEV fetched
  // }
  // Error states:
  // - Upstream 4xx/5xx: return { error: "upstream_error", fetchedAt }
  // - Parse failure: return { error: "schema_mismatch", fetchedAt }
  // - Cache stale >24h: return cached data with staleWarning: true
  //
  // NEVER: Conf/Sit/Edge wiring, signal bus, live queue claim
});
```

### 4.5 Layer Module (`src/data/portWatchOverlay.js`)

```javascript
// Responsibilities:
// 1. Fetch /api/portwatch?chokepoint=<name> on enable
// 2. Render Cesium polygon/label per chokepoint
// 3. Color: cyan-dim (normal), gold-dim (>10% activity drop)
// 4. Card on click: activity stats + trend + observation date + source link
// 5. Refresh: every 60 min (PortWatch updates daily)
// 6. Missing data: show "Activity data unavailable for [date range]"
//
// NEVER:
// - Write to Desk, trigger Conf/Sit, send signal
// - Say "live congestion" or "queue time"
// - Claim "blocked" or "delayed" from activity drop alone
// - Show percentage if denominator is zero or not comparable
//
// Registry entry in LAYER_STATE_REGISTRY:
//   { id: 'portwatch', enabled: false, ... }
```

### 4.6 UI Copy — PortWatch (binding per Lenkung)

| Context | Copy | Forbidden |
|---------|------|-----------|
| Layer toggle label | "PortWatch — Daily Activity (dated)" | "Live Congestion" |
| Overlay label | "Hormuz: 14 transits/day (Sep 10) — avg 18 ▼22%" | "Hormuz: 4h queue wait" |
| Card title | "PortWatch Daily Activity — Hormuz" | "Live Port Congestion" |
| Card subtitle | "Source: IMF PortWatch · Observation: 2026-09-10 · Fetched: 14:32 UTC" | Any omission of observation date |
| Card body (normal) | "Transit activity within recent historical range." | "No congestion" |
| Card body (drop) | "Transit activity below recent average. Investigate independently." | "Port blocked" / "Ships delayed" |
| Card body (missing) | "Activity data unavailable for this period." | Synthetic/interpolated numbers |
| Card footer | "Daily series — not real-time. Source: portwatch.imf.org" | Any claim of live measurement |

### 4.7 Chokepoint Bounding Boxes

| Chokepoint | SW Lat, Lon | NE Lat, Lon |
|-----------|------------|------------|
| Hormuz | 25.5, 55.5 | 27.5, 57.5 |
| Suez | 29.0, 32.0 | 31.0, 33.5 |
| Bab el-Mandeb | 11.5, 42.5 | 13.5, 44.5 |
| Malacca | 1.0, 100.0 | 4.0, 104.0 |
| Singapore | 0.8, 103.0 | 1.8, 104.5 |
| Cape | -35.5, 17.5 | -33.5, 20.5 |

---

## 4b. GDACS Multi-Hazard Alerts — API Contract (FULL GO Research)

**Source:** UN JRC GDACS — `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH`  
**Auth:** Keyless. Swagger: `https://www.gdacs.org/gdacsapi/swagger/index.html`  
**Format:** GeoJSON FeatureCollection. Filters: `eventlist=EQ,TC,FL,VO,WF,DR`, `fromdate`, `todate`, `alertlevel=red,orange,green`  
**Clock:** Near-real-time alerts. Last 4 days via `EVENTS4APP`. Event date, alert level (green/orange/red) based on severity models.  
**Coverage:** Global: earthquakes, tropical cyclones, floods, volcanoes, wildfires, droughts.  
**License:** UN/JRC public data, free with attribution.

### Proxy Contract

```
Route: /api/gdacs?types=EQ,TC,FL,VO,WF,DR&alertlevel=orange,red

Proxy behavior:
  1. Query GDACS SEARCH endpoint with event type + alert level filters
  2. Cache: in-memory, 1h TTL (alerts update near-real-time but hourly is sufficient)
  3. Return: GeoJSON FeatureCollection with GDACS properties preserved
  4. Add: receivedAt (GEV receipt time), cacheAge
  5. Error: { status: "error", reason: "...", lastGoodData: {...} | null }
```

### Layer Module (`src/data/gdacsAlerts.js`)

```javascript
// Display per alert:
//   "[GDACS alert level] · [event type] · [event name/location]"
//   "Reported [event_date] · severity [score] · alert [green|orange|red]"
//   "Source: GDACS/JRC · [link]"
//
// NEVER: "confirmed [disaster]", "trade impact: [amount]"
//
// Chokepoint relevance: show alerts within radius of chokepoint zones
//   500 km for cyclones, 200 km for quakes/floods/volcanoes
//
// Registry: { id: 'gdacs-alerts', enabled: false, group: 'disruption' }
```

**Thesis value:** P2. Fills the multi-hazard gap — unified disaster alerts with severity classification. Supplements USGS (quakes only) and FIRMS (fires only) with floods, cyclones, volcanic events, drought alerts. Chokepoint-relevant: Red Sea cyclones, Strait flooding, volcanic shipping disruption.

---

## 4c. EMSC Euro-Med Earthquakes — Supplement Contract (FULL GO Research)

**Source:** EMSC SeismicPortal FDSN — `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100&minmag=4`  
**Auth:** Keyless. FDSN standard.  
**Format:** GeoJSON (with `format=json`). Supports `starttime`, `endtime`, `minlat/maxlat`, `minmag/maxmag`.  
**Clock:** Near-real-time. Events within minutes. Up to 20,000 results per query.  
**Coverage:** Global for M5+; dense Euro-Med for M3+.  
**License:** Open access.

### Proxy Contract

```
Route: /api/emsc?minmag=4&limit=100

Proxy behavior:
  1. Query EMSC FDSN endpoint with magnitude/time filters
  2. Cache: in-memory, 15 min TTL
  3. Return: GeoJSON with EMSC properties preserved + receivedAt
  4. Same display treatment as USGS: "EMSC earthquake · M[mag] · [region] · event [time]"
```

**Thesis value:** P2 supplement. Faster initial detection for Euro-Med events — Suez Canal approaches, Bosphorus, Mediterranean ports, Turkey pipelines. Optional toggle alongside existing USGS layer.

---

## 4d. NWS Weather Alerts — US Energy Infrastructure (FULL GO Research)

**Source:** NWS API — `https://api.weather.gov/alerts/active`  
**Auth:** Keyless. Requires `User-Agent` header. Provider supports redistribution.  
**Format:** GeoJSON FeatureCollection. Filter: `?area=`, `?zone=`, `?event=`, `?severity=`.  
**Clock:** Real-time. Preserve `sent`/`effective`/`onset`/`expires`/`ends` per alert.  
**Coverage:** US territories only. Hurricanes, storms, coastal flood, tsunami, extreme heat/cold.  
**License:** US Government public domain.

### Proxy Contract

```
Route: /api/nws-alerts?area=TX,LA,MS,AL,FL

Proxy behavior:
  1. Query NWS /alerts/active with area/severity filters
  2. User-Agent: "GodEyeView/1.0 (contact@osato.dev)"
  3. Cache: 30s minimum per NWS guidance
  4. Return: GeoJSON with alert properties + receivedAt
  5. Remove expired alerts (past `expires` field)
  6. Geographic filter: US Gulf states + Atlantic coast for energy relevance
```

**Thesis value:** P2. US Gulf/port weather extremes affecting oil infrastructure, refineries, pipelines. Hurricane tracks threatening Gulf shipping, Houston/LOOP terminals.

---

## 4e. Open-Meteo Marine Forecasts — Route Sea State (FULL GO Research)

**Source:** Open-Meteo Marine — `https://marine-api.open-meteo.com/v1/marine`  
**Auth:** Keyless for non-commercial use (same terms as existing weather integration).  
**Format:** JSON. Query by lat/lon. Marine: wave height, period, direction, swell, ocean temp.  
**Clock:** Forecast models updated every 6h (GFS, ECMWF, ICON). 0.25° grid. Model-derived.  
**License:** CC BY 4.0 for data. Hosted API: non-commercial per terms.

### Proxy Contract

```
Route: /api/marine-weather?lat=26.57&lon=56.25

Proxy behavior:
  1. Query Open-Meteo marine endpoint for chokepoint coordinates
  2. Cache: 6h TTL (matches model update cycle)
  3. Return: { waveHeight, wavePeriod, waveDirection, swellHeight,
              swellPeriod, oceanTemp, modelName, modelInitTime }
  4. Label: "Marine forecast · Open-Meteo [model] · init [datetime]"
  5. NEVER: "current sea conditions" (model forecast, not observation)
```

**Thesis value:** P2. Route-level sea state for chokepoints — wave height at Hormuz/Bab/Cape relevant to tanker operations. Extreme wave forecasts for Cape of Good Hope diversions.

---

## 5. Low-SOG Heuristic — Design and Labels

### 5.1 Architecture (RT-03 compliance)

```
Module: src/data/aisStuckDetection.js

Input:  AIS vessel array from aisLiveVessels.js
        (mmsi, lat, lon, sog, cog, heading, navStatus, sourceTimestamp, receiptTimestamp)

Speed validation (RT-03):
  - Missing/null SOG → EXCLUDED (never coerced to zero)
  - Sentinel values (511, 102.3) → EXCLUDED
  - SOG exactly 0.0 with missing navStatus → "Low SOG candidate" (not "anchored")
  - Speed units are knots as received from AIS

Rules:
  1. LOW_SOG:      SOG < 0.5 kn (exclusive), valid non-sentinel speed
  2. REPORTED_ANCHOR: navStatus === 1 (from AIS), labeled "Reported at anchor"
  3. CLUSTER:      >= 5 vessels with SOG < 1.0 kn within 2 nm radius
  4. IN_CHOKEPOINT: vessel inside one of the 6 chokepoint bounding boxes (§4.7)
  5. CANDIDATE:    LOW_SOG OR REPORTED_ANCHOR

Output per vessel:
  candidateType: null | "low_sog" | "reported_anchor"
  sogKn: number | null
  sourceTimestamp: number (ms epoch from AIS message) | null
  receiptTimestamp: number (ms epoch when proxy received it)
  qualityReason: null | "missing_speed" | "sentinel_speed" | "missing_timestamp"

Output per cluster (viewport, RT-05 compliance):
  count: number (unique MMSI with valid reports in declared candidate zone)
  centerLat, centerLon: centroid of qualifying vessels
  regionId: which chokepoint box (from §4.7 fixed zones, NOT camera viewport)
  truncated: boolean (true if globally capped input truncated this region)

NOT:
  - No ML, no upstream service
  - No signal to Conf/Sit/Edge
  - No "blockade detected" auto-alert
  - No "stuck" in any user-facing label (RT-03)
  - No duration claims in Phase A (RT-04)
  - Camera pan/zoom does NOT change candidate zone counts (RT-05)
  - Unknown speed never coerced to zero; missing heading ≠ drifting (RT-03)
  - Purely visual for human thesis formation
```

### 5.2 Integration in `aisLiveVessels.js`

```javascript
// In existing preRender loop:
// 1. After vessel position update: stuckDetection.evaluate(vessels, viewportBbox)
// 2. stuckDetection returns candidateFlags Map<mmsi, CandidateInfo>
// 3. Rendering: amber glow ring via billboard.color modulation
// 4. Cluster: Cesium.Entity circle + label (separate collection)
//
// Performance: O(n) scan + spatial hash for clusters (~30ms at 5000 vessels)
```

### 5.3 UI Copy — Low-SOG (binding per Lenkung)

| Context | Copy | Forbidden |
|---------|------|-----------|
| Vessel glow | Amber pulsing ring around sprite | Red / "blocked" indicator |
| Vessel card label | "⚓ Low SOG · Dwell candidate" | "Stuck" / "Blocked" / "Grounded" |
| Vessel card detail | "SOG 0.1 kn · Reported position age: 4 min" | "Stuck for 2 hours" (no valid dwell from ring buffer) |
| Cluster badge | "Hormuz: 47 observed, 12 low-SOG candidates" | "12 stuck ships" / "12 ships blocked" |
| Cluster card | "Low-SOG cluster: 12 vessels within 2 nm · Avg SOG 0.3 kn" | "Convoy waiting" / "Queue detected" |
| Tooltip | "Low speed may indicate anchoring, convoy staging, or reception artifact. Verify independently." | Any causal claim |
| **Never auto-promote** | A low-SOG cluster near Suez is not "canal blocked" | Any level > "candidate" without human review |

### 5.4 The Semantic Ladder (from Astra, adopted in Lenkung)

GEV stops at **Level 1** for first ship. No automatic promotion.

| Level | Permitted wording | Minimum evidence |
|-------|-------------------|------------------|
| 0: raw | "Received AIS reports" | Valid positions and known time quality |
| 1: measured subset | "Observed low-speed vessels in this zone" | Named geometry, source-age filter, usable speed, explicit sampled population |
| 2: persistence | "Observed low movement across this interval" | Repeated valid observations including stationary samples; gaps disclosed |
| 3: derived anomaly | "Unusual observed dwell relative to baseline" | Comparable history, zone/class conditioning, versioned rule |
| 4: reported disruption | "Authority/operator reports a restriction" | Attributable source, event time, scope |
| 5: confirmed blockage | Specific bounded finding with evidence | Corroboration and direct evidence; human-reviewed |

**First-ship ceiling: Level 1.** Levels 2–5 require bounded history (Phase B after Approve #2).

### 5.5 Dwell Limitation (from Astra §5.2, binding)

The AIS store retains a ring of 64 samples with ≥30 s and ≥25 m between stored samples. It collapses anchored vessels. Tracks exist only since server start. "Stationary for 45 minutes" **cannot** be read from this ring.

**Consequence for first-ship:** No dwell-time claims. Only instantaneous SOG-based candidate flags. Dwell requires dedicated temporal observation storage (Phase B).

---

## 6. Two Region Types (per Lenkung)

### Maritime Regions (5)

Hormuz, Suez, Bab el-Mandeb, Malacca/Singapore, Cape.

- AIS vessels visible and default context
- PortWatch daily activity overlay available
- Low-SOG heuristic active in chokepoint bounding boxes
- Shipping-focused questions (per Astra §2)

### Land Corridor (1)

Cobalt (DRC/Zambia mining corridor).

- **No ships.** Different evidence bundle.
- FIRMS active fires near supply assets
- USGS earthquakes near infrastructure
- Facility truck density: **"No validated source" — explicit gap**
- Water stress: **"Baseline modelled context" if WRI admitted, otherwise absent**
- Regional news/claims if GDELT brief available

### UI Copy — Region Type

| Region | Opening context | Forbidden |
|--------|----------------|-----------|
| Hormuz | "Strait of Hormuz · AIS observations · PortWatch daily activity" | "Live congestion monitor" |
| Cobalt | "Cobalt corridor · FIRMS/USGS disruption context · Facility data unavailable" | "Live mine operations" / ship-related labels |

---

## 7. Truck Density and Water: Unavailable (binding)

### Truck Density

**Status: UNAVAILABLE.** No inspected source supplies validated truck counts for requested facilities. Display: **"Facility truck activity: no validated source."**

Not valid sources: TomTom road flow (city, not mine gate), photoreal tiles (spatial context, not repeated observations), model-generated counts, generic CCTV.

### Water Stress

**Status: BASELINE-ONLY if WRI Aqueduct admitted.** See Astra Research Intake RI-11 in Appendix A for admission requirements.

WRI Aqueduct 4.0 baseline uses modelled period 1979–2019. "Monthly baseline" = seasonal structure, not this month's water.

If admitted, label: **"Baseline water stress — modelled basin context, WRI Aqueduct 4.0"**  
If not admitted: absent entirely. No fabricated live gauge.

---

## 8. Honesty Requirements (from Astra, adopted)

### 8.1 The Four Clocks

Every evidence object preserves independently:

1. **Observed/event time:** when the source observation occurred (nullable when unknown)
2. **Published/revised time:** when the provider issued or changed it
3. **Received time:** when GEV obtained it
4. **Display time:** the selected as-of time

Refreshing a cache never refreshes the observation. A screenshot at 14:00 is not evidence that all layers describe 14:00.

### 8.2 Coverage and Missingness

- Expose received rows, accepted rows, region rows, rendered subset, source failures, retention window
- Do not label received rows as "all vessels"
- A healthy global socket can coexist with no usable Hormuz observations
- Zero count may mean valid zero; missing response must remain unknown

### 8.3 AIS Timestamp Normalization (from Astra §5.1)

Current code normalizes absent/invalid AIS timestamps to current time. Source-age and dwell calculations must not treat that fallback as trusted measurement. For first-ship: preserve awareness that timestamp quality varies; display source-age where available.

### 8.4 Global Truncation (from Astra §5.3)

`aisLiveVessels.js` requests `maxRows` (default 12,000). Server sorts globally and slices. A busy region elsewhere can alter whether a Hormuz report reaches the client. For first-ship: display observation count per region; note when truncation affects the visible set.

### 8.5 Desk LIVE Badge (per Lenkung)

Desk `GodEyeClient.tsx` sets `live` from `reach === "embeddable"`. This proves reachability, not source liveness.

**Required label:** "Reachable" or "Connected" — not "LIVE" implying all sources current.

---

## 9. CSS — Cyan/Gold HUD

### Token Hierarchy

```css
/* Already committed (b8ea4c1): */
:root {
  --gev-osiris-cyan:      #00e5ff;
  --gev-osiris-gold:      #ffd700;
  --gev-osiris-cyan-dim:  rgba(0, 229, 255, 0.35);
  --gev-osiris-gold-dim:  rgba(255, 215, 0, 0.28);
  --gev-osiris-panel:     rgba(6, 14, 22, 0.82);
  --gev-osiris-border:    rgba(0, 229, 255, 0.22);
}

/* New tokens for build (RT-09: distinct states with text labels): */
:root {
  /* Source state tokens */
  --gev-status-live:        var(--gev-osiris-cyan);      /* Feed active */
  --gev-status-stale:       #ffab00;                      /* Data aged beyond threshold */
  --gev-status-error:       #ff3d00;                      /* Source failed */
  --gev-status-unavailable: rgba(255, 255, 255, 0.2);    /* No source */

  /* Candidate tokens (RT-09: distinct from source state) */
  --gev-status-candidate:   #ff9100;                      /* Amber for candidates */
  --gev-candidate-border:   rgba(255, 145, 0, 0.4);      /* Candidate ring */

  /* PortWatch neutral (RT-06: no congestion green/red) */
  --gev-portwatch-fill:     rgba(100, 140, 180, 0.15);   /* Neutral blue-grey */
  --gev-portwatch-border:   rgba(100, 140, 180, 0.35);

  --gev-chokepoint-fill:  var(--gev-osiris-cyan-dim);
  --gev-chokepoint-warn:  var(--gev-osiris-gold-dim);
  --gev-vessel-trail:     #39ffd5;
  --gev-vessel-candidate: var(--gev-status-candidate);

  --gev-readout-font:     var(--font-mono);
  --gev-readout-size:     11px;
  --gev-readout-color:    var(--gev-osiris-cyan);
}

/* RT-09 design rules:
   - Source age, candidate status, and missingness sit BESIDE the primary readout
   - Color is ALWAYS accompanied by text/symbol label
   - Selection gold, candidate amber, source failure red have distinct text labels
   - At 1366×768, keyboard, low-motion: source dates/gaps readable
   - Screenshots remain honest without hover interactions
   - Loading does not animate placeholder metrics as real data
*/
```

### Application per UI Region

| Region | Cyan | Gold | Amber |
|--------|------|------|-------|
| Panel borders | `--gev-osiris-border` subtle glow | — | — |
| Location pills (chokepoints) | Hover border | Active highlight gold | — |
| AIS vessel labels | `--gev-osiris-cyan` accent | — | — |
| Low-SOG candidate glow | — | — | `--gev-status-candidate` pulsing ring |
| PortWatch overlay | Normal fill cyan-dim | Activity drop fill gold-dim | — |
| FIRMS fire markers | — | `--gev-osiris-gold` | — |
| Earthquake circles | `--gev-osiris-cyan` ring | — | — |
| Data-layer toggle ON | Cyan dot/border | — | — |
| HUD readouts | Mono font cyan | — | — |

### Not in CSS Scope

- No Osiris MapLibre dark mode (Cesium/Esri stays)
- No Osiris logo/branding
- No Osiris font import (Inter + JetBrains Mono stay)
- No gradient background (`--bg-dark: #0a0a0f` stays)

---

## 10. 48h Build Order — First Ship

### Phase Matrix

| # | Hour | Task | Files | Result | Depends |
|---|------|------|-------|--------|---------|
| 1 | 0–2 | **Click-Path Green** | — (verify only) | DoD §1 basis: GEV :4173 + Desk :3000 + `/god-eye` embeddable | Node 24.14, keys in `.env` |
| 2 | 2–6 | **Thesis Defaults** | `src/thesisDefaults.js`, `src/firstRunExperience.js`, `src/data/layerState.js` | AIS default-on; CCTV/Traffic/Radio default-off; shipping first-run preset | Step 1 |
| 3 | 6–10 | **Low-SOG Heuristic** | `src/data/aisStuckDetection.js`, `src/data/aisLiveVessels.js` (import + render) | SOG<0.5 candidate flags; chokepoint cluster badges; amber glow | AIS LIVE |
| 4 | 10–14 | **Candidate UX** | `src/data/vesselLabels.js` (candidate card variant), `src/ui/styles/layers.css` | Candidate cards: "⚓ Low SOG · Dwell candidate"; cluster badge "12 low-SOG" | Step 3 |
| 5 | 14–22 | **PortWatch Proxy + Layer** | `vite.config.js` (proxy), `src/data/portWatchOverlay.js`, `src/data/layerState.js` | PortWatch daily activity overlay: transit counts, dated trend, chokepoint polygon | Source admission (§4.2) |
| 6 | 22–28 | **Cyan/Gold HUD Polish** | CSS files per §9 | Full Osiris-inspired palette; status tokens; chokepoint gold highlights | Steps 3–5 |
| 7 | 28–32 | **GDACS Multi-Hazard** | `vite.config.js` (proxy), `src/data/gdacsAlerts.js` | GDACS alerts: EQ/TC/FL/VO/WF/DR with severity + chokepoint filter | Keyless |
| 8 | 32–36 | **NWS + EMSC + Marine** | `src/data/nwsAlerts.js`, `src/data/emscQuakes.js`, `src/data/marineWeather.js` | US energy weather, Euro-Med quakes, route sea state | Keyless |
| 9 | 36–40 | **GVP Volcanic + WRI Aqueduct** | `src/data/volcanicAlerts.js`, `src/data/waterBaseline.js` | Volcanic activity + Cobalt water baseline (static) | Keyless/download |
| 10 | 40–44 | **Disruption Labels + Region Polish** | `earthquakes.js`, `firmsHeatmap.js`, `locations.js` | FIRMS/USGS honest labels; Cobalt land corridor gaps | FIRMS/USGS LIVE |
| 11 | 44–46 | **Cyan/Gold HUD + Docs** | CSS per §9, `.env.example`, `DATA_SOURCES.md` | Full palette; source-status strip; docs current | Steps 3–10 |
| 12 | 46–48 | **Integration QA + Handoff** | — (manual QA + A1–A16) | End-to-end: Desk → God Eye → Hormuz → AIS + candidates + PortWatch + GDACS → thesis <60s | Steps 1–11 |

### Parallelization

- Steps 3–4 (heuristic) and Step 5 (PortWatch) are **independent** — can be built in parallel.
- Steps 7, 8, 9 (GDACS, NWS/EMSC/Marine, GVP/WRI) are **all independent** of each other and of steps 3–5.
- Step 11 (CSS/docs) depends on steps 3–10 (design needs content).

### Stop Conditions (immediate abort)

Any touch on these files/concepts → abort:

- `src/lib/god-eye.ts` Conf/Sit/Edge import
- Hatch engine modules
- Voice/Mic/`OPENAI_*` integration
- `osirisai.live` iframe
- Secret values in code/docs/commits
- "Blocked" / "stuck" / "congestion" in any auto-generated label
- Live truck/water gauge without validated source

---

## 11. Definition of Done

### Gate A — Owned Opening Path and Isolation

1. Sidebar opens owned GEV through `/god-eye` and intended origin. No Osiris/foreign fallback.
2. Host distinguishes unreachable, framing refusal, and viewer/source failure. Badge says "Reachable" not "LIVE."
3. No microphone, no voice, no RECON, no junk webcams in thesis default.
4. No GEV writes to Desk analytical endpoints, no forbidden imports, no Hatch modification.

### Gate B — A Useful First Minute

5. Operator reaches all 6 regions in one action each. Maritime = AIS; Cobalt = land corridor.
6. Operator can inspect a received ship report, its timestamp quality, source, and reported motion.
7. Source age, time window, filters, and observation limits are legible without dev console.
8. Operator can state either a supported observation or "no supported comparison yet."

### Gate C — Shipping and Candidate Honesty

9. Camera movement and render caps cannot alter a metric's geographic denominator. Truncation visible.
10. Low-SOG labels say "dwell candidate" — never "stuck", "blocked", or "queue."
11. PortWatch shows dated observation day, metric title, scope, and source. Never "live congestion."
12. Queue length, wait time, and "stuck" stay unavailable until Phase B evidence contracts pass.

### Gate D — Physical Context Without Fabricated Impact

13. FIRMS reveals sensor/acquisition info and partial status. Recurring hotspot ≠ outage.
14. USGS reveals M2.5+/24h filter. Symbolic circles ≠ damage footprint.
15. Satellites identify propagated context and source epoch. Old/subset data visible.
16. Truck density unavailable without validated source. Water = baseline or absent.
17. GDACS alert levels (green/orange/red) are model-assessed severity, not confirmed damage. Multi-hazard ≠ exhaustive global coverage.
18. EMSC supplements USGS for Euro-Med; denser Euro-Med detection ≠ global completeness. Minimum M4+ displayed.
19. NWS is US-only. Non-US chokepoints show "No NWS coverage." Expired alerts removed. Alert lifecycle timestamps preserved (sent/effective/onset/expires).
20. Open-Meteo marine = model forecast with visible init time. "Sea state forecast" never presented as "current conditions."

### Gate E — Degradation and Evidence

21. At least one source-outage, one regional-empty, one stale-cache, one restart/history-loss scenario verified.
22. Defaults and source status docs match actual owned runtime.
23. Under-60-second usefulness goal met on reference workstation.
24. No screenshot or panel claims blockage, live water, truck count, or production loss without required source support.

**Failure gate:** If any UI claims "blocked", "live water", "truck count", "complete coverage", "confirmed damage" (from GDACS alert level alone), or "current sea conditions" (from model forecast) without the required evidence, the product fails irrespective of visual polish.

---

## 12. Local Development — Deploy Steps

### Start (two terminals)

```bash
# Terminal A — GEV
cd /workspace/gods-eye-view
nvm use 24.14.0
npm run dev -- --host 127.0.0.1 --port 4173

# Terminal B — Desk
cd /workspace/osato-desk-pr
npm run dev -- --port 3000
```

### Env — GEV (`/workspace/gods-eye-view/.env`)

```bash
GEV_FRAME_ANCESTORS=http://localhost:3000
CESIUM_ION_TOKEN=<via-env-only>
AISSTREAM_API_KEY=<via-env-only>
FIRMS_MAP_KEY=<via-env-only>
# Optional (not thesis P0):
# TOMTOM_API_KEY=<via-env-only>
# GOOGLE_MAPS_API_KEY=<via-env-only>
```

### Env — Desk (`/workspace/osato-desk-pr/.env.local`)

```bash
NEXT_PUBLIC_GEV_URL=http://localhost:4173
# No NEXT_PUBLIC_GEV_DEPTH_URL (A' legacy removed)
# No NEXT_PUBLIC_OSIRIS_LOOK_URL (optional, not default)
```

### Click Path Verification

1. Desk starts (`:3000`)
2. GEV starts (`:4173`)
3. Sidebar → **God Eye View**
4. Globe loads with Esri basemap
5. AIS auto-on (URL param `l=a`)
6. Location pill **Hormuz** → fly-to
7. Ships in Strait of Hormuz visible
8. *(After Step 3):* Low-SOG amber candidates visible
9. *(After Step 5):* PortWatch daily activity overlay visible
10. **Human reads thesis** — never automatically feeds Conf

### Production Deploy (roadmap, not first-ship)

| Phase | Action | Result |
|-------|--------|--------|
| Alpha (now) | Local :4173 + :3000 | Osato-only, dev box |
| Beta | GEV `npm run build` → static; Desk as host | Single-machine preview |
| Staging | GEV on own port/container; Desk iframe URL | Team review possible |
| Prod | GEV on `gev.osato.internal`; `NEXT_PUBLIC_GEV_URL` on prod URL | Hedge-fund grade |

**Never:** `osirisai.live` as prod GEV target. Never foreign Vercel URLs.

---

## 13. Approve Gate Criteria (from Lenkung)

Before build begins:

- [ ] No automatic Thesis → Trade/Conf path
- [ ] Every metric has Source + Clock + Missingness State
- [ ] <60s Hormuz useful: AIS on, chokepoint pill, honest fail states
- [ ] Deploy path to clickable Desk God Eye tab
- [ ] PortWatch labeling = "daily activity / dated" (Astra rule)
- [ ] Low-SOG labeling = "low SOG / dwell candidate" (Lenkung rule)
- [ ] Truck/water = explicit unavailable/baseline
- [ ] Cobalt = land corridor, no ship labels

---

## 14. What Is NOT in This Spec (Phase B+)

| Item | Why deferred | Gate |
|------|-------------|------|
| Bounded history / evidence store | Requires persistence design; first-ship is snapshot-only | Approve #2 |
| Dwell-time claims (Level 2+) | Needs dedicated temporal storage, not ring buffer | Approve #2 |
| Queue length / wait time | Needs validated waiting definition per corridor | Approve #2 |
| WRI Aqueduct integration | Source admission not yet completed | Source admission |
| PortWatch full validation | Dataset schema/access not yet confirmed | Source admission (§4.2) |
| GDELT event cards with provenance | Needs dedup, location precision, contradiction handling | Phase B |
| Multi-day comparison charts | Needs persistent series, comparable periods, missingness rules | Phase B |
| Facility-specific observation | Needs per-site source admission, rights, validated geometry | Phase C |
| NWS CAP alerts (RI-09) | Shortlisted by Astra; admission deferred | Source admission |
| ECMWF Open Data (RI-10) | Shortlisted by Astra; deferred for first ship | Source admission |
| GEM infrastructure (RI-12) | Conditional; deferred for first ship | Source admission |
| GloFAS river forecasts (RI-15) | Access route not verified | Source admission |
| EIA infrastructure maps (RI-16) | Conditional on license/schema validation | Source admission |
| EIA developer API (RI-17) | Deferred; no existing key binding in `.env.example` | Source admission |
| NOAA SWPC space weather (RI-18) | Phase B candidate — keyless, not P0 scope | Phase B |
| VAAC volcanic ash (RI-19) | Phase B candidate — keyless XML, needs parse/validation | Phase B |
| GIE gas storage (RI-22) | Conditional — verify commercial reuse terms first | Source admission |
| Rhine water levels (RI-24) | Phase B candidate — keyless, inland waterways scope | Phase B |
| Paris MoU detentions (RI-26) | Phase B candidate — indirect congestion signal | Phase B |

---

## Appendix A — Astra Research Intake

*Preserved from Astra's OSA-6 research contribution (2026-09-13). This intake provides source admission research for the candidates referenced above. Claude owns the implementation sections; Astra owns this research record.*

### Admission Rules

Reviewed official provider documentation on 2026-09-13. "Shortlist" means worth admitting after the stated checks, not deployed, fully licensed for every downstream use, or operationally certified. "Conditional" means do not enable until the named gap is closed. No new credentials were obtained; `.env.example` already declares `AISSTREAM_API_KEY` and `FIRMS_MAP_KEY`, but declarations do not prove configured access. No secret values were inspected.

Each implementation admission record must preserve: provider and dataset/version, exact endpoint and stable record ID, intended-use/license evidence and attribution, observation time or interval and its precision, publication/revision time if supplied, receipt time, geographic support, units, missingness, quota/cache policy, and sample/schema evidence. Unknown clocks remain null. A successful HTTP request is only transport evidence. Data rights and hosted-service rights require separate checks. Missing admission evidence means disabled/unavailable, never a fabricated replacement.

### Candidate Register

| ID / Candidate | Clock and Label | Missingness | Decision |
|---|---|---|---|
| RI-01 AISStream | Distinguish message source-time from server receipt; no assumed full observation timestamp | Receiver gaps, slow-reader drops, duplicates limit support | **Conditional existing.** Reject complete-fleet, cargo-content, route-clear claims. |
| RI-02 IMF PortWatch | Daily estimated activity; observation day ≠ publication ≠ retrieval | Missing days, AIS coverage shifts, incomplete pages | **Conditional P0.** Exact dataset ID, region mapping, fields, terms need admission. Reject live queue counts. |
| RI-03 Low-SOG derived | Valid source times, sample count, max gap needed | Silence can be receiver/transport failure | **Retain low-SOG candidate; defer duration. Reject 'dark ship' verdict.** |
| RI-04 CelesTrak GP | Element epoch ≠ download time. Old elements, decayed objects, format-limited omissions | Catalog numbers >99,999 excluded from TLE | **Shortlist.** Use JSON/OMM for expanded IDs. Reject complete-catalog claims from TLE. |
| RI-05 NASA FIRMS | Satellite acquisition time; NRT/RT/URT class. Latency varies | Clouds, overpass timing, failed sources | **Conditional existing.** Reject globally 'live fire'. |
| RI-06 USGS Earthquakes | `properties.time` = event; `updated` = revision | Preliminary events can change; detection completeness varies | **Shortlist.** Reject magnitude-to-production-loss conversion. |
| RI-07 Copernicus STAC | Acquisition interval; scene cloud ≠ clear pixels | Catalog listing ≠ image delivery | **Conditional metadata-only.** Validate before admission. |
| RI-08 NASA GIBS | Requested layer date ≠ per-pixel acquisition | Layer availability, no-data, composite construction | **Conditional.** Inspect chosen layer capabilities. |
| RI-09 NWS CAP Alerts | Sent/effective/onset/expires/ends | NWS jurisdiction only, not global | **Shortlist.** Keyless with User-Agent. |
| RI-10 ECMWF Open Data | Model run ≠ forecast valid time | Rolling archive, missing parameters | **Shortlist, defer first ship.** CC BY 4.0 + ECMWF terms. |
| RI-11 WRI Aqueduct 4.0 | Baseline 1979–2019; not current water | No facility telemetry | **Conditional baseline only.** CC BY 4.0. |
| RI-12 GEM GGIT | Dataset release date; status ≠ current availability | Inclusion thresholds; not exhaustive | **Conditional, defer first ship.** CC BY 4.0. |
| RI-13 GDELT Claims | Discovery time ≠ event time; duplicate syndication | Automated extraction, language/source limits | **Conditional, defer claims until provenance contract.** |
| RI-14 Open-Meteo | Model forecast/valid times | Source/model transitions | **Reject free endpoint for commercial desk use.** |
| RI-15 GloFAS | Model issue/run and forecast interval | Ensemble/model resolution | **Defer until access route verified.** |
| RI-16 EIA Maps/Infrastructure | Layer vintage/reporting period | US scope, varying vintages | **Conditional on license/schema.** |
| RI-17 EIA Developer API | Series reporting interval/revision | Reporting lag, geography gaps | **Defer; no existing key binding.** |

### Verification Evidence

- **2026-09-13 15:51:36 UTC:** Direct keyless USGS hour-feed GET returned HTTP 200 and GeoJSON FeatureCollection. Sample ID `nc75434912` exposed separate event `time` and `updated` fields.
- CDSE Sentinel-2 STAC probe failed JSON parsing. Treat RI-07 as unvalidated.
- Official documentation reviewed for all candidates. Live data endpoints, provider keys, exact PortWatch mapping and product-level rights were not operationally validated.

### Required Admission Fixtures

1. Cached response retains old observation/acquisition time; missing source time never becomes receipt time.
2. Newer cloudy scene vs older usable scene remain distinct; item-level cloud metadata ≠ clear facility pixel.
3. Expired/cancelled alert is not active; unsupported geography is not all-clear.
4. Multiple articles with same origin remain one claim family.
5. Provider 429, auth failure, malformed schema, partial page and empty results have distinct visible states.
6. Baseline water, static infrastructure and orbit propagation retain their labels beside primary card.
7. Source admission includes exact terms URL, access method, attribution text, refresh/cache limits.

---

## Appendix B — FULL GO Research Expansion (Claude, 2026-09-13)

*This section implements the FULL GO research mandate. Claude independently researched categories beyond Osato's examples to raise God Eye to hedge-fund grade.*

### B.1 Admission Rules (same as Appendix A)

Each candidate must document: provider/dataset/version, exact endpoint, license/terms URL, observation time semantics, missingness, geographic scope, refresh policy, two sampled responses, and integration boundary. Keyless or existing env key names only. No secrets in git. Honest freshness labels.

### B.1b Newly Admitted Sources (FULL GO Research — Claude 2026-09-13)

These sources were independently researched, verified, and admitted for first-ship or immediate Phase B integration. All are keyless and fill material gaps.

| ID | Source | Endpoint | Auth | Format | Clock | Coverage | Thesis Value | Disposition |
|----|--------|----------|------|--------|-------|----------|-------------|-------------|
| RI-B1 | **GDACS Multi-Hazard** | `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH` | Keyless | GeoJSON | Near-real-time, severity models | Global: EQ/TC/FL/VO/WF/DR | Unified disaster alerts with severity. Supplements USGS+FIRMS. | **ADMIT P2** |
| RI-B2 | **EMSC SeismicPortal** | `https://www.seismicportal.eu/fdsnws/event/1/query?format=json` | Keyless | GeoJSON | Near-real-time, events in minutes | Global M5+, Euro-Med M3+ | Faster Euro-Med quakes: Suez, Bosphorus, Turkey pipelines. | **ADMIT P2** |
| RI-B3 | **NWS Weather Alerts** | `https://api.weather.gov/alerts/active` | Keyless (User-Agent) | GeoJSON | Real-time, per-alert lifecycle | US + territories | US Gulf energy weather: hurricanes, floods, extreme heat. | **ADMIT P2** |
| RI-B4 | **Open-Meteo Marine** | `https://marine-api.open-meteo.com/v1/marine` | Keyless (non-commercial) | JSON | 6h model updates | Global oceans | Route sea state: wave height at Hormuz/Bab/Cape. | **ADMIT P2** |
| RI-B5 | **GVP Volcanic Activity** | `https://volcano.si.edu/news/WeeklyVolcanoRSS.xml` | Keyless (RSS) | GeoRSS | Weekly Thursdays 23:00 UTC | Global, 1400+ volcanoes | Volcanic disruption near shipping lanes. GDACS covers real-time. | **ADMIT P2** |
| RI-B6 | **WRI Aqueduct 4.0** | `https://www.wri.org/data/aqueduct-global-maps-40-data` | Keyless (download) | GeoJSON/Shapefile | Static baseline 1979–2019 | Global basins | Cobalt corridor water-risk screening. CC BY 4.0. | **ADMIT P2** |

**Verification:** GDACS Swagger live at `gdacs.org/gdacsapi/swagger/index.html`. EMSC FDSN endpoint returns GeoJSON with `format=json` parameter. NWS documented redistribution support. Open-Meteo marine API documented at `open-meteo.com/en/docs/marine-weather-api`. GVP RSS reported 403 in Astra probe — may need User-Agent; GDACS VO events serve as real-time fallback. WRI data available via GitHub (`wri/Aqueduct40`), CC BY 4.0 confirmed.

### B.2 Additional Candidates Beyond Osato Examples

| ID | Source & Access | Clock & Label | Why Hedge-Fund Grade | Decision |
|----|----------------|---------------|---------------------|----------|
| RI-18 | **NOAA SWPC Space Weather** — [alerts](https://services.swpc.noaa.gov/products/alerts.json), keyless JSON | Alert issue time + valid period; "Space weather alert · issued HH:MM" | Solar/geomag storms affect satellite comms and GPS accuracy — context for orbital layer and maritime navigation disruptions | **Shortlist Phase B.** Keyless. Useful alongside CelesTrak context. Reject "satellite lost" from a geomag alert. |
| RI-19 | **VAAC Volcanic Ash Advisories** — [ICAO summary](https://www.ssd.noaa.gov/VAAC/), Washington VAAC XML | Advisory issue/valid time; "Volcanic ash advisory · issued HH:MM · valid HH:MM" | Ash clouds disrupt aviation and maritime routes; relevant for chokepoint shipping reroutes | **Shortlist Phase B.** Keyless XML. Need parse/validation. Reject "route closed" from an advisory polygon alone. |
| RI-20 | **Panama Canal Draft Restrictions** — [ACP public notices](https://pancanal.com/en/maritime-operations/), published restrictions | Notice date + effective period; "Panama Canal draft restriction · effective YYYY-MM-DD" | Direct impact on vessel routing and queuing at Panama; context for Suez/Cape rerouting hypotheses | **Shortlist Phase B.** Public notices exist but no structured API; manual/RSS intake needed. Reject "canal closed" from a draft restriction. |
| RI-21 | **UNCTAD Liner Shipping Connectivity** — [LSCI data](https://unctadstat.unctad.org/), quarterly index | Quarterly reporting period; "UNCTAD LSCI · Q3 2026 · country index" | Structural shipping connectivity baseline — context for why certain chokepoints matter more | **Defer.** Annual/quarterly data, not operational. Useful for static analyst context in Phase C. |
| RI-22 | **GIE AGSI/ALSI** — [European gas storage transparency](https://agsi.gie.eu/), public API | Daily reporting; "EU gas storage · report date YYYY-MM-DD · % full" | European energy storage levels affect LNG demand and tanker routing | **Conditional Phase B.** Public API with Terms of Use. Verify commercial reuse before admission. Reject "energy crisis" from storage percentage alone. |
| RI-23 | **OFAC SDN List** — [Treasury data](https://sanctionslist.ofac.treas.gov/Home/SdnList), public XML/CSV | List publication date; "OFAC sanctions list · published YYYY-MM-DD" | Sanctions affect vessel identification and trade flow analysis | **Defer.** Complex legal context; needs legal review before any UI display. Reject "sanctioned vessel" label without confirmed match process. |
| RI-24 | **Rhine Water Levels** — [RWS Waterinfo](https://waterinfo.rws.nl/), public API | Measurement time + station; "Water level · station · measured HH:MM" | European inland waterway disruptions affect commodity transport (coal, chemicals) | **Shortlist Phase B.** Keyless API for Dutch stations. Reject "river closed" from low water level alone. |
| RI-25 | **IMB Piracy Reports** — [ICC IMB](https://www.icc-ccs.org/piracy-reporting-centre), public quarterly reports | Report date + incident date; "IMB reported incident · YYYY-MM-DD · location" | Maritime security zones affect routing decisions and insurance costs | **Defer.** Published reports but no structured API; redistribution terms unclear. Shortlist for Phase B claims. |
| RI-26 | **Paris MoU Port State Control** — [Detentions](https://www.parismou.org/detentions-banning/current-detentions), public query | Detention date + port; "Port state detention · YYYY-MM-DD · port" | Detained vessels at key ports as indirect congestion signal | **Shortlist Phase B.** Public query interface. Reject "port congested" from detention count alone. |

### B.3 Research Categories Explored and Assessed

| Category | Sources Explored | Outcome |
|----------|-----------------|---------|
| **Piracy/maritime security** | IMB PRC, MDAT-GoG, UKMTO advisories | Defer — public advisories exist but terms vary; Phase B claims |
| **Commodity terminal status** | Genscape, Kpler, Vortexa, cFlow | OUT — all require paid subscriptions; no existing key bindings |
| **Port congestion commercial** | MarineTraffic, VesselFinder, Windward | OUT — all require paid API access; no existing key bindings |
| **Solar/geomag storms** | NOAA SWPC | Shortlist RI-18 — keyless; adds satellite/comms context |
| **Volcanic ash** | VAAC centres | Shortlist RI-19 — keyless XML; aviation/maritime route disruption |
| **Canal restrictions** | Panama ACP, Suez Canal Authority | Shortlist RI-20 — public notices; no structured API |
| **Shipping baselines** | UNCTAD LSCI, UNCTAD RMT | Defer — quarterly/annual data; analyst context only |
| **European energy** | GIE AGSI/ALSI | Conditional RI-22 — public API; verify reuse terms |
| **Sanctions lists** | OFAC SDN, EU Consolidated | Defer — legal review needed |
| **Inland waterways** | Rhine (RWS), Danube, Mississippi (USACE) | Shortlist RI-24 — keyless for Rhine; others vary |
| **Port detentions** | Paris MoU, Tokyo MoU | Shortlist RI-26 — public data; indirect signal |
| **Crop/food disruption** | USDA FAS, FAO GIEWS | OUT — agricultural focus, not thesis-relevant for P0 chokepoints |
| **Insurance/P&I** | Lloyd's List, JWC | OUT — behind paywalls; no existing access |

### B.4 Integration Priority for New Candidates

| Priority | Candidates | Gate |
|----------|-----------|------|
| First ship | None from B.2 — existing admitted sources are sufficient for Lenkung P0–P2 scope | — |
| Phase B increment | RI-18 (SWPC), RI-19 (VAAC), RI-22 (GIE gas storage), RI-24 (Rhine levels), RI-26 (Paris MoU) | CEO approve of Phase B scope |
| Phase B claims | RI-20 (Panama), RI-25 (IMB piracy) | Provenance contract required |
| Phase C | RI-21 (UNCTAD), RI-23 (OFAC) | Legal/analyst review |

---

## Appendix C — Red-Team Cross-Reference and Resolution

### RT Finding → Spec Resolution

| RT | Finding | Resolution Section | Status |
|----|---------|-------------------|--------|
| RT-01 | Refresh clock can launder old evidence | §8.1 Four Clocks; §4.4 proxy contract with `observationDate` ≠ `fetchedAt` | **Resolved** |
| RT-02 | Reachability ≠ regional evidence | §1 Fail States (AIS regional silence); §8.5 Desk LIVE Badge = "Reachable" | **Resolved** |
| RT-03 | Low SOG ≠ stuck; anchorage ≠ queue | §5 full heuristic design; §5.3 UI copy (never "stuck"); §5.4 semantic ladder Level 1 ceiling | **Resolved** |
| RT-04 | Phase A cannot borrow Phase B history | §5.5 dwell limitation; §14 "dwell-time claims" deferred to Phase B | **Resolved** |
| RT-05 | Camera/render limits can manufacture trend | §4.7 fixed bounding boxes; §8.4 global truncation disclosure; §11 Gate C.9 | **Resolved** |
| RT-06 | Renaming PortWatch doesn't fix congestion colors | §4.2 source admission gate; §4.6 UI copy; §4.5 "Never" list; §9 neutral color tokens | **Resolved** |
| RT-07 | Agreement/proximity cannot promote to confirmed | §6 region types; §7 truck/water unavailable; §2 OUT list (no auto-incident inference) | **Resolved** |
| RT-08 | Cobalt, trucks, water invite fabricated completeness | §6 two region types; §7 explicit unavailable; §6 Cobalt = land corridor, never ship | **Resolved** |
| RT-09 | Visual hierarchy contradicts fine print | §9 CSS rules; §5.3 amber = always with text "candidate"; §11 Gate D (screenshot @ 1366×768) | **Resolved** |
| RT-10 | Clickable globe ≠ working deployment/isolation | §12 deploy steps; §11 Gate A (isolation check); §10 stop conditions | **Resolved** |
| RT-11 | Public endpoint ≠ permitted use | Appendix A admission rules; Appendix B admission rules; §4.2 source admission sequence; §4b-4e per-source license notes | **Resolved** |
| RT-12 | Latest catalogue item ≠ latest useful image | Appendix A RI-07 (metadata-only; "target visibility unverified") | **Resolved** |
| RT-13 | Alert/model geography can fabricate global coverage | §4d NWS (US-only explicit); §4e marine forecast labeling; §11 Gate D.19–20; Appendix A RI-09/RI-10 | **Resolved** |

### MF (Must-Fix) → Spec Resolution

| MF | Requirement | Resolution |
|----|------------|------------|
| MF-1 | Source/clock/missingness per metric | §8.1 Four Clocks convention; per-source contracts in §4, §5, §8 |
| MF-2 | Candidate labeling only | §5.3 UI copy; §5.1 "NOT" list; §10 stop conditions |
| MF-3 | Phase A temporal limits defined | §5.5 dwell limitation; §5.4 semantic ladder Level 1 ceiling |
| MF-4 | Fixed candidate geography | §4.7 versioned bounding boxes; §8.4 truncation; §11 Gate C.9 |
| MF-5 | PortWatch source admission | §4.2 five-step admission sequence before build |
| MF-6 | Claims/land semantics preserved | §6 region types; §7 truck/water; §2 OUT list |
| MF-7 | Uncertainty beside readout | §9 CSS; §5.3 amber + text; §11 Gate D screenshot test |
| MF-8 | Real deploy/isolation path | §12 deploy; §11 Gate A; §10 stop conditions |
| MF-9 | A1–A10 acceptance cases | Appendix D below |
| MF-10 | Publish spec for review | This Rev 2 document |
| MF-11 | Source admission evidence | §4.2; §4b-4e admitted P2 contracts; Appendix A/B admission rules |
| MF-12 | Catalogue vs imagery semantics | Appendix A RI-07; §2 OUT (no truck counting from imagery) |
| MF-13 | Alert coverage/expiry/forecast | §4d NWS contract (US-only, expired removal); §4e marine forecast labeling; Appendix A RI-09/RI-10; §6 region type coverage |

---

## Appendix D — Acceptance Test Cases (RT compliance)

Requirements for the build's test plan. Fixtures prove semantics before live provider QA; they must stay visibly separate from production observations.

| ID | Adversarial Input / Action | Required Observable Result | Finding |
|----|---------------------------|---------------------------|---------|
| A1 | Missing/future source timestamp; old cache fetched now | Unknown/invalid age or dated old evidence; no valid temporal support | RT-01 |
| A2 | Global AIS healthy; selected region silent; then upstream fails | Regional "no observations" + distinct source failure; preserved aged last-good evidence | RT-02 |
| A3 | Zero/missing/sentinel speed; normal anchored cluster; exact threshold boundary | Deterministic qualified candidates; unusable speed excluded; no stuck verdict | RT-03 |
| A4 | One report, duplicates, 20-minute gap, restart | No invented duration; explicit insufficient history or reset | RT-04 |
| A5 | Pan/zoom, change row cap, overlap zones, globally truncate input | Stable same-sample counts; partial support shown; no duplicate total | RT-05 |
| A6 | PortWatch missing day vs zero; revised day; partial page; zero baseline | Preserved date/unit, gap/revision state, suppressed unsupported percentage | RT-06 |
| A7 | Duplicate headline, vague location, recurring hotspot, partial sensor outage | Attributed qualified claims; no independent-confirmation or damage upgrade | RT-07 |
| A8 | Cobalt selection + imagery on/off + failed source fallback | Land context; trucks/water "unavailable", never numeric filler | RT-08 |
| A9 | Small screen (1366×768), no hover, keyboard, low motion; stale layers | Source dates/gaps and candidate status legible without color alone | RT-09 |
| A10 | Actual Desk entry, source route loss, viewer/frame failure | Useful status within 60 seconds; no false aggregate LIVE or forbidden path | RT-10 |
| A11 | Successful unauthenticated query to new source | Cannot redistribute until terms pinned; unknown terms = disabled | RT-11 |
| A12 | Newest cloudy/off-footprint catalogue item | Not "live view"; cloud metadata preserved; visibility "unverified" | RT-12 |
| A13 | Empty NWS results for Hormuz; expired alert; forecast shown as current | Coverage gap stated; expired removed; forecast ≠ observation | RT-13 |
| A14 | PortWatch comparison with zero baseline denominator | Percentage suppressed; both dates shown; zero ≠ missing | RT-06 |
| A15 | Three sources near same location (AIS slow, PortWatch decline, headlines) | Sources remain separate; no "three sources confirm blockade" | RT-07 |
| A16 | CelesTrak stale elements; WRI baseline labeled with current date styling | Element epoch shown; baseline period stated; no "current" styling on historical data | RT-09, RT-12 |

---

*End Triple-Brain Joint Spec (Rev 3, contracts complete).*  
*Astra-red-teamable and CEO-approvable. Author: Claude · 2026-09-13.*  
*Branch: `cursor/god-eye-owned-basis`*
