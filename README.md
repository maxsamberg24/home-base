# NFL Hub

Your favorite team, season predictions, and pick'em games with friends — built on
ESPN's public (unofficial) NFL API.

## Features

- **My Team** — pick a favorite team; get its news, recent/upcoming scores, record, and depth chart, styled as a trading card.
- **Predictions** — call every team's win total for the season, plus Super Bowl/MVP/ROY/Coach of the Year futures.
- **Games** — create or join a group (share the invite code) and play:
  - **Guess the spread** — closest to the actual closing line wins.
  - **Straight-up pick'em** — pick every winner, no spread.
  - **Survivor pool** — one pick per week, can't reuse a team, lose and you're out.
- Browse the league from the home page or the team picker: sport tabs (NFL live;
  NBA/MLB/NHL are visible "coming soon" placeholders) → division accordions → a
  trading card per team.
- A "Connect your accounts" placeholder on the home page for a future
  DraftKings / fantasy-football sync — no wiring yet, just the UI slot.

## Local development

You need a Postgres connection string (see **Database** below), then:

```bash
npm install
npx prisma migrate deploy   # applies prisma/migrations/ to your database
npm run dev
```

Open http://localhost:3000. There's no login — pick a display name on first visit
(stored in a cookie) so friends can see your picks on a shared leaderboard.

## Database: Netlify DB (Neon Postgres)

The app uses Prisma 7 with the `@prisma/adapter-neon` driver adapter, reading a
single `DATABASE_URL` env var (see `.env`).

- **Local dev**: run `netlify db init` in this project (requires the
  [Netlify CLI](https://docs.netlify.com/cli/get-started/) and `netlify login`
  first) — it provisions a dev database and writes `DATABASE_URL` to `.env` for
  you automatically.
- **Production**: once the site exists on Netlify, link/provision a Netlify DB
  from the site's dashboard (or `netlify db init` again from a linked site) —
  Netlify injects `DATABASE_URL` into the deploy automatically.
- The committed migration in `prisma/migrations/` was generated offline
  (`prisma migrate diff --from-empty --to-schema ...`) against the Postgres
  provider, so the very first `prisma migrate deploy` against a fresh database
  creates every table.

## Deploying to Netlify

1. Push this repo to GitHub (see **Outstanding manual step** below if that
   hasn't happened yet).
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
   Netlify auto-detects Next.js; `netlify.toml` is already set up to run
   `prisma migrate deploy` before every build.
3. Provision a Netlify DB for the site (Site settings → Database, or
   `netlify db init` from a linked local checkout) so `DATABASE_URL` is set in
   the site's environment.
4. Deploy. Every subsequent push runs migrations automatically before the
   Next.js build.

### Outstanding manual step: GitHub

This machine has no GitHub CLI (`gh`) and no existing SSH/HTTPS auth for
GitHub, so I couldn't create/push a repo myself — that needs your login either
way. Once you've run `gh auth login` (or added an SSH key to your GitHub
account), tell me and I'll create the repo and push, or you can do it directly:

```bash
git add -A
git commit -m "NFL Hub: Netlify DB migration + trading-card redesign"
gh repo create nfl-hub --private --source=. --remote=origin --push
```

## Design system

Fixed light brand identity (no dark mode): white background, black (`--ink`)
text and borders, one accent yellow (`--yellow` / `--yellow-soft`). Headlines
use Archivo Black (`font-display`), body text uses Inter. Team "trading cards"
(`src/components/TeamCard.tsx`) use the team's own primary color as the card
panel, a league/division tag bar, and a yellow jersey-style corner badge.
Division grouping is a static map in `src/lib/divisions.ts` (NFL alignment
doesn't change often enough to justify an extra API call).

## How it's built

- Next.js App Router + Server Actions (progressive-enhancement forms, no client JS
  framework needed for mutations).
- Postgres via Prisma for users, groups, predictions, and picks.
- `src/lib/espn.ts` wraps ESPN's undocumented `site.api.espn.com` /
  `sports.core.api.espn.com` endpoints — scoreboard (incl. spreads/odds), teams,
  news, roster, standings, and depth charts.

## Known simplifications

- **Pick lock time** is "kickoff", not literally "noon Sunday" — this covers
  Thursday/Sunday/Monday games uniformly without hardcoding a day-specific cutoff.
- **Spread grading** uses whatever line ESPN is currently showing once a game is
  no longer pre-game, since the API doesn't expose a distinct "opening vs. closing
  line" — in practice this is the last line posted before kickoff.
- **MVP / OROY / DROY / Coach of the Year** are free-text predictions (no live
  ESPN data source for these), so there's no auto-grading — only win-total and
  Super Bowl futures can eventually be checked against real standings.
- **Survivor**: missing a week is not auto-elimination in this version — only an
  actual loss eliminates you.
- **NBA / MLB / NHL** tabs are visual placeholders only — no data, no routes.
- **Connect DraftKings / Fantasy Football** buttons are disabled placeholders —
  no OAuth or sync wired up yet.

## Data source note

This app calls ESPN's public but undocumented API directly from the server on
every request (short in-memory caching, no persistence of ESPN data). It could
break if ESPN changes those endpoints; there's no official support or SLA.
