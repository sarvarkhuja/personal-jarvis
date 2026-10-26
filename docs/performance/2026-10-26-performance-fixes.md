# Navigation performance fixes — 26 October 2026

Implemented locally after the [initial audit](./2026-10-26-navigation-audit.md). These changes have not been deployed, and no database migration has been applied.

## Changes

| Area | Result |
| --- | --- |
| Authentication | Proxy verifies claims instead of fetching the user record on every server request. The SDK retains network verification for legacy tokens and refreshes expiring sessions. Refreshed cookies and forged identity-header rejection are covered by tests. Domain actions reuse the Proxy-verified identity while retaining authenticated Supabase clients and RLS. |
| Query caching | Page-only read clients cache explicitly owner-filtered database GETs for 60 seconds, or 300 seconds for profile/prayer settings. Cache keys retain Authorization and include verified owner identity; user/table tags support immediate invalidation. Auth, writes, RPCs, Storage, unscoped queries, and foreign origins stay uncached. Server Actions retain their uncached clients. |
| Shared profile | All page profile reads use one projection and request-memoized loader, enabling reuse across routes. Failures surface through a recovery boundary rather than silently switching timezone. |
| Home | The header, Future self, and Daily evidence stream independently. The default tab no longer awaits the entire daily dashboard. Salah settings start before the profile wait, removing the final independent query wave. Identical reads across sections are memoized by Next and use the persistent fetch cache. |
| Other queries | Habits runs independent reads together; Today, Plans, and Pills start independent reads before profile-dependent date calculations. Settings reads its row once. Focus history bounds use a stable UTC-day floor, allowing cache hits without truncating the domain window. |
| Workout | Photo signing is batched into one request and streams independently of lifts/weight content. Photo images use lazy loading, asynchronous decoding, and reserved geometry. |
| Mutation freshness | Domain actions immediately expire only affected user/table tags, including foreign-key cascades. Auth login/logout retains layout invalidation. Next still refreshes affected client navigation state after tag expiry; unchanged server-side datasets remain reusable. |
| Account deletion | After deletion, local session cookies are cleared before navigation to login so an unexpired signed cookie cannot send the deleted account back home. All cached account datasets expire, including partial-success cleanup paths. |
| Loading/UI | A shared loading boundary covers routes that lacked one, with an accessible status and reduced-motion-safe spinner. Shared error recovery follows this installed Next.js version's `unstable_retry` API. Closed goal sheets no longer initialize form controllers; drafts survive reopening. Theme hydration no longer synchronously updates state inside an effect. |

`src/lib/supabase/read-fetch.ts` implements caching using the supported extended fetch API for the project's existing Next.js configuration. Cache Components and experimental client stale times were not enabled. Cross-navigation reuse remains bounded by expiry and mutation invalidation; a new login/token can have a different authenticated fetch-cache key.

## Verification

- Final `npm run build`: passed, including Next's TypeScript validation.
- `npm run lint`: passed with zero errors; existing unused-code/documentation warnings remain.
- `npm run test:unit -- --maxWorkers 2 --exclude src/components/home/FutureSelf.test.tsx`: **292 passed across 32 files**.
- The full suite exposed three failures in the unchanged `FutureSelf.test.tsx`. Running the same suite against baseline commit `e7221e643646674a7b93ee08c6e7844203b3c588` reproduced **four passed / three failed**: missing recovery link, focus-session region, and evidence region. Neither the FutureSelf component nor that test was changed to hide these failures.
- New focused tests cover claims/redirects, forged headers, refreshed cookies, scoped caching and Request-header handling, uncached operations, mutation failures/cascades, partial-success focus completion, deletion/session cleanup, deferred forms/drafts, and theme hydration.
- `tests/e2e/navigation-cache.spec.ts` passed against the final local **production** build in Chromium. It created and cleaned up two temporary Supabase accounts, checked real Link navigation, immediate goal updates after a cached read, revisit freshness, isolation between users, narrow-screen overflow, and logout after account deletion. No existing user rows were modified.
- Mobile screenshot was inspected at 390 × 844; the page stayed within the viewport. Production cache files also confirmed that tagged owner-scoped SELECT entries were being written.
- `git diff --check`: passed.

The production browser sample recorded these click-to-content times with small test fixtures:

| Navigation | Elapsed |
| --- | ---: |
| First Goals visit | 883 ms |
| Settings | 395 ms |
| Goals revisit | 384 ms |

These are local browser/Next-server measurements with remote Supabase and Playwright assertion/click overhead. They are single observations, not percentiles, a deployed benchmark, or a controlled before/after comparison. The original audit's 2.1–2.4 second home query approximation measured a different path and must not be compared as a percentage improvement.

## Database follow-up

Prepared [20261026120000_navigation_performance.sql](../../supabase/migrations/20261026120000_navigation_performance.sql) with three additive indexes matching current reads:

- `goals(user_id, created_at)`
- `progress_photos(user_id, date DESC)`
- `habit_logs(user_id, logged_at)`

The linked project reference matches the application's environment. Live index inventory and query-plan inspection could not run: Supabase CLI reported a missing access token, and no database password was configured. The migration received static review only and is **unapplied**. No RLS policies were changed, no database reset ran, and no blanket migration push ran. Applying indexes requires configured database access and checking the actual deployed inventory first.

Deployment region alignment, production query plans, very large histories, and the three baseline FutureSelf UI failures remain outside the verified performance fix. Read-only cache expiry also bounds visibility of changes made outside the application's mutation actions.
