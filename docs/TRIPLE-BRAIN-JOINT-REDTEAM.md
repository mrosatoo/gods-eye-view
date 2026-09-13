# Triple Brain Joint Red-Team — Astra

**Date:** 2026-09-13 · **Pass:** 2, FULL GO intake / pre-implementation-SPEC · **Disposition:** changes required before build approval; joint-SPEC review pending.

## 1. Review boundary and verdict

`TRIPLE-BRAIN-JOINT-SPEC.md` was absent at the initial review. Pass 2 adds its Research Intake only; a complete Claude implementation spec is still pending. Findings below attack the binding CEO decisions and the expected implementation risks in Claude's thesis; they are **not findings against an unseen joint spec**. No application code, configuration, service, deployment or runtime test was changed or executed. This is a document review with official-source research in pass 2, not runtime certification or complete API/terms admission.

Reviewed inputs, in precedence order:

1. [Grok Lenkung](TRIPLE-BRAIN-LENKUNG-GROK.md), especially “Schnitt,” “Joint Auftrag,” and “Approve-Gate Kriterien.”
2. [Claude thesis](TRIPLE-BRAIN-THESIS-CLAUDE.md), especially §§1, 3–6, 8 and Appendix C.
3. [Astra thesis](TRIPLE-BRAIN-THESIS-ASTRA.md), especially §§3, 5–7 and 11. Its implementation observations are prior-review evidence, not reverified runtime findings here.

**Verdict:** the CEO's first-ship scope is viable if the joint spec makes uncertainty executable. A prose promise of “honest labels” is insufficient when API fields, thresholds, colors or fallback values still imply blockage, current observations or complete coverage. The most dangerous combination is a reachable Desk iframe, a healthy global AIS socket, stale regional markers and yesterday's PortWatch series sharing one visually authoritative LIVE state.

Lenkung resolves the competing theses: retain Arch A, build the low-SOG heuristic and dated PortWatch layer, keep bounded history for Phase B after Approve #2. This review does not reopen that decision or require a durable evidence store for first ship. Where evidence is insufficient, narrow the claim or display unavailable.

## 2. Findings the joint spec must resolve

### RT-01 — A refresh clock can launder old or unknown evidence

**Basis:** Lenkung requires source, clock and missingness for every metric. Claude §4.1 proposes one `lastUpdated`; Astra §5.1 identifies prior timestamp normalization risks.

**Attack:** receive an old AIS report now, or a report with no usable source timestamp. Re-fetch a cached PortWatch response. A single current timestamp beside either turns ingestion into apparent observation freshness.

**Required contract:** distinguish source observation time/day, provider revision/publication time when available, receipt time and display/as-of time. Unavailable source time stays null with a quality reason; receipt time may be displayed as receipt only. Define valid-time checks, future-clock tolerance, staleness limits per source, and what happens at each boundary. These limits are product parameters, not scientific confidence. Do not invent a provider revision timestamp if none is supplied.

**Pass evidence:** missing, malformed, future and out-of-order timestamps never become fresh observations or valid temporal-heuristic inputs. Refreshing identical cached data changes receipt metadata only.

### RT-02 — Reachability, global feed health and regional evidence are different states

**Basis:** Lenkung consensus #5; Claude §1's LIVE-dependent first-minute path; Astra §§5.3 and 5.5.

**Attack:** keep the global socket active while Hormuz receives nothing, or keep the Desk tab open after GEV dies. Empty water and a bright badge falsely reassure the operator.

**Required contract:** Desk says “GEV reachable” with check time; it does not claim source truth. GEV shows regional receipt age and source state separately. Specify disabled, loading, current observations, stale, partial, error and no-observations behavior. Empty sampled results may say “0 received vessels matching these filters”; unknown coverage cannot say “0 vessels” or “route clear.” Last-good evidence remains visibly aged after a refresh failure. Recovery must not briefly relabel old markers as fresh.

**Pass evidence:** live global transport plus no regional observations yields “No recent AIS observations received in this region · coverage unknown.” Viewer loss has a bounded reachability recheck or an explicitly dated last check, without a new analytical return channel to Desk.

### RT-03 — Low SOG is not stuck, anchorage is not a queue

**Basis:** Lenkung's explicit label override; Claude §§4.2 and 6 propose `STUCK_FLAG`, “12 stuck,” “Anchored 2h” and pulsing rings.

**Attack:** five vessels perform normal port operations at low reported speed; one reports “at anchor”; another has missing heading. The UI converts those conditions into a transport disruption.

**Required contract:** label the result “Low SOG candidate” or, with temporal support, “Dwell candidate.” Self-reported navigation status says “Reported at anchor.” No `stuckFlag` field may be presented as a verdict. Prefer candidate-oriented field names so later cards cannot accidentally promote the result. Specify speed units, usable versus missing/sentinel values, freshness, unique-vessel handling, region membership and threshold inclusivity. Unknown speed must never coerce to zero. Missing or fixed heading cannot establish drifting. Thresholds such as 0.5 kn, 1 kn, five vessels and two nautical miles remain declared heuristic settings, not validated disruption boundaries.

**Pass evidence:** routine anchorage, slow maneuvering and unusable motion fields produce at most qualified candidates. No automatic “blocked,” “queue,” “congestion confirmed,” delay estimate or trade implication appears anywhere, including summaries and tooltips. Amber means candidate and is explained in text.

### RT-04 — Phase A cannot borrow Phase B's history claims

**Basis:** Lenkung defers bounded history; Claude §§4.2 and 6 imply five-minute motion and two-hour anchorage. Astra §§5.2 and 6 explain why a thinned trail is not dwell evidence.

**Attack:** reconnect or restart after a vessel was stationary; replay duplicate reports; observe a vessel at 10:00 and 10:20 with nothing between. A session timer or trail produces “20 minutes waiting.”

**Required contract:** first ship may use current low-SOG candidates without duration. A temporal candidate requires a specified bounded session observation window, first/last qualifying report, unique sample count, maximum allowed gap, valid source time and reset/expiry behavior. If that support is omitted from Phase A, temporal claims are unavailable. Do not require a persistent history store to resolve this finding. “Low-SOG reports observed between T1 and T2; gaps…” does not prove continuous waiting, arrival time or a completed dwell. Navigation away, disconnection, stale input and restart have explicit handling.

**Pass evidence:** one report never gains duration merely because wall time passes; repeated identical reports do not add support; a gap breaks or disqualifies the temporal candidate under the stated rule; restart reports insufficient history. No baseline anomaly or cross-session comparison is fabricated.

### RT-05 — Camera framing and render limits can manufacture a trend

**Basis:** Claude §§4.1–4.2 use hardcoded boxes and viewport badges; Astra §§5.3 and 5.9 distinguish rendering from an analytical population.

**Attack:** pan the camera, lower GPU row limits, or add newer messages elsewhere in the world. The Hormuz number falls without a shipping change. Broad overlapping Malacca/Singapore boxes count the same vessels twice.

**Required contract:** choose a fixed, named, versioned candidate zone independently of camera framing. State that a coarse box is a selection zone, not a reviewed passage gate or queue boundary. Publish the population/filter/window and truncation state. Counts use unique usable reports within the declared sample before rendering reduction; if the available data is already globally capped, show partial support and suppress population-level comparisons. Define overlap and cluster membership, including whether a vessel can belong to multiple clusters and how totals avoid double counting.

**Pass evidence:** camera/LOD changes preserve a count over the same admitted input. Missing rows change partial-state metadata; they do not support claims of departures or cleared congestion. Membership is deterministic at zone and distance boundaries.

### RT-06 — Renaming PortWatch does not fix congestion-shaped data or colors

**Basis:** Lenkung awards PortWatch labeling to Astra; Claude §§3–5 still propose waiting vessels, delay estimates, `avgTransitCount`, a guessed `chokepoint6` mapping and green/amber/red drops.

**Attack:** a daily activity decline becomes a red congestion polygon; a cache timestamp implies today's series; a absent date becomes zero; a zero baseline produces an impressive percentage. A placeholder upstream URL silently survives into the build.

**Required contract:** identify the admitted official dataset, stable source reference, exact region mapping, fields, metric meaning, units, observation day/time convention, revision behavior and missing-value representation. Source discovery and sampled validation remain implementation admission work; this review does not verify that endpoint. Read-only proxy failure must return explicit unavailable/stale/partial state, never synthetic production values. Fixture data is visibly test-only.

Display “PortWatch · daily activity · observation date YYYY-MM-DD” using the dataset's actual metric title. Specify latest-complete-day selection, pagination/record-limit handling, duplicate date resolution, sorting and cache invalidation. If a comparison is included, name the baseline dates, valid sample minimum, formula and comparable scope; suppress percentages for absent/zero denominators or unsupported comparability. No queue length, wait minutes or blocked-area styling follows from daily activity alone. A neutral activity encoding needs a legend; amber candidate styling must not be reused as a congestion verdict.

**Pass evidence:** two dated values match the admitted source; missing versus zero, revisions, partial pages, invalid region, upstream error and zero-baseline fixtures have distinct outcomes. Current-day unavailability does not erase a valid dated series or pretend that it is current.

### RT-07 — Agreement and proximity cannot promote a claim to confirmed impact

**Basis:** Lenkung P2 says claims, not news confetti; Claude §6's disruption pack; Astra §§5.8 and 6.

**Attack:** an AIS slowdown, a PortWatch decline and three syndicated headlines produce “three sources confirm blockade.” A heat detection near a mine or a quake symbol over a port becomes “production offline.”

**Required contract:** observations, derived candidates and attributed reports remain separate. Do not count AIS-related products as automatically independent corroboration. Group duplicate reports; show original attribution, publication/event times, location precision and retraction/update status where available. Thermal detections do not establish facility fire or loss; quake symbols do not depict measured damage extent. A filtered empty result includes its time/filter/source limitations. No automatic incident-to-price, cargo-to-tonnage or event-to-output inference.

**Pass evidence:** duplicate articles remain one claim family; uncertain geography remains regional; recurrent heat and partial sensor failure do not create outage or all-clear claims. If claims UI is deferred, these are constraints on existing visible layers rather than a requirement to build a new incident system.

### RT-08 — Cobalt, trucks and water invite fabricated completeness

**Basis:** Lenkung's maritime/land split and explicit no-fantasy lock.

**Attack:** reuse a shipping card for Cobalt, show road traffic as mine truck density, or fill a water gauge from a static baseline. A zero or an empty gauge looks like measured absence.

**Required contract:** Cobalt is a land corridor with contextual FIRMS/USGS access and disclosed evidence gaps. Maritime-derived metrics are not applicable there. Use “Facility truck activity: no validated source” and “Current facility water availability: unavailable.” Any later admitted WRI layer must say baseline/modelled, version and geographic scope; it cannot inherit LIVE styling or claim facility operating conditions. Photoreal imagery, Street View, generic cameras and synthetic fallbacks cannot fill either gap.

**Pass evidence:** all Cobalt cards, saved views and error fallbacks retain land semantics; unavailable metrics never render numeric zero. Turning on detailed imagery does not enable a truck or water measurement.

### RT-09 — The visual hierarchy can contradict correct fine print

**Basis:** Lenkung's hedge-fund Lagebild objective and Cyan/Gold scope; Claude §5's pulsing rings and status tokens.

**Attack:** large glowing “LIVE” and amber clusters dominate tiny date caveats. Animated orbital positions look like live surveillance; high-resolution tiles look like imagery acquired today.

**Required contract:** source age, candidate status and missingness sit beside the primary number or marker card, not only in a tooltip. Color is accompanied by text/symbol; selection Gold, heuristic Amber and source failure have distinct labels. Historical/context imagery says so, with acquisition time unknown when unknown. Satellite motion is propagated orbital context with source element epoch and propagation time, not surveillance or complete catalog coverage. Low-motion mode removes alarming pulses without hiding status. Loading must not animate placeholder metrics as real data.

**Pass evidence:** at 1366×768, keyboard and low-motion users can read selected region, source age, candidate meaning and main gap. A screenshot remains honest when detached from hover interactions. The first-minute exercise passes in outage mode by explaining unavailable evidence, not by inventing a finding.

### RT-10 — A clickable globe is not proof of a working deployment or isolation

**Basis:** Lenkung approval gates; Claude §8 suggests static assets for Beta; Astra §§5.4–5.6 identify entrypoint and host-boundary risks.

**Attack:** static build displays imagery while provider routes are absent; a reachable endpoint masks frame refusal; an attractive “never feeds Conf” chip substitutes for checking data paths.

**Required contract:** joint spec names the actual supported launch entrypoint, provider-serving process, intended owned origin, Desk URL, framing configuration, stop/recovery path and source-route smoke checks. Static asset success cannot certify server middleware. Distinguish host unreachable, frame blocked, viewer failure and provider failure. State no automatic path into Hatch/Bias/Conf/Edge/Sit/FA, no Voice, RECON or foreign-runtime fallback. Secret values stay out of output and evidence. No application or deploy action follows from this red-team document.

**Pass evidence:** later QA checks the actual clickable Desk path and provider routes in the declared runtime, plus a scoped import/request/message review for forbidden analytical paths. Host reachability fixes do not introduce an analytical message bus. Unsupported launch modes are explicitly unsupported, not silently covered by one screenshot.

## 3. Small, decisive acceptance set

These are requirements for the joint spec's test plan, **not tests passed in this heartbeat**. Fixtures can prove semantics before live provider QA; they must stay visibly separate from production observations.

| ID | Adversarial input/action | Required observable result | Finding |
|---|---|---|---|
| A1 | Missing/future source timestamp; old cache fetched now | Unknown/invalid age or dated old evidence; no valid temporal support | RT-01 |
| A2 | Global AIS healthy; selected region silent; then upstream fails | Regional unknown plus distinct source failure, preserved aged last-good evidence | RT-02 |
| A3 | Zero/missing/sentinel speed; normal anchored cluster; exact threshold boundary | Deterministic qualified candidates; unusable speed excluded; no stuck verdict | RT-03 |
| A4 | One report, duplicates, 20-minute gap, restart | No invented duration; explicit insufficient history or reset | RT-04 |
| A5 | Pan/zoom, change row cap, overlap zones, globally truncate input | Stable same-sample counts; partial support shown; no duplicate total | RT-05 |
| A6 | PortWatch missing day versus zero; revised day; partial page; zero baseline | Preserved date/unit, gap/revision state, suppressed unsupported percentage | RT-06 |
| A7 | Duplicate headline, vague location, recurring hotspot, partial sensor outage | Attributed qualified claims; no independent-confirmation or damage upgrade | RT-07 |
| A8 | Cobalt selection plus imagery on/off and failed source fallback | Land context; trucks/water unavailable, never numeric filler | RT-08 |
| A9 | Small screen, no hover, keyboard, low motion; stale layers | Source dates/gaps and candidate status legible without color alone | RT-09 |
| A10 | Actual Desk entry, source route loss, viewer/frame failure | Useful status within 60 seconds; no false aggregate LIVE or forbidden path | RT-10 |

## FULL GO addendum — new attacks from Research Intake

The board's 2026-09-13 directive authorizes independent research without another permission ask. Lenkung FULL GO item 5 still places implementation after CEO Spec approval. Seventeen consolidated candidates are recorded in [Joint Spec / Research Intake](TRIPLE-BRAIN-JOINT-SPEC.md#research-intake--full-go--astra-2026-09-13), including weather alerts, modelled river flooding and energy-series cross-checks beyond the initial layer list. These are recommendations, not claims of usable credentials or cleared licensing.

### RT-11 — Public endpoint does not establish permitted use

Attack: a successful unauthenticated query is treated as approval to cache, redistribute or export third-party articles, infrastructure layers or orbital data indefinitely.

Required: pin dataset-specific terms, attribution, automated access/cache limits and export policy before adapter admission. Existing key-name documentation is not evidence of a working key. Unsupported access remains unavailable without credential procurement. Acceptance: unknown terms disable admission; rate limiting preserves dated last-good evidence; key-bearing URLs cannot appear in logs or evidence. RI-01 through RI-17 retain explicit unresolved admission conditions.

### RT-12 — Latest catalogue item does not mean latest useful image

Attack: newest cloudy or off-footprint item, a revised processing timestamp, or the first result page becomes “live view of terminal.”

Required: separate acquisition from publication/receipt, verify footprint and pagination, retain processing/cloud metadata and label unknown visibility. Catalogue freshness never certifies basemap freshness. Acceptance: newer cloudy/older usable fixtures remain distinguishable; no usable scene yields unavailable; no image-derived trucks or operating-state claim. Applies RI-07–08 and RT-09.

### RT-13 — Alert/model geography and clocks can fabricate global coverage

Attack: empty US NWS results show Hormuz safe; yesterday's model run appears as a current observed flood; a static facility joins an alert and becomes “offline.”

Required: explicit coverage, issued/effective/expiry and forecast-valid times, cancellation/revision handling, and dated infrastructure context. Acceptance: unsupported geography differs from no active alerts; expired/cancelled records stop being active; forecast proximity never confirms damage. Applies RI-09–12, RI-15–17 and RT-07–08.

Pass 2 verification: official documentation searched/read with links retained in intake; all seventeen consolidated entries include source/access, clock, missingness, thesis value and conditional/deferred/rejected scope. The OSA-6 contribution adds two direct public probes documented below; no key validity, deployment, commercial-rights certification or application tests are claimed. The original A1–A10 remain required; the intake's seven acceptance cases supplement them.

### RT-14 — Success caching does not prevent failed-request abuse

Static inspection of `server/providers/space/celestrak.js` confirms a six-hour success cache and single-flight requests. After refresh failure the in-flight entry is removed, so the next request can immediately retry stale/missing data. This is a code-path finding, not a load-test result. [CelesTrak policy](https://www.celestrak.org/usage-policy.php) requires downloads only once per update; [format guidance](https://www.celestrak.org/NORAD/documentation/gp-data-formats.php) describes a two-hour GP cadence, error limits and expanded catalog IDs. `src/data/spaceProviderRequests.js` requests TLE.

Required: per-source failure cooldown/circuit state, bounded retries, allowed dataset groups and shared cache across intended clients; retain element-epoch age on stale data. A descriptive User-Agent does not establish the cause of 403 responses. For expanded catalog support use JSON/OMM with compatible parsing/propagation, or disclose TLE-limited support without completeness claims.

Acceptance A14: repeated requests after 403/500 cause no upstream request during cooldown; return aged last-good data or unavailable. Verify restart behavior and non-five-digit catalog handling. Never confuse propagation time with observation time.

### RT-15 — NRT detections are neither live incidents nor unique fires

Static inspection of `server/providers/firms.js` shows three VIIRS **NRT** sources and appends their detections without cross-source deduplication. `src/firstRunExperience.js:113` documents a layer row containing `NASA FIRMS · LIVE · KEY REQUIRED`; this is source-text evidence, not a verified screenshot. [FIRMS area documentation](https://firms.modaps.eosdis.nasa.gov/api/area/) distinguishes NRT/RT/URT and replacement behavior.

Required: count detections as detections; preserve acquisition time, platform/product, source failures and actual NRT class. Do not copy old quota comments into an operational contract; check current status/availability. No blanket global latency promise, unique-fire total or proximity-to-facility-loss promotion.

Acceptance A15: two sensors detect one hotspot, one source fails and acquisition precedes receipt by hours. Show two qualified detections with acquisition ages and partial support, not two live facility fires.

### RT-16 — Claims discovery is not conflict verification

[GDELT documentation](https://gdeltproject.org/data.html) describes media-derived data and discovery-time distinctions. RI-13 remains conditional for attributed discovery. Open data does not grant republication rights to linked article text/images.

Required: preserve original publisher/link, publication time, claimed event time and index receipt separately; retain extraction/geolocation uncertainty, syndication families and correction status (unknown when unavailable). Do not derive casualty counts, confirmed war pins or precise incident coordinates from vague text. Three syndicated articles are not three independent confirmations.

Acceptance A16: three copies of one article and an old event rediscovered today remain one attributed claim family with unsupported event time unknown, not three confirmations of a new event.

### Direct probe evidence — OSA-6 contribution

- 2026-09-13 15:51:36 UTC: keyless USGS hour-feed GET returned HTTP 200 and GeoJSON FeatureCollection. Sample `nc75434912` included separate event `time=1789313183990` and `updated=1789314442649`. One shape/transport observation is not continuous availability or runtime QA.
- Same batch: CDSE Sentinel-2 item URL recorded in Research Intake failed JSON parsing at byte zero. HTTP/body details were not captured; cause remains unknown. No outage diagnosis or production admission follows.
- No application files changed. RT-01–RT-13 remain open pending Claude's implementation-spec mapping; RT-14–RT-16 add specific must-fix contracts. The research scaffold is not the complete implementation spec.

## 4. Revision and handoff boundary

Claude owns incorporating these constraints into the joint spec. Astra's next pass must read the actual `TRIPLE-BRAIN-JOINT-SPEC.md`, record its revision/hash and map RT-01–RT-10 to concrete sections, APIs, UI copy and acceptance cases. Classify each as resolved, partially resolved, open or explicitly deferred with suppressed claims. A generic “follow Astra labeling” reference does not close a finding.

Grok's build approval is distinct from completion of this review artifact. This document grants no approval and requests no new implementation subtasks. The final joint-SPEC assessment remains dependent on that file being published; a note here is not a scheduled continuation or reviewer interaction.

## 5. MUST-FIX before Approve

- [ ] **MF-1 / RT-01–02:** Every primary metric has source, observation clock/time quality and missingness; host reachability cannot imply regional data freshness. Null, zero, stale, partial and no observations have explicit behaviors.
- [ ] **MF-2 / RT-03:** All derived shipping outputs remain low-SOG/dwell candidates; reported anchor status stays reported. Remove automatic stuck, blocked, queue and delay claims from fields, cards, summaries and legends.
- [ ] **MF-3 / RT-04:** Define exactly what Phase A temporal support exists, including gaps/reset/expiry, or suppress temporal claims. Keep persistent bounded history and cross-session comparisons in Phase B after Approve #2.
- [ ] **MF-4 / RT-05:** Define fixed candidate geography, unique membership, sampled denominator and truncation. Camera and rendering caps cannot masquerade as shipping changes.
- [ ] **MF-5 / RT-06:** Replace guessed PortWatch mappings with an explicit source-admission gate, dated metric schema and failure contract. Specify comparison suppression and neutral activity semantics; no live congestion or wait minutes.
- [ ] **MF-6 / RT-07–08:** Preserve attributed claims, shared-source limitations and land-corridor semantics. Keep trucks/current water unavailable; no proximity-to-damage or imagery-to-measurement promotion.
- [ ] **MF-7 / RT-09:** Put uncertainty beside the main readout and preserve it in screenshots, keyboard and low-motion use. Imagery and orbital context cannot look like live physical surveillance.
- [ ] **MF-8 / RT-10:** Name the real owned Desk/GEV deploy and provider path, recovery behavior and isolation verification. A static globe, reachability badge or screenshot alone does not pass.
- [ ] **MF-9 / all:** Joint spec includes A1–A10 with expected outcomes, plus the under-60-second Hormuz path in normal and degraded conditions. Later QA must record actual evidence before claiming product DoD.
- [ ] **MF-10 / review gate:** Publish the joint spec and complete Astra's revision-specific pass before using this pre-SPEC assessment as approval evidence.

- [ ] **MF-11 / RT-11:** Admit each new source only with exact access/terms, attribution, schema and export evidence; public/keyless is not a license verdict.
- [ ] **MF-12 / RT-12:** Specify catalogue acquisition/visibility/footprint/pagination semantics independently of rendered imagery.
- [ ] **MF-13 / RT-13:** Distinguish alert coverage and expiry, forecast run/valid times, and baseline/infrastructure vintage; add the seven Research Intake acceptance cases.
- [ ] **MF-14 / RT-14:** Specify failure cooldown and supported orbital formats; test repeated errors, restart and expanded IDs.
- [ ] **MF-15 / RT-15:** Label actual NRT product and detection count, preserving source gaps and acquisition ages.
- [ ] **MF-16 / RT-16:** Preserve attributed claim families and time/location uncertainty; no automatic confirmation or article republication.

## 6. Astra revision-specific build pass — 2026-09-13

Reviewed Joint Spec Rev 2, SHA-256 `e2ecf712bd4f3f9532ba693ef6f628de3b78fab2408241f6f96ff5f5929a4337`. CEO Approve #1 remains granted; this pass evaluates acceptance and does not reopen authorization. Earlier pre-SPEC statements above describe prior passes.

| Findings | Concrete Rev 2 mapping | Assessment |
|---|---|---|
| RT-01–02 / MF-1 | §§8.1–8.5 four clocks, missingness and Reachable label | Partial: contract exists, §8.3 only acknowledges timestamp fallback; require executable age/quality rules and runtime proof. Desk still visibly says LIVE in Astra browser check. |
| RT-03 / MF-2 | §§5.3–5.4 candidate copy and Level 1 ceiling | Resolved at spec level; implementation tests still required. |
| RT-04 / MF-3 | §§5.4–5.5 explicitly suppress duration and defer history | Resolved at spec level by suppressed claims; restart case still required. |
| RT-05 / MF-4 | §§4.7, 8.2, 8.4 boxes, population and truncation | Partial: unique membership, overlap ownership and camera-independent denominator need tests. |
| RT-06 / MF-5 | §§4.2, 4.4, 4.6 source admission, dated null-safe contract | Resolved at spec level through unavailable fallback; no guessed dataset mapping admitted. |
| RT-07–08 / MF-6 | §§6–7 land semantics, Appendix A RI-13 claims deferral | Partial: keep claims deferred until provenance implemented; imagery cannot infer impact. |
| RT-09 / MF-7 | §9 text plus color and adjacent uncertainty | Partial: 1366×768, keyboard and reduced-motion evidence missing. |
| RT-10 / MF-8–9 | §§11–12 owned iframe, gates and run commands | Partial: reachable iframe verified, useful AIS/default/degraded path not passed. |
| MF-10 | This revision/hash-specific pass | Review record supplied; not a product acceptance verdict. |
| RT-11 / MF-11 | §4.2, Appendix A, Appendix B.1 | **Open conflict:** B.1b and N5–N10 mark sources admitted without the required two fixtures/export/terms evidence. Open-Meteo free non-commercial admission directly conflicts with Appendix A RI-14. Keep all such new integrations unavailable until the intended-use admission record passes. Public/keyless is insufficient. |
| RT-12–13 / MF-12–13 | Conditional catalog/forecast/alert/baseline contracts | Deferred or unavailable until admission and seven intake fixtures pass; no implicit admission from labels in B.1b. |
| RT-14 / MF-14 | Existing CelesTrak proxy and satellite viewer | Partial implementation this run: persisted cooldown, catalog allowlist, original TLE retention, stale warning and subset wording tested. Epoch readout/expanded-ID behavior and deployment-wide sharing remain unverified. |
| RT-15 / MF-15 | Existing FIRMS proxy/layer | Partial implementation this run: NRT/detection copy and partial support, missing fetch clock and malformed payload tests. Full acquisition/product card acceptance remains open. |
| RT-16 / MF-16 | Appendix A RI-13 | Keep attributed-claim expansion deferred until family/time/location/correction contract exists. |

Verification details and integration gaps are recorded in `TRIPLE-BRAIN-BUILD-STATUS.md`. No new source license or live-data availability verdict was inferred in this pass.

MF-11 implementation update: `researchAdmissionGate()` now prevents the four conditional research proxies from contacting upstream in dev/preview until admission is evidenced. Two admission tests pass and all four local endpoints returned `503 source_admission_pending`. This resolves unsafe automatic admission for these routes by suppression, not by granting source rights. Later integration must preserve this gate until the missing admission evidence is reviewed.


## 7. Board-directed workspace honesty gate — 2026-09-13

Reviewed checkout `fd4bc544746b875cd55631cba8246c325a45be5b`; input Joint Spec SHA-256 `32c78d889e10cb6f764a0d378317a18e7b6380af96e7fe917fc2d1cb0bdb1351` before this pass's notice. The board asked Astra to continue in workspace docs if JWT injection remained missing and prohibited a solo soft-build by Grok. No new build, deployment, admission or product acceptance is authorized by this review.

**Disposition: changes required / acceptance open.** This is distinct from the existing Approve #1 implementation authorization.

| Gate | Current evidence | Required closure / responsible role |
|---|---|---|
| MF-4 unique population | Executed deterministic fixture: five copies of the same fresh low-SOG MMSI in Hormuz produce one candidate and a cluster with `count: 1`, despite `CLUSTER_MIN_VESSELS = 5`. Group-size qualification occurs before unique MMSI counting. This proves a pure-evaluator defect, not that production currently supplies duplicates or renders this cluster. | Claude implementation: deduplicate by MMSI before clustering, define conflicting/out-of-order selection, and test four versus five unique vessels plus overlapping zones. Astra reviews evidence. |
| MF-11 source admission | `researchAdmissionGate()` remains before `gdacsProxy()` in Vite. Four research routes explicitly return unavailable. Spec B.1b still says sources were verified/admitted and its rows say ADMIT P2. Those statements are not sufficient terms/schema/fixture/export evidence. | Joint spec owner reconciles admission tables with the gate. Astra must review intended-use evidence before any gate removal; keyless access alone never closes this finding. |
| MF-8/9 product acceptance | Latest build-status section calls A1–A16 addressed and labels remaining runtime acceptance nonblocking, but also records partial MF-14/15/16 runtime acceptance. Earlier HTTP checks and isolated renderer fixtures do not establish the full normal/degraded Desk click path. | Claude/QA supply dated end-to-end evidence for actual Desk/GEV runtime, regional silence, source loss, stale recovery and restart; Astra assesses remaining gates. Previously reported Desk wording fix is recorded, not reverified here. |
| MF-1/2/3 source-time and wording | Prior 81-test evidence remains recorded; source-age evaluator and null-clock behavior remain present. This pass did not rerun that suite. | Preserve fixes. Still prove out-of-order behavior and adjacent age/missingness on actual cards; no temporal dwell claim from a single observation. |

The spec now carries an explicit gate notice to prevent prior completion/admission statements from being mistaken for final acceptance. No other author's historical evidence has been deleted. New sources remain suppressed, and deferred claims remain deferred. Tests passed for a narrower seam do not waive the remaining mandatory acceptance criteria.

Coordination: this run still lacks `PAPERCLIP_API_KEY`. Runtime owner must restore run-bound authentication; Astra then publishes these files and creates the bounded Claude/QA follow-ups with first-class dependencies. Those follow-ups are named here but are not claimed to be scheduled. Workspace documentation is the board-authorized fallback, not a live continuation path.


## 8. MF-16 existing regional-news path — OSA-16, 2026-09-13

At checkout `554e513862adefae4b278734a6da4b2fa8157825`, `normalizeRegionalArticles()` in `src/data/regionalBrief.js` maps `seendate` to `publishedAt` and deduplicates by title plus hostname. `server/providers/regional/news.js` uses this normalizer for the existing GDELT fallback. A synthetic Node fixture of one identical title at three domains returned three records with discovery input serialized as publication time, no event-time field and no claim-family field. No upstream or browser observation is claimed.

MF-16 is **open for this existing path**, while expanded attributed event cards remain deferred. Three records do not prove the UI calls them independent confirmations, but they also do not satisfy A16 family/time preservation. Required repair: distinguish discovery, publication and claimed-event clocks; preserve unknown values, original attribution, uncertainty and correction state; establish syndication-family handling without merging unrelated reports solely by matching titles. Verify rediscovery of an old event and copies across domains in regression and actual UI evidence. No article republication or automatic confirmation is authorized.

MF-14/15 retain the narrower prior test/browser evidence and remaining closure criteria recorded in the OSA-16 BUILD-STATUS section. No acceptance checkbox is closed by this docs-only pass. Runtime authentication is still missing; the attempted issue comment failed HTTP 401. Astra owns repair/review after the runtime owner restores authentication and resumes the task; no delegated issue or review path has been created.
