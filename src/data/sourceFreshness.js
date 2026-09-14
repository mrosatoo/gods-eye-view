/** Observation age is independent of successful acquisition/transport. */
export const AIS_POSITION_SLA_MS = 300_000;
export const AIR_POSITION_SLA_MS = 120_000;
/** Hard-evict vessels whose position is older than this from the live layer. */
export const AIS_POSITION_EVICT_MS = 900_000;
export function sourceFreshness(epochMs, slaMs, nowMs = Date.now()) {
  const known = Number.isFinite(epochMs) && epochMs > 0 && epochMs <= nowMs + 30_000;
  const ageMs = known ? Math.max(0, nowMs - epochMs) : null;
  return {
    ageMs,
    stale: ageMs === null || ageMs > slaMs,
    label: ageMs === null ? 'AGE UNKNOWN · STALE' : `AGE ${Math.floor(ageMs / 1000)}s${ageMs > slaMs ? ' · STALE' : ''}`,
  };
}
