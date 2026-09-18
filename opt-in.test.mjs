#!/usr/bin/env node
/**
 * Opt-in mount honesty: leftover-face GET routes, talent-only POST,
 * OPT_IN_LIVE=0, FIRST_PARTY empty. Never people-data. Never persist.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import worker, { validateOptInBody, check } from "./opt-in/src/worker.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const leftover = JSON.parse(readFileSync(join(root, "leftover-motley.json"), "utf8"));
const routes = JSON.parse(readFileSync(join(root, "opt-in-routes.json"), "utf8"));
const pool = JSON.parse(readFileSync(join(root, "opt-in/FIRST_PARTY.empty.json"), "utf8"));
const healthz = JSON.parse(readFileSync(join(root, "opt-in/healthz.json"), "utf8"));
const html = readFileSync(join(root, "opt-in/public/opt-in.html"), "utf8");
const wrangler = readFileSync(join(root, "opt-in/wrangler.toml.example"), "utf8");
const sample = JSON.parse(
  readFileSync(join(root, "opt-in/fixtures/sample-valid-body.json"), "utf8")
);
const schema = JSON.parse(readFileSync(join(root, "opt-in/opt-in-talent.schema.json"), "utf8"));

assert.equal(routes.live, false);
assert.equal(routes.OPT_IN_LIVE, "0");
assert.equal(routes.service, "demigod-opt-in");
assert.equal(routes.faces["/opt-in"].file, "opt-in/public/opt-in.html");
assert.equal(routes.faces["/opt-in"].status, 200);
assert.match(routes.faces["/opt-in"].contentType, /^text\/html/);
assert.equal(routes.faces["/api/opt-in/healthz"].file, "opt-in/healthz.json");
assert.equal(routes.post["/api/opt-in"].whenNotLive.status, 503);
assert.equal(routes.post["/api/opt-in"].peopleScrapeKeys, 400);
assert.equal(routes.firstParty.count, 0);
assert.equal(routes.firstParty.live, false);

assert.equal(leftover.faces["/opt-in"].file, "opt-in/public/opt-in.html");
assert.equal(leftover.faces["/opt-in"].status, 200);
assert.match(leftover.faces["/opt-in"].contentType, /^text\/html/);
assert.equal(leftover.faces["/api/opt-in/healthz"].file, "opt-in/healthz.json");
assert.equal(leftover.aliases["/opt-in/"], "/opt-in");
assert.ok(existsSync(join(root, leftover.faces["/opt-in"].file)));
assert.ok(existsSync(join(root, leftover.faces["/api/opt-in/healthz"].file)));

assert.equal(pool.live, false);
assert.equal(pool.count, 0);
assert.deepEqual(pool.items, []);
assert.equal(pool.dataMarker, "FIRST_PARTY");
assert.equal(pool.OPT_IN_LIVE, "0");
assert.doesNotMatch(JSON.stringify(pool), /linkedin|apollo|peopleEnrichment/i);

assert.equal(healthz.ok, true);
assert.equal(healthz.service, "demigod-opt-in");
assert.equal(healthz.live, false);

assert.match(html, /<form id="opt-in"/);
assert.match(html, /STUB \/ NOT LIVE/);
assert.match(html, /disabled/);
assert.doesNotMatch(html, /linkedin\.com\/in|apollo\.io/i);
assert.match(wrangler, /OPT_IN_LIVE\s*=\s*"0"/);
assert.doesNotMatch(wrangler, /OPT_IN_LIVE\s*=\s*"1"/);

assert.equal(schema.additionalProperties, false);
assert.ok(schema.required.includes("rolesInterested"));
assert.ok(!schema.properties.linkedInUrl);
assert.ok(!schema.properties.apolloId);
assert.ok(!schema.properties.fullName);

const vOk = validateOptInBody(sample);
assert.equal(vOk.ok, true, vOk.error);

for (const key of [
  "linkedInUrl",
  "linkedinUrl",
  "apolloId",
  "fullName",
  "firstName",
  "lastName",
  "peopleEnrichment",
]) {
  const bad = validateOptInBody({ ...sample, [key]: "nope" });
  assert.equal(bad.ok, false, `should refuse ${key}`);
  assert.match(bad.error, /people-scrape|unknown fields/);
}

globalThis.__SHIP_FORM_HTML__ = html;
const env = { OPT_IN_LIVE: "0" };

const getRes = await worker.fetch(new Request("https://www.trydemigod.com/opt-in"), env);
assert.equal(getRes.status, 200);
assert.match(getRes.headers.get("content-type"), /text\/html/);
const getHtml = await getRes.text();
assert.match(getHtml, /Talent opt-in/);
assert.doesNotMatch(getHtml, /__DEMIGOD_OPT_IN_LIVE__=true/);

const hz = await worker.fetch(
  new Request("https://www.trydemigod.com/api/opt-in/healthz"),
  env
);
const hzj = await hz.json();
assert.deepEqual(hzj, { ok: true, service: "demigod-opt-in", live: false });

const postLi = await worker.fetch(
  new Request("https://www.trydemigod.com/api/opt-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...sample, linkedInUrl: "https://linkedin.com/in/x" }),
  }),
  env
);
assert.equal(postLi.status, 400);

const postOk = await worker.fetch(
  new Request("https://www.trydemigod.com/api/opt-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sample),
  }),
  env
);
assert.equal(postOk.status, 503);
const postBody = await postOk.json();
assert.equal(postBody.wouldPersist, false);
assert.equal(pool.count, 0);
assert.deepEqual(pool.items, []);

await check();

console.log(
  "opt-in-honesty: PASS (GET /opt-in 200, healthz live:false, POST talent-only 503 / LinkedIn 400, FIRST_PARTY.count=0, OPT_IN_LIVE=0)"
);
