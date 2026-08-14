# Webflow pin — one SHA

**PIN = `0d2c91d91822bbab3c68801a2a5b0d37e7011e7f`** (first-paint hide leftover gold “SF Startup Talent.” H1 + statue; frege-night; v1101 foot)

Paste **this one SHA** for preload, CSS, and execute. Do not mix with `5b4d79d94686`, `229c9deace92`, `2cbd3931da2e`, `ba2c85d1a84c`, `309f4b700e1f`, or any other pin.

This SHA is the CDN file commit (`head-latest.css` + `foot-latest.js`). It is **not** claimed as already pasted in Webflow. Live curl 2026-08-14 still pins `@5b4d79d94686abd7fd18044d2318a56bd944657d`.

`foot-core.js` / `head-styles.css` were not changed (live pin is `foot-latest.js` + `head-latest.css`).

Do not use `trydemigod.com/bounties.json` (Webflow page dump). The board feed is `bounties-feed.json` in this repo. Empty listings are honest.

Art direction: `docs/DEMIGOD-ART-DIRECTION.md`.

Selector proof (headless Chrome, live H1/statue markup + Webflow gold-clip CSS):

```
node scripts/proof-gold-theater-hide.mjs
```

```html
<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/foot-latest.js" data-dg-foot-preload>
<meta name="dg-startup-map-script" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/startup-map-latest.js">
<meta name="dg-startup-map-data" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/sf-startup-map.json">
<meta name="dg-startup-roles-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/roles-feed.json">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/head-latest.css">
<script id="demigod-foot-cdn-loader" src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@0d2c91d91822bbab3c68801a2a5b0d37e7011e7f/foot-latest.js" defer></script>
```
