# Matchroom Boxing Beta — Agent Guide

## Quick Start

```bash
bun install                # Setup
bun dev                    # http://localhost:5173 (Vite + SSR)
bun lint                   # ESLint check
bun format                 # Prettier --write .
bun run build:dev          # Dev-mode build (no minification)
bun run seed               # Placeholder — use Supabase Studio instead
bun run register-commands  # Register Discord slash commands
bun run bot                # Start Discord bot (port 7860)
```

**Before pushing**: `bun format && bun lint` (no test suite; typecheck unenforced).

---

## Stack

| Layer       | Tech                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| Framework   | TanStack Start v1 (React 19, SSR via Nitro/Cloudflare Workers)             |
| Routing     | File-based: `src/routes/` (`$` dynamic, `$.tsx` splat, `__root.tsx` shell) |
| Styling     | Tailwind CSS v4 + semantic oklch tokens (`src/styles.css`), `cn()` util    |
| UI          | shadcn/ui (new-york), Radix, lucide-react, framer-motion, recharts         |
| Data        | Supabase (Postgres) — module-level cache, no React Query fetching          |
| Package Mgr | Bun; `bunfig.toml` enforces 24h supply-chain guard                         |
| Path alias  | `@/` → `./src/` (tsconfig paths + vite-tsconfig-paths)                     |

Static assets in `public/` serve at root URL (favicon at `/favicon.png`).

---

## Architecture

| Path                           | Role                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| `src/server.ts`                | Nitro entrypoint — normalizes h3-swallowed SSR errors into error page      |
| `src/start.ts`                 | TanStack Start instance + error middleware                                 |
| `src/router.tsx`               | Router + QueryClient setup                                                 |
| `src/routeTree.gen.ts`         | **Auto-generated** — do not edit                                           |
| `src/data/fighters.ts`         | `loadDataFromSupabase()` + module-level caches + selectors                 |
| `src/data/types.ts`            | Shared types — `Division` is a string union literal, **not** an enum       |
| `src/lib/admin-auth.ts`        | Client-side token storage (localStorage)                                   |
| `src/lib/admin.server.ts`      | Server-only admin CRUD (login, fighters, events, articles, vids, products) |
| `src/lib/supabase.ts`          | Client singleton (anon key, browser-safe)                                  |
| `src/lib/supabase-admin.ts`    | Server-only admin client (service key)                                     |
| `src/lib/error-capture.ts`     | Captures last SSR error for `src/server.ts` to render (sideEffects entry)  |
| `src/lib/error-page.ts`        | HTML error page renderer                                                   |
| `bot-worker.ts`                | Discord bot (discord.js gateway + HTTP on :7860)                           |
| `scripts/register-commands.ts` | Registers Discord slash commands with Discord API                          |

### Data Flow

1. **Routes call** `await loadDataFromSupabase()` in a loader
2. **Module caches** (`_fighters`, `_events`, etc.) fill in-place from Supabase
3. **Components read** `FIGHTERS`, `EVENTS`, etc. directly — no React Query fetching
4. **After admin mutation**, call `router.invalidate()` to re-trigger loaders

### Cache Management

- Module caches have no TTL by default; `loadDataFromSupabase()` replaces array contents in-place
- `clearFightersCache()` deletes cache timestamp so next `ensureFightersLoaded()` fetches fresh data — call after admin mutations
- `refreshFighter(username)` fetches one fighter directly from Supabase and updates the shared `FIGHTERS` array (bypasses cache timestamp check) — used in profile page loaders
- **Admin fighter create/edit pages must call `clearFightersCache()` after successful save**

### Server-only vs Client

- Admin mutations live in `admin.server.ts` (imports `node:crypto`, uses service key)
- Client data reads use `getSupabase()` (anon key, no server needed for reads)
- Use `*.server.ts` naming (TanStack Start convention) for server-only modules
- Do **not** use Next.js `server-only` package — blocked by ESLint

---

## Environment

Missing `VITE_SUPABASE_*` keys → empty site. Missing server keys → admin panel fails silently.

`.env` is committed (public anon key + dev service key). For production, use `.env.local` (gitignored) to override.

### All env vars

| Var                      | Scope  | Required for             |
| ------------------------ | ------ | ------------------------ |
| `VITE_SUPABASE_URL`      | client | site rendering           |
| `VITE_SUPABASE_ANON_KEY` | client | site rendering           |
| `SUPABASE_SERVICE_KEY`   | server | admin CRUD               |
| `ADMIN_PASSWORD`         | server | admin login              |
| `SESSION_SECRET`         | server | token HMAC (optional)    |
| `DISCORD_BOT_TOKEN`      | server | Discord bot              |
| `DISCORD_PUBLIC_KEY`     | server | interaction verification |
| `DISCORD_APPLICATION_ID` | server | register-commands        |
| `DISCORD_GUILD_ID`       | server | OAuth2 auto-join guild   |
| `DISCORD_CLIENT_SECRET`  | server | OAuth2 login            |

---

## Admin Panel

- Token-based HMAC auth (`{expiry}.{signature}`, 24h lifetime)
- `ADMIN_PASSWORD` in env → server creates token → stored in localStorage
- All mutations gated by `validateToken(data.token)` server-side
- **Client auth check is UX only** — real protection is server-side validation
- Token lost on browser restart (not persisted across sessions)
- Login at `/admin/login`, CMD panel at `/admin/fighters`, `/admin/events`, etc.
- Use `router.invalidate()` after mutations to refresh cached data
- **Opponent autocomplete** in `FighterForm` — searches `FIGHTERS` by displayName/username, stores opponent `username`
- **Opponent sync** (`syncOpponentRecords`) mirrors each fight result (inverted) to the opponent's `fight_history`, recalculates their stats + rankings. Call whenever a fighter's history changes
- **Belt checkboxes** in `FighterForm` allow selecting WBC/WBA/IBF/WBO for champion fighters

---

## Division Spelling

Must match Supabase CHECK constraint exactly. **Case-sensitive**:

```
Flyweight, Bantamweight, Featherweight, Lightweight,
Welterweight, Middleweight, Light Heavyweight, Cruiserweight, Heavyweight
```

Typo → `"violates check constraint"` error. The `Division` type in `src/data/types.ts` enforces this at compile time.

---

## Key Conventions

- **TS**: `noUnusedLocals/Parameters: false` (unused vars allowed), `strict: true`
- **Colors**: semantic tokens only (`text-primary`, `bg-card`, `border-border`) — no raw hex
- **Typography**: Anton (headings) + Inter (body) loaded in `__root.tsx`
- **`cn()`** from `@/lib/utils` for merging Tailwind classes
- **`sideEffects: false`** in package.json — tree-shaking-aware; `src/lib/error-capture.ts` is the lone side effect entry
- **Zod** schemas at every server function boundary (admin.server.ts)
- **`displayRank`** is computed from sorted position in each division (belt=0, contenders=1,2,3...), not the raw `rank` DB field
- **`getChampionTitle(beltsHeld)`** returns "World Champion" (1 belt), "Unified Champion" (2-3), "Undisputed" (4) — used in `FighterCard`, `ChampionCard`, and profile page
- **Images**: use CSS vars, not inline styles for hue/saturation; `public/favicon.png` is the site favicon

### vite.config.ts — Do Not Add Plugins Manually

```ts
// @lovable.dev/vite-tanstack-config already includes:
// tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (cloudflare-module default),
// componentTagger (dev-only), VITE_* env injection, @ path alias,
// React/TanStack dedupe, error loggers, sandbox detection (port/host/strictPort).
// Adding them again causes duplicate-plugin errors.
```

### Routing

See `src/routes/README.md`. Key: `routeTree.gen.ts` is auto-generated.

---

## Discord Bot

### Two Deployment Modes

| Mode              | Entry           | Host                               | Purpose                                                           |
| ----------------- | --------------- | ---------------------------------- | ----------------------------------------------------------------- |
| Cloudflare Worker | `src/worker.ts` | `wrangler deploy`                  | Gateway WebSocket via Durable Object + slash command HTTP handler |
| Standalone        | `bot-worker.ts` | `bun run bot` / Docker (port 7860) | discord.js gateway + HTTP — not used in production                |

### Slash Commands (HTTP, no token needed for receipt)

Discord sends slash commands via HTTP webhook (verified by `DISCORD_PUBLIC_KEY`). The worker at `src/worker.ts:100` dispatches to `handler.handleDiscordInteraction(request)`. Commands:

- `/register` — creates fighter row, stores `guild_id`, sends DM with division buttons
- `/stats` — shows fighter record, checks promotion
- `/rankings [division]` — top 15 contenders
- `/ask [question]` — AI reply (uses Workers AI, 10k req/day free tier)
- `/unregister` — removes fighter row, cleans up Discord roles

### Gateway WebSocket (needs valid token for @mentions)

Durable Object `DiscordGatewayDO_v2` (`src/durable-object.ts`) maintains a persistent WS connection. Used for:

- Status presence (online/gaming)
- @mentions in `MESSAGE_CREATE` events (**currently disabled** — dispatch commented out)
- Message dedup via `processedMessages` Set (prevents spam on reconnect)

### Known DO Env Staleness Issue

`this.env` inside DO WebSocket callbacks can hold **stale values** after `wrangler secret put`. Workaround: read token in the `fetch` handler (which gets fresh env) and cache on `this`:

```ts
// In DO fetch handler:
this.botToken = env.DISCORD_BOT_TOKEN;
// Then use this.botToken in WS callbacks
```

### Wakeup + Debug Endpoints

- `GET /debug` — returns DO status JSON
- `GET /envcheck` — returns presence/prefix of `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`
- `GET /wakeup` — forces DO cleanup + reconnect with fresh token
- `GET /discord` — redirects to Discord invite

Cron (`* * * * *`) pings `/wakeup?token=...` every minute to keep DO alive.

### Bot Token Gotchas

- `wrangler secret put DISCORD_BOT_TOKEN` — use `Write-Output` to pipe the value, **not** `Write-Host` (Write-Host prints to console but doesn't pipe to stdin)
- After updating the secret, the DO may still see the old value due to env staleness — use `/wakeup` endpoint or rename the DO class to force a fresh instance
- DO migration `renamed_classes` forces fresh instance (used `DiscordGatewayDO` → `DiscordGatewayDO_v2`)
- Reconnect delay: 30s (OP 9 Invalid Session closes WS instead of re-identifying)

### Auto-Role System

On `/register`, the bot stores `guild_id` in the fighter's DB row. Division selection via DM buttons:

- Division role assigned (e.g. `Heavyweight` → role `1510665777106387025`)
- `Amateur` role (`1510667124006457496`) added

When wins >= 3 (`checkPromotion`):

- `Amateur` role removed
- `Pro Boxer` role (`1510665774052806780`) added

Promotion checked on `/stats` command and after admin `updateFighter` saves stat changes.

### Champion Discord Roles (admin.server.ts)

When `updateFighter` saves belt changes, it does a clean-slate role update:

1. Removes all belt-specific roles (WBC/WBA/IBF/WBO) + title roles (World/Unified/Undisputed)
2. Re-adds belt roles matching current `beltsHeld` (e.g., `WBC` → role `1511958029954846810`)
3. Adds title role based on count: World Champion (1), Unified Champion (2-3), Undisputed (4)
4. If fighter previously held belts but now has none, adds `Former World Champion` role

Role IDs (hardcoded in `src/lib/admin.server.ts:40-51`):

| Role                    | ID                    |
| ----------------------- | --------------------- |
| `Amateur`               | `1510667124006457496` |
| `Pro Boxer`             | `1510665774052806780` |
| `World Champion`        | `1511957885892956160` |
| `Unified Champion`      | `1511959744955285596` |
| `Undisputed`            | `1511959750865059870` |
| `Former World Champion` | `1511961430985932818` |
| Belt: WBC               | `1511958029954846810` |
| Belt: WBA               | `1511958114986098748` |
| Belt: IBF               | `1511958120014942300` |
| Belt: WBO               | `1511958030353305600` |

### Critical: Await All Discord API Calls

All `discordAddRole`, `discordRemoveRole`, `updateDiscordNickname`, and `setNickname` calls **must be awaited**. If they're passed to `ctx.waitUntil()` without `await`, the promise may resolve after the handler has already responded, leaving roles/nicknames in an inconsistent state.

### updateDiscordNickname — Uses Per-Fighter Guild ID

`updateDiscordNickname(guildId, discordId, nickname)` reads `guildId` from the fighter's DB row — **not** from `process.env.DISCORD_GUILD_ID` (which was never set). The nickname format is: `DisplayName | W-L-D | XKO(s)`.

### recalculateDivisionRanks(division)

After division selection or admin stat edits, call `recalculateDivisionRanks(division)` to renumber contenders 1,2,3... (champion stays rank 0). Defined in `src/lib/discord-bot.ts`.

---

## Database

Run `supabase-migration.sql` in Supabase Studio SQL Editor. Tables:

- `fighters` (PK=username), `fight_history`, `events` (PK=slug), `event_cards`
- `articles` (PK=slug), `article_fighters`, `videos`, `video_fighters`, `products`
- Storage buckets: `fighter-images`, `event-images`, `article-images`, `product-images`

---

## Deployment

- **Vercel**: `vercel.json` → `bash build.sh` (`NITRO_PRESET=vercel bun run build` + manual `.vercel/output/` assembly). Auto-deploys from `main` branch pushes.
- **Cloudflare Workers**: `wrangler deploy` (uses `cloudflare-module` Nitro preset). Secrets via `wrangler secret put`.
- **Bot**: `Dockerfile` for container deployment (discord.js gateway + HTTP).

No CI workflows configured (no `.github/` directory).
