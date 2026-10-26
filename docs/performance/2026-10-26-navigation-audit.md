# Navigation and Supabase performance audit — 26 October 2026

This records the pre-fix state. See the [implemented fixes and verification](./2026-10-26-performance-fixes.md) for the follow-up.

The main confirmed problem is repeated remote work on the navigation critical path: an Auth lookup, uncached page reads, and avoidable sequential query waves. Several routes also lack loading boundaries, so the previous page remains visible while this work finishes. This explains why the architecture can feel slow in both development and production; development compilation and disabled automatic prefetch add further delay locally.

This audit reviewed the current source, installed Next.js 16.2.1 documentation, Supabase SDK 2.100.1, migrations, client components, and a read-only probe of the configured Supabase project. Application code and database state were not changed. Only this report and sanitized probe results were added to the repository.

## Observed request times

The read-only probe ran from the workstation at 22:07 Asia/Tashkent on 26 October. It used the configured service-role client for SELECTs, with explicit user filters. No row contents, user identifiers, or credentials were logged. All 29 database reads succeeded. The sample profile had one active habit and one active goal; the other queried history windows returned no rows.

| Observation | Elapsed time |
| --- | ---: |
| First Supabase Auth health request | 1,762 ms |
| Subsequent Auth health requests | 556 / 464 ms |
| Home profile read, two rounds | 487 / 463 ms |
| Most warm database REST reads | 451–520 ms |
| Home parallel-wave elapsed time | 1,453 / 1,186 ms |
| Final salah-settings read | 451 / 439 ms |
| Approximate complete home database sequence | **2,391 / 2,088 ms** |

These are HTTP response times, including network, connections, gateway, and database work. They are **not SQL execution times or measured browser navigation times**. The home approximation excludes Proxy authentication, RLS, rendering, hydration, and browser networking; event and lift windows were approximately equivalent. Service-role access bypasses RLS. Two rounds are diagnostic samples, not percentiles or a performance budget. Workstation-to-Supabase timing does not establish deployed Next-server-to-Supabase timing.

The slow baseline even for empty results suggests substantial network/service overhead in these samples. It does not establish a particular slow SQL statement or database resource problem.

The linked pooler metadata points to `ap-southeast-2` (Sydney), and its project reference matches the environment URL. The current hosting region was not verified. Check the deployed runtime location before attributing production delay to region distance. See [Supabase regions](https://supabase.com/docs/guides/platform/regions).

The public JWKS endpoint returned one ES256 key. This makes locally verified claims a promising authentication optimization, but does not prove that existing session cookies already contain ES256 tokens.

Full sanitized samples: [2026-10-26-supabase-probe.json](./2026-10-26-supabase-probe.json).

## Confirmed causes

### 1. A remote Auth lookup blocks every authenticated server navigation

`src/proxy.ts:35–37` awaits `supabase.auth.getUser()` before forwarding the request. The installed SDK performs a remote user lookup. The matcher at line 71 also covers matching RSC/prefetch requests. Any navigation served entirely from the client cache avoids this path, but a new server request waits for it before page queries start.

Some Server Actions then authenticate again, for example `src/lib/actions/habits.ts:23–25` and `src/actions/expenses.ts:7–8`. For these requests, Proxy authentication and action authentication add separate waits before mutations and rerendering.

Recommended change: use a consistent verified-identity helper and assess `auth.getClaims()` where validating a signed access token satisfies the authorization policy. With ES256 tokens and cached JWKS, verification can be local. Keep fresh `getUser()` checks where fresh user or revocation information is required. Legacy HS256 tokens, absent signing keys, missing WebCrypto, and token refreshes can still require network calls; first/cold JWKS loads also cost a request. Supabase documents these distinctions in [getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims) and its [SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).

Do not bypass Proxy for prefetch requests as a shortcut: `src/lib/auth/server-user.ts:7–11` requires the verified `x-user-id` header that Proxy supplies.

### 2. The home page waits for three database waves

`src/app/(app)/page.tsx` does:

1. Profile SELECT at line 58.
2. Twelve parallel SELECTs at line 97.
3. Salah configuration SELECT, only started at line 315 through `src/lib/data/salah.ts:26`.

The approximate critical path is:

```text
Auth lookup → profile → slowest of 12 reads → salah settings → render
```

The twelve reads already run concurrently. Their times must not be summed as if they were twelve serial reads. The independent final settings request still adds a complete extra wait. It can start alongside the profile request. Other timezone-independent queries can also start before profile finishes.

Both homepage tab panels use `keepMounted` (`page.tsx:367` and `:384`), and all queries finish before the default Future self tab appears. Several reads, including expenses, medication logs, lifts, body metrics, and salah, support the initially hidden Daily evidence panel. Separating these data requirements would keep that work from blocking the default panel. A Suspense boundary alone does not defer a query that the parent already awaits; fetching must move into the relevant section.

Recommended change: start independent reads together; separate independent sections behind Suspense boundaries; consider a compact authenticated dashboard RPC for appropriate summaries if measured request overhead remains high. A new RPC needs its own authorization, correctness, and query-plan review.

### 3. There is no explicit cross-navigation data-cache policy

`next.config.ts:3–6` enables React Compiler only. Page loaders read `headers()` and the Supabase server client reads `cookies()`. There is no explicit Next data-cache wrapper, cached fetch configuration, SWR cache, or React Query cache in `src`.

The installed Next.js documentation says fetches are uncached by default under this configuration. Dynamic page segments have a default client stale time of zero seconds. Consequently, ordinary forward Link/router-push revisits can request page data again. Shared layouts and browser back/forward reuse have separate behavior. This is expected behavior without an explicit cache policy; it is not evidence that a configured persistent cache is broken. See [Next staleTimes](https://nextjs.org/docs/app/api-reference/config/next-config-js/staleTimes).

Recommended change: introduce a deliberate cache policy for stable per-user profile/settings and selected summaries. Include user identity, relevant date/timezone/window, and other output-changing inputs in cache keys. Preserve authorization and mutation freshness. Read request cookies/headers outside persistent cache scopes; directly wrapping the existing cookie-reading `createClient()` is not a valid drop-in solution. React `cache()` only deduplicates within a render/request and does not solve cross-navigation reuse by itself.

The installed docs prefer Cache Components and `use cache` for the newer Next.js model, but enabling `cacheComponents` is an architectural migration, not a one-line fix. A short dynamic client stale time is another tradeoff to evaluate, but `experimental.staleTimes` is experimental and does not remove first-visit query costs.

### 4. Several routes offer no immediate loading state

Home, Focus, Workout, Expenses, Settings, and Salah lack `loading.tsx`. There is no shared `(app)/loading.tsx`. Today, Habits, Pills, Goals, and Plans have leaf loading boundaries. No application page has nested Suspense for independently loadable sections.

For destinations without a loading boundary, dynamic route prefetching is skipped or limited, and navigation can keep the previous page visible until the server returns. Adding boundaries improves immediate feedback; streaming sections can make useful content available before the slowest query finishes. It does not reduce database execution time. See [Next linking and navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating).

### 5. Mutations invalidate revisit reuse

There are 107 `revalidatePath` call sites. A habit mutation invalidates Habits, Today, and Home (`src/lib/actions/habits.ts:209–211`), and ending focus invalidates four destinations (`src/lib/actions/focus.ts:103–106`).

The installed Next 16.2.1 docs explicitly say that calling `revalidatePath` in Server Functions currently also makes previously visited pages refresh when revisited. This compounds uncached navigation after logging habits, focus, or other data. See [revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).

Recommended change: design user-scoped data caches and mutation invalidation together, evaluating data tags and the client refresh behavior of the chosen API. Removing invalidation alone would leave stale UI. Multiple call sites do not mean 107 requests execute for each action.

### 6. Smaller avoidable request chains exist on other pages

| Route | Database requests after auth | Sequential waves | Main observation |
| --- | ---: | ---: | --- |
| `/` | 14 | 3 | Profile, parallel batch, then settings |
| `/today` | 8 | 2 | Profile before seven reads |
| `/plans` | 5 | 2 | Profile before four reads |
| `/habits` | 4 | 2 | Profile before three reads |
| `/pills` | 3 | 2 | Profile before two reads |
| `/focus` | 4 | 1 | Already parallel |
| `/goals` | 2 | 1 | Already parallel |
| `/expenses` | 1 | 1 | Six months of full expense records |
| `/workout` | 4 plus up to 4 Storage calls | Up to 2 | Photo signing follows database reads |
| `/salah` | 2 | 2 | Settings timezone determines log window |
| `/settings` | 2 | 2 | Same settings row read twice |
| `/body` | 0 | 0 | Placeholder page; Proxy still applies |

Counts exclude Auth/session refresh, and waves count network dependencies rather than summing concurrent requests. Some dependencies are valid: timezone is needed before calculating user-local date windows. Lists independent of timezone can start earlier.

Workout calls `createSignedUrl` separately for each photo at `src/app/(app)/workout/page.tsx:88–100`. Those calls are parallel, but the entire page waits for this second wave. Use one [createSignedUrls](https://supabase.com/docs/reference/javascript/storage-from-createsignedurls) call and render photos independently of lifts. Settings can include `city` in the existing settings loader instead of reading `salah_settings` twice (`src/app/(app)/settings/page.tsx:16–21`).

## Database concerns requiring deployed query-plan evidence

The checked-in migrations have these gaps. They do not establish what indexes exist on the deployed database or which scans are actually slow.

| Access pattern | Repository evidence | Candidate to evaluate |
| --- | --- | --- |
| Goals filtered by user, often ordered/filtered by status | No index beginning with `user_id` in migrations; `002_jarvis_tables.sql:25–39` | `(user_id, created_at)` and, only if warranted, an active-goal index matching its ordering |
| Latest four photos for a user | No matching secondary index; `001_initial_schema.sql:117–125`; workout query line 44 | `(user_id, date DESC)` |
| Today's habit logs filtered by `logged_at` | Today page lines 50–54; existing indexes use `log_date` in `005_habit_logs.sql:18–21` | `(user_id, logged_at)` or calendar-date filtering if semantics permit |
| Lifts filtered by user and week | Existing indexes include `exercise` between those columns; `017_weekly_lifts.sql:13–17` | `(user_id, week_start DESC)` if history volume warrants it |

Most other time-series paths already have sensible user/date indexes. Several older RLS policies use `auth.uid()` directly rather than `(select auth.uid())`, including goals and habit logs. The latter can let Postgres evaluate a stable auth expression once per statement. Measure with the authenticated role before claiming that RLS is a bottleneck. See [Supabase RLS performance](https://supabase.com/docs/guides/database/postgres/row-level-security-performance). The probe bypassed RLS and cannot quantify its cost.

Large histories are a future scaling risk: Home reads six months of expense rows and 70 days of focus sessions before computing summaries; Expenses sends six months of full records to the browser. Aggregate summary data in the database and paginate archives when measured volumes justify it. Do not truncate rows needed for correct totals or streaks. The small sample used here does not establish the main account's dataset size.

## Client-side findings

These are secondary, with current timing impact unmeasured:

- Every goal/subgoal mounts its own `AddGoalSheet` (`src/components/goals/GoalCard.tsx:99`), which initializes `useForm` even while closed (`AddGoalSheet.tsx:53`). One shared, on-demand goal form would scale better.
- Several sheets eagerly import form/schema code. Defer form bodies where their first-load cost is material.
- Workout uses raw image elements without lazy loading or bounded image transforms (`src/components/workout/WeeklyCheckCard.tsx:119`); original-image fallback sizes were not measured.

There is no source evidence of a global polling/refresh loop. Sidebar navigation uses real `next/link`. Shared layouts do not query Supabase. Recharts is installed but unused in source, so blaming its bundle would be unsupported. Timers run conditionally and clear their intervals. React Compiler is enabled; missing manual memoization alone is not a demonstrated bug.

## Recommended implementation order and verification

1. Remove independent query waterfalls, combine the duplicate settings read, and batch photo signing. Compare request counts and time to useful content.
2. Adopt verified claims where its authorization semantics fit, test ES256 and legacy sessions, and preserve refresh cookies and forged-header rejection.
3. Add missing loading boundaries and section streaming. Separate default homepage content from the hidden panel's data dependencies.
4. Add explicit user-scoped caching and mutation invalidation. Verify create/update/delete, logout/account switching, date rollover, and timezone changes.
5. Measure deployed Next-to-Supabase latency and confirm hosting/database regions. Moving the database is a separate migration decision, not a prerequisite to fixing source waterfalls.
6. Inspect deployed indexes and authenticated `EXPLAIN (ANALYZE, BUFFERS)` plans for SELECTs; apply only justified index/RLS changes. Keep any writes/migrations outside this audit.
7. Add route/query duration, row-count, and error-code diagnostics without row contents or tokens. Benchmark production-mode first visits, repeat forward navigation, browser back/forward, and navigation after a mutation separately.

Existing Playwright configuration starts `next dev`, and current navigation tests assert behavior rather than performance. Authenticated E2E helpers create/delete remote users; they were not run for this read-only audit. Existing production artifacts predate current source, so their bundle sizes were not used. The process on port 3000 belongs to a different repository; it was not used as this app's benchmark. No current authenticated browser trace or production deployment trace was collected.
