# TB9 — Worldmonitor → God Eye Trading Map

**Osato God Eye · Triple-Brain RESEARCH**  
**Date:** 2026-09-22 · **Madrid (CEST):** ~14:20  
**Author:** Grok Bot (executor)  
**Fork:** `/workspace/gods-eye-view` (MIT code; third-party data carved out)  
**WM reference (catalog only):**  
`https://www.worldmonitor.app/dashboard?lat=19.7885&lon=0.0000&zoom=1.47&view=global&timeRange=7d&layers=conflicts,bases,hotspots,ais,nuclear,sanctions,weather,canadaAlerts,economic,waterways,military,natural,minerals,tradeRoutes`

**Osato brief (2026-09-22):** Keep current zoom/pan haptics **1:1**. Level up: brutal 3D resolution. Cut non-trading noise. Focus globe + right rail on **trading-thesis intel**.

**Legal posture:** World Monitor **platform source = AGPL-3.0-only** ([LICENSE](https://github.com/koala73/worldmonitor/blob/main/LICENSE), [docs/license](https://www.worldmonitor.app/docs/license)). Hosted API/MCP/embeds governed by [EULA](https://www.worldmonitor.app/docs/eula) (2026-09-21). **Do not fork, vendor, or iframe-embed WM dashboard/code into GEV.** Catalog UX concepts; prefer **public upstream APIs** already in GEV pattern; optional later: paid WM REST/MCP under Osato's plan (never AGPL copy). MIT SDKs fetch data still under EULA.

**Mix-Lock:** Do **NOT** wire Hatch / Conf / Edge / Sit. GEV remains Lagebild-only (`never feeds Conf`).

**No commits** in this research task.

---

## 0. Constraints (lock before build)

| Lock | Rule |
|------|------|
| Haptics | `src/cameraControlConfig.js` inertia/zoom/wheel (`INERTIA_*`, `_zoomFactor`, fixed-pivot wheel) — **no retune** |
| Mix-Lock | No Hatch/Conf/Edge/Sit imports, postMessage, BroadcastChannel, or Desk signal bus |
| AGPL | No WM source copy, no AGPL embed widget, no “inspired” paste of their panel TS |
| Honesty | STALE / UNAVAILABLE / DEGRADED / dated labels; never fake LIVE or invent congestion/blockade |
| Thesis CUT | traffic, bikeshare, radio (and similar gimmicks) stay **default-off**; do not promote into thesis strip |
| Boot | 3D quality upgrades must not block first paint; defer Ion/Google/terrain after Esri keyless land |

---

## 1. Layer matrix

WM URL layers + Osato KEEP list mapped to GEV inventory (`thesisDefaults.js` + `src/data/*` layer ids) and **public** source candidates (honest freshness).

Legend: **GEV** = exists in fork · **Partial** = related module but not WM-equivalent · **No** = missing · Priority **P0** ship next · **P1** thesis add · **P2** nice/rail-only.

| # | WM / thesis concept | GEV existing? | Public API / source candidates (prefer these) | Priority | Notes |
|---|---------------------|---------------|-----------------------------------------------|----------|-------|
| 1 | **AIS / ships** (`ais`) | **Yes** `ais-live-vessels` (default ON) | AISStream.io WS (existing proxy); Digitraffic FI regional supplement (TB6); never claim Gulf from FI | **P0** | Keep honesty: coverage ≠ global; STALE/age; Hormuz/Bab gaps known |
| 2 | **Chokepoints / waterways** (`waterways` + PortWatch) | **Yes** `portwatch` (default ON) + `CHOKEPOINT_BOUNDING_BOXES` | IMF PortWatch ArcGIS (dated daily); AIS dwell/low-SOG candidates local | **P0** | Label **dated daily activity** — never live congestion |
| 3 | **Trade routes** (`tradeRoutes`) | **Partial** (chokepoint boxes + AIS corridors only) | Static Natural Earth / public corridor polylines; WTO/UN Comtrade **annual** (slow); no fake live flows | **P1** | Static route ribbons + thesis chokepoints first |
| 4 | **Earthquakes** | **Yes** `earthquakes` (USGS, ON); `emsc-quakes` (OFF) | USGS GeoJSON; EMSC FDSN (CC BY 4.0) | **P0** | Catalog health ≠ quiet earth |
| 5 | **Fires / burn** (`natural` subset) | **Yes** `local-firms` (FIRMS, ON) | NASA FIRMS MAP_KEY + keyless VIIRS CSV recovery (TB6) | **P0** | Acquisition time ≠ receipt; not facility confirmation |
| 6 | **Weather alerts** (`weather`, `canadaAlerts`) | **Partial** `nws-alerts` (US, OFF); `marine-weather` (OFF); Open-Meteo cockpit | NWS CAP/alerts; Env Canada alerts (open); Open-Meteo | **P1** | Thesis: marine + corridor WX; US-only NWS is incomplete |
| 7 | **Natural disasters** (`natural`) | **Partial** `gdacs-alerts` (OFF) | GDACS RSS/API; NASA EONET | **P1** | Admit only with STALE/UNAVAILABLE; research gate history |
| 8 | **Aviation / flights** | **Yes** `flights` (OpenSky + adsb.lol, ON) | OpenSky (NC license!); adsb.lol ODbL point API | **P0** | Commercial OpenSky needs agreement; regional ≠ worldwide |
| 9 | **Military activity / flights** (`military`) | **Yes** `military` (adsb.lol mil, default OFF) | adsb.lol military; USNI fleet **scrapes** = fragile | **P1** | Thesis-toggle; not Conf input |
| 10 | **Military bases** (`bases`) | **Partial** `military-installations` / awareness (OSM+Places, OFF) | OSM Overpass `military=*`; curated public registries — **not** WM’s 125k seed | **P2** | Viewport-bounded only; incomplete mapped context |
| 11 | **War / armed conflict** (`conflicts`) | **No** dedicated layer | UCDP GED (research ToS); ACLED (key + ToS); LiveUAMap **not** freely redistributable | **P1** | Prefer UCDP/ACLED via **own** server proxy; or WM REST if licensed — never scrape WM |
| 12 | **Crisis / conflict zones** | **No** polygons | Curated static GeoJSON (public domain / OSM DMZ etc.) maintained in GEV | **P1** | Hard-coded zones OK if attributed; no AI-invented polygons |
| 13 | **Intel hotspots** (`hotspots`) | **No** | GDELT DOC geo + surge heuristics **with** methodology label; not “AI Forecast” clone | **P2** | Correlation ≠ confirmation |
| 14 | **Satellites** | **Yes** `satellites` (CelesTrak SGP4, ON) | CelesTrak GP; SatNOGS TLE fallback (TB6) | **P0** | Propagated estimate from dated TLE — not live telemetry |
| 15 | **Sanctions** (`sanctions`) | **No** | OFAC SDN (US gov); EU consolidated list; UN sanctions — public lists | **P1** | Entity lookup cards in rail; map = country choropleth optional |
| 16 | **Economic centers** (`economic`) | **No** map layer | Static GFCI/exchange hubs GeoJSON; FRED/BIS **series** in rail | **P2** | Globe pins + rail quotes; Desk owns prices if any |
| 17 | **Minerals** (`minerals`) | **No** | USGS MCS tables (public); static concentration — **not** live | **P2** | Thesis cobalt/mines context; annual data |
| 18 | **Nuclear** (`nuclear`) | **No** | IAEA PRIS / OSM power=nuclear — static facilities | **P2** | Optional; low thesis density unless Hormuz/energy thesis |
| 19 | **Protests / unrest** | **No** | ACLED protests; GDELT (citation); democracy/log scaling if scoring | **P1** | Rail + sparse map; rate-limit |
| 20 | **Climate anomalies** | **No** | Open-Meteo ERA5 / climate API; NOAA | **P2** | Heatmap optional; don’t obscure AIS |
| 21 | **Refugee flows** | **No** | UNHCR data portal / IOM DTM (ToS check; often delayed) | **P2** | Rail cards; rarely live |
| 22 | **Live webcams** (thesis-useful only) | **Partial** `cctv` (Austin/Caltrans/TfL — traffic cams, default OFF) | Curated YouTube live **embeds** for chokepoints only; TfL/Caltrans if corridor-relevant | **P2** | **CUT** city traffic CCTV from thesis defaults; allowlist 4–8 strategic cams |
| 23 | **Submarine cables** | **Yes** TeleGeography (NC carve-out), default OFF | Keep OFF for commercial thesis or replace | **CUT / P2** | CC BY-NC-SA — commercial must remove |
| 24 | **Traffic** | **Yes** `traffic` | TomTom / OSM | **CUT** | Non-thesis noise |
| 25 | **Bikeshare** | **Yes** `bikeshare` | GBFS | **CUT** | Non-thesis |
| 26 | **Radio** | **Yes** `radio` | Radio Browser | **CUT** | Non-thesis |
| 27 | **Rocket launches** | **Yes** `rocket-launches` | Launch Library 2 | **P2** | Space thesis only |
| 28 | **Datacenters / dams** | **Yes** local layers | OSM extracts | **CUT** for thesis strip | Infra cascade = rail optional later |

### CUT list (explicit)

- traffic, bikeshare, radio  
- generic city CCTV grids (keep only strategic chokepoint/webcam allowlist)  
- positive-events / giving / crypto gimmicks / bikes / radio “fun”  
- any WM AGPL UI clone  
- fake live PortWatch / canal-blocked inference from low SOG alone  

---

## 2. Right-rail IA (trading-only · 3–5 panels max)

WM concepts Osato likes → **legal/safe GEV approximation** (honest STALE/UNAVAILABLE). Cap **5** panels; default show **4**.

| # | Panel | WM vibe | GEV approximation (public / existing) | Freshness contract |
|---|--------|---------|----------------------------------------|--------------------|
| **R1** | **Thesis Pulse** | Bloomberg-like live feed | Merge: GDELT DOC presets (Hormuz/Suez/Bab/Malacca/cobalt) + existing `disruptionContext` / regional-brief patterns; optional Google News RSS **personal/NC only** | Each row: source, observed/published time, STALE if >N min; never “LIVE” badge for syndicated news |
| **R2** | **Chokepoint Board** | Infrastructure cascades + shipping | PortWatch dated cards + AIS low-SOG candidate counts **per box** + marine-weather (Open-Meteo) | PortWatch = **dated**; AIS = position age; null ≠ zero vessels |
| **R3** | **Country / Corridor Risk** | Country instability (CII-like) | **Do not clone WM CII.** Lightweight scorecard: unrest count (ACLED if keyed) + conflict (UCDP) + news velocity (GDELT) + sanctions flag — methodology footnote; or UNAVAILABLE | Show components; if core sources down → **Insufficient data** (WM pattern is good UX — reimplement, don’t copy) |
| **R4** | **Market Context** | Markets beside map | Desk already owns trading; GEV rail = **read-only** WTI/Brent/Gold/VIX via public Yahoo/Stooq **or** Desk iframe — no Conf write | Quote age + exchange session; weekend = closed/STALE |
| **R5** (optional) | **Intel Brief** | AI Forecast / Live Intelligence | Short LLM brief **only** over retrieved headlines+events with citations; or static “no model” digest | Label **model paraphrase**; empty if sources insufficient — **no fabricated forecast** |

**Out of rail:** Radio, CCTV browser, bikeshare, Scene director clutter, Hatch/Conf chips.

**Chrome owner:** Astra — layout, badges, honesty chips, feed merge UI.  
**Globe owner:** Claude — map layers feeding R2 pins/overlays only.

---

## 3. Brutal 3D quality levers (Cesium / Ion) — without killing boot

**Keep haptics 1:1** — do not change `cameraControlConfig.js` constants.

Existing stacks (`mapStackController.js`): `photoreal` (Google 3D Tiles), `bing-aerial` / `bing-labels` (Ion), `esri-imagery` (keyless default land), `osm` + Re:Earth terrain.

### Boot-safe order (recommended)

1. **First paint:** Esri World Imagery + flat/ellipsoid or cached Re:Earth — already keyless path.  
2. **After idle / `requestIdleCallback` (~1–2s):** upgrade terrain to Re:Earth quantized-mesh if not ready.  
3. **User or thesis “HQ” toggle:** Bing Aerial (Ion token) **or** Google Photorealistic tileset — never block `:4173` ready on Ion/Google.  
4. **Never** await Google tileset before showing Esri.

### Quality knobs (tune after boot; measure FPS)

| Lever | Where / idea | Risk |
|-------|----------------|------|
| Ion Bing Aerial / Aerial+Labels | Existing stacks; ensure `CESIUM_ION_TOKEN` in env | Token + quota |
| Google Photorealistic 3D Tiles | `mapStartup.js` `createGooglePhotorealistic3DTileset` | Key restrictions, EEA billing, heavy GPU |
| `tileset.maximumScreenSpaceError` | Lower (e.g. 2–8) for sharper Google tiles; raise when FPS <45 | Boot/GPU cost — **apply post-load** |
| Imagery `maximumLevel` / clamp | Prefer high Maxar/Esri levels only when camera height < threshold | Tile storm at global zoom |
| Terrain | Re:Earth already; avoid Cesium World Terrain unless Ion paid & deferred | Extra fetch |
| `viewer.resolutionScale` | 1.0 default; optional 1.25 on dpr≤1 desktop HQ mode | Fill-rate |
| MSAA / FXAA | Enable FXAA light; MSAA only if GPU allows | Mobile kill |
| `requestRenderMode` | Keep idle governor (`renderGovernor.js`) — quality ≠ continuous 60 when parked | Don’t disable governor |
| LOD / entity budgets | AIS/FIRMS/flights already budgeted — tighten when HQ imagery on | Overdraw |
| Avoid | Continuous bloom+detection@100% + Google 3D + full AIS | Known FPS dips (PERFORMANCE.md) |

**Brutal resolution = HQ imagery/terrain after ready**, not more noise layers.

---

## 4. Ordered build plan

### Claude (globe / layers)

| Step | Work | Pri |
|------|------|-----|
| C0 | Freeze haptics; assert Mix-Lock scan (no Hatch/Conf/Edge/Sit) | P0 |
| C1 | Thesis defaults audit: ON = AIS, quakes, FIRMS, sats, flights, portwatch; OFF = traffic/bike/radio/cctv/cables | P0 |
| C2 | Boot path: Esri first → deferred Ion/Google MSE polish; document HQ toggle | P0 |
| C3 | Chokepoint visual pack: boxes + PortWatch cards honesty + AIS age chips on globe | P0 |
| C4 | Trade-route static ribbons (Hormuz–Malacca–Cape set) | P1 |
| C5 | Conflict zone polygons (curated) + optional UCDP/ACLED points via **own** proxy | P1 |
| C6 | Sanctions country tint / OFAC list join (static refresh) | P1 |
| C7 | Weather: enable marine-weather + selective NWS/GDACS with admission | P1 |
| C8 | Strategic webcam allowlist layer (not city CCTV) | P2 |
| C9 | CUT UI: hide traffic/bike/radio from thesis layer strip (keep code) | P0 |

### Astra (chrome / feeds / rail)

| Step | Work | Pri |
|------|------|-----|
| A0 | Right-rail shell: max 5 slots; trading IA R1–R4 (+R5 opt) | P0 |
| A1 | Honesty chrome: STALE/UNAVAILABLE/DEGRADED + source clocks; ban fake LIVE | P0 |
| A2 | Thesis Pulse feed (GDELT presets + disruption cards) | P0 |
| A3 | Chokepoint Board wiring to PortWatch + AIS summaries | P0 |
| A4 | Country/Corridor Risk **approximation** (components, no WM CII copy) | P1 |
| A5 | Market Context quotes or Desk deep-link | P1 |
| A6 | Intel Brief (cited only) or omit if no model key | P2 |
| A7 | QA: Hormuz/Suez/Bab/Malacca journeys; zero rows ≠ clear; Mix-Lock | P0 |

### Parallel / Grok

- Source ToS gate for ACLED/UCDP/OFAC before enable.  
- Optional: evaluate **WM MCP/REST** under Osato API plan for R3 scores only — **outputs** under EULA, not AGPL code. Prefer public first.

---

## 5. Explicit NO

1. **NO AGPL fork / vendor / iframe embed** of worldmonitor.app dashboard or `koala73/worldmonitor` platform source into GEV.  
2. **NO fake live** — PortWatch as live congestion; AIS gaps as “no ships”; FIRMS as confirmed facility fire; TLE as live sat track; news as LIVE wire.  
3. **NO Hatch / Conf / Edge / Sit** wiring, votes, size hints, or Desk signal writes.  
4. **NO haptic retune** of zoom/pan inertia.  
5. **NO promoting** traffic / bikes / radio into thesis defaults.  
6. **NO cloning** WM CII / AI Forecast algorithms or pasting their panel TypeScript.  
7. **NO bulk scrape** of WM front-end to bypass API metering (EULA §8).  
8. **NO commits** from this research deliverable alone.

---

## 6. Top 10 bullets — Grok joint

1. **Catalog ≠ code:** Steal WM *layer IA and rail density*; implement with GEV Cesium + public APIs — AGPL platform stays outside the MIT fork.  
2. **Haptics locked 1:1** (`cameraControlConfig.js`); spend the “wow” budget on **deferred Ion/Google/Esri sharpness**, not mouse feel.  
3. **Thesis ON core:** AIS, PortWatch (dated), USGS quakes, FIRMS, satellites, flights — already in `thesisDefaults.js`; finish honesty + chokepoint UX.  
4. **Biggest gap vs WM URL:** conflicts, hotspots, sanctions, tradeRoutes, economic, minerals, nuclear — **add via public lists/static GeoJSON**, not WM embed.  
5. **CUT noise hard:** traffic, bikeshare, radio, city CCTV grids — keep code, exile from thesis strip/rail.  
6. **Right rail ≤5:** Thesis Pulse · Chokepoint Board · Country/Corridor Risk (honest components) · Market Context · optional cited Brief.  
7. **WM REST/MCP is a paid Outputs path** (EULA), not a license to ship their UI; public upstreams remain default for isolation + cost.  
8. **Brutal 3D = post-boot HQ:** Esri land → idle terrain → optional Bing/Google + lower `maximumScreenSpaceError`; keep `requestRenderMode` governor.  
9. **Claude = globe layers + boot/HQ; Astra = rail chrome + feeds + STALE badges; Grok = ToS/priority gate.**  
10. **Mix-Lock forever:** Lagebild only — beautiful globe must never write Conf/Edge/Sit/Hatch.

---

## 7. GEV inventory snapshot (2026-09-22)

Registered / thesis-relevant layer ids:

| id | thesisDefault |
|----|---------------|
| `ais-live-vessels` | ON |
| `earthquakes` | ON |
| `local-firms` | ON |
| `satellites` | ON |
| `flights` | ON |
| `portwatch` | ON |
| `military` | OFF |
| `military-awareness` / `military-installations` | OFF |
| `gdacs-alerts` / `emsc-quakes` / `nws-alerts` / `marine-weather` | OFF |
| `cctv` / `traffic` / `radio` / `bikeshare` | OFF (CUT from thesis) |
| `telegeography-submarine-cables` / `local-dams` / `local-datacenters` / `rocket-launches` | OFF |

Camera: WM-like fluidity **already shipped** — preserve.

---

## 8. References

- GEV: `DATA_SOURCES.md`, `src/thesisDefaults.js`, `src/cameraControlConfig.js`, `src/mapStackController.js`, `docs/TB6-LIVE-API-RESEARCH-ASTRA.md`, `docs/TRIPLE-BRAIN-THESIS-CLAUDE.md`  
- WM: OpenAPI `https://www.worldmonitor.app/openapi.yaml`, MCP `https://worldmonitor.app/mcp`, agents `https://www.worldmonitor.app/agents.md`, EULA `https://www.worldmonitor.app/docs/eula`, architecture/data pipeline docs  

**End TB9 research.** Ready for Claude/Astra build tickets; no repo commits from this file write.
