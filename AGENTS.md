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

---

## Architecture

| Path                           | Role                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| `src/server.ts`                | Nitro entrypoint — SSR error wrapper (catches h3 swallows)                 |
| `src/start.ts`                 | TanStack Start instance + error middleware                                 |
| `src/router.tsx`               | Router + QueryClient setup                                                 |
| `src/routeTree.gen.ts`         | **Auto-generated** — do not edit                                           |
| `src/data/fighters.ts`         | `loadDataFromSupabase()` + module-level caches + selectors                 |
| `src/lib/admin-auth.ts`        | Client-side token storage (localStorage)                                   |
| `src/lib/admin.server.ts`      | Server-only admin CRUD (login, fighters, events, articles, vids, products) |
| `src/lib/supabase.ts`          | Client singleton (anon key, browser-safe)                                  |
| `src/lib/supabase-admin.ts`    | Server-only admin client (service key)                                     |
| `bot-worker.ts`                | Discord bot (discord.js gateway + HTTP on :7860)                           |
| `scripts/register-commands.ts` | Registers slash commands with Discord API                                  |

### Data Flow

1. **Routes call** `await loadDataFromSupabase()` in a loader
2. **Module caches** (`_fighters`, `_events`, etc.) fill in-place from Supabase
3. **Components read** `FIGHTERS`, `EVENTS`, etc. directly — no React Query fetching
4. **After admin mutation**, call `router.invalidate()` to re-trigger loaders

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

---

## Admin Panel

- Token-based HMAC auth (`{expiry}.{signature}`, 24h lifetime)
- `ADMIN_PASSWORD` in env → server creates token → stored in localStorage
- All mutations gated by `validateToken(data.token)` server-side
- **Client auth check is UX only** — real protection is server-side validation
- Token lost on browser restart (not persisted across sessions)
- Login at `/admin/login`, CMD panel at `/admin/fighters`, `/admin/events`, etc.
- Use `router.invalidate()` after mutations to refresh cached data

---

## Division Spelling

Must match Supabase CHECK constraint exactly. **Case-sensitive**:

```
Flyweight, Bantamweight, Featherweight, Lightweight,
Welterweight, Middleweight, Light Heavyweight, Cruiserweight, Heavyweight
```

Typo → `"violates check constraint"` error.

---

## Key Conventions

- **TS**: `noUnusedLocals/Parameters: false` (unused vars allowed), `strict: true`
- **Colors**: semantic tokens only (`text-primary`, `bg-card`, `border-border`) — no raw hex
- **Typography**: Anton (headings) + Inter (body) loaded in `__root.tsx`
- **Images**: use CSS vars, not inline styles for hue/saturation
- **`cn()`** from `@/lib/utils` for merging Tailwind classes
- **`sideEffects: false`** in package.json — tree-shaking-aware
- **Zod** schemas at every server function boundary (admin.server.ts)
- **Division type** is a union string literal (not enum). See `src/data/types.ts`

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

- `bot-worker.ts` — standalone Bun HTTP server on port 7860
- Discord gateway connection (discord.js) for status + interaction handling
- Interaction handler at `src/lib/discord-bot.ts` (lazy-imported)
- Slash commands registered via `bun run register-commands`
- Containerized via Dockerfile for deployment (`bun run bot` CMD)

---

## Database

Run `supabase-migration.sql` in Supabase Studio SQL Editor. Tables:

- `fighters` (PK=username), `fight_history`, `events` (PK=slug), `event_cards`
- `articles` (PK=slug), `article_fighters`, `videos`, `video_fighters`, `products`
- Storage buckets: `fighter-images`, `event-images`, `article-images`, `product-images`

---

## Deployment

- **Vercel**: custom build command in `vercel.json` (`bun build` + manual `.vercel/output/` assembly)
- **Cloudflare Workers**: uses `cloudflare-module` Nitro preset (default in vite.config.ts)
- **Bot**: `Dockerfile` for container deployment (discord.js gateway + HTTP)

No CI workflows configured (no `.github/` directory).
