# Roadmap Playbook + Recall — design

Combined design from two planning sessions (2026-10-27): **Phase 1** (follow + capture + library) and **Phases 2–4** (spaced-repetition recall, Telegram bot, daily nudges). Approved by Aki.

## Context

Aki is following the 28-week Go AI-platform roadmap (`docs/files/senior-ai-systems-engineer-go-platform-roadmap-2026_1.md`, 15 h/week) and has lost track **four times**, from all four causes:

1. **Fell behind, so restarting felt huge.** The calendar-based plan stopped matching reality.
2. **The plan kept changing.** Progress didn't carry over between revisions.
3. **No daily nudge.**
4. **Did the work, then forgot it.**

Phase 1 fixes 1 and 2: no start date, "current week" means the first week with something unresolved, skipping counts as resolved, and a `[ REVISED ]` marker keeps ticks across doc revisions. It also adds fast capture and a library. Phases 2–4 fix 3 and 4. Claude drafts flashcards from Aki's notes, spaced repetition schedules them, and a Telegram bot (inside Jarvis) delivers a daily nudge and handles quick reviews inline.

**Does it need a backend?** Yes, a small one, all inside Jarvis:
- a webhook route that receives Telegram taps;
- a protected nudge route;
- a 15-minute timer.

Jarvis runs on Vercel, and Vercel Hobby cron only fires once a day. So the timer is **Supabase `pg_cron` + `pg_net`** calling the Vercel route. No new server and no Go service.

## Decisions (both sessions)

| Topic | Decision | Source |
| --- | --- | --- |
| Home | Page in Jarvis: `/roadmap` week workspace + `/roadmap/library` | phase-1 session |
| Unit of progress | Week × 5 items (`design/go/ai/ml/evidence`), done/skip, no dates, no guilt UI | phase-1 session |
| Notes | kind + confidence 1–3 + topics (curated vocabulary + own); library by topic/kind/confidence | phase-1 session |
| Topics | Curated starter list, **no AI tagging** | phase-1 session |
| Flashcards | **AI drafts from my notes** (Claude drafts 3–5, user keeps/edits/drops) | this session |
| Where recall happens | **Both**: inline in Telegram + full session in Jarvis | this session |
| Pace | ~15 h/week (≈5 items/week) | this session |
| Bot location | **Inside Jarvis** (TS/Supabase), not a Go service | this session |
| Bot identity | **New dedicated bot from BotFather.** The existing `TELEGRAM_BOT_TOKEN` may belong to the Claude Code Telegram plugin, which polls. A webhook on the same bot would break it. | this session |
| Nudge times | Vary day to day → configurable; defaults 08:00 summary + 21:30 "only if idle" | this session |
| Streaks | None (both sessions) | both |
| Migrations | Re-runnable SQL, **pasted by Aki into the Supabase SQL editor** | phase-1 session |
| Process | Spec doc → `superpowers:writing-plans` → subagent-driven-development, branch `feat/roadmap-playbook`, commit per task, explicit paths | phase-1 session |

**Conflict resolved:** the phase-1 session listed "daily scheduler, reminders, spaced repetition" as v1 non-goals. They stay out of Phase 1 and arrive in Phases 2–4, because this session's answers added them. Its "no AI" applied to topic tagging and still holds. AI is used only to draft cards.

Claude's calls (please check):
- pace counts items, not hours, so capture stays fast;
- re-entry mode starts after 3 quiet days;
- daily caps of 20 reviews and 10 new cards;
- drafting fires automatically only for `learning`/`gotcha`/`decision` notes of ≥120 chars, with a manual "DRAFT CARDS" button on any note;
- Telegram `/note` takes `#topic` hashtags.


## Phase 1: Follow + capture + library (`/roadmap`, `/roadmap/library`)

### Phase 1 calls (check these)
- **No start date.** "Current week" = the first week that still has an item without a status. Skipped counts as resolved, so falling behind is never shown in red.
- **The 5 items per week** are `design` (the weekly DESIGN.md/ADR from the doc's weekly cadence), `go`, `ai`, `ml` and `evidence`, the four columns of the 28-week table.
- **Content is generated from the markdown.** A script parses the 28-week table and the 7-capstone list into a committed TS file. Re-run it when the doc is revised. The app gets no markdown parser at runtime, which matches how `future-self.ts` keeps static content as TS constants.
- **Status is stored sparsely.** No row means todo. Clicking DONE or SKIP again clears it back to todo.
- **Doc revisions don't silently move ticks.** Each tick stores a short hash of the item text. If a later doc revision rewrites that item, the tick stays and a muted `[ REVISED ]` marker appears.
- Each note records the **week it was written from** (automatic) and, optionally, **which of the 5 items** it's about.
- **Confidence can be re-rated in place** on any note card. Kind can be edited too, so a `question` can become a `learning` once answered.
- **Library filters live in the URL** (like `goals/page.tsx` `?status=`), so views can be bookmarked. All notes load in one query and are filtered in memory, which is fine for one user and hundreds of notes. A simple text search `q` is included.
- A note with several topics appears in **each** of its topic groups when grouping by topic.
- Not in v1: Home glance, spaced-repetition reminders, AI tagging, in-app reading of the doc's §1–§27 reference sections, Week 0 / carry-over.


### Goals / non-goals / anti-goals
- **Goals:** open the page, see this week, tick an item, and capture a note in under 30 seconds. Find "all my confidence-1 notes about Kafka" in two clicks.
- **Non-goals:** a daily scheduler, streaks, reminders, multi-user features, editing the curriculum in-app.
- **Anti-goals (fails even if it works):** guilt UI (red "behind" states), slow capture (modal forms, required fields beyond body/kind), topic soup (`k8s` vs `kubernetes`), breaking the page's design language.


### Data model: one migration
`supabase/migrations/20261027120000_roadmap.sql`. Follow the `20261006120000_self_image_items.sql` grants and RLS (text + CHECK with no enums, `revoke all … from anon, authenticated`, grant CRUD to authenticated, 4 policies on `(select auth.uid()) = user_id`). Write it **re-runnable** like `022_salah.sql` (`create table if not exists`, `create index if not exists`, `drop policy if exists` before each `create policy`). **Aki pastes it into the Supabase SQL editor by hand** (decided). There is no local Supabase: no `config.toml`, no CLI, and `.env` points at the hosted project.

```sql
roadmap_item_status (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week smallint not null check (week between 1 and 28),
  track text not null check (track in ('design','go','ai','ml','evidence')),
  status text not null check (status in ('done','skipped')),
  item_hash text not null,   -- short hash of the item text when ticked; drift detection
  updated_at timestamptz not null default now(),
  unique (user_id, week, track)
)

roadmap_notes (
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week smallint not null check (week between 1 and 28),
  track text null check (track in ('design','go','ai','ml','evidence')),
  kind text not null check (kind in ('learning','question','gotcha','decision','resource','story')),
  confidence smallint not null default 2 check (confidence between 1 and 3),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  topics text[] not null default '{}' check (cardinality(topics) <= 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
index (user_id, created_at desc); GIN index on topics
```

### Static content (generated + curated)
- `src/lib/domain/roadmap-parse.ts` (pure): `parseWeekTable(markdown) → RoadmapWeek[]` and `parseCapstones(markdown) → Capstone[]`.
  - It finds the `## 28-week execution plan` heading, skips the `**Weekly cadence:**` paragraph, and parses the first pipe table after it.
  - The week cell is `**M1 · 1**` (U+00B7) or `**2**`, and a month carries forward until the next `M` marker. It detects `**Capstone N:**` in the Evidence cell (weeks 4, 8, …, 28).
  - Capstones are read under the heading that **starts with** `### Seven portfolio capstones` (the full heading has a suffix), as a numbered list of `**title:** description`.
- `scripts/generate-roadmap-data.ts` (`#!/usr/bin/env npx tsx`) writes `src/lib/domain/roadmap-data.ts` with a `// GENERATED — run npm run roadmap:gen` header. **Add `tsx` as a devDependency** (it isn't installed today), and add `"roadmap:gen": "tsx scripts/generate-roadmap-data.ts"`.
- `RoadmapWeek = { week, month, go, ai, ml, evidence, capstone: number | null }`. Cell text keeps inline markdown. The `design` item's text is a constant built from the doc's weekly cadence ("Write this week's DESIGN.md / ADR before building") and is identical every week.
- `itemHash(text)` is a short, stable, non-crypto hash (e.g. FNV-1a → base36), stored on tick. If the current text's hash ≠ the stored hash, the item shows a muted `[ REVISED ]` marker and the tick stays.
- `src/components/roadmap/InlineMd.tsx` + pure `parseInlineMd(text) → segments` render code, bold, *italic* (W24 has `*pipeline*`) and links only. No dependency.
- `src/lib/domain/roadmap-topics.ts` (hand-curated): about 45 `{ slug, label, weeks: number[] }` taken from the table, e.g. `go-concurrency [2,7]`, `postgres [3]`, `redis-caching [3,16]`, `opentelemetry [4,26]`, `idempotency-retries [5,6]`, `kafka-redpanda [6,8]`, `outbox-dedup [6,23]`, `backpressure [7,20]`, `gpu-memory [7]`, `kubernetes [9]`, `helm-gitops [10]`, `opentofu-terraform [11]`, `gcp [11,27]`, `k8s-operators [12,24]`, `embeddings [3,13]`, `hybrid-retrieval [13]`, `rerankers [14]`, `multi-tenancy [15]`, `prompt-injection [15,22]`, `evals [15,16]`, `structured-output [16]`, `vllm-sglang [17,19]`, `kv-cache [18,23]`, `quantization [18]`, `multi-lora [19]`, `failure-drills [20,26]`, `mcp [22]`, `context-engineering [23]`, `qlora [24]`, `system-design [25]`, `pytorch-execution [2,8]`, `tokenizers [5,23]`, `onnx [10,11]`, `profiling [4,8,20]`, `security-rbac [27]`, `model-supply-chain [27]`… (the builder finalizes the list).

### Domain logic (pure, unit-tested): `src/lib/domain/roadmap.ts`
- `TRACKS` (key, label: DESIGN / GO / AI PLATFORM / ML RUNTIME / EVIDENCE), `NOTE_KINDS` (key, label), `monthOfWeek(w) = ceil(w/4)`.
- `currentWeek(statuses)`, `weekTally(statuses, week)`, `overallTally(statuses)`.
- `normalizeTopic(raw)` → lower-kebab, trimmed, max 40 chars. `suggestTopics(week)`. `knownTopics(notes)` = vocabulary ∪ used topics, with counts.
- `parseLibraryParams(searchParams)` → validated `{ topic?, kind?, conf?, q?, group: 'topic'|'kind'|'confidence'|'none', sort: 'weakest'|'newest'|'oldest' }`, defaulting to `group=topic, sort=weakest`.
- `filterNotes`, `sortNotes`, `groupNotes`. Weakest = confidence asc, then oldest first.

### Schemas + actions
- `src/lib/schemas/roadmap.ts` (zod v4, re-exported from `schemas/index.ts`): `ItemStatusSchema`, `CreateRoadmapNoteSchema` (topics are normalized and de-duplicated, max 8), and `UpdateRoadmapNoteSchema` (partial + `id`).
- `src/lib/actions/roadmap.ts` (`'use server'`), following `src/lib/actions/self-images.ts` exactly (`requireUserId`, `safeParse`, `Result = {success}|{error}`, `.eq('user_id', userId)`, `invalidateUserData`):
  - `setItemStatus(week, track, status | null)`: upsert `onConflict: 'user_id,week,track'` with `item_hash` computed **server-side** from `roadmap-data.ts` (never trusted from the client), or delete when null.
  - `createRoadmapNote`, `updateRoadmapNote` (sets `updated_at`), `deleteRoadmapNote`.

### Wiring into existing infra
- Add `'roadmap_item_status', 'roadmap_notes'` to `USER_DATA_TABLES` in `src/lib/data/cache-tags.ts`. This is required for read caching and invalidation. **Every page read must also include `.eq('user_id', userId)`**: `src/lib/supabase/read-fetch.ts` only caches GETs that carry that filter.
- Add both tables to `TABLES` in `src/app/api/export/route.ts`.
- `src/components/layout/AppSidebar.tsx`: add `{ href: '/roadmap', icon: Route, label: 'Roadmap' }` (lucide). Add `g r` to `BINDINGS` in `src/components/keyboard/ShortcutsProvider.tsx` if it isn't taken.

### Page 1: `/roadmap` (week workspace)
`src/app/(app)/roadmap/page.tsx`, an async server component. `searchParams: Promise<{ w?: string }>`. Reads go through `requireUserId` + `createReadClient(userId)` with `Promise.all` of all statuses (≤140 rows) and notes where `week = selected`. The selected week is `?w` (1–28, validated); otherwise `currentWeek`. Container `w-full px-4 py-8 pb-24`, header `ROADMAP` plus a `[ WEEK | LIBRARY ]` segmented link (GoalsFilter recipe).
- **`RoadmapHero`** (client, the one instrument): rail `[ M2 · WEEK 6 OF 28 ]` with a verdict word on the right (`IN PROGRESS` / `WEEK CLEAR` / `ALL CLEAR`). The **only `font-doto`** number is items done, `023` with a mono unit `/140 DONE · 4 SKIPPED`. Below it is a 28-cell week strip. It reuses only HorizonRunway's grid layout, since that strip is decorative and not focusable. Each cell is a real focusable `<Link>`/button with an `aria-label` (`Week 12, 3 of 5 done`), a hit area ≥24px, and a fill showing the done ratio. It links to `?w=N`. On mobile the strip wraps to 2 rows of 14 (`grid-cols-14 md:grid-cols-28`), because 28 columns at phone width would be about 11px each. The selected week is outlined, the first unresolved week gets `bg-accent` (the single expressive colour), and month ticks M1–M7 sit underneath. There's a height-reserved `aria-live` annotation on hover/focus (`W12 · Kubebuilder and Go controllers… · 3/5`) and one Space Grotesk sentence.
- **Masonry** (`columns-1 md:columns-2 2xl:columns-3`, local `Card` recipe with `[ LABEL ]` headers):
  - `[ WEEK 6 · ITEMS ]` → `WeekItems` (client). It has 5 rows, each with a mono track label, `InlineMd` text, and `DONE` / `SKIP` text buttons that toggle. The button styling follows GoalStatusButtons (10px mono, `hover:text-success`/`hover:text-accent`). The `useTransition` + `{success}|{error}` + inline `[ERROR: …]` handling follows `SelfImageList.tsx`. There's a capstone line when `capstone` is set (title + description from `parseCapstones`), and `← W5 · W7 →` links.
  - `[ CAPTURE ]` → `NoteComposer` (client). It has a textarea (SelfImageList `field` recipe, ⌘/Ctrl+Enter saves), kind chips (`aria-pressed`, default `learning`), 3-dot confidence (default 2), an optional "about" chip row (the 5 tracks), and a topic picker. The picker shows this week's suggested topic chips first, then a text input with a `<datalist>` of known topics; Enter adds and normalizes, and a chip × removes. It resets after a save and shows `[ SAVED ]`.
  - `[ NOTES · WEEK 6 · n ]` → a list of `NoteCard` for this week.
- `loading.tsx` repeats the header with `[ LOADING… ]` and dot-grid placeholders.

### Page 2: `/roadmap/library`
`src/app/(app)/roadmap/library/page.tsx`. `searchParams: Promise<{ topic?, kind?, conf?, q?, group?, sort? }>` → `parseLibraryParams`. It loads all notes once and runs the domain filter/sort/group.
- A small header instrument (no Doto, which stays on page 1): `[ LIBRARY · 46 NOTES ]`, a confidence distribution segment bar (1/2/3), and one sentence, e.g. "11 notes you rated 1: start there."
- `LibraryFilters` (client, `<Link>`/`useSearchParams` like `GoalsFilter.tsx`): GROUP `(topic)(kind)(confidence)(none)`, SORT `(weakest)(newest)(oldest)`, KIND chips, CONF `(1)(2)(3)`, topic chips with counts (most used first, toggles `?topic`), and a search input (debounced `router.replace`). Plus a CLEAR link.
- The masonry has one card per group (`[ GO-CONCURRENCY · 12 ]`) containing `NoteCard`s, and an empty state using `WidgetEmpty`-style mono text.

### `NoteCard` (shared)
It shows a kind label, confidence dots (clickable to re-rate via `updateRoadmapNote`, ≥24px hit area), the body (whitespace preserved), topic chips (link → `/roadmap/library?topic=x`), a `W6` link (→ `/roadmap?w=6`) and a date (UTC-safe formatter, never `toLocaleDateString` on an ISO string). EDIT swaps in an inline composer prefilled with the note. DELETE uses an inline "Delete? Yes/No" (SelfImageList recipe).


### Phase 1 additions (from the recall session)
Build Phase 1 tasks 1–6 (below) with these additions:
- **Hero line under the Doto count:** neutral projected finish plus 14-day activity dots, e.g. `≈ 4.6 ITEMS/WK · FINISH ≈ 2027-05` and `● ● ○ ● …`. Never red, never "behind".
  - Pure helpers go in `src/lib/domain/roadmap.ts`:
    - `paceSummary(statuses, today)`: rolling 4-week rate of resolved items, defaulting to 5/week with no history.
    - `activityDots(statuses, notes, reviews, today, tz)`, using `toUserDate` from `src/lib/domain/timezone.ts`.
- Leave masonry slots for `[ REVIEW ]` and `[ DRAFTS ]` cards. They render only after Phase 2.


### Phase 1 task order (each test-first)
1. Parser + generator script + generated `roadmap-data.ts`, with `tsx` added as a devDependency. Tests: 28 weeks, months 1–7, 4 non-empty cells each, capstones at weeks 4/8/12/16/20/24/28, 7 capstone descriptions. A fixture covers the cadence paragraph and the suffixed capstone heading.
2. Topic vocabulary + `roadmap.ts` domain functions + `itemHash` + `parseInlineMd` (code/bold/italic/link). Unit tests go in `src/lib/domain/__tests__/`.
3. Re-runnable migration + zod schemas + server actions + `USER_DATA_TABLES` / export route. Schema tests, plus an action test modelled on `src/lib/actions/__tests__/cache-invalidation.test.ts`.
   **→ Pause here.** I hand Aki the SQL file to paste into the Supabase SQL editor. I confirm the tables exist before continuing; the UI tasks check against real data.
4. `/roadmap` page: hero, WeekItems (with the `[ REVISED ]` marker), NoteComposer, NoteCard, loading. Component tests cover composer topic add/normalize + submit payload, and the WeekItems toggle.
5. `/roadmap/library` page: filters, grouping, re-rate/edit/delete.
6. Sidebar (`Route` icon) + `g r` shortcut. e2e `tests/e2e/roadmap.spec.ts`: tick an item → capture a note with a topic → find it in the library via `?topic=` & `?conf=`. RLS spec modelled on `tests/e2e/rls-goals.spec.ts`. Both run against the hosted project like the existing specs and clean up their test users.

### Phase 1 verification
- `npm run roadmap:gen` regenerates `roadmap-data.ts` with no diff.
- `npm run typecheck && npm run lint && npm run test:unit` all green.
- After Aki pastes the migration, it is re-run once more to prove it is safe to re-run. `npm run test:e2e -- roadmap rls-roadmap` passes against the hosted project. There is no local DB, so `db:reset` is not used.
- Use the `run` skill to start `npm run dev`, open `/roadmap`: tick DONE on a W1 item and watch the hero count and strip update. Skip one, re-click to clear, jump to W12 via the strip and see capstone 3. Capture a note with 2 topics. Open `/roadmap/library`, group by kind, sort weakest, filter `conf=1`, re-rate a note and see it move. Check the mobile width and dark mode.

## Phase 2: Recall (cards + spaced repetition + AI drafting)

**Migration** `supabase/migrations/20261028120000_roadmap_recall.sql`. Same re-runnable / RLS / grants recipe as Phase 1.

| Table | Columns |
| --- | --- |
| `roadmap_cards` | `id`, `user_id`, `note_id` (→ `roadmap_notes`, `on delete set null`), `week` 1–28, `topic` text, `front`/`back` (CHECK length), `status` (`draft\|active\|suspended`), FSRS state (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, `last_review`), timestamps; index `(user_id, status, due)` |
| `roadmap_reviews` | `id`, `user_id`, `card_id` (cascade), `rating` 1–4, `via` (`web\|telegram`), `reviewed_at` |

Add both to `USER_DATA_TABLES` (`src/lib/data/cache-tags.ts`) and to `TABLES` in `src/app/api/export/route.ts`.

**Domain (pure, TDD):**
- `src/lib/domain/roadmap-srs.ts` wraps `ts-fsrs`: `newCardState(now)`, `rate(state, rating, now)`, `retrievability(state, now)`.
- `src/lib/domain/roadmap-review.ts`:
  - `buildReviewQueue(cards, reviewsToday, caps, now)`: due cards, lowest retrievability first, capped at 20 reviews / 10 new. Overflow rolls forward silently.
  - `isReentry(lastActivity, today)`: true after ≥3 quiet days.
  - `warmupTopics(statuses, vocabulary)`: topics of the last resolved week, from the `weeks[]` in `roadmap-topics.ts`. These drive a 10-card warm-up queue.
  - `weakTopics(cards, now)`.

**Cache invalidation outside Server Actions:** `invalidateUserData` (`src/lib/data/invalidate.ts`) calls `updateTag`, which throws anywhere except inside a Server Action. Add `expireUserData(userId, ...tables)` beside it, using `revalidateTag(userDataTag(userId, t), { expire: 0 })` (Next 16 signature, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md`). Use it in every `after()` callback, the webhook and the cron route. Without it, `/roadmap` shows up to 60 s of stale data after a Telegram review.

**AI drafting:** `src/lib/ai/draft-cards.ts` (server-only).
- Uses `@anthropic-ai/sdk` → `zodOutputFormat`, with schema `{cards: [{front, back, topic}]}` (3–5 cards).
- Call it on the **beta** namespace (`client.beta.messages.parse`), because the refusal fallback `fallbacks: "default"` needs beta header `server-side-fallback-2026-07-01`. If the installed SDK has no beta `parse`, use `client.beta.messages.create` with `output_config.format` and validate with zod.
- Model `claude-opus-5-5`, `output_config.effort: "low"`. Write it from the claude-api skill's TypeScript docs; don't guess SDK shapes.
- Prompt input: the week's item text from `roadmap-data.ts`, the note body, kind and topics.
- Prompt rules:
  - only facts from the note and the item;
  - one idea per card;
  - prefer why / when / trade-off / failure-mode questions;
  - answers ≤3 sentences;
  - `topic` ∈ the note's topics, or else the week's suggested topics.
- Triggers:
  - `createRoadmapNote` schedules drafting with `after()` from `next/server`, so capture stays under 30 s;
  - a "DRAFT CARDS" action on `NoteCard`.
- Failure never blocks the note. If the key is missing or the API errors, the note card shows a retry.

**Actions** go in `src/lib/actions/roadmap.ts`, following Phase 1's `self-images.ts` recipe: `keepDraft`, `editCard`, `dropDraft`, `addCard`, `rateCard(cardId, rating)`, `suspendCard`, `draftCardsForNote(noteId)`. Shared mutations that take `(supabase, userId)` live in `src/lib/data/roadmap.ts` so the Telegram webhook can reuse them with the admin client.

**UI** (local `Card` recipe, `[ LABEL ]` headers):
- On `/roadmap`, `[ REVIEW · 14 DUE ]` links to the session, and `[ DRAFTS · 3 ]` offers keep/edit/drop per card. In re-entry mode the hero sentence becomes "Welcome back. 10-card warm-up first."
- `/roadmap/review` runs `ReviewSession` (client): front, then Space reveals the back, then keys 1–4 rate it. The flow is optimistic and ends with `[ DONE FOR TODAY · N ]`.
- `/roadmap/library` shows a per-topic retention figure next to the group headers. `NoteCard` shows its card count.

## Phase 3: Telegram bot (inside Jarvis)

**Migration** `supabase/migrations/20261029120000_roadmap_telegram.sql`:
- `roadmap_settings` (pk `user_id`): `max_reviews_per_day` 20, `max_new_per_day` 10, `morning_nudge` time 08:00, `evening_nudge` time 21:30, `nudges_enabled`, `paused_until`, `telegram_chat_id` bigint unique, `telegram_link_token_hash`, `telegram_link_expires_at`. The Phase 2 caps read from here, with code defaults until the row exists.
- `roadmap_nudges` (pk `user_id, kind, local_date`, `sent_at`): service-role only. Write an explicit `revoke all … from anon, authenticated` and no grants, because Supabase grants new `public` tables to both roles by default.

**`src/lib/telegram/`** uses raw Bot API calls via `fetch`, no library:
- `bot-api.ts`: `sendMessage`, `editMessageText`, `answerCallbackQuery`, `setWebhook`.
- `callback-data.ts`: a codec for payloads of ≤64 bytes:
  - `s:<cardId>` shows the answer; `r:<cardId>:<1-4>` rates the card;
  - `k:`/`d:<cardId>` keeps or drops a draft;
  - `i:<week>:<track>:<d|s>` ticks an item;
  - `rv` starts a review.
  - It is stateless, so there is no session table.
- `handlers.ts` covers:
  - `/start <token>` links the chat.
  - `/today` shows the current week's 5 items with [Done] [Skip] buttons, the due count, and [Review].
  - `/review` runs the review inline: front + [Show answer] → edit to show the back + [Again][Hard][Good][Easy] → `rate()` → next card, until the queue is empty.
  - `/note <text> #topic …` creates a `learning` note for the current week; drafts come back with Keep/Drop.
  - `/pause <days>` silences nudges.
  - Updates from any chat other than the linked one are ignored.
- Linking:
  1. Settings gets a "Roadmap" section with Connect Telegram, nudge times, caps and pause.
  2. Connecting generates a one-time token: 32 random bytes, base64url-encoded, because the Telegram `start` parameter allows at most 64 characters of `A-Za-z0-9_-`. Only its SHA-256 hash is stored, with a 15-minute expiry.
  3. The token goes into the link `https://t.me/<ROADMAP_TELEGRAM_BOT_USERNAME>?start=<token>`.

**Route** `src/app/api/telegram/webhook/route.ts`:
- It must **not** use `requireUserId()`. `src/proxy.ts` excludes `/api`, so `x-user-id` is untrusted there.
- It rejects any request whose `X-Telegram-Bot-Api-Secret-Token` doesn't match `ROADMAP_TELEGRAM_WEBHOOK_SECRET` (timing-safe compare).
- It uses `createAdminClient()` (`src/lib/supabase/admin.ts`). Every query filters `user_id` explicitly, because the service role bypasses RLS.
- It acks fast and runs Claude drafting in `after()` with a set `maxDuration`.

**Script** `scripts/telegram-set-webhook.ts` (tsx is added in Phase 1 task 1) calls `setWebhook` with:
- URL `<prod-url>/api/telegram/webhook`. The production URL is a **required argument**, and the script refuses `http://` and `localhost`. `NEXT_PUBLIC_APP_URL` in `.env` is `http://localhost:3000`, and Telegram only accepts public HTTPS.
- `secret_token`;
- `allowed_updates: ["message","callback_query"]`.

## Phase 4: Daily nudges

- `src/lib/domain/roadmap-nudges.ts` (pure, TDD): `dueNudges(settings, nowLocal, sentToday, activityToday, reentry)`.
  - **Morning** (at or after `morning_nudge`): "W6 · 3/5 left · 14 cards due" + [Review now] [Open Jarvis]. In re-entry mode it switches to the welcome-back variant (warm-up + last note recap).
  - **Evening** (at or after `evening_nudge`): only if nothing was reviewed or ticked and no note was written today. "5 minutes? 10 cards waiting."
  - Paused or disabled means no nudges.
- `src/app/api/cron/learn-nudges/route.ts` (POST):
  - Requires bearer `CRON_SECRET`, compared timing-safe.
  - Loops over linked users and computes local time from `profiles.timezone`.
  - **Before sending**, inserts `roadmap_nudges` with `on conflict do nothing returning`. That makes sending at-most-once per kind per day.
- Timer SQL is pasted by Aki once and committed as `supabase/manual/roadmap-cron.sql` without the secrets. **Order matters:** first deploy the route, then create the Vault secrets, then schedule.
  - `create extension if not exists pg_cron; … pg_net`;
  - `vault.create_secret(...)` for the URL and `CRON_SECRET`, run by hand;
  - `cron.schedule('roadmap-nudges', '*/15 * * * *', $$ select net.http_post(...) $$)`, reading both values from `vault.decrypted_secrets`.
- Optional: a `RoadmapGlance` on the home dashboard.

## Existing issues found (out of scope; not fixed by this plan)

- **`/api/export` always redirects to `/login`.** `src/proxy.ts` skips `/api/*`, so the `x-user-id` header that `requireUserId()` needs is never set there. Adding tables to its `TABLES` list (as Phase 1 does) is harmless, but export won't work until the proxy matcher or the route's auth is fixed.
- **`scripts/create-default-user.ts` hardcodes a password.** Rotate the password and read it from env if the repo is ever made public.

## Dependencies and env

- Phase 2: `npm i ts-fsrs @anthropic-ai/sdk`.
- Env vars go in `.env.example` and Vercel:
  - `ANTHROPIC_API_KEY` (Phase 2);
  - `ROADMAP_TELEGRAM_BOT_TOKEN`, `ROADMAP_TELEGRAM_BOT_USERNAME`, `ROADMAP_TELEGRAM_WEBHOOK_SECRET` (Phase 3). These belong to the new bot; leave the existing `TELEGRAM_BOT_TOKEN` alone.
  - `CRON_SECRET` (Phase 4).

## Process and git

- Work on branch `feat/roadmap-playbook`, one commit per task, staging explicit paths only. Leave the unrelated `docs/files/` deletions and `.claude/settings.local.json` alone. No push or PR unless asked.
- Save the combined design to `docs/superpowers/specs/2026-10-27-roadmap-playbook-design.md`.
- Run `superpowers:writing-plans` → `docs/superpowers/plans/2026-10-27-roadmap-playbook.md`, then `superpowers:subagent-driven-development`. UI tasks load `nothing-design` + `frontend-design`. Read `node_modules/next/dist/docs/` before any route or action code (AGENTS.md).
- **Pause after each migration task** so Aki can paste the SQL. Confirm the tables exist before continuing.
- Each phase ends usable:
  1. Follow + capture.
  2. Recall in Jarvis.
  3. Recall in Telegram.
  4. Nudges.

## Verification

- **Phase 1:** the Phase 1 verification above, plus `paceSummary` and `activityDots` unit tests.
- **Phase 2:**
  - unit tests for `roadmap-srs` (ratings move `due`; Again lowers stability) and `roadmap-review` (caps, ordering, re-entry at 3 days, warm-up topics);
  - `draft-cards` with a mocked SDK (schema, topic restriction, failure keeps the note);
  - a `ReviewSession` component test (Space, 1–4);
  - e2e `rls-roadmap-cards.spec.ts`;
  - manually: write a `learning` note, see drafts, keep 2, review them at `/roadmap/review`, and see `roadmap_reviews` rows.
- **Phase 3:**
  - codec round-trip and ≤64 bytes;
  - webhook route tests (`// @vitest-environment node`, mocks like `src/lib/actions/__tests__/cache-invalidation.test.ts`): 401 on a missing or wrong secret, unknown chat ignored;
  - manually: create the new bot in BotFather, set the three `ROADMAP_TELEGRAM_*` env vars in Vercel, deploy, run `npx tsx scripts/telegram-set-webhook.ts <prod-url>`, confirm the Claude Code Telegram plugin still works, connect from Settings on the phone, then try `/today` (tick an item and check that `/roadmap` reflects it), `/review` (3 cards), and `/note … #kafka-redpanda` (drafts arrive).
- **Phase 4:**
  - `dueNudges` unit tests: before/after the nudge times, evening only when idle, paused, already sent, re-entry;
  - POST the cron route twice with `curl -H "Authorization: Bearer $CRON_SECRET"` and confirm exactly one message;
  - after the timer SQL is pasted, confirm runs in `cron.job_run_details`.
- **Every phase:** `npm run typecheck && npm run lint && npm run test:unit`.
