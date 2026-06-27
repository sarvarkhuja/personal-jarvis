# Personal Jarvis

A personal life-tracking dashboard (expenses, goals, habits, pills, focus, workouts) built on
Next.js + Supabase.

- **Framework:** Next.js (App Router, React Compiler enabled)
- **Auth & DB:** Supabase (Postgres + Row Level Security) via `@supabase/ssr`
- **Tests:** Vitest (unit) + Playwright (e2e)

> **Note on the framework:** this project tracks a Next.js variant whose conventions differ from
> what you may be used to — e.g. the middleware lives in `src/proxy.ts` (exported as a Web Handler),
> not `middleware.ts`. When in doubt, read the guides in `node_modules/next/dist/docs/`.

---

## Prerequisites

- **Node.js** ≥ 20 (developed on v25)
- **npm** (lockfile is `package-lock.json`)
- A **Supabase project** (hosted). Get its URL and keys from
  Project Settings → API: <https://supabase.com/dashboard/project/_/settings/api>
- _(optional)_ the **Supabase CLI** if you want to run/reset migrations locally

---

## Step-by-step: local setup

### 1. Install dependencies

```bash
git clone https://github.com/sarvarkhuja/personal-jarvis.git
cd personal-jarvis
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in the values from your Supabase dashboard
(Project Settings → API):

| Variable                    | Where to get it                        | Notes                                               |
| --------------------------- | -------------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | "Project URL"                          | Safe to expose.                                     |
| `SUPABASE_ANON_KEY`         | "Project API keys" → **anon / public** | Shipped to the browser. **Must** be the `anon` key. |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys" → **service_role**  | Server-only. Used by `src/lib/supabase/admin.ts`.   |
| `NEXT_PUBLIC_APP_URL`       | —                                      | `http://localhost:3000` for local dev.              |

> ### 🔴 Critical: anon key vs service_role key
>
> The two keys look almost identical but their JWT `role` differs (`anon` vs `service_role`).
>
> - `NEXT_PUBLIC_*` variables are **shipped to the browser**.
> - The `service_role` key **bypasses all Row Level Security** (full DB admin).
> - **Never** put the `service_role` key in `SUPABASE_ANON_KEY`, or you publish an
>   admin key to every visitor.
>
> Verify a key's role by decoding the middle JWT segment, e.g.:
>
> ```bash
> echo "<jwt>" | cut -d. -f2 | base64 -d   # look for "role":"anon"
> ```

### 3. Apply database migrations

Migrations live in `supabase/migrations/`. Apply them to your Supabase project (e.g. via the
Supabase CLI linked to your project, or by running the SQL in the dashboard's SQL editor).

```bash
# If using a local Supabase stack:
npm run db:reset        # resets local DB and replays every migration
npm run db:types        # regenerates src/lib/database.types.ts from the schema
```

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>. The proxy (`src/proxy.ts`) redirects unauthenticated requests to
`/login` — create an account via `/signup`, then you'll land on the dashboard.

---

## Step-by-step: production deployment (Vercel)

The app is a standard Next.js deploy. The **only** required setup is the environment variables —
a missing one takes the whole site down, because `src/proxy.ts` runs on nearly every route.

### 1. Set environment variables in your host

In **Vercel → Project → Settings → Environment Variables**, add the same four variables as above
to the **Production** (and **Preview**) environment:

| Variable                    | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | your project URL                                        |
| `SUPABASE_ANON_KEY`         | the **anon** key (role `anon` — never service_role)     |
| `SUPABASE_SERVICE_ROLE_KEY` | the service*role key (no `NEXT_PUBLIC*` prefix)         |
| `NEXT_PUBLIC_APP_URL`       | your production URL, e.g. `https://your-app.vercel.app` |

### 2. Redeploy

> ⚠️ **`NEXT_PUBLIC_*` variables are inlined at _build_ time**, not read at runtime. Setting them
> and re-running an old build will **not** work — you must trigger a **fresh build/deploy** so the
> values get baked into the bundle.

Trigger a new deployment (push a commit, or "Redeploy" in the Vercel dashboard) **after** the
variables are saved.

_Other hosts (Cloudflare/OpenNext, etc.):_ same rule — the four variables must be present in the
build environment, and you must rebuild after changing them.

### 3. Verify

- Load the site — it should redirect to `/login` and render (no 500).
- Log in; confirm dashboard data loads.
- In browser DevTools → network, confirm the Supabase requests use the `anon` key (not service_role).

---

## Useful scripts

| Command             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the dev server                               |
| `npm run build`     | Production build                                   |
| `npm run start`     | Serve the production build                         |
| `npm run lint`      | ESLint                                             |
| `npm run typecheck` | `tsc --noEmit`                                     |
| `npm run test:unit` | Vitest unit tests                                  |
| `npm run test:e2e`  | Playwright e2e tests                               |
| `npm run verify`    | typecheck + lint + unit + e2e (run before merging) |

---

## Troubleshooting

### `Error: Your project's URL and Key are required to create a Supabase client!`

The Supabase client (in `src/proxy.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/action.ts`)
received `undefined` for the URL/key — i.e. `NEXT_PUBLIC_SUPABASE_URL` and/or
`SUPABASE_ANON_KEY` are not set in the running environment.

**Fix:**

1. **Locally** — ensure `.env.local` exists and is filled (step 2 above), then restart `npm run dev`.
2. **In production** — set the variables in your host and **redeploy** (they're build-time inlined;
   see deployment step 2).

### RLS errors / "row level security" denials locally

If local dev was previously using the `service_role` key as the anon key, switching to the real
`anon` key means RLS now applies (as it does in production). Errors that appear are real policy gaps,
not regressions — fix them in `supabase/migrations/`.

---

## Project structure

```
src/
  proxy.ts              # Auth middleware (exported Web Handler) — runs on most routes
  app/
    (auth)/             # /login, /signup
    (app)/              # authenticated dashboard pages (expenses, goals, habits, pills, focus, workout, today)
    api/                # route handlers (e.g. /api/export)
  actions/              # server actions
  lib/supabase/         # server.ts / action.ts / admin.ts client factories
supabase/migrations/    # SQL migrations (source of truth for the schema)
docs/                   # plans & specs
```
