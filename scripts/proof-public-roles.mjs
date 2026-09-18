#!/usr/bin/env node
/**
 * Proof: X-week 2026-08-14 public-roles overlay stays honest.
 *
 *   node scripts/proof-public-roles.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const feed = JSON.parse(readFileSync(join(root, 'public-roles.json'), 'utf8'));
const readme = readFileSync(join(root, 'public-roles.md'), 'utf8');
const foot = readFileSync(join(root, 'foot-latest.js'), 'utf8');
const ats = JSON.parse(readFileSync(join(root, 'roles-feed.json'), 'utf8'));

function assert(cond, msg) {
  if (!cond) throw new Error('PROOF FAIL: ' + msg);
}

assert(feed.schema === 'demigod.public-roles/1', 'schema is demigod.public-roles/1');
assert(Array.isArray(feed.roles) && feed.roles.length === 14, 'exactly 14 overlay rows');
assert(/X-week 2026-08-14/.test(feed.note) && /not ATS first-observation/i.test(feed.note), 'file note names X-week, not ATS');
assert(/X-week 2026-08-14 from @nazzari/.test(readme), 'README names X-week source');
assert(feed.sourceArticle === 'https://x.com/nazzari/status/2088312787915399337', 'source article is nazzari 08/14');
assert(!/SahilGandhi426|CalebPeffer|kumareth|callumhyman24|Mazer|Torenberg|draprints|Jayyang/i.test(JSON.stringify(feed)), 'skipped unnamed/commentary tweets leaked in');

const expected = [
  ['Rivet', 'Engineer (Rust/actors/OSS)', 'X', 'https://x.com/NathanFlurry/status/2087625596797083966'],
  ['xAI', 'Software Engineer, Search Infrastructure', 'Greenhouse', 'https://job-boards.greenhouse.io/xai/jobs/5205179007'],
  ['xAI', 'Software Engineer, X Money', 'Greenhouse', 'https://job-boards.greenhouse.io/xai/jobs/5108231007'],
  ['xAI', 'Software Engineer, X Web Engineer', 'Greenhouse', 'https://job-boards.greenhouse.io/xai/jobs/5063930007'],
  ['Edge City', 'Program Director, Inflection Fellowship and Grants', 'X', 'https://x.com/JoinEdgeCity/status/2087905200161829290'],
  ['Mintlify', 'Designer / Design Engineer', 'X', 'https://x.com/mintlify/status/2087989891875709101'],
  ['Mintlify', 'SDR / BDR', 'X', 'https://x.com/coleywoleyyy/status/2087774617314451955'],
  ['Marble', 'SWE intern', 'X', 'https://x.com/arjunjchaliha/status/2086854908964479191'],
  ['ElevenLabs', 'Chief of Staff, Canada', 'X', 'https://x.com/maxlmns/status/2086942565765464524'],
  ['Corgi', 'Open roles across functions', 'X', 'https://x.com/Lin_DAO_/status/2086556934157529464'],
  ['SideShift', 'Growth / GTM / Influencer', 'X', 'https://x.com/dierre/status/2086856273128260082'],
  ['Auth0 Lab (Okta)', 'Principal Applied AI/ML Scientist', 'Okta', 'https://www.okta.com/company/careers/engineering/principal-applied-aiml-scientist-auth0-lab-8031281/'],
  ['Google Labs', 'Product Designer', 'X', 'https://x.com/sambecker/status/2086888338284294226'],
  ['Brown University', 'Economics / Watson public policy faculty (assistant, associate, or full)', 'X', 'https://x.com/instrumenthull/status/2086851095544873142'],
];

const xaiTweet = 'https://x.com/xbxnxdxcxtx/status/2086899925674311882';
feed.roles.forEach(function (role, i) {
  const [company, title, provider, url] = expected[i];
  assert(role.company === company, 'row ' + i + ' company');
  assert(role.title === title, 'row ' + i + ' title');
  assert(role.provider === provider, 'row ' + i + ' provider');
  assert(role.url === url, 'row ' + i + ' url');
  assert(role.firstObservedAt === '2026-08-14', 'row ' + i + ' firstObservedAt is overlay date');
  assert(role.postedAt === null, 'row ' + i + ' postedAt must be null (no employer date)');
  assert(role.sourceArticle === feed.sourceArticle, 'row ' + i + ' sourceArticle');
  assert(/^https:\/\//.test(role.sourceTweet), 'row ' + i + ' sourceTweet');
  if (provider === 'X') {
    assert(/^https:\/\/x\.com\//.test(role.url), 'X row ' + i + ' url is a tweet, not an invented ATS board');
    assert(role.sourceTweet === role.url, 'X row ' + i + ' sourceTweet matches url');
  }
  if (provider === 'Greenhouse') {
    assert(/job-boards\.greenhouse\.io/.test(role.url), 'Greenhouse row uses a real board URL');
    assert(role.sourceTweet === xaiTweet, 'xAI rows keep the source tweet');
  }
  if (provider === 'Okta') {
    assert(/okta\.com\/company\/careers/.test(role.url), 'Okta row uses the Okta career URL');
    assert(role.sourceTweet === 'https://x.com/yenkel/status/2086887373837656413', 'Auth0 source tweet');
  }
});

assert(feed.roles[7].employmentType === 'Internship', 'Marble is Internship');
assert(feed.roles[7].fn === 'engineering', 'Marble fn');
assert(feed.roles[9].fn === 'other', 'Corgi fn other');
assert(feed.roles[11].fn === 'ai/data', 'Auth0 fn');
assert(feed.roles[13].fn === 'other', 'Brown fn other');
assert(/Sep 7/.test(feed.roles[13].note || ''), 'Brown applications target stays a note, not postedAt');

const overlayUrls = new Set(feed.roles.map((r) => r.url));
assert(!(ats.roles || []).some((r) => overlayUrls.has(r.url)), 'overlay URLs were not written into generated roles-feed.json');
assert(/dgPublicRolesUrl|public-roles\.json/.test(foot), 'foot-latest.js can fetch the overlay');
assert(/not ATS first-observation|weekly X job feed|@nazzari/i.test(foot), 'homepage rail copy does not call X-week rows ATS observations');

console.log('PROOF OK: public-roles overlay is X-week 2026-08-14, 14 rows, not ATS first-observation');
