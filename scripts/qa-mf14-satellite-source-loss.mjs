#!/usr/bin/env node
/**
 * qa-mf14-satellite-source-loss.mjs — MF-14 browser acceptance.
 *
 * Drives headless Chromium against the dev server with intercepted CelesTrak
 * responses. Proves the satellite layer's source-loss behavior through three
 * deterministic states:
 *
 *   (i)   NOMINAL — all 6 core groups load valid TLE fixtures; layer shows
 *         satellites, status=nominal, DOM layer chip reads nominal/ON.
 *         A satellite is selected via trackById and its tracked readout is
 *         verified for name, altitude, NORAD id, and element provenance.
 *   (ii)  PARTIAL LOSS — 2 groups fail (503); layer status=degraded,
 *         DOM chip reads degraded, catalog retained (count > 0).
 *   (iii) TOTAL LOSS — all 6 groups fail; status=unavailable, DOM chip
 *         reads unavailable, stale catalog retained on screen.
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

/** Read the satellite layer toggle button's feed state from the DOM. */
async function readLayerChipState(page) {
  return page.evaluate(() => {
    const row = document.querySelector('[data-layer-id="satellites"]');
    if (!row) return null;
    const btn = row.querySelector('.data-toggle-btn');
    if (!btn) return null;
    return {
      feedState: btn.dataset.feedState || null,
      text: btn.textContent?.trim() || null,
    };
  });
}

/** Read the tracked readout from the overlay accessibility layer. */
async function readTrackedAccessibility(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll(
      '#world-overlay-action-list button[data-overlay-action-key]',
    )];
    const tracked = buttons.find((b) => {
      const key = b.dataset.overlayActionKey || '';
      return key.includes('tracked');
    });
    if (tracked) {
      return { label: tracked.getAttribute('aria-label') || tracked.textContent || '' };
    }
    return null;
  });
}

/** Enable the satellite layer and wait for catalog to load. */
async function enableSatellitesAndWait(page, { timeoutS = 30 } = {}) {
  return page.evaluate(async (tS) => {
    const dm = window.__godsEyeView.dataManager;
    await dm.setEnabled('satellites', true);
    const mod = dm.layers.get('satellites').module;
    for (let i = 0; i < tS; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const s = mod.getStats();
      if ((s.count > 0 || s.error) && s.status !== 'loading') return s;
    }
    return mod.getStats();
  }, timeoutS);
}

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

      const stats = await enableSatellitesAndWait(page);

      record('NOMINAL: satellites loaded, count > 0',
        stats.count > 0,
        `count=${stats.count} status=${stats.status}`);
      record('NOMINAL: getStats().status is nominal',
        stats.status === 'nominal',
        `status=${stats.status}`);
      record('NOMINAL: no error reported',
        stats.error === null || stats.error === undefined,
        `error=${JSON.stringify(stats.error)}`);

      if (stats.count === 0 || stats.status !== 'nominal') exitCode = 1;

      // Read actual DOM layer chip feed state
      const chip = await readLayerChipState(page);
      record('NOMINAL: DOM layer chip feedState is nominal',
        chip?.feedState === 'nominal',
        `feedState=${chip?.feedState} text=${chip?.text}`);
      if (chip?.feedState !== 'nominal') exitCode = 1;

      // Select ISS (NORAD 25544) via the public trackById API and verify tracked readout
      const trackResult = await page.evaluate(async () => {
        const dm = window.__godsEyeView.dataManager;
        const mod = dm.layers.get('satellites').module;
        const tracked = mod.trackById(25544, { origin: 'user' });
        await new Promise((r) => setTimeout(r, 2000));
        window.__godsEyeView.viewer.scene.requestRender?.();
        await new Promise((r) => setTimeout(r, 500));

        const entity = window.__godsEyeView.viewer.trackedEntity;
        if (!entity) return { tracked, entity: null };

        const model = entity.gevLabelModel;
        return {
          tracked,
          title: model?.title || null,
          details: model?.details || null,
          trackedId: entity.gevTrackedId || null,
        };
      });

      record('NOMINAL: ISS tracked via trackById',
        trackResult.tracked === true,
        `trackedId=${trackResult.trackedId}`);

      if (trackResult.tracked) {
        record('NOMINAL: tracked readout title is ISS (ZARYA)',
          trackResult.title === 'ISS (ZARYA)',
          `title=${trackResult.title}`);

        const details = trackResult.details || [];
        const hasNorad = details.some((d) => /NORAD 25544/.test(d));
        record('NOMINAL: tracked readout includes NORAD 25544',
          hasNorad,
          `details=${JSON.stringify(details)}`);

        const hasAltitude = details.some((d) => /\d+ km/.test(d));
        record('NOMINAL: tracked readout includes altitude',
          hasAltitude,
          `details=${JSON.stringify(details)}`);

        const hasProvenance = details.some((d) => /CURRENT TLE|TLE/i.test(d));
        record('NOMINAL: tracked readout includes element provenance',
          hasProvenance,
          `details=${JSON.stringify(details)}`);

        const hasClass = details.some((d) => /STATION|ISS/i.test(d));
        record('NOMINAL: tracked readout includes satellite class',
          hasClass,
          `details=${JSON.stringify(details)}`);
      } else {
        record('NOMINAL: tracked readout title is ISS (ZARYA)', false, 'tracking failed');
        exitCode = 1;
      }

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

      const stats = await enableSatellitesAndWait(page);

      record('PARTIAL: catalog retained (count > 0)',
        stats.count > 0,
        `count=${stats.count}`);
      record('PARTIAL: getStats().status is degraded',
        stats.status === 'degraded',
        `status=${stats.status}`);
      record('PARTIAL: error reports unavailable groups',
        typeof stats.error === 'string' && /unavailable/i.test(stats.error),
        `error=${JSON.stringify(stats.error)}`);

      if (stats.count === 0 || stats.status !== 'degraded') exitCode = 1;

      // Read actual DOM layer chip feed state
      const chip = await readLayerChipState(page);
      record('PARTIAL: DOM layer chip feedState is degraded',
        chip?.feedState === 'degraded',
        `feedState=${chip?.feedState} text=${chip?.text}`);

      await page.screenshot({ path: path.join(SHOTS_DIR, 'mf14-partial-loss.png') });
      await page.close();
    }

    // ── (iii) TOTAL LOSS — all groups fail ─────────────────────────────────
    console.log('\n(iii) TOTAL LOSS — all 6 groups return 503...');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });

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

      // Seed the catalog with nominal data first
      const seedStats = await enableSatellitesAndWait(page);
      record('TOTAL LOSS setup: catalog seeded',
        seedStats.count > 0,
        `seeded count=${seedStats.count}`);
      const seededCount = seedStats.count;

      // Read DOM chip to confirm nominal state before outage
      const nominalChip = await readLayerChipState(page);
      record('TOTAL LOSS setup: DOM chip confirms nominal before outage',
        nominalChip?.feedState === 'nominal',
        `feedState=${nominalChip?.feedState}`);

      // Switch to total failure mode and trigger a refresh
      interceptMode = 'failure';
      const afterOutage = await page.evaluate(async (seeded) => {
        const dm = window.__godsEyeView.dataManager;
        const mod = dm.layers.get('satellites').module;
        try {
          const viewer = window.__godsEyeView.viewer;
          await mod.update(viewer);
        } catch { /* update may throw on abort */ }
        await new Promise((r) => setTimeout(r, 3000));
        dm._refreshTogglePanel?.();
        return mod.getStats();
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

      // Read actual DOM layer chip after total loss
      const lossChip = await readLayerChipState(page);
      record('TOTAL LOSS: DOM layer chip feedState is unavailable',
        lossChip?.feedState === 'unavailable' || lossChip?.feedState === 'stale',
        `feedState=${lossChip?.feedState} text=${lossChip?.text}`);

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
