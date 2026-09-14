import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { normalizeRegionalArticles } from '../src/data/regionalBrief.js';

const output = process.argv[2];
if (!output) throw new Error('Pass a screenshot output path');
const moduleUrl = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const presentation = moduleUrl(await readFile(new URL('../src/ui/cockpitPresentation.js', import.meta.url), 'utf8'));
const briefing = moduleUrl((await readFile(new URL('../src/ui/cockpitBriefing.js', import.meta.url), 'utf8'))
  .replace("'./cockpitPresentation.js'", JSON.stringify(presentation)));
const css = await readFile(new URL('../src/ui/styles/cockpit.css', import.meta.url), 'utf8');
const articles = normalizeRegionalArticles({ articles: [
  { title: 'Unconfirmed regional report', url: 'https://original.example/report', seendate: '20200101T000000Z' },
  { title: 'Unconfirmed regional report', url: 'https://syndicated.example/report', seendate: '20260913T120000Z' },
  { title: 'Report without source clock', url: 'https://unknown.example/report' },
] });
articles.push({ title: 'RSS publication record', url: 'https://rss.example/report', domain: 'RSS outlet',
  publishedAt: '2026-09-12T12:00:00Z', publicationTimeBasis: 'RSS pubDate' });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.setContent('<style>body {background:#101820;color:#ddd;font:14px monospace} main {width:380px;padding:24px} </style><main><h2>Regional news · deterministic fixture</h2><ul class="cockpit-news-list"></ul></main>');
  await page.addStyleTag({ content: css });
  const result = await page.evaluate(async ({ briefing, articles }) => {
    const { renderRegionalBrief } = await import(briefing);
    const list = document.querySelector('ul');
    renderRegionalBrief.call({ newsList: list, updateLocalPosition() {}, scheduleContextLayout() {} }, { articles }, {});
    return {
      rows: [...list.children].map(row => row.innerText),
      links: [...list.querySelectorAll('a')].map(a => a.href),
      overflow: [...list.querySelectorAll('span')].some(span => span.scrollWidth > span.clientWidth + 1),
    };
  }, { briefing, articles });
  assert.equal(result.rows.length, 4);
  assert.match(result.rows[0], /PUBLICATION UNKNOWN.*INDEXED/s);
  assert.match(result.rows[1], /POSSIBLE SYNDICATION/);
  assert.match(result.rows[2], /PUBLICATION UNKNOWN/);
  assert.doesNotMatch(result.rows[2], /INDEXED/);
  assert.match(result.rows[3], /REPORTED PUBLICATION/);
  for (const row of result.rows) assert.match(row, /EVENT TIME UNKNOWN · UNVERIFIED · CORRECTIONS UNKNOWN/);
  assert.deepEqual(result.links, articles.map(a => a.url));
  assert.equal(result.overflow, false);
  await page.screenshot({ path: path.resolve(output) });
  console.log(JSON.stringify({ status: 'passed', ...result }, null, 2));
} finally { await browser.close(); }
