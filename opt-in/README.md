# FIRST_PARTY talent opt-in (trydemigod mount)

**Honesty:** `OPT_IN_LIVE=0`. `FIRST_PARTY` is empty (`count: 0`, `live: false`). No persist. No people-data. No email send. Not production matching E2E.

Company-free talent fields only. No LinkedIn scrape. No Apollo People.

## Routes

| Surface | Method / path | Behavior |
|---------|---------------|----------|
| Static form | `GET /opt-in` | **200** HTML from `public/opt-in.html` |
| Health | `GET /api/opt-in/healthz` | `{ ok: true, service: "demigod-opt-in", live: false }` while `OPT_IN_LIVE≠1` |
| Submit | `POST /api/opt-in` | Validate talent-only body; **503** refuse persist while stub |

Route map: `../opt-in-routes.json` (same leftover-face shape as `leftover-motley.json`). GET faces are also registered on that leftover map so the existing CDN Worker can serve them without a new stack.

## Local check

```bash
node opt-in/src/worker.mjs --check
node opt-in.test.mjs
```
