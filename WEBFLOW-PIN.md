# Webflow pin — one SHA

**PIN = `94d25aa3d6351c58980c03103dd7b3276e0c40fa`** (v1102 home copy: SF Bay Area roles, Sign up to Demigod, shorter process; honest empty bounties; pin-SHA feed; no-JS empty state; frege-night gold/statue hide)

Paste **this one SHA** for preload, CSS, execute, and the bounties feed. Do not mix with `e0fe769c0dca9fc8804f6676e928f42092570d6c`, `0d2c91d91822bbab3c68801a2a5b0d37e7011e7f`, `5b4d79d94686`, `229c9deace92`, `2cbd3931da2e`, `ba2c85d1a84c`, `309f4b700e1f`, or any other pin.

Never fetch jsDelivr `@main` for `bounties-feed.json` — that alias has cached old Dasha-copied rows with `"payTo":""`. Pin a content SHA.

This SHA is the CDN file commit (`head-latest.css` + `foot-latest.js` + `bounties-feed.json`). Live site still needs this pin pasted after merge.

`foot-core.js` / `head-styles.css` were not changed (live pin is `foot-latest.js` + `head-latest.css`).

Do not use `trydemigod.com/bounties.json` (Webflow page dump). The board feed is `bounties-feed.json` in this repo. Empty listings are honest. Do not extraSeed dasha-desk.

`/bounties` is a published Webflow shell. For no-JS readers, paste the empty-state HTML from `bounties.html` into that page body (or rely on the head CSS `::before` for `data-wf-page="6a7e0d218c0fdcade58240b3"`). `?p=bounties` uses the same copy from `foot-latest.js`.

Art direction: `docs/DEMIGOD-ART-DIRECTION.md`.

Home copy proof (v1102: SF Bay Area roles, Sign up to Demigod, shorter process):

```
node scripts/proof-home-copy.mjs
```

Selector proof (headless Chrome, live H1/statue markup + Webflow gold-clip CSS):

```
node scripts/proof-gold-theater-hide.mjs
```

Empty bounties proof (feed `listings: []`, no `"payTo":""`, pin-SHA feed, no-JS empty state):

```
node scripts/proof-bounties-empty.mjs
```

```html
<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/foot-latest.js" data-dg-foot-preload>
<meta name="dg-startup-map-script" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/startup-map-latest.js">
<meta name="dg-startup-map-data" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/sf-startup-map.json">
<meta name="dg-startup-roles-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/roles-feed.json">
<meta name="dg-bounties-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/bounties-feed.json">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/head-latest.css">
<script id="demigod-foot-cdn-loader" src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@94d25aa3d6351c58980c03103dd7b3276e0c40fa/foot-latest.js" defer></script>
```
