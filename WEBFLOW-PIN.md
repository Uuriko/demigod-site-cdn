# Demigod intake release

Prepared on 2026-09-05 from [PR #19](https://github.com/Uuriko/demigod-site-cdn/pull/19).

**Release pin: `9de30598841ac20848e26ec68317f26045fedb3e`**

Status: reviewed and merged; Webflow publication is pending. Publishing needs access to the `talentlink-sf` Webflow workspace, which is not connected in the preparing session. A merge alone does not update the site.

## Scope and checks

The founder and candidate intake changes prevent delayed choices from skipping review, wait for a confirmed Webflow submission result, and restore unfinished drafts without erasing the other form or silently dropping a resume upload.

- All 45 deterministic navigation, submission, and draft-recovery checks pass.
- JavaScript syntax and the Stripe-readiness source contract pass.
- The merged file tree matches the tested checkout: `71764958720836268e32e65adbcf60f5df58af2f`.
- Compared with the previously observed live pin, only `foot-latest.js` changes among production assets; the other changed files are regression tests.
- Browser and live submission testing have not been performed. Duplicate-send protection is confined to the current page session.

## Apply in Webflow

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

The last successfully captured live intake used `3b0761f2eb93641bd60b90945429b96b4b847413` (v1109). A fresh live read was blocked in the preparation environment, so recheck the current settings before publishing and use the captured pre-release head/footer as the authoritative rollback.

To restore that observed version, restore the prior pin in the same asset URLs and restore the prior script integrity value below, then save and republish. Restore the matching pre-release preload settings as well.

- Script integrity: `sha384-JCYPWA7daMN2ly4P5z6HohsyyGs1cwIKVSQMwqLj+92GJYMz0kUrVi92WT+xO2XS`
- Stylesheet integrity: `sha384-DVJvIlODKqEw2alxHLe65wLzssFAGRkg2Xeu8Rc9C4Mqw9x+WoW4h5tQE9BOdVxm`

## Existing content rules

Use immutable content pins for production, including the bounties feed. Do not fetch jsDelivr `@main`, mix runtime asset pins, use `trydemigod.com/bounties.json`, or seed the board from dasha-desk. Empty listings are intentional.

The live assets are `foot-latest.js` and `head-latest.css`; `foot-core.js` and `head-styles.css` are not this release's serving path. Preserve the brand direction in `docs/DEMIGOD-ART-DIRECTION.md`.
