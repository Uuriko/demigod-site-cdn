# Agent entry — Demigod CDN tree (`~/src/demigod-site-cdn`)

**Machine SoR (read first):** `/Users/johnpotter/src/AGENTS.md` and `/Users/johnpotter/src/AGENT-BOARD.md`. Claim a row on the board before a multi-file edit. `git status --short` — if a path is dirty and you did not write it, do not edit it.

DIE is the Demigod desk on trydemigod.com — never print `DIE` in overlay JS. Public brand is **Demigod**.

## Products (do not mix)

| Product | Path |
|---|---|
| Demigod / DIE | this repo |
| Desk (Slack replacement) | `~/src/desk-chat/` only |
| Dasha | `~/src/dasha-desk/` only |

## How agents talk

Two channels, same disk, **no Slack API**:

1. **Board** — append a row to `~/src/AGENT-BOARD.md` (durable). Paste for a new Codex/Claude/Grok session is in `~/src/AGENTS.md`.
2. **Bus** — `/tmp/dg-busy/agent-bus/messages.jsonl` (Codex DIE worktree). This Mac has no `node` on PATH:

```bash
python3 scripts/dg-bus.py inbox grok --unread
python3 scripts/dg-bus.py claim --from grok --path scripts/foo.rb --until "proofs pass"
python3 scripts/dg-bus.py read grok
```

Interactive TUIs do **not** auto-read the bus. Check inbox + board at session start. One writer per file. No agent equals the user.

## Split (2026-09-02)

| Lane | Who | Write here | Do not |
|---|---|---|---|
| **Overlay / pin** | Codex claimed 2026-09-01 | `WEBFLOW-PIN.md`, `OPERATOR-PASTE.md`, `verify-live-release.*`, `foot-latest.js` | Push, Designer-publish |
| **Stripe leftover KYC** | Other session (`docs/ops/LANE.md`) | activate / Mercury / W-9 packets | Overlay; invoicing scripts |
| **Stripe invoicing operator** | Grok | `scripts/stripe-account-setup.rb`, `scripts/placement-invoice.rb`, `scripts/stripe-invoice-lifecycle.rb`, `scripts/stripe-invoice-followup.rb`, proofs, `art/stripe-*`, `docs/ops/stripe-invoice-playbook.md`, `docs/ops/stripe-invoice-preview.html` | Overlay; Desk; DIE collab store |
| **DIE Track Room** | Codex claimed 2026-09-02 | `die-pr100` collab store + `COLLABORATION-PLANE.md` | Overlay; Desk UI |
| **Desk / Slack replacement** | Other Grok (`AGENT-BOARD.md`) | `~/src/desk-chat/` | This CDN tree; Dasha |
| **Dasha** | Claude (see board) | `~/src/dasha-desk/` | Demigod KYC |

Desk = Slack replacement product. DIE Track Room = private collab kernel in the DIE worktree. They are not the same tree. Do not merge them.

## Hard gates

- No mail, GitHub push, wrangler, Webflow publish, Stripe `--apply`, or calendar unless the **current** user request says so.
- Do not put `Demigod Labs, Inc.` or an EIN in `foot-latest.js`.
- Do not merge `placement-invoice.rb` with `stripe-invoice-draft.rb`.

- **Never push local `main` or upload `docs/ops/` (EIN, Stripe ids, KYC/grant packets; public repo, jsDelivr caches forever).** A pre-push hook refuses it; `.gitignore` lists the folder; backup at `~/src/demigod-private-ops-backup-2026-09-02/`; relocation plan in `~/src/CODEX-HANDOFF-2026-09-02.md` §3. (Claude, 2026-09-02, at John's request.)
