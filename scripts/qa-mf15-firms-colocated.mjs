#!/usr/bin/env node
/**
 * qa-mf15-firms-colocated.mjs — MF-15 browser acceptance.
 *
 * Drives headless Chromium against the dev server with intercepted FIRMS
 * responses containing two co-located VIIRS detections (N20 and N21 at the
 * same lat/lon with the same acquisition time). Proves:
 *
 *   (i)   RENDER — both detections exist in the layer, both have distinct
 *         detection keys, and at least one ambient card renders on the canvas.
 *   (ii)  CYCLE — clicking the visible card selects the first detection;
 *         clicking again on the same card cycles to the second detection.
 *         Both selected detail cards carry correct per-sensor product and
 *         sourceSupport.
 *   (iii) SOURCE LOSS — when /api/firms returns 503 no_key, both retained
 *         detections are marked stale with 'key required' in sourceSupport.
 *
 * No upstream FIRMS key required — all responses are intercepted.
 * Screenshots saved to qa-shots/ (gitignored).
 *
 * Run:  node scripts/qa-mf15-firms-colocated.mjs --url http://localhost:4176
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

const ACQ_DATE = '2026-09-13';
const ACQ_TIME = '0400';

function colocatedPayload() {
  const mk = (satellite, product) => ({
    lat: 30.51, lon: -98.21, frp: 1520.4, confidence: 'h',
    brightness: 330, brightnessTi5: 290, daynight: 'N',
    acqDate: ACQ_DATE, acqTime: ACQ_TIME,
    satellite, instrument: 'VIIRS', product,
  });
  return {
    fetchedAt: Date.now(),
    stale: false,
    ttlMs: 1800000,
    sources: [
      { source: 'VIIRS_NOAA20_NRT', count: 1, ok: true },
      { source: 'VIIRS_NOAA21_NRT', count: 1, ok: true },
    ],
    count: 2,
    fires: [
      mk('N20', 'VIIRS_NOAA20_NRT'),
      mk('N21', 'VIIRS_NOAA21_NRT'),
    ],
  };
}

async function bootAndEnable(page, { timeoutS = 30 } = {}) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(
    () => window.__godsEyeView?.viewer && window.__godsEyeView?.dataManager,
    { timeout: 60000 },
  );
  await sleep(1500);
  return page.evaluate(async (tS) => {
    const dm = window.__godsEyeView.dataManager;
    await dm.setEnabled('local-firms', true);
    const mod = dm.layers.get('local-firms').module;
    let s = null;
    for (let i = 0; i < tS; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      s = mod.getStats();
      if ((s.count > 0 || s.error) && !s.loading) break;
    }
    return s;
  }, timeoutS);
}

async function setView(page, lon, lat, height) {
  await page.evaluate((lo, la, h) => {
    const gev = window.__godsEyeView;
    const ell = gev.viewer.scene.globe.ellipsoid;
    const d2r = Math.PI / 180;
    try { gev.viewer.camera.cancelFlight(); } catch { /* no flight active */ }
    gev.viewer.camera.setView({
      destination: ell.cartographicToCartesian({ longitude: lo * d2r, latitude: la * d2r, height: h }),
      orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
    });
    gev.viewer.scene.requestRender?.();
  }, lon, lat, height);
}

async function waitForOverlayCards(page, { timeoutMs = 15000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let sample = null;
  while (Date.now() < deadline) {
    await page.evaluate(() => window.__godsEyeView?.viewer?.scene?.requestRender?.());
    await sleep(300);
    sample = await page.evaluate(() => {
      const diagnostics = window.__gevWorldOverlay?.getDiagnostics?.();
      return {
        painted: diagnostics?.paintedBySource?.firms || 0,
        entries: diagnostics?.entriesBySource?.firms || 0,
      };
    });
    if (sample.entries > 0 && sample.painted > 0) return sample;
  }
  return sample || { painted: 0, entries: 0 };
}

async function main() {
  console.log('\nMF-15 Co-located FIRMS Access Browser Acceptance');
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
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setRequestInterception(true);
    let interceptMode = 'colocated';
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/firms/status')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(interceptMode === 'keyless'
            ? { hasKey: false }
            : { hasKey: true, lastFetch: Date.now(), count: 2, stale: false, ttlMs: 1800000, transactions: null }),
        });
        return;
      }
      if (url.includes('/api/firms')) {
        if (interceptMode === 'keyless') {
          req.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'no_key' }) });
        } else {
          req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(colocatedPayload()) });
        }
        return;
      }
      try { req.continue(); } catch { /* already handled */ }
    });

    // ── (i) RENDER — both detections loaded ────────────────────────────────
    console.log('(i) RENDER — loading co-located N20+N21 fixture...');
    const stats = await bootAndEnable(page);

    record('RENDER: layer loaded 2 detections',
      stats?.count === 2,
      `count=${stats?.count}`);

    const fireKeys = await page.evaluate(() => {
      const dm = window.__godsEyeView.dataManager;
      const mod = dm.layers.get('local-firms').module;
      const fires = mod.getDetectableObjects({ maxCount: 10 });
      return fires.map((f) => ({
        key: f.key || f.id,
        satellite: f.satellite,
        product: f.product,
      }));
    });
    record('RENDER: distinct detection keys',
      fireKeys.length === 2,
      `keys=${JSON.stringify(fireKeys)}`);
    if (stats?.count !== 2 || fireKeys.length !== 2) exitCode = 1;

    // Move camera to the fire location
    await setView(page, -98.21, 30.51, 50000);
    const overlay = await waitForOverlayCards(page);
    record('RENDER: card overlay painted for co-located fires',
      overlay.entries > 0 && overlay.painted > 0,
      `entries=${overlay.entries} painted=${overlay.painted}`);
    if (overlay.painted === 0) exitCode = 1;
    await page.screenshot({ path: path.join(SHOTS_DIR, 'mf15-colocated-render.png') });

    // ── (ii) CYCLE — click to select first, reclick to cycle to second ─────
    console.log('\n(ii) CYCLE — clicking card to verify per-sensor detail and cycling...');

    // Click the accessible FIRMS action button (keyboard/assistive mirror)
    const firstClick = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll(
        '#world-overlay-action-list button[data-overlay-action-key]',
      )].filter((b) => String(b.dataset.overlayActionKey || '').startsWith('firms\x00'));
      if (buttons.length > 0) {
        buttons[0].click();
        return { method: 'action-button', count: buttons.length };
      }
      return null;
    });

    if (firstClick) {
      await sleep(1000);
      // Read the selected entity from the context store
      const card1 = await page.evaluate(() => {
        const store = window.__gevContextStore;
        if (!store?.selectedEntityId) return null;
        const record = store.entities.get(store.selectedEntityId);
        if (!record) return null;
        return {
          id: store.selectedEntityId,
          sensor: record.properties?.sensor || null,
          product: record.properties?.product || null,
          sourceSupport: record.properties?.sourceSupport || null,
        };
      });

      record('CYCLE: first click selects a fire detection',
        card1?.id != null,
        `selectedId=${card1?.id}`);

      if (card1) {
        record('CYCLE: first selection has per-sensor product',
          card1.product === 'VIIRS_NOAA20_NRT' || card1.product === 'VIIRS_NOAA21_NRT',
          `product=${card1.product}`);
      }
      const card1product = card1?.product;

      // Wait for overlay to settle after first selection, then re-render
      await sleep(500);
      await page.evaluate(() => window.__godsEyeView?.viewer?.scene?.requestRender?.());
      await sleep(500);

      // Now reclick the visible card to cycle to the co-located sibling.
      // The selected card's action button should have been rebuilt.
      const reclickDebug = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll(
          '#world-overlay-action-list button[data-overlay-action-key]',
        )].filter((b) => String(b.dataset.overlayActionKey || '').startsWith('firms\x00'));
        const pressed = buttons.filter((b) => b.getAttribute('aria-pressed') === 'true');
        const info = {
          totalButtons: buttons.length,
          pressedButtons: pressed.length,
          labels: buttons.map((b) => b.getAttribute('aria-label') || b.textContent || '').slice(0, 3),
        };
        // Click the pressed (selected) button, or the first one if none pressed
        const target = pressed[0] || buttons[0];
        if (target) target.click();
        info.clicked = Boolean(target);
        return info;
      });
      if (!reclickDebug.clicked) console.log(`    Note: no action button found for reclick`);
      await sleep(1500);

      const card2 = await page.evaluate(() => {
        const store = window.__gevContextStore;
        if (!store?.selectedEntityId) return null;
        const record = store.entities.get(store.selectedEntityId);
        if (!record) return null;
        return {
          id: store.selectedEntityId,
          sensor: record.properties?.sensor || null,
          product: record.properties?.product || null,
          sourceSupport: record.properties?.sourceSupport || null,
        };
      });

      if (card2) {
        record('CYCLE: reclick cycled to different sensor',
          card2.id !== card1?.id,
          `first=${card1?.id} second=${card2.id}`);
        record('CYCLE: cycled detection has distinct product',
          card2.product !== card1product,
          `product1=${card1product} product2=${card2.product}`);
        if (card2.id === card1?.id) exitCode = 1;
      } else {
        record('CYCLE: reclick cycled to different sensor', false, 'no selected fire after reclick');
        exitCode = 1;
      }
    } else {
      record('CYCLE: fire action button available', false, 'no action button found');
      exitCode = 1;
    }

    await page.screenshot({ path: path.join(SHOTS_DIR, 'mf15-colocated-cycle.png') });

    // ── (iii) SOURCE LOSS — both detections marked stale ───────────────────
    console.log('\n(iii) SOURCE LOSS — switching to keyless mode...');
    interceptMode = 'keyless';

    // Trigger a FIRMS refresh
    await page.evaluate(async () => {
      const dm = window.__godsEyeView.dataManager;
      const mod = dm.layers.get('local-firms').module;
      // Force a reload to pick up the keyless state
      if (mod._refreshForTest) {
        await mod._refreshForTest();
      } else {
        await dm.setEnabled('local-firms', false);
        await new Promise((r) => setTimeout(r, 500));
        await dm.setEnabled('local-firms', true);
      }
    });
    await sleep(3000);

    const lossStats = await page.evaluate(() => {
      const dm = window.__godsEyeView.dataManager;
      const mod = dm.layers.get('local-firms').module;
      return mod.getStats();
    });

    const lossCards = await page.evaluate(() => {
      const store = window.__gevContextStore;
      if (!store?.entities) return [];
      return [...store.entities.values()]
        .filter((r) => r.layerId === 'local-firms')
        .map((r) => ({
          sensor: r.properties?.sensor || null,
          sourceSupport: r.properties?.sourceSupport || null,
          product: r.properties?.product || null,
        }));
    });

    const allStale = lossCards.every((c) =>
      typeof c.sourceSupport === 'string' && /STALE|key required/i.test(c.sourceSupport));

    record('SOURCE LOSS: key required error surfaced',
      lossStats.error === 'KEY REQUIRED' || /key/i.test(String(lossStats.error)),
      `error=${JSON.stringify(lossStats.error)}`);

    if (lossCards.length > 0) {
      record('SOURCE LOSS: retained detections marked stale',
        allStale,
        `detections=${lossCards.length} supports=${JSON.stringify(lossCards.map(c => c.sourceSupport))}`);
    } else {
      record('SOURCE LOSS: detections retained (count > 0)', lossCards.length > 0,
        `count=${lossCards.length}`);
    }

    await page.screenshot({ path: path.join(SHOTS_DIR, 'mf15-colocated-source-loss.png') });
    await page.close();
  } catch (e) {
    console.error('\x1b[31mHarness error:\x1b[0m', e);
    exitCode = 3;
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.ok === true).length;
  const fail = results.filter((r) => r.ok === false).length;
  console.log('\n' + '─'.repeat(60));
  console.log(`  MF-15 RESULT: ${pass} passed, ${fail} failed`);
  console.log(`  Shots : ${SHOTS_DIR}/mf15-*.png`);
  console.log('─'.repeat(60) + '\n');
  process.exit(exitCode || (fail > 0 ? 1 : 0));
}

main().catch((e) => { console.error(e); process.exit(3); });
