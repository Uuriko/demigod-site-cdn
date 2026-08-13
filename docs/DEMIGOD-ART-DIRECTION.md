# Demigod art direction (locked)

Frege-night forest/mint. Not Dasha acid/hot/violet. Not gold SaaS.

## Tokens

| Name | Hex | CSS |
|---|---|---|
| night | `#03140d` | `--dg-night` |
| ink | `#02100a` | `--dg-ink` |
| phosphor | `#a6ffcb` | `--dg-phosphor` |
| signal | `#10c674` | `--dg-signal` |
| paper | `#f3f0e7` | `--dg-paper` |

Compatibility aliases in `head-latest.css`: `--g`/`--gl`/`--dk` map to signal / phosphor / night. Do not reintroduce `--g:#D4AF37`.

## Type

- **Sans** (system-ui / Manrope) for UI and H1
- **Georgia** for section titles (`h2`/`h3`)
- No Cinzel, no gold uppercase shout

## CTAs

- **Hire** = filled signal on night (`background: #10c674; color: #03140d`)
- **Talent / Share privately** = phosphor outline (`border: phosphor; color: paper or phosphor; transparent fill`)
- Hire is the primary card. Do not equal-weight dual-path so Hire reads dimmer than Share privately.

## Forbidden

- Gold `#D4AF37` (and C9A84C / E8D5A3 gold-era cascade)
- Dasha palette (acid / hot / violet)
- Lavender glass
- Dual `:root` gold FOUC (remap `--g:#D4AF37` instead of deleting it)
- 21-row leaderboard
- Dasha ticker
- `extraSeed` from dasha-desk
- elizaOS

## Product honesty

- Contact: **potter@trydemigod.com** only
- Empty bounties feed is honest — do not seed fake listings
- Never `extraSeed` dasha-desk into Demigod
- Webflow: **one SHA** for preload, CSS, and execute — see `WEBFLOW-PIN.md`
