/** Supported input is named, numeric five-column TLE only. OMM/Alpha-5 are excluded. */
export function parseTLE(text) {
  const lines = String(text).trim().split('\n').map(l => l.trim()).filter(Boolean);
  const entries = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    const [name, line1, line2] = lines.slice(i, i + 3);
    const a = /^1 ([ 0-9]{5})[A-Z ]/.exec(line1);
    const b = /^2 ([ 0-9]{5}) /.exec(line2);
    if (!a || !b || !/^\d+$/.test(a[1].trim()) || a[1] !== b[1]) continue;
    entries.push({ name, line1, line2 });
  }
  return entries;
}

/** Element time is independent of both fetch time and SGP4 propagation time. */
export function satelliteElementLabel(satrec, nowMs = Date.now()) {
  const epochMs = (satrec?.jdsatepoch - 2440587.5) * 86400000;
  if (!Number.isFinite(epochMs)) return 'PROPAGATED · TLE epoch unknown · STALE';
  const age = nowMs - epochMs;
  const staleMs = 86_400_000;
  const ageText = age < 0 ? 'future epoch' : age < 3600000 ? '<1h old'
    : age < 48 * 3600000 ? `${Math.floor(age / 3600000)}h old`
      : `${Math.floor(age / 86400000)}d old`;
  const staleTag = (age > staleMs || age < 0) ? ' · STALE' : '';
  return `PROPAGATED · TLE ${new Date(epochMs).toISOString().slice(0, 16)}Z · ${ageText}${staleTag}`;
}

export function satelliteTleEpochMs(satrec) {
  const epochMs = (satrec?.jdsatepoch - 2440587.5) * 86400000;
  return Number.isFinite(epochMs) && epochMs > 0 ? epochMs : null;
}

export function isTleEpochStale(satrec, nowMs = Date.now()) {
  const epochMs = satelliteTleEpochMs(satrec);
  if (epochMs == null) return true;
  const age = nowMs - epochMs;
  return age > 86_400_000 || age < 0;
}
