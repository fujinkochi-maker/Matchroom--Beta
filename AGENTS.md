# Matchroom Boxing Beta — Agent Guide

## Commands

```bash
bun dev          # dev server (Vite)
bun build        # production build
bun build:dev    # dev-mode build
bun lint         # ESLint
bun format       # Prettier --write .
```

Command order when submitting: `bun format && bun lint` (no tests or typecheck step exists).

## Stack

- **Framework**: TanStack Start v1 (React 19, SSR via Nitro/Cloudflare Workers)
- **Routing**: File-based in `src/routes/` — flat `.tsx` files, `$` for dynamic segs (`boxers.$username`), `__root.tsx` is the app shell
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss"`), `cn()` from `@/lib/utils` (clsx + tailwind-merge), semantic oklch tokens in `src/styles.css`
- **UI**: shadcn/ui (new-york style, RSC=false), Radix primitives, lucide-react icons, framer-motion
- **Pkg manager**: Bun; `bunfig.toml` has 24h supply-chain guard (`minimumReleaseAge`)

## Architecture

| Path                       | Role                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `src/server.ts`            | Nitro entrypoint — SSR error wrapper around `@tanstack/react-start/server-entry`             |
| `src/start.ts`             | TanStack Start instance with error middleware                                                |
| `src/router.tsx`           | Creates router + QueryClient                                                                 |
| `src/routeTree.gen.ts`     | **Auto-generated** — do not edit                                                             |
| `src/data/fighters.ts`     | Data layer: Supabase-backed `loadDataFromSupabase()` populates module-level caches           |
| `src/lib/supabase.ts`      | Supabase client singleton (reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from `.env`) |
| `src/lib/config.server.ts` | Server-only env config helper                                                                |
| `src/lib/error-capture.ts` | Captures uncaught errors for SSR recovery                                                    |

Content is backed by **Supabase** (Postgres). Every route calls `loadDataFromSupabase()` in its loader — data is fetched once per navigation and cached in module-level arrays. No mock data exists; the site shows empty states until data is added.

**Admin panel**: Supabase Studio (Table Editor) — add/edit/delete rows in a GUI. Tables mirror the `src/data/types.ts` schemas.

## Seed the database

1. Run `supabase-migration.sql` in Supabase Studio SQL Editor to create tables.
2. Add data via **Supabase Studio → Table Editor** (fighters, events, articles, videos, products).

## Division sync rules

Divisions must be spelled exactly as in `src/data/types.ts`:

```
Flyweight, Bantamweight, Featherweight, Lightweight, Welterweight,
Middleweight, Light Heavyweight, Cruiserweight, Heavyweight
```

These are enforced by CHECK constraints on `fighters.division` and `event_cards.weight` in the migration SQL. If you add data via Supabase Studio and get a "new row violates check constraint" error, the division spelling is wrong.

## Style conventions

- Prettier: `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`
- `noUnusedLocals`/`noUnusedParameters`: **off** in tsconfig
- `@typescript-eslint/no-unused-vars`: **off** in ESLint
- Google Fonts: Anton (display headings) + Inter (body), loaded in `__root.tsx` via `<link>`
- Colors via CSS variables only — no raw hex in components

# Matchroom Boxing Beta — Build Plan

A premium, sports-broadcast-style website for the Roblox "Boxing Beta" game under the Matchroom brand. Clean white + Matchroom red, sharp typography, championship presentation. All content is mocked (no backend) so the site looks fully alive from the first load.

## Brand & Design System

- Palette in `src/styles.css` (oklch tokens):
  - background `#FFFFFF`, surface `#F5F5F5`, foreground `#111111`
  - primary `#D71920` (Matchroom Red), primary-dark `#A00000`
  - subtle borders, no gold, no purple gradients
- Typography: condensed sports display for headings (Anton or Bebas Neue) paired with Inter for body — loaded via Google Fonts in `__root.tsx`.
- Components: shadcn (Button, Card, Input, Tabs, Badge, Dialog, Sheet, Table, Select).
- Motion: framer-motion for hero parallax, card hover lifts, fade/slide-in section reveals, championship spotlight glow.
- Reusable primitives: `SectionHeader`, `FighterCard`, `ChampionCard`, `EventCard`, `NewsCard`, `VideoCard`, `ProductCard`, `StatTile`.

## Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx           shared <SiteHeader/> + <SiteFooter/>, fonts, meta
  index.tsx            Home (hero, champions strip, upcoming event, news + videos teasers)
  champions.tsx        All 9 division champions, full showcase
  boxers.index.tsx     Boxers listing (champions row + search/filter + grid)
  boxers.$username.tsx Fighter profile (banner, stats, career, fight history, related news/videos)
  events.tsx           Event posters, countdowns, fight cards
  rankings.tsx         Tabs per weight class with ranked table
  news.index.tsx       Featured article + category grid
  news.$slug.tsx       Article reader
  videos.tsx           Netflix-style category rows with hover preview
  store.tsx            Merch grid with featured drops
```

Each route sets its own `head()` with title + description + og tags. `_` not used — all pages share the same chrome via `__root.tsx`.

## Mock data layer

A single `src/data/` module with typed mock data so every page is populated and cross-linked:

- `fighters.ts` — ~40 fighters across 9 divisions, each with username, nickname, division, rank, record (W-L-D), KO%, reach, height, age, stance, belts, avatar prompt, fight history.
- `events.ts` — 6 upcoming + past events with date, arena, poster, main event, full card.
- `news.ts` — 12 articles tagged to fighters/events with categories.
- `videos.ts` — 20 video entries (highlights, KOs, full fights, training, faceoffs, pressers) with thumbnail + duration.
- `products.ts` — 12 merch items.
- `divisions.ts` — the 9 weight classes with current champion id.

Helper selectors: `getChampion(division)`, `getFighterByUsername`, `getNewsForFighter`, `getVideosForFighter`, `getRanked(division)`.

## Page details

**Home** — Cinematic hero (full-bleed Roblox arena image, dark overlay, red accent bar, "MATCHROOM / HOME OF BOXING BETA", two CTAs → Champions / Events), then: Champions strip (9 cards), Next Event spotlight with countdown, Top Rankings teaser, Latest News (3), Featured Videos (4), Store teaser.

**Champions** — Grid of 9 large premium cards (one per division) with belt count, record, KO%, hover expand → "View Profile".

**Boxers** — Champions row at top → search input → filter chips (division, champion, top ranked, active, undefeated, KO specialist) → responsive fighter grid with hover red glow + quick stats.

**Fighter Profile** — Hero banner (large image, name, nickname, division, belts, rank badge) → stat dashboard cards (W/L/D, KO%, reach, height, age, stance) → Career Overview → Fight History table → Related News (filtered from `news.ts`) → Related Videos (filtered from `videos.ts`).

**Events** — Poster-style cards with countdown timers (live ticking via `setInterval`), main event, full card on click via Dialog.

**Rankings** — `Tabs` for 9 divisions; each tab a ranked table: Rank, Fighter (avatar + name), Record, Streak. Champion highlighted in red top row.

**News** — Featured article hero + category filter + grid. Detail page renders article body with related news/videos sidebar.

**Videos** — Category rows (horizontal scroll). Card hover: scale + red play button animation + auto-preview placeholder shimmer.

**Store** — Featured drop hero + product grid with "Limited Stock" badges, Quick View dialog, mock Add to Cart toast.

## Navigation

Sticky top navbar in `__root.tsx`: logo "MATCHROOM | BOXING BETA" + links (Home, Champions, Boxers, Rankings, Events, News, Videos, Store). Mobile: Sheet drawer. Underline-from-left hover, active link in red. Footer with brand, quick links, social, Roblox-game disclaimer.

## Imagery

Generate hero + key cards via imagegen (Roblox-style boxing arenas, championship belts, fighter faceoffs). Avatars: stylized Roblox-fighter portraits, batch-generated for the headline ~15 fighters; remaining fighters reuse a small pool with deterministic mapping so the grid stays varied but cheap to produce.

## Technical notes

- TanStack Start file-based routing; flat dot-separated filenames.
- All colors via semantic tokens — no raw hex in components.
- framer-motion: `motion.div` with `whileHover`, `whileInView` reveals, `AnimatePresence` for dialogs.
- Countdown timers in a small `useCountdown` hook.
- No backend, no auth, no Lovable Cloud — pure frontend with mock data. Cart/search/filter state local with `useState`.
- Disclaimer in footer: "Fan-made Roblox experience. Not affiliated with Matchroom Sport Ltd."

## Out of scope (v1)

- Real authentication, real payments, real video streaming
- Admin panel / CMS
- Live data from Roblox API

Once you approve, I'll build it route-by-route with the mock data + imagery generated up front.
