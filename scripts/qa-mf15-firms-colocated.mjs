#!/usr/bin/env node
/**
 * qa-mf15-firms-colocated.mjs — MF-15 browser acceptance.
 *
 * Drives headless Chromium against the dev server with intercepted FIRMS
 * responses containing two co-located VIIRS detections (N20 and N21 at the
 * same lat/lon with the same acquisition time). Proves:
 *
 *   (i)   RENDER — both detections exist in the layer with distinct keys;
 *         at least one card is painted on the canvas overlay.
 *   (ii)  CYCLE — real pointer click on the projected fire position selects
 *         the first detection with per-sensor product/acquisition/support.
 *         Re-clicking the same screen position cycles to the second
 *         detection with a distinct product. Both sensors verified.
 *   (iii) SOURCE LOSS — when /api/firms returns 503 no_key, exactly 2
 *         retained detections are marked stale with distinct IDs.
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
      { source: 'VIIRS_SNPP_NRT', count: 0, ok: false },
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
  await page.waitForSelector('#first-run-launcher:not([hidden])', { timeout: 30000 });
  await page.click('[data-first-run-choice="explore"]');
  await page.waitForSelector('#first-run-launcher', { hidden: true, timeout: 10000 });
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

/** Get the screen-space position of the first FIRMS fire by projecting its world position. */
async function getFireScreenPosition(page) {
  return page.evaluate(() => {
    const viewer = window.__godsEyeView.viewer;
    const dm = window.__godsEyeView.dataManager;
    const mod = dm.layers.get('local-firms').module;
    const fires = mod.getDetectableObjects({ maxCount: 10 });
    if (!fires.length || !fires[0].position) return null;
    const screen = viewer.scene.cartesianToCanvasCoordinates(fires[0].position);
    return screen ? { x: screen.x, y: screen.y } : null;
  });
}

/** Read overlay diagnostics: painted and entry counts for FIRMS source. */
async function getOverlayDiagnostics(page) {
  return page.evaluate(() => {
    const diagnostics = window.__gevWorldOverlay?.getDiagnostics?.();
    return {
      painted: diagnostics?.paintedBySource?.firms || 0,
      entries: diagnostics?.entriesBySource?.firms || 0,
      totalPainted: diagnostics?.paintedCount || 0,
    };
  });
}

/** Read the currently selected fire entity from the context store. */
async function readSelectedFire(page) {
  return page.evaluate(() => {
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
}

/** Read the accessibility button labels for FIRMS overlay actions. */
async function readAccessibilityButtons(page) {
  return page.evaluate(() => {
    const buttons = [...document.querySelectorAll(
      '#world-overlay-action-list button[data-overlay-action-key]',
    )].filter((b) => String(b.dataset.overlayActionKey || '').startsWith('firms\x00'));
    return buttons.map((b) => ({
      key: b.dataset.overlayActionKey,
      label: b.getAttribute('aria-label') || b.textContent || '',
      pressed: b.getAttribute('aria-pressed') === 'true',
    }));
  });
}

/** Read the FIRMS layer toggle button feed state from the DOM. */
async function readLayerChipState(page) {
  return page.evaluate(() => {
    const row = document.querySelector('[data-layer-id="local-firms"]');
    if (!row) return null;
    const btn = row.querySelector('.data-toggle-btn');
    if (!btn) return null;
    return {
      feedState: btn.dataset.feedState || null,
      text: btn.textContent?.trim() || null,
    };
  });
}

/** Wait for at least one overlay card to be painted. */
async function waitForOverlayCards(page, { timeoutMs = 15000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let diag = null;
  while (Date.now() < deadline) {
    await page.evaluate(() => window.__godsEyeView?.viewer?.scene?.requestRender?.());
    await sleep(300);
    diag = await getOverlayDiagnostics(page);
    if (diag.entries > 0 && diag.painted > 0) return diag;
  }
  return diag || { painted: 0, entries: 0, totalPainted: 0 };
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
      return fires.map((f) => f.id);
    });
    record('RENDER: exactly 2 detectable objects with distinct IDs',
      fireKeys.length === 2 && fireKeys[0] !== fireKeys[1],
      `ids=${JSON.stringify(fireKeys)}`);
    if (stats?.count !== 2 || fireKeys.length !== 2) exitCode = 1;

    // Move camera to the fire location for close-up view
    await setView(page, -98.21, 30.51, 50000);
    const overlay = await waitForOverlayCards(page);
    record('RENDER: overlay cards painted for co-located fires',
      overlay.entries > 0 && overlay.painted > 0,
      `entries=${overlay.entries} painted=${overlay.painted}`);
    if (overlay.painted === 0) exitCode = 1;

    // Read accessibility buttons to verify card content is reachable
    const buttons = await readAccessibilityButtons(page);
    record('RENDER: accessibility buttons present for interactive cards',
      buttons.length > 0,
      `buttons=${buttons.length} labels=${JSON.stringify(buttons.map(b => b.label).slice(0, 3))}`);

    await page.screenshot({ path: path.join(SHOTS_DIR, 'mf15-colocated-render.png') });

    // ── (ii) CYCLE — pointer click to select and cycle ────────────────────
    console.log('\n(ii) CYCLE — real pointer click to select first sensor, reclick to cycle...');

    // Get screen position of a fire detection for pointer click
    const firePos = await getFireScreenPosition(page);
    if (!firePos) {
      record('CYCLE: fire screen position available', false, 'could not project fire to screen');
      exitCode = 1;
    } else {
      record('CYCLE: fire projects to screen',
        firePos.x > 0 && firePos.y > 0,
        `x=${firePos.x.toFixed(0)} y=${firePos.y.toFixed(0)}`);

      // First real pointer click at the fire's screen position
      await page.mouse.click(firePos.x, firePos.y);
      await sleep(1500);
      await page.evaluate(() => window.__godsEyeView?.viewer?.scene?.requestRender?.());
      await sleep(500);

      const card1 = await readSelectedFire(page);
      record('CYCLE: first pointer click selects a fire detection',
        card1?.id != null,
        `selectedId=${card1?.id}`);

      if (card1) {
        record('CYCLE: first selection has per-sensor product',
          card1.product === 'VIIRS_NOAA20_NRT' || card1.product === 'VIIRS_NOAA21_NRT',
          `product=${card1.product}`);
        record('CYCLE: first selection has source support',
          /PARTIAL/.test(card1.sourceSupport),
          `sourceSupport=${card1.sourceSupport}`);

        // Verify the selected card's accessibility button is updated
        const selectedButtons = await readAccessibilityButtons(page);
        const pressedBtn = selectedButtons.find(b => b.pressed);
        record('CYCLE: selected card reflected in accessibility layer',
          pressedBtn != null,
          `pressed=${pressedBtn?.label?.slice(0, 80) || 'none'}`);

        record('CYCLE: first rendered card has acquisition and product',
          /acquired/.test(pressedBtn?.label) && pressedBtn.label.includes(card1.product),
          pressedBtn?.label);
        await page.screenshot({ path: path.join(SHOTS_DIR, 'mf15-first-sensor.png') });
        const card1Id = card1.id;
        const card1Product = card1.product;

        // Re-click at the same position to cycle to the co-located sibling
        await page.mouse.click(firePos.x, firePos.y);
        await sleep(1500);
        await page.evaluate(() => window.__godsEyeView?.viewer?.scene?.requestRender?.());
        await sleep(500);

        const card2 = await readSelectedFire(page);
        if (card2) {
          record('CYCLE: reclick cycled to different detection',
            card2.id !== card1Id,
            `first=${card1Id} second=${card2.id}`);
          record('CYCLE: cycled detection has distinct product',
            card2.product !== card1Product && (card2.product === 'VIIRS_NOAA20_NRT' || card2.product === 'VIIRS_NOAA21_NRT'),
            `product1=${card1Product} product2=${card2.product}`);
          record('CYCLE: cycled detection preserves partial source support',
            /PARTIAL/.test(card2.sourceSupport),
            `sourceSupport=${card2.sourceSupport}`);
          const secondButtons = await readAccessibilityButtons(page);
          const secondLabel = secondButtons.find(b => b.pressed)?.label || '';
          record('CYCLE: second rendered card has acquisition and product',
            /acquired/.test(secondLabel) && secondLabel.includes(card2.product), secondLabel);
          if (card2.id === card1Id) exitCode = 1;
        } else {
          record('CYCLE: reclick cycled to different detection', false, 'no selected fire after reclick');
          exitCode = 1;
        }
      } else {
        record('CYCLE: first selection has per-sensor product', false, 'no fire selected');
        exitCode = 1;
      }
    }

    await page.screenshot({ path: path.join(SHOTS_DIR, 'mf15-colocated-cycle.png') });

    // ── (iii) SOURCE LOSS — both detections marked stale ───────────────────
    console.log('\n(iii) SOURCE LOSS — switching to keyless mode via real refresh...');
    interceptMode = 'keyless';

    // Trigger a FIRMS refresh through the real data manager update path
    await page.evaluate(async () => {
      const dm = window.__godsEyeView.dataManager;
      const mod = dm.layers.get('local-firms').module;
      await mod.update();
      dm._refreshTogglePanel?.();
    });
    await sleep(3000);

    const lossStats = await page.evaluate(() => {
      const dm = window.__godsEyeView.dataManager;
      const mod = dm.layers.get('local-firms').module;
      return mod.getStats();
    });

    record('SOURCE LOSS: key required error surfaced',
      lossStats.error === 'KEY REQUIRED',
      `error=${JSON.stringify(lossStats.error)}`);

    // Read ALL retained FIRMS context entries — assert exactly 2 with distinct IDs
    const lossEntries = await page.evaluate(() => {
      const store = window.__gevContextStore;
      if (!store?.entities) return [];
      return [...store.entities.entries()]
        .filter(([, r]) => r.layerId === 'local-firms')
        .map(([id, r]) => ({
          id,
          sensor: r.properties?.sensor || null,
          product: r.properties?.product || null,
          sourceSupport: r.properties?.sourceSupport || null,
        }));
    });

    record('SOURCE LOSS: exactly 2 retained detections',
      lossEntries.length === 2,
      `count=${lossEntries.length}`);

    if (lossEntries.length === 2) {
      record('SOURCE LOSS: retained IDs are distinct',
        lossEntries[0].id !== lossEntries[1].id,
        `id1=${lossEntries[0].id} id2=${lossEntries[1].id}`);

      const allStale = lossEntries.every((e) =>
        typeof e.sourceSupport === 'string'
        && /STALE/i.test(e.sourceSupport)
        && /key required/i.test(e.sourceSupport));
      record('SOURCE LOSS: both detections marked stale with key required',
        allStale,
        `supports=${JSON.stringify(lossEntries.map(e => e.sourceSupport))}`);

      const products = lossEntries.map(e => e.product).sort();
      record('SOURCE LOSS: retained products are per-sensor',
        products.includes('VIIRS_NOAA20_NRT') && products.includes('VIIRS_NOAA21_NRT'),
        `products=${JSON.stringify(products)}`);

      if (!allStale) exitCode = 1;
    } else {
      record('SOURCE LOSS: retained IDs are distinct', false, `count=${lossEntries.length}`);
      exitCode = 1;
    }

    // Wait for layer panel to re-sync after source loss
    await page.evaluate(() => window.__godsEyeView?.viewer?.scene?.requestRender?.());
    await sleep(2000);

    // Read layer chip state from the DOM
    const chipState = await readLayerChipState(page);
    if (chipState) {
      record('SOURCE LOSS: layer chip reflects error state',
        chipState.feedState !== 'nominal',
        `feedState=${chipState.feedState} text=${chipState.text}`);
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
