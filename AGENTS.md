# Matchroom Boxing Beta — Agent Guide

## Quick Start

```bash
bun install                # Setup
bun dev                    # http://localhost:5173 (Vite + SSR)
bun lint && bun format     # ESLint + Prettier (before pushing)
bun run build:dev          # Dev build (no minification)
bun run register-commands  # Register Discord slash commands
bun run bot                # Start Discord bot (port 7860)
```

---

## Stack

TanStack Start v1 (React 19 + SSR) · File-based routes (`src/routes/`) · Tailwind CSS v4 + oklch semantic tokens (`src/styles.css`) · shadcn/ui + Radix · Supabase (module-level cache, no React Query) · Bun · `@/` → `./src/`

---

## Architecture

| Path                        | Role                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| `src/server.ts`             | Nitro entrypoint                                                       |
| `src/router.tsx`            | Router + QueryClient                                                   |
| `src/routeTree.gen.ts`      | **Auto-generated — do not edit**                                       |
| `src/data/fighters.ts`      | Module-level caches (`FIGHTERS`, `EVENTS`, etc.) + loaders + selectors |
| `src/data/types.ts`         | Shared types; `Division` is a string union literal                     |
| `src/lib/admin.server.ts`   | Server-only admin CRUD (Zod-gated)                                     |
| `src/lib/supabase.ts`       | Client singleton (anon key)                                            |
| `src/lib/supabase-admin.ts` | Server-only admin client (service key)                                 |
| `src/worker.ts`             | Cloudflare Worker bot entry (prod)                                     |
| `src/durable-object.ts`     | `DiscordGatewayDO_v2` — persistent WS for bot                          |

### Cache Rules

- `loadDataFromSupabase()` fills module-level arrays in-place. **Components read `FIGHTERS`, `EVENTS` directly** — no React Query.
- Call `clear*Cache()` **client-side** _before_ `router.invalidate()` after mutations.
- `clearFightersCache` deletes `_lastLoaded["fighters"]` — **`_fighters` (wrong key) was the old bug**.
- `refreshFighter(username)` fetches one fighter directly (bypasses cache TTL) for profile pages.

### Server-only vs Client

Admin mutations in `admin.server.ts` (service key, `node:crypto`). Client reads via `getSupabase()` (anon key). `*.server.ts` naming convention.

---

## Environment

`.env` is committed (anon key + dev service key). `.env.local` overrides (gitignored).

| Var                                                                 | Scope  | Required for           |
| ------------------------------------------------------------------- | ------ | ---------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`                       | client | site rendering         |
| `VITE_SITE_URL`                                                     | both   | Discord embed/DM links |
| `SUPABASE_SERVICE_KEY`                                              | server | admin CRUD             |
| `ADMIN_PASSWORD`                                                    | server | admin login            |
| `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID` | server | Discord bot            |
| `DISCORD_GUILD_ID`, `DISCORD_CLIENT_SECRET`                         | server | OAuth2 auto-join guild |
| `FEED_WEBHOOK_URL`                                                  | server | feed post embed        |

---

## Admin Panel

- HMAC token auth (`{expiry}.{signature}`, 24h). `ADMIN_PASSWORD` → server creates token → localStorage.
- **Client auth is UX-only** — real protection is server-side `validateToken()`.
- Opponent sync (`syncOpponentRecords`) mirrors fight results to opponent's history + recalculates stats/rankings.
- **Stats are NOT auto-calc'd from history** — set wins/losses/draws/kos manually in the form.
- Role IDs (WBC/WBA/IBF/WBO, Amateur/Pro, champion tiers, Former Champion) hardcoded in `admin.server.ts`.
- `updateDiscordNickname` per-fighter `guildId` (from DB). Format: `DisplayName | W-L-D | XKO(s)`.
- All Discord role/nickname API calls **must be awaited**.

---

## Division Spelling

Case-sensitive, must match Supabase CHECK:

```
Flyweight, Bantamweight, Featherweight, Lightweight,
Welterweight, Middleweight, Cruiserweight, Heavyweight
```

---

## Key Conventions

- **TS**: `noUnusedLocals/Parameters: false`, `strict: true`
- **Colors**: semantic tokens only. **Never `text-primary` on `bg-foreground`** (near-identical values — invisible). Use `text-background`. `--matchroom-red` in oklch in `styles.css`.
- **Typography**: Anton (headings) + Inter (body) in `__root.tsx`
- **`cn()`** from `@/lib/utils`. **`sideEffects`** in package.json; `error-capture.ts` is lone entry.
- **`displayRank`** computed from sorted position, not DB `rank`. `getChampionTitle(beltsHeld)`: 0→Champion, 1→World, 2-3→Unified, 4→Undisputed.
- **`BeltIcon`** at `src/components/BeltIcon.tsx` — renders belt PNGs from `src/assets/`.
- **`vite.config.ts`**: `@lovable.dev/vite-tanstack-config` bundles all plugins — do **not** add them manually.
- **Routing**: `routeTree.gen.ts` auto-generated. `$` for dynamic segments, `$.tsx` for splat, `__root.tsx` shell.
- **Feed webhook**: `createPost` `await`s the fetch + checks HTTP status (serverless terminates pending promises).
- **`clearFightersCache()` deletes `"fighters"` key** (not `"_fighters"`).

---

## Discord Bot

### Deployment

| Mode                     | Entry           | Command           |
| ------------------------ | --------------- | ----------------- |
| Cloudflare Worker (prod) | `src/worker.ts` | `wrangler deploy` |
| Standalone (dev/Docker)  | `bot-worker.ts` | `bun run bot`     |

**Never use Nitro-generated `dist/server/wrangler.json` for bot deploys.**

### Commands (HTTP, key-verified)

`/register` `/stats` `/rankings [division]` `/ask` `/unregister` `/help`

### Durable Object (`DiscordGatewayDO_v2`)

Persistent WS for status presence, `GUILD_MEMBER_ADD` welcome DM, message dedup. **Env staleness**: `this.env` in WS callbacks can be stale after `wrangler secret put` — read token in `fetch` handler, cache on `this`. 30s reconnect delay. `* * * * *` cron pings `/wakeup` to keep alive.

### Auto-Role

`/register` → fighter row + division role + `Amateur` role. Wins ≥ 3 → `Pro Boxer` role replaces `Amateur`. Champion belt changes do clean-slate role re-assignment.

---

## Database

Run `supabase-migration.sql` in Supabase Studio. Tables: `fighters` (PK=username), `fight_history`, `events` (PK=slug), `event_cards`, `articles`, `article_fighters`, `videos`, `video_fighters`, `products`, `event_signups`, `fighter_follows`, `posts`, `post_tags`, `post_likes`, `notifications`. FK constraints on event fighter columns are **dropped** (free-text). Storage buckets: `{fighter,event,article,product}-images`, `post-images`, `videos`.

---

## Deployment

- **Vercel**: `vercel.json` → `bash build.sh` → auto-deploys from `main`.
- **Cloudflare Workers**: `wrangler deploy` (cloudflare-module preset). Secrets via `wrangler secret put`.
- **Bot**: `Dockerfile` for container deployment.
- No CI (no `.github/`).
