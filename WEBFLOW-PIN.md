# Webflow pin — one SHA

**PIN = `e90d426c599febcd283fd7dcdefa84f7c0487988`** (this leftover fix; v1101 foot + empty Demigod feed)

Live 2026-08-13 mixed pins: preload/CSS `@309f4b700e1f` (v1099) vs execute `@7d7d0ebab1d8` (v1101). Paste **one** SHA for preload, CSS, and execute.

Do not use `trydemigod.com/bounties.json` (Webflow page dump). The board feed is `bounties-feed.json` in this repo.

```html
<link rel="preload" as="script" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e90d426c599febcd283fd7dcdefa84f7c0487988/foot-latest.js" data-dg-foot-preload>
<meta name="dg-startup-map-script" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e90d426c599febcd283fd7dcdefa84f7c0487988/startup-map-latest.js">
<meta name="dg-startup-map-data" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e90d426c599febcd283fd7dcdefa84f7c0487988/sf-startup-map.json">
<meta name="dg-startup-roles-feed" content="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e90d426c599febcd283fd7dcdefa84f7c0487988/roles-feed.json">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e90d426c599febcd283fd7dcdefa84f7c0487988/head-latest.css">
<script id="demigod-foot-cdn-loader" src="https://cdn.jsdelivr.net/gh/Uuriko/demigod-site-cdn@e90d426c599febcd283fd7dcdefa84f7c0487988/foot-latest.js" defer></script>
```
