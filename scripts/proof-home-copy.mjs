#!/usr/bin/env node
/**
 * Proof: home first-screen + process copy (v1102).
 *
 * Pass when foot-latest.js (and the matching versioned file):
 *   - COPY.heroSub is "SF Bay Area roles"
 *   - COPY.heroTrustLine is empty (hero() must not paint #dg-hero-chips)
 *   - COPY.ctaFounder is "Hire talent"
 *   - COPY.ctaEngineer is "Sign up to Demigod"
 *   - dual-path hrefs stay /?wiz=startup and /?wiz=engineer
 *   - home process H2 / step cards use the short human voice
 *   - retired software/compares/propose H2 is not painted onto the home
 *
 *   node scripts/proof-home-copy.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const latest = readFileSync(join(root, 'foot-latest.js'), 'utf8');
const versioned = readFileSync(join(root, 'foot-v1102.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('PROOF FAIL: ' + msg);
}

function field(src, key) {
  const m = src.match(new RegExp(key + ":'((?:\\\\'|[^'])*)'"));
  assert(m, 'COPY.' + key + ' is a quoted string');
  return m[1].replace(/\\'/g, "'");
}

assert(latest === versioned, 'foot-latest.js and foot-v1102.js must be the same bytes');
assert(/window\.dgFootVersion = 'v1102'/.test(latest), 'dgFootVersion is v1102');
assert(/\/\*dg-foot-v1102-core\*\//.test(latest), 'banner is dg-foot-v1102-core');

assert(field(latest, 'heroSub') === 'SF Bay Area roles', 'heroSub is SF Bay Area roles');
assert(field(latest, 'heroTrustLine') === '', 'heroTrustLine is empty');
assert(field(latest, 'ctaFounder') === 'Hire talent', 'ctaFounder stays Hire talent');
assert(field(latest, 'ctaEngineer') === 'Sign up to Demigod', 'ctaEngineer is Sign up to Demigod');

assert(/heroTrustLine:''/.test(latest), 'heroTrustLine literal is empty');
assert(/if\(chips&&!COPY\.heroTrustLine\)/.test(latest), 'hero() removes leftover chips when trust line is empty');
assert(/if\(chips&&COPY\.heroTrustLine\)/.test(latest), 'hero() only paints chips when trust line is set');

const dual = latest.match(/function ensureHeroDual\(\)\{[\s\S]*?\}\)\(\);/);
assert(dual, 'ensureHeroDual exists');
assert(/'\/\?wiz=startup'/.test(dual[0]), 'hire href stays /?wiz=startup');
assert(/'\/\?wiz=engineer'/.test(dual[0]), 'talent href stays /?wiz=engineer');
assert(!/mk\('[^']+'\)/.test(dual[0].replace(/mk\('hire'\)|mk\('talent'\)/g, '')), 'no third CTA besides hire + talent');
assert(/mk\('hire'\)/.test(dual[0]) && /mk\('talent'\)/.test(dual[0]), 'exactly hire + talent CTAs');

const steps = latest.match(/qa\('\.step-card'\)\.forEach\(function\(card,i\)\{[\s\S]*?\}\);/);
assert(steps, 'step-card rewrite exists');
assert(/\['Send a brief','Role, must-haves, cash\. Nobody\\'s messaged yet\.'\]/.test(steps[0]), 'step 01 Send a brief');
assert(/\['A person picks','They read the match and can say why\.'\]/.test(steps[0]), 'step 02 A person picks');
assert(/\['You both say yes','Intro only after both sides agree\.'\]/.test(steps[0]), 'step 03 You both say yes');
assert(!/Software compares the facts/.test(steps[0]), 'step cards no longer paint Software compares the facts');

assert(/h\.textContent='A person picks\. You both say yes\.'/.test(latest), 'home process H2 is A person picks. You both say yes.');
assert(!/h\.textContent='Software compares\. A human proposes\. Mutual yes\.'/.test(latest), 'retired process H2 is not painted onto the home');
assert(/p\.textContent='';/.test(latest) && /trust-header p/.test(latest), 'process sub is dropped, not restated');

assert(!/heroSub:'One SF Bay role/.test(latest), 'old heroSub is gone');
assert(!/ctaEngineer:'Share privately'/.test(latest), 'old ctaEngineer is gone');
assert(!/heroTrustLine:'No public profiles\. No feed\. No blasts/.test(latest), 'old heroTrustLine is gone');

console.log('PROOF PASS');
console.log(JSON.stringify({
  version: 'v1102',
  heroSub: field(latest, 'heroSub'),
  heroTrustLine: field(latest, 'heroTrustLine'),
  ctaFounder: field(latest, 'ctaFounder'),
  ctaEngineer: field(latest, 'ctaEngineer'),
  hrefs: ['/?wiz=startup', '/?wiz=engineer'],
  processH2: 'A person picks. You both say yes.',
}, null, 2));
