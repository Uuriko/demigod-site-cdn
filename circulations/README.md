# Circulations (v0)

Public discovery. No login. Static files on this CDN — no people-broker, no auto-send.

| Path | File |
|---|---|
| `/circulations` | `circulations.html` |
| `/circulations.json` | `circulations.json` |

Both are leftover faces in `leftover-motley.json`. Schema: `circulations/schema.json` (`demigod-circulations/v0`).

A circulation is a sealed list. Each entry has `name`, a one-line `vouch`, `open_to_work`, optional `network_gap`, and optional `linkedin` (string or null). The LinkedIn field stays on the schema.

v0 ships two lists marked `example: true` (Circulator A / Engineer Example, Circulator B / Operator Example). Placeholder names, not live people.

Human kill-switch before ticket send, consent, intro, and invoice.
