#!/usr/bin/env node
/**
 * Proof: empty Demigod bounties stay honest.
 *
 * Pass when:
 *   - bounties-feed.json is demigod-bounties-feed/v1 with listings []
 *   - feed / rendered empty state never emit "payTo":""
 *   - foot page HTML is no-JS-readable (empty state in the template)
 *   - feed fetch is pin-SHA (same host as foot-latest.js), never @main
 *   - bountyRender([]) keeps the empty state
 *   - bountyNormalize({payTo:""}) omits payTo
 *
 *   node scripts/proof-bounties-empty.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(join(root, 'foot-latest.js'), 'utf8');
const css = readFileSync(join(root, 'head-latest.css'), 'utf8');
const htmlStatic = readFileSync(join(root, 'bounties.html'), 'utf8');
const feed = JSON.parse(readFileSync(join(root, 'bounties-feed.json'), 'utf8'));
const feedRaw = readFileSync(join(root, 'bounties-feed.json'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('PROOF FAIL: ' + msg);
}

assert(feed.schema === 'demigod-bounties-feed/v1', 'schema is demigod-bounties-feed/v1');
assert(Array.isArray(feed.listings) && feed.listings.length === 0, 'listings is []');
assert(!/"payTo"\s*:\s*""/.test(feedRaw), 'feed JSON emits "payTo":""');
assert(!/dasha-bounties-feed|dasha-desk|extraSeed/i.test(JSON.stringify(feed.listings)), 'feed still has Dasha rows');
assert(/don't hold/i.test(feed.note) && /10%/.test(feed.note), 'feed note splits USDC rail from 10% on hire');

const pageBlock = js.match(/bounties:\s*\{[\s\S]*?\n  \},\n  map:/);
assert(pageBlock, 'bounties page block in foot-latest.js');
const pageHtml = pageBlock[0];
assert(/There are no Demigod listings yet/.test(pageHtml), 'page HTML has empty-state lead');
assert(/potter@trydemigod\.com/.test(pageHtml), 'page HTML has potter@');
assert(/10% of first-year base when a hire starts/.test(pageHtml), 'page HTML names 10% matching fee');
assert(/Declared USDC/.test(pageHtml) && /unused/.test(pageHtml), 'page HTML splits declared USDC rail');
assert(/We don't hold USDC/.test(pageHtml), 'page HTML says we do not hold USDC');
assert(!/id="dg-bounty-payto"|name="payTo"/.test(pageHtml), 'empty-state page still has payTo input');
assert(/id="dg-bounty-empty"/.test(pageHtml), 'empty state is in the template (no-JS-readable)');

assert(!/bounties-feed\.json.*@main|@main\/bounties-feed|demigod-site-cdn\/main\/bounties-feed/.test(js), 'foot still fetches bounties-feed @main');
assert(/function dgBountiesFeedUrl/.test(js), 'foot resolves feed from pin SHA');
assert(/if \(payTo\) out\.payTo = payTo/.test(js), 'normalize only sets payTo when non-empty');
assert(/@main\(\?:\\\/\|\[\?#\]\|\$\)/.test(js) || /@main\(\?:\/\|\[\?#\]\|\$\)/.test(js), 'feed URL rejects @main');

assert(/There are no Demigod listings yet/.test(htmlStatic), 'bounties.html empty state');
assert(/potter@trydemigod\.com/.test(htmlStatic), 'bounties.html contact');
assert(!/"payTo"\s*:\s*""/.test(htmlStatic), 'bounties.html emits payTo:""');

assert(/data-wf-page="6a7e0d218c0fdcade58240b3"/.test(css), 'head no-JS empty state targets /bounties Webflow page');
assert(/There are no Demigod listings yet/.test(css), 'head no-JS copy names empty listings');
assert(/potter@trydemigod\.com/.test(css), 'head no-JS copy has potter@');
assert(/10% on-hire matching fee/.test(css), 'head no-JS copy splits 10% from USDC rail');

function extractFn(name) {
  const start = js.indexOf('function ' + name + '(');
  assert(start >= 0, 'extract ' + name);
  let i = js.indexOf('{', start);
  assert(i >= 0, 'extract body ' + name);
  let depth = 0;
  let quote = '';
  let escape = false;
  for (; i < js.length; i++) {
    const c = js[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    if (c === '/' && js[i + 1] === '/') {
      i = js.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (c === '/' && js[i + 1] === '*') {
      i = js.indexOf('*/', i + 2);
      if (i < 0) break;
      i += 1;
      continue;
    }
    if (c === '/') {
      let p = i - 1;
      while (p >= 0 && /[ \t]/.test(js[p])) p--;
      if (/[=(:,!&|?[;{}\n+]/.test(js[p] || '\n')) {
        quote = '/';
        continue;
      }
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return js.slice(start, i + 1);
    }
  }
  throw new Error('PROOF FAIL: unclosed ' + name);
}

const helpers = [
  extractFn('bountyListingKey'),
  extractFn('bountyIsSolana'),
  extractFn('bountyIsEvm'),
  extractFn('bountyPayHref'),
  extractFn('bountyIsDashaDesk'),
  extractFn('bountyOwnListings'),
  extractFn('bountyNormalize'),
  extractFn('dgBountiesFeedUrl'),
  extractFn('bountyRender'),
].join('\n');

const empty = { hidden: false, innerHTML: '<p class="dg-p-lead">There are no Demigod listings yet.</p>' };
const host = { hidden: true, innerHTML: 'stale', querySelectorAll: () => [] };
const rootEl = {
  querySelector(sel) {
    if (sel === '#dg-bounty-empty') return empty;
    if (sel === '#dg-bounty-live') return host;
    return null;
  },
};
const docs = {
  q(sel) {
    if (sel === '#demigod-foot-cdn-loader') {
      return { src: 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/foot-latest.js' };
    }
    if (sel === 'meta[name="dg-bounties-feed"]') return null;
    if (String(sel).includes('preload')) return null;
    return null;
  },
  document: {
    getElementsByTagName() { return []; },
  },
};

const ctx = vm.createContext({
  q: docs.q,
  document: docs.document,
  DG_USDC_SOL: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  DG_USDC_BASE: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  console,
});
vm.runInContext(helpers, ctx);

const blank = vm.runInContext('bountyNormalize({name:"x",repo:"a/b",payTo:"",amount:25}, "demigod")', ctx);
assert(blank && blank.name === 'x', 'normalize keeps a real listing');
assert(!Object.prototype.hasOwnProperty.call(blank, 'payTo'), 'normalize({payTo:""}) still has payTo key');
assert(!JSON.stringify(blank).includes('"payTo":""'), 'normalize JSON emits "payTo":""');

const dasha = vm.runInContext('bountyNormalize({name:"dasha desk",repo:"Uuriko/dasha-desk",payTo:""}, "demigod")', ctx);
assert(dasha == null, 'dasha-desk listing must be dropped');
const dashaFeed = vm.runInContext('bountyOwnListings({schema:"dasha-bounties-feed/v1",listings:[{name:"x",repo:"a/b"}]})', ctx);
assert(Array.isArray(dashaFeed) && dashaFeed.length === 0, 'dasha schema feed must be []');

ctx.__root = rootEl;
vm.runInContext('bountyRender(__root, [])', ctx);
assert(empty.hidden === false, 'empty listings hid #dg-bounty-empty');
assert(host.hidden === true, 'empty listings left #dg-bounty-live visible');
assert(host.innerHTML === '', 'empty listings wrote into #dg-bounty-live');
assert(/There are no Demigod listings yet/.test(empty.innerHTML), 'empty state text lost after render([])');
assert(!/"payTo"\s*:\s*""/.test(empty.innerHTML + host.innerHTML), 'render([]) emitted "payTo":""');

const pinUrl = vm.runInContext('dgBountiesFeedUrl()', ctx);
assert(
  pinUrl === 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/bounties-feed.json',
  'feed URL must follow foot-latest.js pin SHA, got ' + pinUrl
);
assert(!/@main/.test(pinUrl), 'resolved feed URL contains @main');

ctx.q = function (sel) {
  if (sel === '#demigod-foot-cdn-loader') {
    return { src: 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@main/foot-latest.js' };
  }
  return null;
};
const rejected = vm.runInContext('dgBountiesFeedUrl()', ctx);
assert(rejected === '', '@main foot src must not resolve a feed URL, got ' + rejected);

const dumpDir = '/tmp/dg-bounties-empty-proof';
mkdirSync(dumpDir, { recursive: true });
const report = {
  schema: feed.schema,
  listings: feed.listings,
  feedHasPayToEmpty: /"payTo"\s*:\s*""/.test(feedRaw),
  pinUrl,
  rejectedMain: rejected,
  normalizeOmitsEmptyPayTo: !Object.prototype.hasOwnProperty.call(blank, 'payTo'),
  renderEmptyKeepsState: empty.hidden === false && host.hidden === true && host.innerHTML === '',
};
writeFileSync(join(dumpDir, 'report.json'), JSON.stringify(report, null, 2));

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome', '/usr/local/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((p) => {
      try { return spawnSync(p, ['--version'], { encoding: 'utf8', timeout: 5000 }).status === 0; }
      catch { return false; }
    });

if (chrome) {
  const fixture = `<!doctype html><html data-wf-page="6a7e0d218c0fdcade58240b3"><head>
<meta charset="utf-8">
<style id="overlay">${css.replace(/<\/style/gi, '<\\/style')}</style>
</head><body>
<script>
const before = getComputedStyle(document.body, '::before');
const report = { content: before.content, display: before.display };
document.body.setAttribute('data-proof', JSON.stringify(report));
</script>
</body></html>`;
  const tmp = '/tmp/dg-bounties-empty-proof.html';
  writeFileSync(tmp, fixture);
  const result = spawnSync(
    chrome,
    ['--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files', '--dump-dom', 'file://' + tmp],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 30000 }
  );
  assert(result.status === 0, 'chrome exited ' + result.status);
  const m = result.stdout.match(/data-proof="([^"]+)"/);
  assert(m, 'chrome dump contains data-proof');
  const painted = JSON.parse(m[1].replace(/&quot;/g, '"'));
  assert(/no Demigod listings yet/i.test(String(painted.content || '')), 'no-JS ::before missing empty state: ' + painted.content);
  assert(/potter@trydemigod\.com/i.test(String(painted.content || '')), 'no-JS ::before missing potter@: ' + painted.content);
  assert(painted.display !== 'none', 'no-JS ::before is display:none');
  writeFileSync(join(dumpDir, 'chrome.json'), JSON.stringify(painted, null, 2));
}

console.log('PROOF PASS');
console.log(JSON.stringify(report, null, 2));
