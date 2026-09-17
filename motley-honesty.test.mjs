#!/usr/bin/env node
/**
 * Motley leftover honesty: humans.txt, contribute, and ai-plugin.json
 * on this CDN tree must be Demigod-owned faces. Never Dasha Contribute
 * HTML. Never Dasha Compute plugin JSON.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const humans = readFileSync(join(root, 'humans.txt'), 'utf8');
const contribute = readFileSync(join(root, 'contribute.txt'), 'utf8');
const plugin = readFileSync(join(root, '.well-known/ai-plugin.json'), 'utf8');
const leftover = JSON.parse(readFileSync(join(root, 'leftover-motley.json'), 'utf8'));

const dashaLeak = /getdasha\.com\/contribute|Contribute to Dasha|Dasha Compute|plugin\.jup\.ag/i;
const htmlDoc = /<!doctype html|<html[\s>]/i;

assert.doesNotMatch(humans, htmlDoc, 'humans.txt is text/plain, not HTML');
assert.doesNotMatch(humans, dashaLeak, 'humans.txt never points at Dasha Contribute/Compute');
assert.match(humans, /Desk:\s*Demigod/, 'humans.txt names the Demigod desk');
assert.match(humans, /potter@trydemigod\.com/, 'humans.txt has the public desk contact');
assert.match(humans, /https:\/\/www\.trydemigod\.com\//, 'humans.txt names the site');
assert.match(humans, /https:\/\/www\.trydemigod\.com\/contact/, 'humans.txt names contact');
assert.match(humans, /https:\/\/www\.trydemigod\.com\/room/, 'humans.txt names Room');

assert.doesNotMatch(contribute, htmlDoc, 'contribute.txt is text/plain, not Dasha HTML');
assert.doesNotMatch(contribute, /Contribute to Dasha|Dasha Compute|plugin\.jup\.ag/i, 'contribute face is not Dasha');
assert.match(contribute, /Contribute to Demigod/, 'contribute face is Demigod-owned');
assert.match(contribute, /potter@trydemigod\.com/, 'contribute face has desk contact');
assert.match(contribute, /Uuriko\/demigod-ops/, 'contribute face points at Demigod GitHub');
assert.match(contribute, /https:\/\/www\.trydemigod\.com\/contact/, 'contribute face names contact');

const pluginJson = JSON.parse(plugin);
assert.equal(pluginJson.name, 'Demigod');
assert.equal(pluginJson.name_for_human, 'Demigod');
assert.equal(pluginJson.url, 'https://www.trydemigod.com/');
assert.equal(pluginJson.desk, 'https://www.trydemigod.com/');
assert.equal(pluginJson.room, 'https://www.trydemigod.com/room');
assert.equal(pluginJson.contact_email, 'potter@trydemigod.com');
assert.equal(pluginJson.api?.url, 'https://www.trydemigod.com/room/.well-known/agent.json');
assert.doesNotMatch(plugin, /getdasha\.com\/contribute|Contribute to Dasha|plugin\.jup\.ag/i, 'ai-plugin.json is not a Dasha Contribute copy');
assert.doesNotMatch(plugin, /lobby\.getdasha\.com|compute\/api\/v1/, 'ai-plugin.json has no Dasha Compute base_url');
assert.doesNotMatch(plugin, /"name"\s*:\s*"Dasha Compute"/, 'ai-plugin.json name is not Dasha Compute');
assert.ok(pluginJson.product?.not?.includes('Dasha Compute'), 'plugin product.not names Dasha Compute');

assert.equal(leftover.host, 'www.trydemigod.com');
assert.equal(leftover.faces['/humans.txt'].file, 'humans.txt');
assert.equal(leftover.faces['/humans.txt'].status, 200);
assert.match(leftover.faces['/humans.txt'].contentType, /^text\/plain/);
assert.equal(leftover.faces['/contribute'].file, 'contribute.txt');
assert.equal(leftover.faces['/.well-known/ai-plugin.json'].file, '.well-known/ai-plugin.json');
assert.match(leftover.faces['/.well-known/ai-plugin.json'].contentType, /^application\/json/);
assert.equal(leftover.aliases['/ai-plugin.json'], '/.well-known/ai-plugin.json');
assert.equal(leftover.leftoverSameHost['/.well-known/mcp.json'], '/room/.well-known/agent.json');
assert.equal(leftover.leftoverSameHost['/compute/skill.md'], '/room/llms.txt');
for (const dest of Object.values(leftover.leftoverSameHost)) {
  assert.match(dest, /^\//, `same-host leftover dest ${dest}`);
  assert.doesNotMatch(dest, /getdasha/i, `same-host leftover dest ${dest} is not Dasha`);
}
for (const host of leftover.neverLocationHosts) {
  assert.match(host, /getdasha/, `never-host lists ${host}`);
}

console.log('motley-honesty: PASS (humans.txt + contribute.txt + ai-plugin.json are Demigod-owned; leftover map never 308s to getdasha)');
