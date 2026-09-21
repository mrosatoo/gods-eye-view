# TB8 AIS repair and feed QA — Astra

Completed 2026-09-16 for [OSA-63](/OSA/issues/OSA-63), parent [OSA-61](/OSA/issues/OSA-61).

## Outcome

Real AIS vessels now render and refresh. Browser samples at 2026-09-16T21:23:04.798Z and 2026-09-16T21:23:27.052Z contained 12,000 vessels; **1,372 shared MMSIs changed observed latitude/longitude**. Screenshot visually inspected. No fixture positions, synthetic motion, substitute feed, additional AIS socket, or Worldmonitor code used.

## Defects repaired

- AISStream emits `last_position_epoch` in Unix seconds. Client eviction compared it against milliseconds, dropping every row as ancient. Normalize units at the wire boundary; real wire-shape regression now proves a fresh vessel survives.
- Poll interval was 60 seconds, longer than the 30-second first-connect grace. Shared-cache snapshots now poll every 10 seconds. Empty post-filter results explicitly report UNAVAILABLE and do not advance success time.
- Earthquakes are enabled in thesis defaults. Traffic, bikeshare, radio remain off in those defaults and no longer appear in the layer toggle panel. Radio launchers/panels and the road-sync chip are hidden. Saved optional controls remain mounted for safe lifecycle cleanup; this does not delete old saved preferences.
- STALE takes precedence over FALLBACK in the health chip. PortWatch failed/undated responses no longer masquerade as nominal activity.

## Live browser acceptance

Fresh browser, actual existing service at localhost:4173, LIVE SHIPPING launcher, real network, no intercepted feed responses.

| Feed | Observed result | Honest interpretation |
| --- | --- | --- |
| AISStream | 12,000 rendered vessels; 1,372 changed coordinates over ~22 seconds; final source age 15s | LIVE sample. Earlier connecting snapshot read STALE and recovered automatically. |
| Flights | 590 → 606 aircraft; final source age 17s | Fresh ADSB.lol **250nm regional fallback**, not global coverage. |
| Earthquakes | 29 M2.5+ events; USGS catalog generated 21:22:24 UTC | Fresh catalog; event occurrence time remains separate. |
| Satellites | 832 objects; 168 with stale/invalid TLE epochs | DEGRADED, propagated estimates, not measured live telemetry. |
| FIRMS | 254,549 retained detections, 1,800 rendered cells; fetched ~7 minutes earlier | NRT detection cache, not live imagery or verified incidents. |
| PortWatch | Six unavailable chokepoint responses | UNAVAILABLE, not live transit/congestion. |

Regional AIS snapshot counts: {"Hormuz": 0, "Suez": 7, "Bab": 0, "Malacca": 41}. Zero returned rows do not prove no vessels or disruption; global feed liveness does not establish Gulf/Red Sea coverage. Original source epochs and Mix-Lock semantics remain intact.

Noise layers were all disabled and absent from the toggle catalog; radio launcher had no rendered rectangle. No page exceptions. Optional AI HUD summary requests returned an unrelated credits/429 error; no claim that AI narration was verified.

## Verification and handoff

Node 24.14.0: initial AIS/source-time/watchdog/flights/satellite/quake/launcher suites passed 233 tests; manager suite passed 110; final changed AIS/PortWatch plus FIRMS freshness suite passed 137 (overlapping suite counts, not a unique total). `git diff --check` passed. Initial system Node 20 lacked built-in WebSocket; rerun used the required Node 24 and passed.

Source edits remain in the shared workspace. Uploaded patch includes only this issue's edits, excluding existing unrelated documentation and untracked files. Uploaded evidence JSON records both sample times, final per-feed states, movement examples and regional counts. No deployment, merge, or comprehensive upstream uptime guarantee is claimed.

## Commit preparation — 2026-09-21

For [OSA-64](/OSA/issues/OSA-64): reviewed the pending AIS, thesis defaults,
noise controls, PortWatch and feed-chip changes. Restored `build/vite.js` from
HEAD because its deletion was unrelated and the package still exports it.
Kept historical TB6 build-status edits and unrelated untracked files outside
this commit.

Fresh verification on Node 24.14.0: 345/345 tests pass across aisLiveVessels,
aisSourceTime, aisWatchdog, portWatchOverlay, manager, firstRunExperience,
reasonableDefaults and sourceFreshness. `git diff --check` passes.
The September 16 browser observations above are historical evidence; no fresh
live-feed or tunnel acceptance is claimed by this commit-preparation run.
Claude owns independent pre-live QA and the post-green service/tunnel check.
