#!/usr/bin/env node
/**
 * Circulations v0: public static faces, example rows only.
 * No live people. LinkedIn stays an optional string on the schema.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const leftover = JSON.parse(readFileSync(join(root, "leftover-motley.json"), "utf8"));
const feed = JSON.parse(readFileSync(join(root, "circulations.json"), "utf8"));
const schema = JSON.parse(readFileSync(join(root, "circulations/schema.json"), "utf8"));
const html = readFileSync(join(root, "circulations.html"), "utf8");
const readme = readFileSync(join(root, "circulations/README.md"), "utf8");

assert.equal(leftover.faces["/circulations"].file, "circulations.html");
assert.equal(leftover.faces["/circulations"].status, 200);
assert.match(leftover.faces["/circulations"].contentType, /^text\/html/);
assert.equal(leftover.faces["/circulations.json"].file, "circulations.json");
assert.equal(leftover.faces["/circulations.json"].status, 200);
assert.match(leftover.faces["/circulations.json"].contentType, /^application\/json/);
assert.equal(leftover.aliases["/circulations/"], "/circulations");
assert.ok(existsSync(join(root, leftover.faces["/circulations"].file)));
assert.ok(existsSync(join(root, leftover.faces["/circulations.json"].file)));

assert.equal(feed.schema, "demigod-circulations/v0");
assert.equal(feed.url, "https://www.trydemigod.com/circulations");
assert.deepEqual(feed.kill_switches, ["ticket_send", "consent", "intro", "invoice_send"]);
assert.equal(feed.circulations.length, 2);

const placeholder = /^(Circulator [A-Z]|Engineer Example|Operator Example)$/;
for (const circulation of feed.circulations) {
  assert.equal(circulation.example, true, circulation.id);
  assert.equal(circulation.sealed, true, circulation.id);
  assert.match(circulation.circulator, placeholder, circulation.circulator);
  assert.ok(circulation.entries.length >= 1);
  for (const entry of circulation.entries) {
    assert.equal(typeof entry.name, "string");
    assert.match(entry.name, placeholder, entry.name);
    assert.equal(typeof entry.vouch, "string");
    assert.ok(entry.vouch.length > 0 && entry.vouch.length < 160, "vouch is one line");
    assert.equal(typeof entry.open_to_work, "boolean");
    assert.ok(Object.prototype.hasOwnProperty.call(entry, "linkedin"), "linkedin key kept");
    assert.equal(entry.linkedin, null);
    if (Object.prototype.hasOwnProperty.call(entry, "network_gap")) {
      assert.equal(typeof entry.network_gap, "string");
    }
  }
}

const withGap = feed.circulations[0].entries[0];
const withoutGap = feed.circulations[1].entries[0];
assert.equal(withGap.network_gap, "high competence, low SV exposure");
assert.equal(Object.prototype.hasOwnProperty.call(withoutGap, "network_gap"), false);

assert.equal(schema.$id, "demigod-circulations/v0");
const linkedin = schema.$defs.entry.properties.linkedin;
assert.ok(linkedin, "schema keeps linkedin");
assert.deepEqual(linkedin.type, ["string", "null"]);
assert.equal(schema.$defs.entry.required.includes("linkedin"), false, "linkedin stays optional");
assert.equal(schema.$defs.entry.required.includes("network_gap"), false);

assert.match(html, /Circulations/);
assert.match(html, /example: true/);
assert.match(html, /Circulator A/);
assert.match(html, /Engineer Example/);
assert.match(html, /Circulator B/);
assert.match(html, /Operator Example/);
assert.match(html, /Shipped the example with me at Example Co\./);
assert.match(html, /Human kill-switch before ticket send, consent, intro, and invoice/);
assert.match(html, /href="\/circulations\.json"/);
assert.match(html, /potter@trydemigod\.com/);
assert.doesNotMatch(html, /linkedin\.com\/in\/|apollo\.io|api[_-]?key/i);
assert.doesNotMatch(JSON.stringify(feed), /linkedin\.com|apollo/i);

assert.match(readme, /\/circulations\.json/);
assert.match(readme, /example: true/);
assert.match(readme, /linkedin/);

console.log("circulations: PASS (/circulations + /circulations.json, example rows only)");
