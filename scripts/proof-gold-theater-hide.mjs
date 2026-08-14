#!/usr/bin/env node
/**
 * Selector + computed-style proof that leftover Webflow gold/statue
 * theater is not visible under the overlay CSS (first paint, no foot JS).
 *
 * Fixture = live www.trydemigod.com markup (2026-08-14 recurl) + Webflow
 * gold-clip rules that beat color remaps. Overlay = head-latest.css.
 *
 * Pass when:
 *   - .title-accent-gold computed display is none (or font-size 0)
 *   - .statue-frame / .statue-wrapper / .statue-svg computed display is none
 *   - H1 ::before content is "Demigod"
 *   - visible H1 text is not "SF Startup Talent"
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'head-latest.css'), 'utf8');
const js = readFileSync(join(root, 'foot-latest.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('PROOF FAIL: ' + msg);
}

const requiredCss = [
  [/\.title-accent-gold[\s\S]{0,400}display\s*:\s*none\s*!important/, 'head hides .title-accent-gold'],
  [/\.statue-frame[\s\S]{0,400}display\s*:\s*none\s*!important/, 'head hides .statue-frame'],
  [/\.statue-wrapper[\s\S]{0,400}display\s*:\s*none\s*!important/, 'head hides .statue-wrapper'],
  [/\.statue-svg[\s\S]{0,400}display\s*:\s*none\s*!important/, 'head hides .statue-svg'],
  [/content\s*:\s*"Demigod"/, 'head first-paint ::before is Demigod'],
  [/h1:not\(\[data-dg-hero-h1\]\):has\(\.title-accent-gold\)/, 'head zeros leftover H1 until JS brand paint'],
];
for (const [re, label] of requiredCss) assert(re.test(css), label);

const requiredJs = [
  [/title-accent-gold/, 'foot killGoldTheater targets title-accent-gold'],
  [/SF Startup Talent/, 'foot replaces leftover SF Startup Talent H1'],
  [/paintHeroBrandH1/, 'foot paints brand H1 Demigod'],
  [/display:none!important;visibility:hidden!important;font-size:0!important/, 'foot CSS hides leftover gold spans'],
];
for (const [re, label] of requiredJs) assert(re.test(js), label);

const wfGold = `
.title-accent-gold {
  color: var(--_colors---brand-gold, #c9a84c);
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(135deg, #e5c158 0%, #aa8c2c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  display: block;
}
.hero-title { color: #fff; font-family: Cinzel, serif; font-size: 6.5vw; font-weight: 900; }
.hero-content-right { display: flex; }
.statue-frame { position: relative; padding: 24px; }
.statue-wrapper { display: flex; width: 280px; height: 380px; }
.statue-svg { width: 100%; height: 100%; }
.hero-section h1:has(.title-accent-gold) { visibility: visible; }
`;

const liveMarkup = `
<header class="hero-section">
  <div class="hero-container">
    <div class="hero-content-left">
      <h1 class="hero-title"><span class="title-accent-gold">SF Startup Talent.</span> <span class="title-accent-red">Tech</span> <span class="title-accent-blue">Matched.</span></h1>
    </div>
    <div class="hero-content-right">
      <div class="statue-frame">
        <div class="statue-border-gold"></div>
        <div class="statue-wrapper"><svg class="statue-svg" viewBox="0 0 200 300"></svg></div>
      </div>
    </div>
  </div>
</header>
`;

const html = `<!doctype html><html><head>
<meta charset="utf-8">
<style id="webflow-gold">${wfGold}</style>
<style id="overlay">${css.replace(/<\/style/gi, '<\\/style')}</style>
</head><body>${liveMarkup}
<script>
const hidden = (el) => {
  if (!el) return { missing: true };
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    display: s.display,
    visibility: s.visibility,
    fontSize: s.fontSize,
    color: s.color,
    fill: s.webkitTextFillColor || s.getPropertyValue('-webkit-text-fill-color'),
    bg: s.backgroundImage,
    w: r.width,
    h: r.height,
    notVisible: s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.fontSize) === 0 || (r.width === 0 && r.height === 0)
  };
};
const h1 = document.querySelector('h1.hero-title');
const before = getComputedStyle(h1, '::before');
const report = {
  gold: hidden(document.querySelector('.title-accent-gold')),
  statueFrame: hidden(document.querySelector('.statue-frame')),
  statueWrapper: hidden(document.querySelector('.statue-wrapper')),
  statueSvg: hidden(document.querySelector('.statue-svg')),
  heroRight: hidden(document.querySelector('.hero-content-right')),
  h1Before: before.content,
  h1Text: (h1 && h1.innerText || '').replace(/\\s+/g, ' ').trim()
};
document.title = 'PROOF';
document.body.setAttribute('data-proof', JSON.stringify(report));
</script>
</body></html>`;

const tmp = '/tmp/dg-gold-theater-proof.html';
writeFileSync(tmp, html);

const chrome =
  process.env.CHROME_PATH ||
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(() => true);

const evalJs = `
const el = document.body;
JSON.parse(el.getAttribute('data-proof') || '{}')
`;

const dumpDir = '/tmp/dg-gold-theater-proof-dump';
mkdirSync(dumpDir, { recursive: true });
const dumped = join(dumpDir, 'dump.json');

const result = spawnSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--dump-dom',
    'file://' + tmp,
  ],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 30000 }
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  throw new Error('PROOF FAIL: chrome exited ' + result.status);
}

const dom = result.stdout;
const m = dom.match(/data-proof="([^"]+)"/);
assert(m, 'chrome dump contains data-proof');
const report = JSON.parse(m[1].replace(/&quot;/g, '"'));
writeFileSync(dumped, JSON.stringify(report, null, 2));

assert(report.gold && report.gold.notVisible, '.title-accent-gold still visible: ' + JSON.stringify(report.gold));
assert(report.statueFrame && report.statueFrame.notVisible, '.statue-frame still visible: ' + JSON.stringify(report.statueFrame));
assert(report.statueWrapper && report.statueWrapper.notVisible, '.statue-wrapper still visible: ' + JSON.stringify(report.statueWrapper));
assert(report.statueSvg && report.statueSvg.notVisible, '.statue-svg still visible: ' + JSON.stringify(report.statueSvg));
assert(/Demigod/i.test(String(report.h1Before || '')), 'H1 ::before is not Demigod: ' + report.h1Before);
assert(!/SF Startup Talent/i.test(String(report.h1Text || '')), 'SF Startup Talent still visible H1 text: ' + report.h1Text);

try { unlinkSync(tmp); } catch {}
console.log('PROOF PASS');
console.log(JSON.stringify(report, null, 2));
