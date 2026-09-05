# Demigod intake release

Prepared on 2026-09-05 from [PR #19](https://github.com/Uuriko/demigod-site-cdn/pull/19).

**Release pin: `9de30598841ac20848e26ec68317f26045fedb3e`**

Status: reviewed and merged, but **not live**. Webflow was connected and the release was published on 2026-09-05. Production verification found that the existing Cloudflare Worker overwrote the script integrity value with the previous release's fingerprint. The original Webflow settings were immediately restored and republished; both public intake pages again serve the prior matching script and integrity value. Cloudflare access is needed to correct the rewrite before retrying this release.

## Scope and checks

The founder and candidate intake changes prevent delayed choices from skipping review, wait for a confirmed Webflow submission result, and restore unfinished drafts without erasing the other form or silently dropping a resume upload.

- All 45 deterministic navigation, submission, and draft-recovery checks pass.
- JavaScript syntax and the Stripe-readiness source contract pass.
- The merged file tree matches the tested checkout: `71764958720836268e32e65adbcf60f5df58af2f`.
- Compared with the previously observed live pin, only `foot-latest.js` changes among production assets; the other changed files are regression tests.
- Browser and live submission testing have not been performed. Duplicate-send protection is confined to the current page session.

## Production verification and rollback receipt

- Webflow accepted the release; its published timestamp was `2026-09-05T03:12:13.632Z`.
- The Webflow subdomain served the new `9de30598841ac20848e26ec68317f26045fedb3e` script with the correct `sha384-2sRe…` integrity value.
- Both public `www` intake routes served that new script URL but the old `sha384-JCYP…` integrity value. The response identified the existing Worker surface as `X-Demigod-Edge: home-wiz`; the mismatched fingerprint would prevent execution.
- The original head and footer were restored verbatim. Webflow confirmed the rollback at `2026-09-05T03:13:38.847Z`.
- Fresh HTTP 200 responses from `/?wiz=startup` and `/?wiz=engineer` then served the previous `3b0761f2eb93641bd60b90945429b96b4b847413` script and its matching `sha384-JCYP…` integrity value, with cache status `MISS`.
- The active site's instructions name Worker `demigod-html` as the owner of public `www`. Preserve its routing and first paint; keep `www` proxied and the apex DNS-only. No Worker or DNS changes were made.

### Required correction before retry

Update the existing Worker's script URL/integrity handling so a recognized immutable release always receives its matching fingerprint. Preserve the old release mapping for rollback. Do not disable integrity verification or add a second loader. Verify both old and new URL/fingerprint pairs before deploying the Worker change, then apply the Webflow release below and verify the actual public HTML and asset bytes again.

The relevant Worker source was not present in the accessible Demigod CDN/ops repositories. Use the existing Cloudflare deployment and its current source; do not reconstruct or overwrite the Worker from the Webflow HTML.

## Apply in Webflow after the Worker correction

1. Open the existing `talentlink-sf` site settings and record its current head/footer custom code before editing. Check for newer unpublished work before saving.
2. Update the existing script preload, startup map/data/feed, stylesheet, and executing footer script URLs to the release pin below. Update any existing `dg-bounties-feed` meta tag to the same pin. Preserve all other custom code, the form integration, and the separate hero-image pin.
3. Update the script's integrity value together with its URL. Keeping the old integrity value will block the new script. Keep the stylesheet integrity value shown below. Use matching integrity and cross-origin settings on the script preload and execution tag.
4. Verify the CDN responses match the fingerprints below before publishing.
5. Save the custom code, then publish to the existing `talentlink-sf.webflow.io` and `www.trydemigod.com` targets.
6. Inspect the fresh published intake pages at `/?wiz=startup` and `/?wiz=engineer` for the release pin and matching integrity value. Confirm the loaded script matches the release bytes. Record the publish result before calling the release live.

These snippets replace the corresponding existing tags; do not replace the entire head/footer with them or add a second execution tag.

Head tags:

```html
<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/foot-latest.js" data-dg-foot-preload integrity="sha384-2sReNAg4qhfZGOpv3pcmI7DoBsd/0WtYjeSwoDAS+8BbsPhTZ9oHTEvG8g9TTMQ2" crossorigin="anonymous">
<meta name="dg-startup-map-script" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/startup-map-latest.js">
<meta name="dg-startup-map-data" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/sf-startup-map.json">
<meta name="dg-startup-roles-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/roles-feed.json">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/head-latest.css" onerror="var s=document.getElementById('dg-base-tokens');if(s)s.textContent+=';/*catbox-css-failed*/'" integrity="sha384-DVJvIlODKqEw2alxHLe65wLzssFAGRkg2Xeu8Rc9C4Mqw9x+WoW4h5tQE9BOdVxm" crossorigin="anonymous">
```

Footer execution tag:

```html
<script id="demigod-foot-cdn-loader" src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/foot-latest.js" integrity="sha384-2sReNAg4qhfZGOpv3pcmI7DoBsd/0WtYjeSwoDAS+8BbsPhTZ9oHTEvG8g9TTMQ2" crossorigin="anonymous" defer></script>
```

If the existing `dg-bounties-feed` meta tag is present, its new content is:

```text
https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@9de30598841ac20848e26ec68317f26045fedb3e/bounties-feed.json
```

## Asset fingerprints

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `foot-latest.js` | 433851 | `251c4614c916d58a8a58f2a5b013a98ff89fdab0052faad6a02d26e7164ee700` |
| `head-latest.css` | 126978 | `db3e15e6653eabab1c595f7f880d2f559533151c7cbde888ebe84c7a92b50ff4` |

## Rollback

The verified rollback serves `3b0761f2eb93641bd60b90945429b96b4b847413` (v1109) on both public intake routes. The Webflow origin uses older asset references that the Worker rewrites. Capture fresh head/footer blocks before retrying and restore those exact blocks for a rollback; do not assume origin and edge pins are identical.

| Restored Webflow setting | Pin / fingerprint |
| --- | --- |
| Head preload, stylesheet, startup map and feeds | `b100a610ad40` |
| Footer script | `26de647f7000` |
| Footer script integrity at origin | `sha384-QOz+1a+0qQt0RzcVTXG7PKDkCmPMSNy2KU4NqrW0m7dqaBzP/b8D3khuyeVkbc2c` |
| Public Worker script | `3b0761f2eb93641bd60b90945429b96b4b847413` |

For the public Worker mapping, the previous fingerprints are below. Restore the captured Webflow head/footer and the matching Worker mapping together if a future coordinated release needs rollback.

- Script integrity: `sha384-JCYPWA7daMN2ly4P5z6HohsyyGs1cwIKVSQMwqLj+92GJYMz0kUrVi92WT+xO2XS`
- Stylesheet integrity: `sha384-DVJvIlODKqEw2alxHLe65wLzssFAGRkg2Xeu8Rc9C4Mqw9x+WoW4h5tQE9BOdVxm`

## Existing content rules

Use immutable content pins for production, including the bounties feed. Do not fetch jsDelivr `@main`, mix runtime asset pins, use `trydemigod.com/bounties.json`, or seed the board from dasha-desk. Empty listings are intentional.

The live assets are `foot-latest.js` and `head-latest.css`; `foot-core.js` and `head-styles.css` are not this release's serving path. Preserve the brand direction in `docs/DEMIGOD-ART-DIRECTION.md`.
