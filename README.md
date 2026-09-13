# The Locker Room

A hub for every sports team you follow — NFL, NBA, MLB, NHL, college
football, college basketball, and Premier League soccer — built on ESPN's
public (unofficial) API, with friends, predictions, peer-to-peer picks, and a
personal "locker" layered on top.

## Features

- **Home** — a "next up" card for every team you follow (superfan teams get
  priority), quick unfollow, and an "add teams" browser (sport tabs →
  division accordion or flat grid → trading-card team picker, choosing
  casual or superfan when you follow).
- **My Locker** (`/locker`) — a personal hub: 3 public "locker door" photo
  slots pulled from unlimited private photo storage, a 30-word sharpie-font
  whiteboard, a trophy shelf (auto-awarded when a followed team wins a major
  championship, from here forward only), a log of games you've attended with
  photos attachable to each, and medals earned in group games. Every group
  page shows all its members' lockers too.
- **Team profiles** (`/teams/[league]/[teamId]`) — recent results and box
  score links, upcoming games (with a ticket-price search link and an "I'm
  going" flag), roster, team stats, depth chart (NFL only), news, casual/
  superfan toggle, which of your friends also follow this team, and a
  private notes box.
- **News** (`/news`) — recent articles for every followed team, newest
  first, filtered by the same team bar as everything else.
- **Schedule** — list or calendar view, upcoming or results, filtered by
  whichever teams are toggled on in the bar at the bottom of the screen (that
  bar persists across every page); games you're going to are highlighted.
- **Standings** — real ESPN conference/division tables per league you follow,
  your teams highlighted.
- **Friends** — connect via a shareable friend code, see their followed
  teams, and any bets you have outstanding with them.
- **Games** — season win-total & award predictions, four NFL group modes
  (spread guess, due Tuesday night ET on the honor system; straight-up
  pick'em; survivor pool with an optional buy-in; a weekly best-lineup
  fantasy game scored in standard PPR) played in named groups with their own
  message board, and a friend-to-friend wager board: post a pick with a line
  and stake, a friend accepts, declines, or counters back.
- "Connect your accounts" placeholders (Venmo handle, DraftKings, Fantasy
  Football) — no real integration yet, just the UI slot marked "coming soon".

## Local development

You need a Postgres connection string (see **Database** below), then:

```bash
npm install
npx prisma migrate deploy   # applies prisma/migrations/ to your database
npm run dev
```

Open http://localhost:3000. There's no login — pick a display name on first
visit (stored in a cookie); friends connect to you via a friend code, not an
account system.

## Database: Netlify DB (Neon Postgres)

The app uses Prisma 7 with the `@prisma/adapter-neon` driver adapter.
`src/lib/prisma.ts` reads `DATABASE_URL` if set (local dev), otherwise calls
`getConnectionString()` from the official `@netlify/database` SDK.

**Important:** Netlify Database does **not** expose its connection string as
a plain environment variable — not under any name, and not even to the
build step. It's only reachable through that SDK call, and only from code
running inside the deployed app (a Netlify Function), which is why
`prisma migrate deploy` cannot run as part of `netlify.toml`'s build
command — confirmed by grepping the build environment for every
plausible variable name and finding nothing. `netlify.toml` therefore just
runs `npm run build`, nothing database-related.

- **Local dev**: run `netlify db init` in this project (requires the
  [Netlify CLI](https://docs.netlify.com/cli/get-started/) and `netlify login`
  first) — it provisions a dev database and writes `DATABASE_URL` to `.env`
  for you automatically.
- **Production**: a Netlify DB attached to the site (Data & Storage →
  Database in the dashboard) is reachable by the deployed app automatically
  via the SDK — no env var to configure.
- **Applying migrations to production**: since the build can't reach the
  database, `prisma/migrations/` has to be applied out-of-band, once per new
  migration — e.g. `netlify db` CLI commands, or running
  `npx prisma migrate deploy` locally with `DATABASE_URL` pointed at the
  production connection string (visible in the dashboard's Database page
  under the `production` branch).

## Deploying to Netlify

1. Push this repo to GitHub (see **Outstanding manual step** below if that
   hasn't happened yet).
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
   Netlify auto-detects Next.js.
3. Attach a Netlify DB to the site (Data & Storage → Database in the
   dashboard).
4. Apply migrations once (see above) so the tables actually exist.
5. Deploy.

### Outstanding manual step: GitHub

This machine has no GitHub CLI (`gh`) and no existing SSH/HTTPS auth for
GitHub, so a repo can't be created/pushed from here — that needs your login
either way. Once you've run `gh auth login` (or added an SSH key to your
GitHub account), say the word and it can be pushed, or run directly:

```bash
git add -A
git commit -m "Home Base: multi-sport rebuild"
gh repo create "Home Base" --private --source=. --remote=origin --push
```

(If the GitHub repo you already created is named something other than
"Home Base", use `git remote add origin <its URL>` and `git push -u origin
main` instead of `gh repo create`.)

## Design system

Fixed light brand identity (no dark mode): white background, black (`--ink`)
text and borders, one accent yellow (`--yellow` / `--yellow-soft`). Headlines
use Archivo Black (`font-display`), body text uses Inter. Team "trading
cards" (`src/components/TeamCard.tsx`) use the team's own primary color as
the card panel, a league/division tag bar, and a yellow jersey-style corner
badge.

## Multi-sport architecture

- `src/lib/leagues.ts` is the registry of supported leagues — each maps our
  own slug (used in URLs and DB rows) to ESPN's `sportPath` segment.
- `src/lib/espn.ts` is fully parameterized by `sportPath`, including a
  `normalizeRoster()` step: ESPN returns NFL rosters pre-grouped by position
  (`{position, items[]}[]`) but a flat `athlete[]` for NBA/MLB/soccer, so both
  shapes are normalized to the same grouped structure.
- `src/lib/divisions.ts` only maps **NFL** abbreviations to conference/
  division. NBA and MLB show a flat team grid when adding teams (their
  abbreviations can collide with NFL's — e.g. DAL/PHI/WSH exist in both — so
  reusing the NFL map there would misgroup teams). The **Standings** page is
  unaffected: it renders whatever real conference/division groups ESPN
  returns per league, live.
- `FavoriteTeam` (league + ESPN team id, unique per user) replaces the old
  single `favoriteTeamId` column, so one person can follow teams across every
  supported league at once.

## Known simplifications

- **Group pick'em games** (spread guess / straight-up / survivor / fantasy)
  and **season predictions** are NFL-only — weeks don't map cleanly onto
  NBA/MLB's daily schedules, so generalizing them was out of scope here.
- **Spread picks lock Tuesday night ET** for the whole week (honor system —
  nothing stops you from looking up the real line first); **fantasy lineups
  lock Sunday at 1pm ET**; other picks lock at each game's own kickoff.
- **Spread grading** (group games) uses whatever line ESPN is currently
  showing once a game is no longer pre-game, since the API doesn't expose a
  distinct "opening vs. closing line".
- **Fantasy scoring** is standard PPR computed from ESPN's boxscore: kicker
  points are flat per-make (3/FG, 1/XP, no distance tiers — the boxscore
  doesn't expose individual kick distances), and team defense doesn't score
  fumble-recovery points (the boxscore doesn't cleanly attribute which team
  recovered).
- **Friend wagers are unrefereed**: either participant can mark a settled
  wager's outcome — there's no dispute resolution or verification against a
  real result, since these are free-form picks (not always tied to a graded
  game).
- **Player stats** on a team profile currently show the roster, not live
  season stat leaders (no cheap ESPN endpoint for that per player).
- **Ticket prices** link out to a SeatGeek search rather than showing a price
  in-app — no ticket marketplace API/key is configured.
- **Trophies** (My Locker) are only detected for the four major pro leagues
  with a single championship game (Super Bowl, NBA Finals, World Series,
  Stanley Cup) — Premier League's title is decided by a season-long table
  and college football/basketball's playoff formats weren't worth the extra
  detection logic here. Only awarded for championships from now forward,
  never backfilled.
- **Medals** (My Locker) are only awarded for the survivor pool and the
  weekly fantasy game, which have an unambiguous winner — the spread and
  straight-up pick'em leaderboards run all season with no clean "it's over"
  signal to detect.
- **Photos** are stored directly in Postgres (no blob storage/CDN set up),
  capped at 4MB each, with no client-side compression or resizing.
- Premier League is the only soccer league wired up.
- Schedule's "Results" tab is capped at the 40 most recent games (an 82-game
  NBA/MLB season would otherwise render one very long page).
- **Connect Venmo / DraftKings / Fantasy Football** are disabled
  placeholders — no OAuth or real money movement wired up.

## Data source note

This app calls ESPN's public but undocumented API directly from the server
on every request (short in-memory caching, no persistence of ESPN data). It
could break if ESPN changes those endpoints; there's no official support or
SLA.
