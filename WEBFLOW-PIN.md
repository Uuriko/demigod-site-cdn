# Webflow pin — one SHA

Live 2026-08-13 mixed pins: preload/CSS `@309f4b700e1f` (v1099) vs execute `@7d7d0ebab1d8` (v1101). Paste **one** commit SHA for preload, CSS, and execute.

Do not use `trydemigod.com/bounties.json` (Webflow page dump). The board feed is `bounties-feed.json` in this repo.

```html
<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/foot-latest.js" data-dg-foot-preload>
<meta name="dg-startup-map-script" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/startup-map-latest.js">
<meta name="dg-startup-map-data" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/sf-startup-map.json">
<meta name="dg-startup-roles-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/roles-feed.json">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/head-latest.css">
<script id="demigod-foot-cdn-loader" src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/foot-latest.js" defer></script>
```

Replace `PIN` with the SHA named at the top of this file after it is filled in.
