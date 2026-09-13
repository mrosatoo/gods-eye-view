# Triple-Brain Thesis — Claude
## Architektur & Build-Readiness: Owned GEV Hedge-Fund Basis

**Stand:** 2026-09-13  
**Autor:** Claude (Architektur & Spec-Tor)  
**Branch:** `cursor/god-eye-owned-basis`  
**Repo:** `mrosatoo/gods-eye-view` (Owned Fork)  
**Arch:** A (locked) — Desk `/god-eye` iframe → GEV `:4173`  

---

## 1. Desk `/god-eye` — UX Definition of Done (< 60 s)

Osato klickt in der Desk-Sidebar auf **God Eye View**. Innerhalb von 60 Sekunden muss folgendes stehen:

| Sekunde | Was passiert | Beweis |
|---------|-------------|--------|
| 0–2 | Iframe lädt `http://localhost:4173/?welcome=0&v=2&l=a` | `GodEyeClient.tsx` + `god-eye.ts` `GEV_DEFAULT_URL` |
| 2–5 | Esri-Satellite-Globus rendert (keyless Default-Basemap) | `mapStartup.js` → Esri World Imagery |
| 5–8 | AIS Layer auto-on via URL-Param `l=a` (first-run shipping preset) | `layerState.js` v2 codec + `firstRunExperience.js` |
| 8–15 | AIS WebSocket connected, erste Vessel-Positionen strömen | `aisStreamAdapter.js` → `AISSTREAM_API_KEY` → WS |
| 15–20 | FIRMS + Earthquakes togglebar (Mission ENVIRONMENTAL oder manuell) | `localLayers.js` → `firmsHeatmap.js` + `earthquakes.js` |
| 20–30 | Location-Pill **Hormuz** klicken → Fly-to `26.57°N 56.25°E` alt 180 km | `locations.js` `CITY_POIS.hormuz` (seit 2026-09-12) |
| 30–45 | AIS-Schiffe im Strait sichtbar — Dichte visuell lesbar | `aisLiveVessels.js` render-loop, 12k rows Default |
| 45–55 | Satellites toggle-on → CelesTrak 833 Orbits + ISS | `satellites.js` + `/api/celestrak` Proxy (HTTPS→HTTP fallback) |
| 55–60 | Photoreal on-demand: Map-Tray → Ion → Zoom auf Hafen | `mapStackController.js` → `CESIUM_ION_TOKEN` |

**Header-Chip muss immer zeigen:** *Lagebild only · never feeds Conf*  
**Nicht in 60 s nötig:** PortWatch (GAP), GDELT-Globe, Scene Director, CCTV

### Fail-States (ehrlich)

| Failure | Ursache | Recovery |
|---------|---------|----------|
| Leerer Frame | GEV `:4173` nicht gestartet / Node-Version falsch | `nvm use 24.14.0 && npm run dev` |
| AIS stumm | `AISSTREAM_API_KEY` nicht in `.env` oder WebSocket-Timeout | Key prüfen; `AIS_FIRST_CONNECT_GRACE_MS` = 30 s Grace |
| CelesTrak TLS-EOF | Upstream TLS instabil | Proxy hat automatischen HTTP-Fallback + Disk-Cache |
| Framing blocked | `GEV_FRAME_ANCESTORS` fehlt `:3000` | `.env` → `GEV_FRAME_ANCESTORS=http://localhost:3000` |

---

## 2. P0–P3 Layer IN/OUT

### IN — Ranked nach Thesis-Nutzen

#### P0 — Shipping / Chokepoint (höchste Thesis-Dichte)

| Layer | Registry-ID | Status | Source | Thesis-Nutzen |
|-------|-------------|--------|--------|---------------|
| **AIS Live Vessels** | `ais-live-vessels` | **LIVE** | AISStream WS via `/api/ais-live` | Schiffe an Hormuz/Suez/Bab/Malacca/Cape in Echtzeit |
| **Chokepoint Presets** | — (Location Pills) | **LIVE** | `locations.js` `CITY_POIS` | 1-Click Fly-to Hormuz/Suez/Bab/Malacca/Cape |
| **IMF PortWatch Overlay** | — | **GAP** | IMF PortWatch API (keyless) | Congestion/Waiting-Queues an `chokepoint6` Hormuz etc. |
| **AIS Stuck-Ship Semantik** | — | **GAP** | Lokale Heuristik auf AIS-Daten | „Ship blocked / anchored cluster / drift" Detection |
| **Submarine Cables** | `telegeography-submarine-cables` | LIVE (sekundär) | TeleGeography bundle | Crypto/Infra-Narrativ; CC BY-NC-SA Lizenz beachten |

#### P1 — Satellites

| Layer | Registry-ID | Status | Source | Thesis-Nutzen |
|-------|-------------|--------|--------|---------------|
| **CelesTrak Satellites** | `satellites` | **LIVE** | CelesTrak TLE (keyless Proxy + Cache) | Orbit-Kontext, ISS, Regime-Read |

#### P2 — Disruption Events

| Layer | Registry-ID | Status | Source | Thesis-Nutzen |
|-------|-------------|--------|--------|---------------|
| **FIRMS Active Fires** | `local-firms` | **LIVE** | NASA FIRMS via `/api/firms` | Energie/Mine/Waldbrand nahe Supply-Korridoren |
| **USGS Earthquakes** | `earthquakes` | **LIVE** | USGS `all_day.geojson` M2.5+ (keyless) | Pipeline/Hafen/Mine-Schock |
| **GDELT Headlines** | — | **PARTIAL** | GDELT DOC 2.0 (keyless) → Cockpit Brief | Spot-Events Hormuz/Mine als Brief-Kontext |

#### P3 — Photoreal on Demand

| Layer | Registry-ID | Status | Source | Thesis-Nutzen |
|-------|-------------|--------|--------|---------------|
| **Cesium Ion Photoreal** | — (Map Stack) | **LIVE** | `CESIUM_ION_TOKEN` | Hafen/Mine/Engstelle Detail-Zoom |
| **Esri World Imagery** | — (Default Basemap) | **LIVE** | Esri (keyless) | Immer-an Landing-Globus |

### OUT — Explizite Ausschlussliste

| Was | Warum | Lock |
|-----|-------|------|
| **Bias / Conf / Edge / Sit / FA** | Isolation: GEV speist nie den Entscheidungspfad | LOCK |
| **RECON / Port-Scan / OSINT-Scrape** | Offensive Tools verboten | LOCK |
| **Voice / Mic / AI-HUD-Summary** | WONTFIX per Osato Gate | LOCK |
| **iframe `osirisai.live`** | Fremde Vercel nie als Produkt | LOCK |
| **Osiris-Runtime als Default-Embed** | Arch A′ widerrufen; Osiris = Look-Ref only | LOCK |
| **Junk-Public-Webcams als Default** | Austin/Caltrans/TfL/Shinjuku ≠ WTI-Thesis | LOCK |
| **CCTV Packs** (`cctv`) | Geografisch falsch für Chokepoints; OUT default | SKIP |
| **TomTom Street Traffic** (`traffic`) | Stadtstau ≠ Öl-/Metall-Route | SKIP |
| **Radio** (`radio`) | Entertainment | SKIP |
| **Bikeshare** (`bikeshare`) | Irrelevant | SKIP |
| **Space Missions LL2** (`rocket-launches`) | Spectacle, nicht Thesis | SKIP |
| **Hatch-Engine-Code** | Unverändert lassen | LOCK |
| **Secrets in Commits** | Nur Env-Namen, nie Werte | LOCK |
| **GEV → Desk Signal-Bus** | Kein Lane-Vote / Size-Hint / Conf-Write | LOCK |
| **Google News als Default-Quelle** | Kein kommerzielles Default ohne ToS-Check | SKIP |
| **OpenSky als Pflicht** | NC-Lizenz; adsb.lol Fallback reicht | SKIP |

---

## 3. Konkreter GEV File/Module Plan

### Bestehende Module (keine Änderung nötig)

| Modul | Pfad | Funktion |
|-------|------|----------|
| AIS Adapter | `src/data/aisStreamAdapter.js` | WebSocket zu AISStream, Message-Parsing |
| AIS Renderer | `src/data/aisLiveVessels.js` | Vessel-Sprites, Labels, Trails, Focus |
| AIS Watchdog | `src/data/aisWatchdog.js` | Connection Health, Reconnect |
| Vessel Labels | `src/data/vesselLabels.js` | Card-Rendering, Type-Accent |
| FIRMS Heatmap | `src/data/firmsHeatmap.js` | NASA FIRMS Heatmap + Cards |
| Fire Anchors | `src/data/fireAnchors.js` | DEM-Lift für Feuer-Marker |
| Earthquakes | `src/data/earthquakes.js` | USGS 24h GeoJSON M2.5+ |
| Satellites | `src/data/satellites.js` | CelesTrak 833 Orbits, ISS Pass |
| Layer State | `src/data/layerState.js` | v2 Registry, URL-Codec, Persistence |
| Layer Manager | `src/data/manager.js` | Enable/Disable Orchestration |
| Local Layers | `src/data/localLayers.js` | FIRMS + Infrastructure Bundle |
| Locations | `src/locations.js` | CITY_POIS inkl. Chokepoints |
| Map Stack | `src/mapStackController.js` | Esri/Ion/Google-3D Switching |
| Map Startup | `src/mapStartup.js` | Cesium Viewer Bootstrap |
| First-Run | `src/firstRunExperience.js` | Shipping Preset, AIS Default-on |
| Vite Proxy | `vite.config.js` | `/api/ais-live`, `/api/firms`, `/api/celestrak`, `/api/radio`, etc. |

### Neue Module (48h Build)

| Modul | Vorgeschlagener Pfad | Funktion | Priorität |
|-------|---------------------|----------|-----------|
| **PortWatch Proxy** | `vite.config.js` (neuer Middleware-Block) | Read-only Proxy zu IMF PortWatch API, in-memory Cache (1h TTL) | P0 |
| **PortWatch Layer** | `src/data/portWatchOverlay.js` | GeoJSON-Overlay für Chokepoint-Congestion: transit counts, waiting vessels, delay estimates. Kein Conf-Hook. | P0 |
| **Stuck-Ship Heuristik** | `src/data/aisStuckDetection.js` | Client-side SOG≈0 + Anchor-Cluster Detection im AIS-Feed. Viewport-Dichte Flags am Chokepoint. Kein ML, kein Backend. | P0 |
| **Thesis-Default Config** | `src/thesisDefaults.js` | Zentrale Config: welche Layers default-on (AIS, optional FIRMS/Quakes), welche Chokepoint-Views pre-loaded, CCTV/Traffic/Radio default-off | P0 |
| **Disruption Brief Panel** | `src/data/disruptionBrief.js` | GDELT DOC-Preset-Queries (Hormuz, Suez, Cobalt, Mine, Blockade) → Context-Panel-Karten. Read-only, nie Sit-Trigger. | P2 |

### CSS — Cyan/Gold HUD (Details in §5)

| Datei | Änderung |
|-------|---------|
| `style.css` (Root) | Tokens `--gev-osiris-*` bereits committed (b8ea4c1) |
| `src/ui/styles/foundation.css` | `--accent` (#00d4ff → #00e5ff) Upgrade; `--gev-gold` Token hinzufügen |
| `src/ui/styles/layers.css` | AIS-Label Accent → Cyan; FIRMS → Gold |
| `src/ui/styles/controls.css` | Active-Chip Border Cyan |
| `src/ui/styles/command-dock.css` | Dock-Border Cyan Glow |
| `src/ui/styles/location.css` | Chokepoint-Pill Gold Highlight |

---

## 4. PortWatch + Stuck-Ship Design

### 4.1 IMF PortWatch Integration

**Quelle:** IMF PortWatch API — öffentlich, keyless, RESTful.  
**Endpunkt-Typ:** `chokepoint6` (Hormuz, Suez, Bab el-Mandeb, Malacca, Singapore, Cape) + globale Trade-Transit-Daten.

```
Architektur:

Browser (GEV)
  │
  ├── GET /api/portwatch?chokepoint=hormuz
  │         │
  │    vite.config.js Proxy Middleware
  │    ┌────────────────────────────────┐
  │    │ In-memory Cache (1h TTL)       │
  │    │ Upstream: portwatch.imf.org    │
  │    │ Response: JSON transit counts  │
  │    │ No auth needed (public API)    │
  │    │ Rate limit: 1 req/choke/hour   │
  │    └────────────────────────────────┘
  │
  └── portWatchOverlay.js
      ├── GeoJSON Polygon per Chokepoint (hardcoded bounding)
      ├── Fill: Congestion Gradient (Green→Amber→Red)
      ├── Label: "Hormuz: 14 transits/day (avg 18) ▼ 22%"
      └── Click: Detail Card (kein Conf-Write)
```

**Proxy (in `vite.config.js`):**

```javascript
// Neuer Block nach celestrak-proxy
// IMF PortWatch proxy — keyless, 1h cache, read-only
server.middlewares.use('/api/portwatch', async (req, res) => {
  // Parse ?chokepoint=hormuz|suez|bab|malacca|singapore|cape
  // Cache in-memory Map<string, {data, ts}>
  // Upstream: https://portwatch.imf.org/api/...
  // Return: { chokepoint, transitCount, avgTransitCount, pctChange, lastUpdated }
  // No Conf/Sit/Edge wiring — pure read
});
```

**Layer-Modul (`src/data/portWatchOverlay.js`):**

```javascript
// Responsibilities:
// 1. Fetch /api/portwatch?chokepoint=<name> on enable
// 2. Render Cesium Polygon/Label per chokepoint
// 3. Congestion color: green (normal), amber (>10% drop), red (>25% drop)
// 4. Card on click: transit stats + trend
// 5. Refresh: every 60 min (PortWatch updates daily)
// 6. NEVER: write to Desk, trigger Conf/Sit, send Signal
//
// Registry entry in LAYER_STATE_REGISTRY:
//   { id: 'portwatch', enabled: false, ... }
//
// Dependencies: locations.js chokepoint coords for polygon placement
```

**Chokepoint Bounding-Boxes (hardcoded, nicht dynamisch):**

| Chokepoint | SW Lat/Lon | NE Lat/Lon |
|-----------|-----------|-----------|
| Hormuz | 25.5, 55.5 | 27.5, 57.5 |
| Suez | 29.0, 32.0 | 31.0, 33.5 |
| Bab el-Mandeb | 11.5, 42.5 | 13.5, 44.5 |
| Malacca | 1.0, 100.0 | 4.0, 104.0 |
| Singapore | 0.8, 103.0 | 1.8, 104.5 |
| Cape | -35.5, 17.5 | -33.5, 20.5 |

### 4.2 Stuck-Ship Semantik

**Problem:** AIS Live liefert Rohpunkte — Schiffspositionen mit SOG/COG/Heading. Kein semantisches Signal „Ship stuck / Convoy waiting / Canal blocked".

**Design: Client-Side Heuristik (kein ML, kein Backend)**

```
Modul: src/data/aisStuckDetection.js

Input:  AIS vessel array aus aisLiveVessels.js
        (mmsi, lat, lon, sog, cog, heading, shipType, timestamp)

Regeln:
  1. ANCHORED:   SOG < 0.5 kn AND NavStatus = "at anchor" (wenn verfügbar)
  2. DRIFTING:    SOG < 1.0 kn AND SOG > 0 AND keine Heading-Änderung > 10° in 5 min
  3. CLUSTER:     >= 5 Vessels mit SOG < 1.0 kn innerhalb 2 nm Radius
  4. CHOKEPOINT:  Vessel innerhalb eines der 6 Chokepoint-Bounding-Boxes
  5. STUCK_FLAG:  ANCHORED OR DRIFTING innerhalb CHOKEPOINT Bbox

Output:
  - Vessel-Level:  stuckFlag: boolean pro Vessel
  - Cluster-Level: stuckCluster: { center, count, avgSog, chokepoint }
  - Viewport:      Density-Badge im Location-Bar: "Hormuz: 47 vessels, 12 stuck"

Rendering:
  - Stuck-Vessels:  Amber Glow Ring um Sprite (pulsierend)
  - Cluster:        Amber Circle-Overlay mit Count-Label
  - Badge:          Top-bar neben Chokepoint-Name: "12 ⚓" (Amber)

NICHT:
  - Kein ML, kein Upstream-Service
  - Kein Signal an Conf/Sit/Edge
  - Kein "Blockade detected" Auto-Alert
  - Rein visuell für menschliche Thesis-Bildung
```

**Integration in `aisLiveVessels.js`:**

```javascript
// In der bestehenden preRender loop:
// 1. Nach vessel position update: stuckDetection.evaluate(vessels, viewportBbox)
// 2. stuckDetection liefert stuckFlags Map<mmsi, StuckInfo>
// 3. Rendering: amber glow ring via billboard.color modulation
// 4. Cluster: Cesium.Entity circle + label (separate collection)
//
// Performance: O(n) scan + spatial hash für Cluster (~30ms bei 5000 Vessels)
// Kein Web Worker nötig bei dieser Größenordnung
```

---

## 5. Cyan/Gold HUD in GEV

### Design-Philosophie

Osiris = **Look-Inspiration only**. Die Cyan (#00e5ff) / Gold (#ffd700) Palette wird nativ in GEV CSS gebaut, nicht per Osiris-iframe importiert. Ziel: Command-Center-Ästhetik auf Hedge-Fund-Niveau.

### Token-Hierarchie

```css
/* Bereits committed (b8ea4c1): */
:root {
  --gev-osiris-cyan:      #00e5ff;
  --gev-osiris-gold:      #ffd700;
  --gev-osiris-cyan-dim:  rgba(0, 229, 255, 0.35);
  --gev-osiris-gold-dim:  rgba(255, 215, 0, 0.28);
  --gev-osiris-panel:     rgba(6, 14, 22, 0.82);
  --gev-osiris-border:    rgba(0, 229, 255, 0.22);
}

/* Geplante Erweiterung: */
:root {
  /* Status-Semantik */
  --gev-status-live:      var(--gev-osiris-cyan);     /* Feed aktiv */
  --gev-status-warning:   #ffab00;                     /* Degraded/Stale */
  --gev-status-critical:  #ff3d00;                     /* Offline/Error */
  --gev-status-stuck:     #ff9100;                     /* Stuck-Ship Amber */

  /* Thesis-Accents */
  --gev-chokepoint-fill:  var(--gev-osiris-cyan-dim);  /* PortWatch Overlay */
  --gev-chokepoint-warn:  var(--gev-osiris-gold-dim);  /* Congestion Drop */
  --gev-vessel-trail:     #39ffd5;                     /* AIS Trail (bestehend) */
  --gev-vessel-stuck:     var(--gev-status-stuck);     /* Stuck-Ship Glow */

  /* Typography */
  --gev-readout-font:     var(--font-mono);            /* HUD Readouts */
  --gev-readout-size:     11px;
  --gev-readout-color:    var(--gev-osiris-cyan);
}
```

### Anwendung pro UI-Region

| Region | Cyan | Gold | Effekt |
|--------|------|------|--------|
| **Panel-Borders** | `--gev-osiris-border` | — | Subtiler Cyan-Glow Ring um alle Panels |
| **Location-Pills** (Chokepoints) | Hover-Border | Active-Highlight Gold für Shipping-Pill | Gold = Thesis-Fokus |
| **AIS Vessel Labels** | `--gev-osiris-cyan` Accent | — | Schiffe leuchten Cyan |
| **Stuck-Ship Glow** | — | `--gev-status-stuck` Amber | Pulsierender Ring |
| **PortWatch Overlay** | Normal-Fill Cyan-Dim | Congestion-Fill Gold-Dim | Farbwechsel = Thesis-Signal |
| **FIRMS Fire Markers** | — | `--gev-osiris-gold` | Gold-Akzent für Feuer |
| **Earthquake Circles** | `--gev-osiris-cyan` | — | Cyan Ring + Magnitude |
| **Satellite Orbits** | `--gev-osiris-cyan` (bestehend) | — | Bereits Cyan |
| **Data-Layer Toggle ON** | Cyan Dot/Border | — | Aktiver Layer = Cyan |
| **HUD Readouts** | Mono-Font in Cyan | — | Lat/Lon/Alt Readouts |
| **First-Run Shipping Button** | — | `--gev-osiris-gold` (committed) | "Shipping" Thesis-Entry Gold |

### Nicht in Scope (Look-Ref Grenze)

- Kein Osiris-MapLibre Dark-Mode als Basemap (Cesium/Esri bleibt)
- Kein Osiris-Logo/Branding in GEV
- Kein Osiris-Font Import (Inter + JetBrains Mono bleiben)
- Kein Gradient-Hintergrund (GEV `--bg-dark: #0a0a0f` bleibt)

---

## 6. 48h Build Order

### Phase-Matrix

| # | Stunde | Aufgabe | Dateien | Ergebnis | Abhängigkeiten |
|---|--------|---------|---------|----------|---------------|
| **1** | 0–2 | **Click-Path Green** | — (Verify only) | DoD §1 Basis: GEV :4173 + Desk :3000 + `/god-eye` embeddable; AIS/FIRMS/Sats/Quakes manuell verify | Node 24.14, Keys in `.env` |
| **2** | 2–6 | **Thesis Defaults** | `src/thesisDefaults.js`, `src/firstRunExperience.js`, `src/data/layerState.js` | AIS default-on; CCTV/Traffic/Radio default-off; Shipping First-Run preset polished | Step 1 green |
| **3** | 6–10 | **Stuck-Ship Heuristik** | `src/data/aisStuckDetection.js`, `src/data/aisLiveVessels.js` (import + render integration) | SOG<0.5 Anchor/Drift Flags; Chokepoint-Cluster Badges; Amber Glow Sprites | AIS LIVE |
| **4** | 10–14 | **Stuck-Ship UX** | `src/data/vesselLabels.js` (stuck card variant), `src/ui/styles/layers.css` | Stuck-Vessel Cards: "⚓ Anchored 2h · SOG 0.1 kn"; Cluster Badge "12 ⚓" im Location-Bar | Step 3 |
| **5** | 14–22 | **PortWatch Proxy + Layer** | `vite.config.js` (proxy block), `src/data/portWatchOverlay.js`, `src/data/layerState.js` (registry entry) | PortWatch `chokepoint6` Congestion-Overlay: Transit Counts, Trend, Chokepoint-Polygon | Keyless API verify |
| **6** | 22–28 | **Cyan/Gold HUD Polish** | `style.css`, `src/ui/styles/foundation.css`, `layers.css`, `controls.css`, `command-dock.css`, `location.css` | Vollständige Osiris-Inspired Palette; Status-Semantik Tokens; Chokepoint Gold Highlights | Steps 3–5 (Design mit Content) |
| **7** | 28–34 | **Disruption Pack** | `src/data/disruptionBrief.js` (optional), `src/data/earthquakes.js` (filter tweak), `firmsHeatmap.js` | FIRMS+USGS als "Earth Watch" One-Click; GDELT Keywords für Hormuz/Suez (nur wo Brief schon im Stack) | FIRMS/USGS LIVE |
| **8** | 34–40 | **Photoreal Playbook + Ion QA** | Docs only; optional `mapStackController.js` tweak | Ion-on-demand Kurzpfad für Hafen/Mine Zoom; GPU/Quota Schon-Strategie dokumentiert | Ion Token set |
| **9** | 40–44 | **Docs Sync + Env Cleanup** | `.env.example`, `DATA_SOURCES.md`, `STATUS.md` | A′-Stale-Refs → Arch A; Thesis-Absatz in STATUS; Proof-Screenshot "Hormuz AIS + Stuck" | All steps |
| **10** | 44–48 | **Integration Test + Handoff** | — (Manual QA) | End-to-End: Desk → God Eye → Hormuz → AIS + Stuck + PortWatch → Thesis-Narrativ lesbar in <60s | Steps 1–9 |

### Parallelisierung

- Steps 3–4 (Stuck-Ship) und Step 5 (PortWatch) sind **unabhängig** — können parallel gebaut werden.
- Step 6 (CSS) hängt von Steps 3–5 ab (Design braucht Content für Feinschliff).
- Step 7 (Disruption) ist unabhängig von Steps 3–6.

### Stop-Bedingungen

Jeder Touch an diesen Dateien/Konzepten → **sofortiger Abort**:
- `src/lib/god-eye.ts` Conf/Sit/Edge Import
- Hatch-Engine Module
- Voice/Mic/`OPENAI_*` Integration
- `osirisai.live` iframe
- Secret-Werte in Code/Docs/Commits

---

## 7. Explizite OUT-Liste

### Architektur-OUT (nie bauen)

| Item | Begründung |
|------|-----------|
| Bias/Conf/Edge/Sit/FA Wiring | Isolation Lock — GEV speist nie Engine-Entscheidungen |
| GEV → Desk postMessage/API | Sandboxed Sibling, eigene Origin, kein Signal-Bus |
| RECON / Scanner / OSINT-Scrape | Offensive Tools — NEVER |
| Voice / Mic / Realtime-AI-HUD | WONTFIX per Osato Gate |
| Osiris-Runtime als Default | Look-Ref only, nie iframe/Embed |
| ML/AI Stuck-Ship Detection | Heuristik reicht; kein Backend-ML für Trading-Thesis |
| Auto-Alert "Blockade detected" | Menschliche Thesis-Bildung, kein Auto-Signal |

### Feature-OUT (bewusst nicht Default)

| Feature | Registry-ID | Begründung |
|---------|-------------|-----------|
| CCTV Packs | `cctv` | Austin/TfL/Shinjuku ≠ Chokepoint; ON nur wenn echte Port-Cams existieren |
| Street Traffic | `traffic` | TomTom Midtown ≠ WTI-Route |
| Radio | `radio` | Entertainment, nicht Thesis |
| Bikeshare | `bikeshare` | Irrelevant |
| Space Missions | `rocket-launches` | Spectacle |
| Live Flights | `flights` | Sekundär vs Schiffe; nur bei Luftlage-Eskalation |
| Military Awareness | `military-awareness` | Engine-Komponente, nicht Lagebild-Default |
| Datacenters | `local-datacenters` | Nische |
| Dams | `local-dams` | Nische |

### Quellen-OUT (nie einbinden)

| Quelle | Begründung |
|--------|-----------|
| Google News RSS als Default | Kommerziell ohne ToS-Freigabe |
| OpenSky als Pflicht | NC-Lizenz; adsb.lol Fallback reicht |
| Wix/Public Webcam-Verzeichnisse | Junk für Thesis |
| Neue API-Keys ohne Osato-Go | Budget/Compliance Gate |

---

## 8. Deploy Path — Clickable God Eye Tab Link

### Lokale Entwicklung (heute)

```
┌─────────────────────────────────────────────────┐
│  Osato Desk (Next.js :3000)                     │
│  ┌───────────┐  ┌─────────────────────────────┐ │
│  │ Sidebar   │  │  /god-eye                   │ │
│  │           │  │  ┌────────────────────────┐  │ │
│  │ [God Eye] ├──┤  │ iframe                 │  │ │
│  │ [Conf]    │  │  │ src=GEV :4173          │  │ │
│  │ [Edge]    │  │  │ ?welcome=0&v=2&l=a     │  │ │
│  │ [...]     │  │  │                        │  │ │
│  │           │  │  │  ┌──────────────────┐  │  │ │
│  │           │  │  │  │ Cesium Globe     │  │  │ │
│  │           │  │  │  │ + AIS + FIRMS    │  │  │ │
│  │           │  │  │  │ + Satellites     │  │  │ │
│  │           │  │  │  │ + PortWatch(GAP) │  │  │ │
│  │           │  │  │  └──────────────────┘  │  │ │
│  │           │  │  └────────────────────────┘  │ │
│  └───────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Terminal A: cd /workspace/gods-eye-view && nvm use 24.14.0 && npm run dev -- --host 127.0.0.1 --port 4173
Terminal B: cd /workspace/osato-desk-pr && npm run dev -- --port 3000
```

### Env-Konfiguration (Desk)

```bash
# /workspace/osato-desk-pr/.env.local
NEXT_PUBLIC_GEV_URL=http://localhost:4173
# Kein NEXT_PUBLIC_GEV_DEPTH_URL (A′ legacy)
# Kein NEXT_PUBLIC_OSIRIS_LOOK_URL (optional, nicht Default)
```

### Env-Konfiguration (GEV)

```bash
# /workspace/gods-eye-view/.env
GEV_FRAME_ANCESTORS=http://localhost:3000
CESIUM_ION_TOKEN=<via-env-only>
AISSTREAM_API_KEY=<via-env-only>
FIRMS_MAP_KEY=<via-env-only>
# Optional (nicht Thesis-P0):
# TOMTOM_API_KEY=<via-env-only>
# GOOGLE_MAPS_API_KEY=<via-env-only>
# OPENSKY_CLIENT_ID / SECRET
# LL2_API_TOKEN
```

### Click-Pfad für Osato

1. **Desk** starten (`:3000`)
2. **GEV** starten (`:4173` — Node 24.14!)
3. Sidebar → **God Eye View** klicken
4. Globus lädt mit Esri Basemap
5. AIS auto-on (URL-Param `l=a`)
6. Location-Pill **Hormuz** klicken
7. Schiffe im Strait of Hormuz sichtbar
8. *(Nach Build Step 3):* Stuck-Ship Amber-Glow sichtbar
9. *(Nach Build Step 5):* PortWatch Congestion-Overlay sichtbar
10. **Thesis lesen** — menschlich, nie automatisch in Conf

### Production Deploy (nicht jetzt, Roadmap)

| Phase | Aktion | Ergebnis |
|-------|--------|---------|
| **Alpha** (jetzt) | Lokal :4173 + :3000 | Osato-only, Dev-Box |
| **Beta** | GEV `npm run build` → Static Assets; Desk als Host | Single-Machine Preview |
| **Staging** | GEV auf eigenem Port/Container; Desk iframe URL anpassen | Team-Review möglich |
| **Prod** | GEV auf `gev.osato.internal` o.ä.; `NEXT_PUBLIC_GEV_URL` auf prod-URL; `GEV_FRAME_ANCESTORS` auf prod-Desk-Domain | Hedge-Fund-Grade |

**Nie:** `osirisai.live` als Prod-GEV-Target. Nie fremde Vercel-URLs.

---

## Appendix A — Ehrliche Gap-Analyse

| # | Gap | Schwere | Abhilfe | Stunde |
|---|-----|---------|---------|--------|
| 1 | **PortWatch = 0** | Hoch | Proxy + Overlay bauen (keyless API) | 14–22 |
| 2 | **Stuck-Ship Semantik = 0** | Hoch | Client-side SOG/Cluster Heuristik | 6–14 |
| 3 | **GDELT nicht Globus-first** | Mittel | Keyword-Presets für Hormuz/Suez im Brief-Panel | 28–34 |
| 4 | **Energie-Feuer ohne Anchors** | Niedrig | Pipeline/Terminal POIs in FIRMS-Filter (später) | >48h |
| 5 | **Docs A′-Stale** | Niedrig | `.env.example` + STATUS bereinigen | 40–44 |
| 6 | **Kein Water-Stress Layer** | Niedrig | Kein ehrlicher keyless Source → OUT bis Source gefunden | — |
| 7 | **Kein Facility Truck Density** | Niedrig | Kein ehrlicher Source → OUT bis Source gefunden | — |
| 8 | **CCTV an falschen Orten** | n/a | OUT-Lock; neue Packs nur mit echten Choke-Cams | — |

## Appendix B — Key-Inventar

| Key (Env-Name) | Status | Pflicht für Thesis? |
|----------------|--------|-------------------|
| `AISSTREAM_API_KEY` | Gesetzt | **Ja** (P0) |
| `CESIUM_ION_TOKEN` | Gesetzt | Ja (P3 on-demand) |
| `FIRMS_MAP_KEY` | Gesetzt | Ja (P2) |
| `GEV_FRAME_ANCESTORS` | Gesetzt | **Ja** (Desk-Embed) |
| `TOMTOM_API_KEY` | Gesetzt | Nein (Thesis OUT) |
| `GOOGLE_MAPS_API_KEY` | Optional unset | Nein (Search nice-to-have) |
| `OPENSKY_CLIENT_*` | Optional unset | Nein (adsb.lol Fallback) |
| `LL2_API_TOKEN` | Optional unset | Nein (public reicht) |
| `OPENAI_*` | Gesetzt aber WONTFIX | Nein (Voice = WONTFIX) |

## Appendix C — Architekturprinzipien (Qualitätstor)

1. **Kein erfundenes LIVE.** Jeder Status-Claim basiert auf Datei-Evidenz oder Probe.
2. **Kein Secret in Docs/Code.** Nur Env-Namen, nie Werte.
3. **Isolation prüfen.** Jeder Commit wird gegen Conf/Sit/Edge/Bias-Import geprüft.
4. **Gap-Liste brutal halten.** Lieber ehrlich GAP als falsch LIVE.
5. **Menschliche Thesis.** GEV informiert Osato. Osato entscheidet. Engine bleibt stumm.
6. **Owned Basis.** Code und Keys gehören uns. Upstream-APIs sind austauschbar.
7. **Keine Fake-Precision.** Wenn kein ehrlicher Source existiert, ist das Feature OUT.

---

*Ende Triple-Brain Thesis Claude.*  
*Nächster Schritt: Build Phase 1 (Steps 1–5, Stunde 0–22).*
