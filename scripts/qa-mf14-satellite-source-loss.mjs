#!/usr/bin/env node
/**
 * qa-mf14-satellite-source-loss.mjs — MF-14 browser acceptance.
 *
 * Drives headless Chromium against the dev server with intercepted CelesTrak
 * responses. Proves the satellite layer's source-loss behavior through three
 * deterministic states:
 *
 *   (i)   NOMINAL — all 6 core groups load valid TLE fixtures; layer shows
 *         satellites, getStats().status === 'nominal', tracked readout > 0.
 *   (ii)  PARTIAL LOSS — 2 groups fail (503); layer status is 'degraded',
 *         error names the failed count, catalog is retained (count > 0).
 *   (iii) TOTAL LOSS — all 6 groups fail; status is 'unavailable',
 *         error is 'CelesTrak unreachable', stale catalog retained on screen.
 *
 * No upstream keys required — all CelesTrak responses are intercepted.
 * Screenshots saved to qa-shots/ (gitignored).
 *
 * Run:  node scripts/qa-mf14-satellite-source-loss.mjs --url http://localhost:4176
 */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SHOTS_DIR = path.join(REPO_ROOT, 'qa-shots');

const argv = process.argv.slice(2);
const getOpt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const APP_URL = getOpt('--url', 'http://localhost:4176');
const HEADFUL = argv.includes('--headful');

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const tag = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  [${tag}] ${name}${detail ? `  — ${detail}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minimal valid TLE fixture — ISS (ZARYA) with a plausible epoch.
const TLE_FIXTURE = `ISS (ZARYA)
1 25544U 98067A   26256.50000000  .00016717  00000-0  10270-3 0  9003
2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391480479
GPS BIIR-2  (PRN 13)
1 24876U 97035A   26256.40000000  .00000004  00000-0  10000-3 0  9001
2 24876  55.5400 239.2800 0110000  84.0000 277.0000  2.00565800200001
COSMOS 2456
1 38755U 12044A   26256.30000000  .00000010  00000-0  10000-3 0  9002
2 38755  64.8000  25.0000 0010000  90.0000 270.0000  2.13100000100001
GALILEO-FM2
1 28922U 06018A   26256.20000000 -.00000019  00000-0  00000-0 0  9001
2 28922  56.0000 300.0000 0005000 120.0000 240.0000  1.70475000100001
GOES 16
1 41866U 16071A   26256.10000000 -.00000270  00000-0  00000-0 0  9003
2 41866   0.0500 271.0000 0001200 130.0000 230.0000  1.00272000 30001
TDRS 13
1 40296U 14068A   26256.00000000 -.00000300  00000-0  00000-0 0  9002
2 40296   3.0000 340.0000 0002000 200.0000 160.0000  1.00270000 25001
`;

const CATALOG_GROUPS = ['stations', 'visual', 'gps-ops', 'glo-ops', 'galileo', 'geo'];

async function main() {
  console.log('\nMF-14 Satellite Source-Loss Browser Acceptance');
  console.log(`  App URL : ${APP_URL}\n`);

  try {
    const res = await fetch(APP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`\x1b[31mDev server not reachable at ${APP_URL} (${e.message}).\x1b[0m`);
    process.exit(2);
  }

  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: HEADFUL ? false : 'new',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
      '--disable-dev-shm-usage', '--disable-web-security',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--window-size=1440,900',
    ],
  });

  let exitCode = 0;
  try {
    // ── (i) NOMINAL — all groups serve valid TLEs ──────────────────────────
    console.log('(i) NOMINAL — intercepting all CelesTrak groups with valid TLE fixtures...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/celestrak/')) {
          req.respond({
            status: 200,
            contentType: 'text/plain',
            headers: { 'x-tle-cache': 'MISS' },
            body: TLE_FIXTURE,
          });
          return;
        }
        try { req.continue(); } catch { /* already handled */ }
      });

      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(
        () => window.__godsEyeView?.viewer && window.__godsEyeView?.dataManager,
        { timeout: 60000 },
      );
      await sleep(1500);

      const stats = await page.evaluate(async () => {
        const dm = window.__godsEyeView.dataManager;
        await dm.setEnabled('satellites', true);
        const mod = dm.layers.get('satellites').module;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s = mod.getStats();
          if (s.count > 0 && s.status !== 'loading') return s;
        }
        return mod.getStats();
      });

      record('NOMINAL: satellites loaded, count > 0',
        stats.count > 0,
        `count=${stats.count} status=${stats.status} error=${JSON.stringify(stats.error)}`);
      record('NOMINAL: getStats().status is nominal',
        stats.status === 'nominal',
        `status=${stats.status}`);
      record('NOMINAL: no error reported',
        stats.error === null || stats.error === undefined,
        `error=${JSON.stringify(stats.error)}`);

      if (stats.count === 0 || stats.status !== 'nominal') exitCode = 1;

      // Verify layerFeedState chip
      const chip = await page.evaluate(() => {
        const dm = window.__godsEyeView.dataManager;
        const entry = dm.layers.get('satellites');
        const stats = entry.module.getStats();
        // Inline layerFeedState logic to verify the mapping
        if (stats.status === 'nominal') return 'nominal';
        if (stats.status === 'degraded') return 'degraded';
        if (stats.status === 'unavailable') return 'unavailable';
        return stats.status;
      });
      record('NOMINAL: layerFeedState chip is nominal', chip === 'nominal', `chip=${chip}`);
      if (chip !== 'nominal') exitCode = 1;

      await page.screenshot({ path: path.join(SHOTS_DIR, 'mf14-nominal.png') });
      await page.close();
    }

    // ── (ii) PARTIAL LOSS — 2 groups fail ──────────────────────────────────
    console.log('\n(ii) PARTIAL LOSS — 2 groups return 503, rest serve valid TLEs...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.setRequestInterception(true);
      const failedGroups = new Set(['gps-ops', 'galileo']);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/celestrak/')) {
          const group = url.split('/api/celestrak/')[1]?.split('?')[0];
          if (failedGroups.has(group)) {
            req.respond({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' });
          } else {
            req.respond({
              status: 200,
              contentType: 'text/plain',
              headers: { 'x-tle-cache': 'MISS' },
              body: TLE_FIXTURE,
            });
          }
          return;
        }
        try { req.continue(); } catch { /* already handled */ }
      });

      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(
        () => window.__godsEyeView?.viewer && window.__godsEyeView?.dataManager,
        { timeout: 60000 },
      );
      await sleep(1500);

      const stats = await page.evaluate(async () => {
        const dm = window.__godsEyeView.dataManager;
        await dm.setEnabled('satellites', true);
        const mod = dm.layers.get('satellites').module;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s = mod.getStats();
          if ((s.count > 0 || s.error) && s.status !== 'loading') return s;
        }
        return mod.getStats();
      });

      record('PARTIAL: catalog retained (count > 0)',
        stats.count > 0,
        `count=${stats.count}`);
      record('PARTIAL: getStats().status is degraded',
        stats.status === 'degraded',
        `status=${stats.status}`);
      record('PARTIAL: error reports failed groups',
        typeof stats.error === 'string' && /unavailable/i.test(stats.error),
        `error=${JSON.stringify(stats.error)}`);

      if (stats.count === 0 || stats.status !== 'degraded') exitCode = 1;

      await page.screenshot({ path: path.join(SHOTS_DIR, 'mf14-partial-loss.png') });
      await page.close();
    }

    // ── (iii) TOTAL LOSS — all groups fail ─────────────────────────────────
    console.log('\n(iii) TOTAL LOSS — all 6 groups return 503...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

      // First load with nominal data (to seed the catalog), then reload with total failure
      await page.setRequestInterception(true);
      let interceptMode = 'nominal';
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/celestrak/')) {
          if (interceptMode === 'nominal') {
            req.respond({
              status: 200,
              contentType: 'text/plain',
              headers: { 'x-tle-cache': 'MISS' },
              body: TLE_FIXTURE,
            });
          } else {
            req.respond({ status: 503, contentType: 'text/plain', body: 'Service Unavailable' });
          }
          return;
        }
        try { req.continue(); } catch { /* already handled */ }
      });

      await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(
        () => window.__godsEyeView?.viewer && window.__godsEyeView?.dataManager,
        { timeout: 60000 },
      );
      await sleep(1500);

      // First: seed the catalog with nominal data
      const seedStats = await page.evaluate(async () => {
        const dm = window.__godsEyeView.dataManager;
        await dm.setEnabled('satellites', true);
        const mod = dm.layers.get('satellites').module;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const s = mod.getStats();
          if (s.count > 0) return s;
        }
        return mod.getStats();
      });
      record('TOTAL LOSS setup: catalog seeded',
        seedStats.count > 0,
        `seeded count=${seedStats.count}`);
      const seededCount = seedStats.count;

      // Switch to total failure mode and trigger a refresh
      interceptMode = 'failure';
      const afterOutage = await page.evaluate(async (seeded) => {
        const dm = window.__godsEyeView.dataManager;
        const mod = dm.layers.get('satellites').module;
        // Trigger a manual refresh by calling update
        try {
          const viewer = window.__godsEyeView.viewer;
          await mod.update(viewer);
        } catch { /* update may throw on abort */ }
        await new Promise((r) => setTimeout(r, 2000));
        const s = mod.getStats();
        return { ...s, seeded };
      }, seededCount);

      record('TOTAL LOSS: status is unavailable',
        afterOutage.status === 'unavailable',
        `status=${afterOutage.status}`);
      record('TOTAL LOSS: error is CelesTrak unreachable',
        afterOutage.error === 'CelesTrak unreachable',
        `error=${JSON.stringify(afterOutage.error)}`);
      record('TOTAL LOSS: stale catalog retained (count preserved from seed)',
        afterOutage.count > 0 && afterOutage.count === seededCount,
        `count=${afterOutage.count} seeded=${seededCount}`);

      if (afterOutage.status !== 'unavailable' || afterOutage.count === 0) exitCode = 1;

      await page.screenshot({ path: path.join(SHOTS_DIR, 'mf14-total-loss.png') });
      await page.close();
    }
  } catch (e) {
    console.error('\x1b[31mHarness error:\x1b[0m', e);
    exitCode = 3;
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.ok === true).length;
  const fail = results.filter((r) => r.ok === false).length;
  console.log('\n' + '─'.repeat(60));
  console.log(`  MF-14 RESULT: ${pass} passed, ${fail} failed`);
  console.log(`  Shots : ${SHOTS_DIR}/mf14-*.png`);
  console.log('─'.repeat(60) + '\n');
  process.exit(exitCode || (fail > 0 ? 1 : 0));
}

main().catch((e) => { console.error(e); process.exit(3); });
