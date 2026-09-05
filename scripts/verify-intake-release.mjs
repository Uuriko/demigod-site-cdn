import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Release gate: compare the reviewed Git bytes, local assets, and the
// actual copy/paste block. This does not deploy or claim the public edge is fixed.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL('../' + path, import.meta.url));
const manifest = JSON.parse(read('docs/ops/intake-release-2026-09-05.json'));
const pack = read('docs/ops/SHIP-2026-09-02-WWW.md').toString();
const paths = [
  'foot-latest.js', 'head-latest.css', 'startup-map-latest.js',
  'sf-startup-map.json', 'roles-feed.json', 'bounties-feed.json',
];
const hash = (bytes, algorithm, encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);

assert.equal(manifest.schema, 'demigod.intake-release/1');
assert.match(manifest.releaseCommit, /^[a-f0-9]{40}$/);
assert.deepEqual(Object.keys(manifest.assets).sort(), [...paths].sort());
for (const path of paths) {
  const bytes = read(path);
  const expected = manifest.assets[path];
  const released = execFileSync('git', ['show', manifest.releaseCommit + ':' + path], {
    cwd: root, maxBuffer: 8 * 1024 * 1024,
  });
  assert.ok(bytes.equals(released), path + ': must match the reviewed immutable release');
  assert.equal(bytes.length, expected.bytes, path + ': byte count');
  assert.equal(hash(bytes, 'sha256'), expected.sha256, path + ': SHA-256');
  assert.equal('sha384-' + hash(bytes, 'sha384', 'base64'), expected.integrity, path + ': integrity');
  assert.equal(hash(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]), 'sha1'), expected.gitBlob, path + ': Git blob');
  if (path.endsWith('.json')) JSON.parse(bytes);
}
const version = read('foot-latest.js').toString().match(/window\.dgFootVersion\s*=\s*['"]([^'"]+)['"]/)?.[1];
assert.equal(version, manifest.runtimeVersion, 'Do not relabel an unavailable bundle');
assert.ok(read('foot-v1122.js').equals(read('foot-latest.js')), 'Retained legacy alias must match serving bytes');

const htmlBlocks = [...pack.matchAll(/```html\n([\s\S]*?)\n```/g)];
assert.equal(htmlBlocks.length, 1, 'One copy/paste block');
const tags = [...htmlBlocks[0][1].matchAll(/<(link|meta|script)\b([^>]*)>/g)].map(([, tag, attributes]) => ({
  tag,
  attrs: Object.fromEntries([...attributes.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, name, value]) => [name, value ?? true])),
}));
assert.equal(tags.length, 6, 'Exactly six replacement tags');
const one = predicate => {
  const matches = tags.filter(predicate);
  assert.equal(matches.length, 1, 'Each required tag must appear exactly once');
  return matches[0].attrs;
};
const url = path => 'https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@' + manifest.releaseCommit + '/' + path;
const preload = one(t => t.tag === 'link' && t.attrs.rel === 'preload');
const css = one(t => t.tag === 'link' && t.attrs.rel === 'stylesheet');
const script = one(t => t.tag === 'script');
assert.equal(preload.href, url('foot-latest.js'));
assert.equal(preload.as, 'script');
assert.equal(preload['data-dg-foot-preload'], true);
assert.equal(script.id, 'demigod-foot-cdn-loader');
assert.equal(script.src, preload.href);
assert.equal(script.defer, true);
assert.equal(css.href, url('head-latest.css'));
for (const [attrs, path] of [[preload, 'foot-latest.js'], [script, 'foot-latest.js'], [css, 'head-latest.css']]) {
  assert.equal(attrs.integrity, manifest.assets[path].integrity, path + ': tag integrity must match fetched bytes');
  assert.equal(attrs.crossorigin, 'anonymous', path + ': consistent cross-origin loading');
}
for (const [name, path] of [
  ['dg-startup-map-script', 'startup-map-latest.js'],
  ['dg-startup-map-data', 'sf-startup-map.json'],
  ['dg-startup-roles-feed', 'roles-feed.json'],
]) assert.equal(one(t => t.tag === 'meta' && t.attrs.name === name).content, url(path));
assert.ok(pack.includes(url('bounties-feed.json')), 'Optional existing bounties feed uses the same pin');

console.log('PASS: 6 assets match immutable Git bytes and manifest; 6 tags use one pin with matching integrity.');
console.log('Readiness: ' + manifest.status + '.');
