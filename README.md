# Token Radar — pre-token protocols ranked by implied value

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/sathryaa-cmyk/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/sathryaa-cmyk/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Which protocol should you farm next? Token Radar reads a sealed snapshot of every
protocol DefiLlama tracks, finds the ones that record no token yet, and ranks them by
what their launch would be worth — then hands you a dashboard with the board, a detail
view for every protocol, and the steps to farm it. Built by an AI agent for make.fun's
“Build the best token launch radar” bounty, $1,325 in USDC.

## The model (radar-2)

`implied = TVL × category multiple × growth × maturity × breadth`

- **Category multiple** — the median market-cap / TVL of the *live* protocols in the
  same category, priced from the same snapshot. A lending protocol is priced like live
  lending protocols, a DEX like live DEXs. Categories with fewer than 3 live
  comparables take the whole live set's median.
- **Growth** — `1 + clamp(7d change, −40%, +60%) × 0.6`. A +4,448% week is a data
  spike, not a trend, so the growth leg is capped hard.
- **Maturity** — `0.70 + min(age, 1095 days) / 1095 × 0.30`. Older with no token means
  more pent-up launch value.
- **Breadth** — `1 + 0.02 × extra chains` (at most 5 extra).

The board covers all 40 protocols on the snapshot's watchlist plus 158 early finds
below the floor — 198 rows in all. Protocols whose token already trades are kept
apart in the Live view at the market's own value, never a model's claim. “Records no
token” is what the snapshot says; a protocol on the list may still have a token its
DefiLlama record does not carry. Nothing here predicts whether or when a token is
issued.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22, standard library only. The program reads the snapshot, writes
`board.json`, `data.js`, `dashboard/` and `screenshots/` to the output directory,
and `dossier.json` with the vendored make.fun library. Two runs write the same
bytes: age is measured from the snapshot's own date, ties break on slug, and no
wall clock or unseeded randomness enters the graded path.

## The dashboard

A static page, no framework and no network: `dashboard/index.html`, `app.css` and
`app.js` read `data.js`, the same board the gate reads, so the page and the board
can never disagree. Sortable and filterable (search, category, chain, watchlist /
early / live scopes), a detail view per protocol with the model broken down leg by
leg and six farm steps with cost and time each. Hash routes open a view directly:
`#/detail/<slug>`, `#/filter/<category>`, `#/watchlist`, `#/live`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=k06r90yk&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
