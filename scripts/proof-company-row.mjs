#!/usr/bin/env node
/**
 * Proof: SF directory company names open the internal company page.
 *
 *   node scripts/proof-company-row.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = readFileSync(join(root, 'startup-map-latest.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('PROOF FAIL: ' + msg);
}

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
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return js.slice(start, i + 1);
    }
  }
  throw new Error('PROOF FAIL: unclosed ' + name);
}

const funcs = js.match(/var DG_FUNCS = (\[[^\]]+\])/);
assert(funcs, 'DG_FUNCS is a quoted array');

const ctx = vm.createContext({ URL, console });
vm.runInContext(
  'var DG_FUNCS = ' + funcs[1] + ';\n' +
    extractFn('esc') + '\n' +
    extractFn('safeUrl') + '\n' +
    extractFn('dgFunctionLabel') + '\n' +
    extractFn('companyRow') + '\n',
  ctx
);

const html = vm.runInContext(
  'companyRow({ id: "yc:abundant", name: "Abundant", website: "https://www.abundant.ai/", jobsUrl: "https://jobs.ashbyhq.com/abundant", source: "Y Combinator", sourceLicense: "YC-public", hiring: "yes" }, 0)',
  ctx
);

assert(/class="dg-dir-name" href="\/c\/yc%3Aabundant"/.test(html), 'name href is /c/yc%3Aabundant');
assert(/href="\/c\/yc%3Aabundant">Company</.test(html), 'secondary Company link uses the same encoded path');
assert(/href="https:\/\/www\.abundant\.ai\/"/.test(html), 'website remains a secondary link');
assert(/href="https:\/\/jobs\.ashbyhq\.com\/abundant"/.test(html), 'jobsUrl remains a secondary link');
assert(!/class="dg-dir-name" href="https:\/\/www\.abundant\.ai\//.test(html), 'name no longer points at the website when id is present');

const fallback = vm.runInContext(
  'companyRow({ name: "No Id Co", website: "https://example.com/" }, 1)',
  ctx
);
assert(/class="dg-dir-name" href="https:\/\/example\.com\/"/.test(fallback), 'missing id falls back to website on the name');
assert(!/href="\/c\//.test(fallback), 'missing id does not emit a /c/ link');

const encoded = vm.runInContext(
  'companyRow({ id: "wd:Q116758847", name: "Wiki Co" }, 2)',
  ctx
);
assert(/href="\/c\/wd%3AQ116758847"/.test(encoded), 'wikidata id encodes the colon');

console.log('PROOF PASS');
console.log(JSON.stringify({
  nameHref: '/c/yc%3Aabundant',
  secondary: ['Company', 'website', 'jobsUrl'],
  fallback: 'website-on-name when id is missing',
}, null, 2));
