# Webflow pin — one SHA

Paste **one** SHA for preload, CSS, and execute. Do not mix pins.

Live tokens and art direction: `docs/DEMIGOD-ART-DIRECTION.md` (frege-night forest/mint).

Do not use `trydemigod.com/bounties.json` (Webflow page dump). The board feed is `bounties-feed.json` in this repo. Empty listings are honest.

```html
<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/foot-latest.js" data-dg-foot-preload>
<meta name="dg-startup-map-script" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/startup-map-latest.js">
<meta name="dg-startup-map-data" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/sf-startup-map.json">
<meta name="dg-startup-roles-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/roles-feed.json">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/head-latest.css">
<script id="demigod-foot-cdn-loader" src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@PIN/foot-latest.js" defer></script>
```

Replace `PIN` with the SHA on the next line after this file is committed.
