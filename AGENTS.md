# Matchroom Boxing Beta — Agent Guide

## Quick Start

```bash
# Setup
bun install
cp .env.example .env.local  # See Environment Setup below

# Development
bun dev          # http://localhost:5173 (Vite + SSR)
bun lint
bun format       # Prettier --write .
```

**Before pushing**: `bun format && bun lint` (no tests; typecheck is not enforced).

---

## Stack

| Layer           | Tech                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| **Framework**   | TanStack Start v1 (React 19, SSR via Nitro/Cloudflare Workers)                                 |
| **Routing**     | File-based: `src/routes/` (flat `.tsx` files, `$` for dynamic segs, `__root.tsx` is app shell) |
| **Styling**     | Tailwind CSS v4 + semantic oklch tokens in `src/styles.css`, `cn()` from utils                 |
| **UI**          | shadcn/ui (new-york), Radix primitives, lucide-react, framer-motion                            |
| **Data**        | Supabase (Postgres), module-level caching with `loadDataFromSupabase()`                        |
| **Package Mgr** | Bun; `bunfig.toml` enforces 24h supply-chain guard                                             |

---

## Environment Setup

### Client-Side (.env or .env.local)

```env
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[public-anon-key-safe-to-commit]
```

### Server-Side (.env.local, never commit)

```env
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[public-anon-key]
SUPABASE_SERVICE_KEY=[admin-only-secret]  # Never share
ADMIN_PASSWORD=[your-secret-password]
SESSION_SECRET=[optional-hmac-secret]
NODE_ENV=development
NITRO_PRESET=cloudflare-module
```

Missing client keys → empty site. Missing admin keys → admin panel fails silently.

---

## Architecture

| Path                        | Role                                                            |
| --------------------------- | --------------------------------------------------------------- |
| `src/server.ts`             | Nitro entrypoint — SSR error wrapper                            |
| `src/start.ts`              | TanStack Start instance + error middleware                      |
| `src/router.tsx`            | Router + QueryClient setup                                      |
| `src/routeTree.gen.ts`      | **Auto-generated** — do not edit                                |
| `src/data/fighters.ts`      | Data layer: `loadDataFromSupabase()` + module cache + selectors |
| `src/lib/supabase.ts`       | Client singleton (anon key, safe for browser)                   |
| `src/lib/supabase-admin.ts` | Server-only admin client (service key)                          |
| `src/lib/admin-auth.ts`     | Token validation (HMAC-signed, 24h lifetime)                    |
| `src/routes/admin.*.tsx`    | Admin CRUD routes (token-gated, server functions)               |

### Data Flow

1. **Routes load data**: `loader: async () => { await loadDataFromSupabase(); }`
2. **Module cache fills**: `_fighters`, `_events`, etc. arrays refilled in-place
3. **Components read cache**: `useMemo(() => FIGHTERS.filter(...))` — no re-fetch
4. **After admin mutation**: Call `router.invalidate()` to trigger new load

---

## Key Patterns

### Admin Authentication (Token-Based HMAC)

- Token format: `"{expiry}.{signature}"` (24h lifetime)
- Server validates: `validateToken(data.token)` before any mutation
- Client stores in `localStorage` via `setAdminToken()`
- **Critical**: Client check is UX only; real protection is server-side validation
- After browser restart: User must login again (token lost)

**Example server function:**

```typescript
export const createFighter = createServerFn({ method: "POST" })
  .inputValidator(fighterSchema)
  .handler(async ({ data }) => {
    if (!validateToken(data.token)) throw new Error("Unauthorized");
    const supabase = getAdminSupabase();
    const { error } = await supabase.from("fighters").insert({
      /* ... */
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
```

### Data Fetching (Singleton + Module Cache)

- `getSupabase()` returns client singleton (anon key, safe for browser)
- `getAdminSupabase()` returns admin singleton (service key, server-only)
- All data loaded in parallel via `Promise.all()`
- Relations fetched separately (no joins; explicit queries for join tables)
- Silent fail on error → empty arrays (graceful degradation)

**Selectors available:**

```
getChampion(division)          // Get current champ for division
getFighterByUsername(username) // Single fighter lookup
getNewsForFighter(username)    // Articles tagged to fighter
getVideosForFighter(username)  // Videos tagged to fighter
getRanked(division)            // Fighters ranked 0-N for division
```

### Component Patterns

- **Motion cards**: `motion.div` with `whileHover={{ y: -4 }}` + `AnimatePresence` for dialogs
- **Forms**: Local state + server functions + Zod validation at boundary
- **Filtering**: Client-side `useMemo()` over cached arrays (no server call)
- **Images**: CSS vars only; `cn()` to merge Tailwind classes safely

---

## Conventions

### Division Spelling (Critical)

**Must use exact enum values:**

```
Flyweight, Bantamweight, Featherweight, Lightweight,
Welterweight, Middleweight, Light Heavyweight, Cruiserweight, Heavyweight
```

Enforced by Supabase CHECK constraints. Typos → "violates check constraint" error.

### Code Style

- **Prettier**: `printWidth: 100`, `semi: true`, `singleQuote: false`, `trailingComma: "all"`
- **TypeScript**: `noUnusedLocals: false`, `noUnusedParameters: false` (unused vars allowed)
- **ESLint**: `@typescript-eslint/no-unused-vars: off` (no unused var errors)
- **Typography**: Anton (headings) + Inter (body) loaded in `__root.tsx`
- **Colors**: Semantic tokens only — `text-primary`, `bg-card`, `border-border` (no raw hex)

### Routing (TanStack Start File-Based)

See [src/routes/README.md](src/routes/README.md) for full conventions. Quick reference:

- `index.tsx` → `/`
- `boxers.$username.tsx` → `/boxers/:username`
- `{-$category}.tsx` → optional segment
- `$.tsx` → splat route (`_splat` param, not `*`)
- `__root.tsx` → app shell (preserve `<Outlet />`)

---

## Common Pitfalls

| Issue                                  | Root Cause                                  | Fix                                                  |
| -------------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Empty site on load                     | Missing or wrong Supabase keys              | Check `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| "Division violates check constraint"   | Typo in division name (e.g., "heavyweight") | Use exact case from enum list above                  |
| Admin panel 403 after page refresh     | Token lost from localStorage                | User must login again; tokens are ephemeral          |
| "SUPABASE_SERVICE_KEY is not set"      | Server env missing for admin operations     | Set `SUPABASE_SERVICE_KEY` in `.env.local`           |
| Admin mutation doesn't show on refresh | Cache not invalidated                       | Call `router.invalidate()` + reload                  |
| TypeScript errors on unused vars       | ESLint reporting false positives            | Error is expected; rule is disabled                  |
| Wrong colors in production             | Using raw hex instead of CSS vars           | Replace with semantic token (e.g., `text-primary`)   |

---

## Database Setup

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run [supabase-migration.sql](supabase-migration.sql) in **Supabase Studio → SQL Editor**
3. Add data via **Supabase Studio → Table Editor** (fighters, events, articles, videos, products)

Tables auto-link: `fighters` PK = username, `fight_history` refs username, join tables `article_fighters` & `video_fighters` etc.

---

## Style Conventions

Palette in `src/styles.css` (oklch tokens):

- **Neutral**: `background` (#FFF), `surface` (#F5F5F5), `foreground` (#111)
- **Brand**: `primary` (#D71920 Matchroom Red), `primary-dark` (#A00000)
- **Semantic**: `card`, `border`, `muted`, `destructive` — all oklch
- **No raw hex in components** — use `className` with Tailwind semantic tokens

---

## Project Scope

### In Scope (v1 — Current)

- **Pages**: Home, Champions, Boxers, Boxer Profile, Events, Rankings, News, Videos, Store
- **Data**: Fully populated Supabase tables (fighters, events, articles, videos, products + join tables)
- **Admin Panel**: Create/read/update/delete for all content via Supabase Studio UI
- **Auth**: Simple password-based admin login (token-gated server functions)
- **Motion**: framer-motion for card hovers, hero parallax, dialog reveals
- **Imagery**: Generated via imagegen (Roblox-style arenas, fighter avatars, merchandise)
- **Search/Filter**: Client-side search + filter chips (no server call)
- **Mobile**: Responsive grid + Sheet drawer nav

### Out of Scope (v1)

- Real user authentication or user profiles
- Payment processing or shopping cart
- Live data from Roblox API
- Custom CMS — use Supabase Studio Table Editor
- Video streaming — links to external providers

### Brand

- Clean white + Matchroom red (#D71920)
- Sport-broadcast typography (Anton + Inter)
- Championship-quality visual hierarchy
- Disclaimer: "Fan-made Roblox experience. Not affiliated with Matchroom Sport Ltd."
