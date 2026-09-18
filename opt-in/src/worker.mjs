#!/usr/bin/env node
/**
 * demigod-opt-in Worker (mounted on demigod-site-cdn).
 *
 * Routes:
 *   GET  /opt-in              → static form HTML (200)
 *   GET  /api/opt-in/healthz  → { ok, service, live }
 *   POST /api/opt-in          → validate company-free talent fields; persist ONLY when OPT_IN_LIVE=1
 *
 * Local harness (no Cloudflare):
 *   node opt-in/src/worker.mjs --check
 *   node opt-in/src/worker.mjs --dry-run-validate opt-in/fixtures/sample-valid-body.json
 *
 * NEVER LinkedIn scrape. NEVER invent FIRST_PARTY rows.
 * Production stays OPT_IN_LIVE=0. Do not wrangler publish from this PR.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optInRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(optInRoot, "..");
const formPath = path.join(optInRoot, "public", "opt-in.html");
const firstPartyEmpty = path.join(optInRoot, "FIRST_PARTY.empty.json");

const FORBIDDEN_PEOPLE_KEYS = Object.freeze([
  "linkedInUrl",
  "linkedinUrl",
  "linkedin",
  "linkedin_url",
  "apolloId",
  "peopleEnrichment",
  "fullName",
  "firstName",
  "lastName",
  "scrapeSource",
  "brokerSource",
]);

const ALLOWED_BODY_KEYS = Object.freeze([
  "rolesInterested",
  "workAuthUS",
  "locationPref",
  "cheapTalkExpectations",
  "contactHandleType",
  "contactHandleValue",
  "consentVersion",
  "consent",
]);

export const PLANNED = Object.freeze({
  host: "trydemigod.com",
  staticPath: "/opt-in",
  routes: {
    form: "GET /opt-in",
    healthz: "GET /api/opt-in/healthz",
    submit: "POST /api/opt-in",
  },
  workerName: "demigod-opt-in",
  dataMarker: "FIRST_PARTY",
  liveDefault: false,
});

export function validateOptInBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const keys = Object.keys(body);
  const forbidden = keys.filter((k) => FORBIDDEN_PEOPLE_KEYS.includes(k));
  if (forbidden.length) {
    return {
      ok: false,
      error: `refused people-scrape fields: ${forbidden.join(", ")} (company-free talent fields only)`,
    };
  }
  const unknown = keys.filter((k) => !ALLOWED_BODY_KEYS.includes(k));
  if (unknown.length) {
    return { ok: false, error: `unknown fields: ${unknown.join(", ")}` };
  }
  const required = [
    "rolesInterested",
    "workAuthUS",
    "locationPref",
    "cheapTalkExpectations",
    "contactHandleType",
    "contactHandleValue",
    "consentVersion",
  ];
  const missing = required.filter(
    (k) => body[k] === undefined || body[k] === null || body[k] === ""
  );
  if (missing.length) {
    return { ok: false, error: `missing: ${missing.join(", ")}` };
  }
  if (!Array.isArray(body.rolesInterested) || !body.rolesInterested.length) {
    return { ok: false, error: "rolesInterested must be non-empty array" };
  }
  if (body.rolesInterested.some((r) => typeof r !== "string" || !r.trim())) {
    return { ok: false, error: "rolesInterested items must be non-empty strings" };
  }
  if (typeof body.workAuthUS !== "boolean") {
    return { ok: false, error: "workAuthUS must be boolean" };
  }
  if (!["email", "x", "telegram"].includes(body.contactHandleType)) {
    return { ok: false, error: "contactHandleType must be email|x|telegram" };
  }
  if (typeof body.contactHandleValue !== "string" || !body.contactHandleValue.trim()) {
    return { ok: false, error: "contactHandleValue required" };
  }
  if (typeof body.consentVersion !== "string" || !body.consentVersion.trim()) {
    return { ok: false, error: "consentVersion required" };
  }
  if (body.consent === false) {
    return { ok: false, error: "consent must be accepted" };
  }
  return { ok: true };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Cloudflare Worker export. Env: OPT_IN_LIVE=1 to enable persist. Production stays "0". */
const worker = {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    const live = String(env.OPT_IN_LIVE || "") === "1";

    if (
      request.method === "GET" &&
      (url.pathname === "/opt-in" || url.pathname === "/opt-in/")
    ) {
      let html =
        typeof globalThis.__SHIP_FORM_HTML__ === "string"
          ? globalThis.__SHIP_FORM_HTML__
          : null;
      if (!html && env.ASSETS && typeof env.ASSETS.fetch === "function") {
        try {
          const asset = await env.ASSETS.fetch(
            new Request(new URL("/opt-in.html", url.origin))
          );
          if (asset.ok) html = await asset.text();
        } catch {
          /* fall through */
        }
      }
      if (!html) {
        return new Response("opt-in form asset missing", { status: 503 });
      }
      if (live) {
        html = html.replace(
          "</head>",
          "<script>window.__DEMIGOD_OPT_IN_LIVE__=true;</script></head>"
        );
      }
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/opt-in/healthz") {
      return json({ ok: true, service: "demigod-opt-in", live });
    }

    if (request.method === "POST" && url.pathname === "/api/opt-in") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "invalid JSON" }, 400);
      }
      const v = validateOptInBody(body);
      if (!v.ok) return json({ ok: false, error: v.error }, 400);
      if (!live) {
        return json(
          {
            ok: false,
            error: "OPT_IN_LIVE!=1 — stub refuses persist; FIRST_PARTY stays empty",
            wouldPersist: false,
          },
          503
        );
      }
      const optInId = crypto.randomUUID();
      return json(
        { ok: true, optInId, status: "active", dataMarker: "FIRST_PARTY" },
        201
      );
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};

export default worker;

function usage(code = 1) {
  console.error(`Usage:
  node opt-in/src/worker.mjs --check
  node opt-in/src/worker.mjs --dry-run-validate <body.json>

Local stub only. Never writes FIRST_PARTY. Never deploys.`);
  process.exit(code);
}

export async function check() {
  if (!fs.existsSync(formPath)) {
    console.error("MISSING opt-in/public/opt-in.html");
    process.exit(1);
  }
  if (!fs.existsSync(firstPartyEmpty)) {
    console.error("MISSING opt-in/FIRST_PARTY.empty.json");
    process.exit(1);
  }
  const pool = JSON.parse(fs.readFileSync(firstPartyEmpty, "utf8"));
  if (pool.live === true || (Array.isArray(pool.items) && pool.items.length > 0)) {
    console.error("REFUSED: FIRST_PARTY pool must stay empty/live:false until real form is live");
    process.exit(1);
  }
  if (pool.dataMarker !== "FIRST_PARTY" || pool.count !== 0) {
    console.error("REFUSED: FIRST_PARTY.empty.json shape invalid");
    process.exit(1);
  }

  const good = {
    rolesInterested: ["Founding Engineer"],
    workAuthUS: true,
    locationPref: "SF Bay",
    cheapTalkExpectations: "comp band stub",
    contactHandleType: "email",
    contactHandleValue: "talent@example.invalid",
    consentVersion: "opt-in-v1",
    consent: true,
  };
  const vOk = validateOptInBody(good);
  if (!vOk.ok) {
    console.error("validateOptInBody FAIL on good body:", vOk.error);
    process.exit(1);
  }
  const vLi = validateOptInBody({ ...good, linkedInUrl: "https://linkedin.com/in/x" });
  if (vLi.ok) {
    console.error("validateOptInBody FAIL: should refuse linkedInUrl");
    process.exit(1);
  }

  globalThis.__SHIP_FORM_HTML__ = fs.readFileSync(formPath, "utf8");
  const env = { OPT_IN_LIVE: "0" };

  const getRes = await worker.fetch(new Request("https://trydemigod.com/opt-in"), env);
  if (getRes.status !== 200) {
    console.error(`GET /opt-in expected 200, got ${getRes.status}`);
    process.exit(1);
  }

  const health = await worker.fetch(
    new Request("https://trydemigod.com/api/opt-in/healthz"),
    env
  );
  const hj = await health.json();
  if (!hj.ok || hj.service !== "demigod-opt-in" || hj.live !== false) {
    console.error("healthz FAIL", hj);
    process.exit(1);
  }

  const postBad = await worker.fetch(
    new Request("https://trydemigod.com/api/opt-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...good, linkedInUrl: "https://linkedin.com/in/x" }),
    }),
    env
  );
  if (postBad.status !== 400) {
    console.error(`POST with linkedInUrl expected 400, got ${postBad.status}`);
    process.exit(1);
  }

  const postGoodStub = await worker.fetch(
    new Request("https://trydemigod.com/api/opt-in", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(good),
    }),
    env
  );
  if (postGoodStub.status !== 503) {
    console.error(
      `POST stub (OPT_IN_LIVE=0) expected 503 refuse persist, got ${postGoodStub.status}`
    );
    process.exit(1);
  }
  const postJson = await postGoodStub.json();
  if (postJson.wouldPersist !== false) {
    console.error("POST stub must set wouldPersist:false");
    process.exit(1);
  }

  console.log(
    "opt-in worker: --check OK (GET /opt-in 200, POST validates talent-only / refuses LinkedIn, FIRST_PARTY.count=0, live=false, no deploy)"
  );
  console.log(
    `  host=${PLANNED.host} ${PLANNED.routes.form} | ${PLANNED.routes.submit} — OPT_IN_LIVE=0`
  );
}

function dryRunValidate(bodyPath) {
  const abs = path.isAbsolute(bodyPath)
    ? bodyPath
    : path.join(repoRoot, bodyPath);
  const alt = path.join(optInRoot, bodyPath);
  const tryPath = fs.existsSync(abs) ? abs : alt;
  if (!fs.existsSync(tryPath)) {
    console.error(`MISSING body: ${bodyPath}`);
    process.exit(1);
  }
  const body = JSON.parse(fs.readFileSync(tryPath, "utf8"));
  const v = validateOptInBody(body);
  if (!v.ok) {
    console.error(`dry-run-validate FAIL: ${v.error}`);
    process.exit(1);
  }
  console.log(
    "dry-run-validate OK — talent fields only; would POST /api/opt-in when OPT_IN_LIVE=1; NOT writing FIRST_PARTY"
  );
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const args = process.argv.slice(2);
  if (args[0] === "--check") {
    check()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  } else if (args[0] === "--dry-run-validate") {
    if (!args[1]) usage(1);
    dryRunValidate(args[1]);
  } else if (args[0] === "--help" || args[0] === "-h") usage(0);
  else usage(1);
}
