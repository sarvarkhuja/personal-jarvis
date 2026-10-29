# Roadmap Playbook + Recall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/roadmap` playbook in Jarvis for following the 28-week Go AI-platform roadmap. It has week items, notes and a library. Claude drafts flashcards from your notes, and they are scheduled with spaced repetition. A dedicated Telegram bot handles inline reviews and daily nudges.

**Architecture:** Everything lives in the existing Next.js 16 + Supabase app and follows its layer split:
- `src/lib/domain` holds pure logic, unit-tested.
- `src/lib/schemas` holds zod schemas.
- `src/lib/data` holds loaders and shared mutations that take `(supabase, userId)`.
- `src/lib/actions` holds Server Actions.
- `src/components/roadmap` holds the UI.

Telegram and the timer come in through two `/api` routes. Those routes authenticate with their own secrets and use the service-role client. Supabase `pg_cron` + `pg_net` calls the nudge route every 15 minutes.

**Tech Stack:** Next.js 16.2 (App Router, `after`, `revalidateTag`), React 19, Supabase (Postgres, RLS, pg_cron, pg_net, Vault), zod 4, Vitest + Testing Library, Playwright. New dependencies: `tsx` (dev), `ts-fsrs`, `@anthropic-ai/sdk`.

**Spec:** `docs/superpowers/specs/2026-10-27-roadmap-playbook-design.md`

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing any route handler, server action or page (AGENTS.md: this Next.js has breaking changes).
- `src/proxy.ts` excludes `/api`. **Never call `requireUserId()` in `/api` routes.** They authenticate with their own secret and use `createAdminClient()`, and every query filters `user_id` explicitly.
- Server Actions follow `src/lib/actions/self-images.ts` exactly:
  - `'use server'`, `requireUserId()`, `Schema.safeParse`;
  - return `type Result = { success: true } | { error: string }`;
  - include `.eq('user_id', userId)` on every write;
  - call `invalidateUserData(userId, …tables)` on success;
  - log with `console.error('[fnName]', error)` and return human copy.
- Page reads use `createReadClient(userId)`, and every select includes `.eq('user_id', userId)` (`read-fetch.ts` only caches reads that carry it).
- Outside Server Actions (route handlers and `after()` callbacks), invalidate with `expireUserData` (Task 11), never `invalidateUserData`.
- Every new user table goes in `USER_DATA_TABLES` (`src/lib/data/cache-tags.ts`) and in `TABLES` (`src/app/api/export/route.ts`). `roadmap_nudges` is the exception: it is service-role only and goes in neither.
- Migrations:
  - re-runnable: `create table if not exists`, `create index if not exists`, `drop policy if exists` before each `create policy`;
  - RLS/grants exactly as in `supabase/migrations/20261006120000_self_image_items.sql`;
  - text + CHECK, no enums.
  - **Aki pastes each into the Supabase SQL editor.** The executor stops after every migration task until Aki confirms.
- Dates: "today" is always local, from `toUserDate(new Date(), profiles.timezone)` (`src/lib/domain/timezone.ts`). Never derive a date from the client clock.
- Design (Nothing):
  - `[ LABEL ]` mono uppercase card titles via `WidgetCard` (`src/components/today/WidgetCard.tsx`);
  - masonry `columns-1 md:columns-2 2xl:columns-3`;
  - `font-doto` only for the hero count;
  - `bg-accent` red only on the current-week marker;
  - no red "behind" state, no streaks;
  - hit areas ≥ 24 px;
  - errors render inline as `[ERROR: …]`.
- Claude: model `claude-opus-5-5`, `output_config.effort: "low"`, beta header `server-side-fallback-2026-07-01` with `fallbacks: "default"`. Write it from the claude-api skill's TypeScript docs.
- Telegram:
  - plain-text messages (no `parse_mode`);
  - `callback_data` ≤ 64 bytes;
  - the bot is the **new** one: `ROADMAP_TELEGRAM_BOT_TOKEN`, `ROADMAP_TELEGRAM_BOT_USERNAME`, `ROADMAP_TELEGRAM_WEBHOOK_SECRET`;
  - links in messages use `ROADMAP_APP_URL` (the production https origin), never `NEXT_PUBLIC_APP_URL` (localhost in `.env`);
  - never touch the existing `TELEGRAM_BOT_TOKEN`.
- Fixed values:
  - 28 weeks × 5 tracks = 140 items;
  - tracks `design | go | ai | ml | evidence`;
  - note kinds `learning | question | gotcha | decision | resource | story`;
  - confidence 1–3, default 2;
  - ≤ 8 topics per note;
  - note body ≤ 4000 characters;
  - review caps 20 reviews and 10 new cards a day;
  - nudges at 08:00 and 21:30;
  - re-entry after ≥ 3 quiet days;
  - warm-up of 10 cards;
  - auto-draft only for `learning | gotcha | decision` notes of ≥ 120 trimmed characters;
  - 3–5 cards per draft.
- Git: branch `feat/roadmap-playbook` (exists), one commit per task, `git add` with explicit paths only. Never stage `.claude/settings.local.json` or the `docs/files/` deletions. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run unit tests with `npx vitest run <path>`. The full gate is `npm run typecheck && npm run lint && npm run test:unit`.

## Review Focus

1. **Double-tapping a rating button in Telegram.** A second tap on an already-rated card must not log a second review. Callback data carries the card's `reps`, and a mismatch is a no-op (Task 15 codec, Task 17 handler test).
2. **The timer fires late.** If it was down and fires after 21:30, send only the evening check, never morning and evening together (Task 19 test).
3. **Local midnight vs UTC.** At 23:30 UTC it is already the next day in Asia/Tashkent. "Today" for activity, caps and nudge dedup must be the local date (Task 20 test).
4. **Card text with Markdown characters** (`_`, `*`, `[`, backticks, as in Go/K8s snippets). It must reach Telegram unchanged and not break sending (Task 15 test: no `parse_mode` in the request body).
5. **An oversized or empty `/note` from Telegram.** Over 4000 characters, or no text after `/note`, the bot replies with a short error instead of failing silently (Task 17 test).

---

# Phase 1: Follow + capture + library

### Task 1: Roadmap content: parser, generator, inline markdown

**Files:**
- Create: `src/lib/domain/roadmap-parse.ts`, `src/lib/domain/inline-md.ts`, `scripts/generate-roadmap-data.ts`, `src/lib/domain/roadmap-data.ts` (generated)
- Modify: `package.json` (devDependency `tsx`; script `"roadmap:gen": "tsx scripts/generate-roadmap-data.ts"`)
- Test: `src/lib/domain/__tests__/roadmap-parse.test.ts`, `src/lib/domain/__tests__/inline-md.test.ts`

**Interfaces:**
- Produces:
  - `type RoadmapWeek = { week: number; month: number; go: string; ai: string; ml: string; evidence: string; capstone: number | null }`
  - `type Capstone = { n: number; title: string; description: string }`
  - `parseWeekTable(md: string): RoadmapWeek[]`
  - `parseCapstones(md: string): Capstone[]`
  - `roadmap-data.ts` exports `ROADMAP_WEEKS: RoadmapWeek[]` and `CAPSTONES: Capstone[]`
  - `type InlineSegment = { kind: 'text' | 'code' | 'bold' | 'italic' | 'link'; text: string; href?: string }`
  - `parseInlineMd(text: string): InlineSegment[]`

- [ ] **Step 1: Write failing parser tests.** They read the real doc with `fs.readFileSync('docs/files/senior-ai-systems-engineer-go-platform-roadmap-2026_1.md', 'utf8')` and also use a small inline fixture.

```ts
it('parses 28 weeks with months 1–7 carried forward', () => {
  const weeks = parseWeekTable(doc);
  expect(weeks).toHaveLength(28);
  expect(weeks.map((w) => w.week)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  expect(weeks[1].month).toBe(1);   // "**2**" inherits M1
  expect(weeks[8].month).toBe(3);   // "**M3 · 9**"
  expect(weeks.every((w) => w.go && w.ai && w.ml && w.evidence)).toBe(true);
});
it('marks capstones on weeks 4,8,…,28', () => {
  expect(parseWeekTable(doc).filter((w) => w.capstone).map((w) => [w.week, w.capstone]))
    .toEqual([[4,1],[8,2],[12,3],[16,4],[20,5],[24,6],[28,7]]);
});
it('reads 7 capstones under the suffixed heading', () => {
  const caps = parseCapstones(doc);
  expect(caps).toHaveLength(7);
  expect(caps[0]).toMatchObject({ n: 1, title: 'Go AI API gateway' });
  expect(caps[0].description).toMatch(/^request admission/);
});
it('skips the cadence paragraph and keeps inline markdown in cells', () => {
  expect(parseWeekTable(FIXTURE)[0].go).toContain('`context`');
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/domain/__tests__/roadmap-parse.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `parseWeekTable` and `parseCapstones` in `src/lib/domain/roadmap-parse.ts` (pure, no fs).**
  - `parseWeekTable`: find `## 28-week execution plan`, take the first pipe table after it, and skip the header and `---` rows.
  - Week cell matches `/\*\*(?:M(\d) · )?(\d+)\*\*/` (U+00B7). The month carries forward.
  - `capstone` comes from `/\*\*Capstone (\d):\*\*/` in the evidence cell.
  - Split rows on `|` outside backticks.
  - `parseCapstones`: find the heading that starts with `### Seven portfolio capstones` and read the numbered list `N. **title:** description`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Write failing `inline-md` tests.**
  - `` 'a `b` **c** *d* [e](https://x.y)' `` gives `text,code,text,bold,text,italic,text,link` with `href: 'https://x.y'`.
  - Unbalanced `**x` stays text.
  - W24's `*pipeline*` gives italic.
- [ ] **Step 6: Implement `parseInlineMd` in `src/lib/domain/inline-md.ts`** as a single left-to-right scanner with no dependency. Run `npx vitest run src/lib/domain/__tests__/inline-md.test.ts`. Expected: PASS.
- [ ] **Step 7: Generator.**
  - `npm i -D tsx`.
  - Write `scripts/generate-roadmap-data.ts` (`#!/usr/bin/env npx tsx`, same header style as `scripts/create-default-user.ts`). It reads the doc, calls both parsers, and writes `src/lib/domain/roadmap-data.ts` with the header `// GENERATED — run npm run roadmap:gen` and `JSON.stringify(…, null, 2)` literals typed against `RoadmapWeek`/`Capstone`.
  - Add the `roadmap:gen` script and run `npm run roadmap:gen`.
  - Expected: the file exists. Running it twice gives `git diff --exit-code src/lib/domain/roadmap-data.ts` clean.
- [ ] **Step 8: Commit.** `git add package.json package-lock.json scripts/generate-roadmap-data.ts src/lib/domain/roadmap-parse.ts src/lib/domain/inline-md.ts src/lib/domain/roadmap-data.ts src/lib/domain/__tests__/roadmap-parse.test.ts src/lib/domain/__tests__/inline-md.test.ts` then `git commit -m "feat(roadmap): parse 28-week table and capstones into generated data"`

### Task 2: Progress domain: items, hashes, current week, pace, activity, topics

**Files:**
- Create: `src/lib/domain/roadmap.ts`, `src/lib/domain/roadmap-topics.ts`
- Test: `src/lib/domain/__tests__/roadmap.test.ts`

**Interfaces:**
- Consumes: `ROADMAP_WEEKS`, `RoadmapWeek` (Task 1); `toUserDate` from `src/lib/domain/timezone.ts`; `addDaysISO` from `src/lib/domain/habit-consistency.ts`.
- Produces (all in `roadmap.ts` unless noted):
  - `TRACKS: readonly { key: Track; label: string }[]`, with labels DESIGN / GO / AI PLATFORM / ML RUNTIME / EVIDENCE
  - `type Track = 'design'|'go'|'ai'|'ml'|'evidence'`
  - `NOTE_KINDS: readonly { key: NoteKind; label: string }[]`
  - `type NoteKind = 'learning'|'question'|'gotcha'|'decision'|'resource'|'story'`
  - `DESIGN_ITEM_TEXT = "Write this week's DESIGN.md / ADR before building"`
  - `monthOfWeek(week: number): number`, computed as `ceil(w/4)`
  - `itemText(week: number, track: Track): string`
  - `itemHash(text: string): string`: FNV-1a 32-bit, base36
  - `type ItemStatus = { week: number; track: Track; status: 'done'|'skipped'; item_hash: string; updated_at: string }`
  - `isRevised(s: ItemStatus): boolean`
  - `currentWeek(statuses: ItemStatus[]): number | null`: null means all 140 are resolved
  - `weekTally(statuses, week): { done: number; skipped: number; open: number }`
  - `overallTally(statuses): { done: number; skipped: number; total: 140 }`
  - `paceSummary(statuses: ItemStatus[], today: string, tz: string): { perWeek: number; remaining: number; finishMonth: string }`
  - `activityDots(timestamps: string[], today: string, tz: string): boolean[]`: 14 entries, oldest first
  - `normalizeTopic(raw: string): string`
  - `suggestTopics(week: number): string[]`
  - `knownTopics(notes: { topics: string[] }[]): { slug: string; count: number }[]`
  - In `roadmap-topics.ts`: `ROADMAP_TOPICS: readonly { slug: string; label: string; weeks: number[] }[]`. It holds about 45 entries, starting from the list in the spec's "Static content" section. Every week 1–28 must appear in at least one topic's `weeks`.

- [ ] **Step 1: Write failing tests.**

```ts
const st = (week: number, track: Track, status: 'done'|'skipped' = 'done', updated_at = '2026-10-20T10:00:00Z'): ItemStatus =>
  ({ week, track, status, updated_at, item_hash: itemHash(itemText(week, track)) });
it('current week = first week with an unresolved item; skipped counts as resolved', () => {
  const w1 = TRACKS.map((t) => st(1, t.key, t.key === 'ml' ? 'skipped' : 'done'));
  expect(currentWeek([])).toBe(1);
  expect(currentWeek(w1)).toBe(2);
});
it('returns null when all 140 are resolved', () => { /* 28×5 statuses */ expect(currentWeek(all)).toBeNull(); });
it('flags revised items when stored hash differs', () => {
  expect(isRevised({ ...st(3, 'go'), item_hash: 'old' })).toBe(true);
  expect(isRevised(st(3, 'go'))).toBe(false);
});
it('design item text is identical every week', () => { expect(itemText(7, 'design')).toBe(DESIGN_ITEM_TEXT); });
it('pace defaults to 5/week with no history and projects finish from today', () => {
  expect(paceSummary([], '2026-10-28', 'Asia/Tashkent')).toEqual({ perWeek: 5, remaining: 140, finishMonth: '2027-05' });
});
it('pace uses resolved items in the last 28 local days', () => {
  const s = Array.from({ length: 8 }, (_, i) => st(1 + Math.floor(i / 5), TRACKS[i % 5].key, 'done', '2026-10-15T10:00:00Z'));
  expect(paceSummary(s, '2026-10-28', 'Asia/Tashkent').perWeek).toBe(2);
});
it('activity dots mark local days with any timestamp, oldest first', () => {
  const dots = activityDots(['2026-10-27T20:30:00Z' /* = 10-28 local */], '2026-10-28', 'Asia/Tashkent');
  expect(dots).toHaveLength(14); expect(dots[13]).toBe(true); expect(dots[12]).toBe(false);
});
it('normalizes topics to lower-kebab ≤40 chars', () => {
  expect(normalizeTopic('  Go Concurrency ')).toBe('go-concurrency');
  expect(normalizeTopic('K8s/Operators!!')).toBe('k8s-operators');
  expect(normalizeTopic('x'.repeat(60))).toHaveLength(40);
});
it('suggests vocabulary topics for a week and counts known topics', () => {
  expect(suggestTopics(6)).toContain('kafka-redpanda');
  expect(knownTopics([{ topics: ['kafka-redpanda', 'my-own'] }])[0]).toEqual({ slug: 'kafka-redpanda', count: 1 });
});
it('every week has at least one vocabulary topic', () => {
  for (let w = 1; w <= 28; w++) expect(suggestTopics(w).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/domain/__tests__/roadmap.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `roadmap-topics.ts` (vocabulary) and `roadmap.ts`.
  - `paceSummary`: `perWeek` = resolved statuses whose local `updated_at` date falls within the 28 days ending today, divided by 4, rounded to 1 decimal. Use 5 when that is 0.
  - `remaining` = 140 − all resolved.
  - `finishMonth` = `today + ceil(remaining / perWeek × 7)` days, as `yyyy-MM`.
  - `knownTopics`: sort by count desc, then slug asc. Vocabulary slugs that no note uses get count 0.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/domain/roadmap.ts src/lib/domain/roadmap-topics.ts src/lib/domain/__tests__/roadmap.test.ts` then `git commit -m "feat(roadmap): progress domain, pace and topic vocabulary"`

### Task 3: Library domain: params, filter, sort, group

**Files:**
- Create: `src/lib/domain/roadmap-library.ts`
- Test: `src/lib/domain/__tests__/roadmap-library.test.ts`

**Interfaces:**
- Consumes: `NoteKind`, `Track`, `NOTE_KINDS` (Task 2).
- Produces:
  - `type RoadmapNote = { id: string; week: number; track: Track | null; kind: NoteKind; confidence: 1|2|3; body: string; topics: string[]; created_at: string; updated_at: string }`
  - `type LibraryParams = { topic?: string; kind?: NoteKind; conf?: 1|2|3; q?: string; group: 'topic'|'kind'|'confidence'|'none'; sort: 'weakest'|'newest'|'oldest' }`
  - `parseLibraryParams(sp: Record<string, string | string[] | undefined>): LibraryParams`
  - `filterNotes(notes: RoadmapNote[], p: LibraryParams): RoadmapNote[]`
  - `sortNotes(notes: RoadmapNote[], sort: LibraryParams['sort']): RoadmapNote[]`
  - `groupNotes(notes: RoadmapNote[], group: LibraryParams['group']): { key: string; label: string; notes: RoadmapNote[] }[]`

- [ ] **Step 1: Write failing tests.**
  - `parseLibraryParams({})` returns `{ group: 'topic', sort: 'weakest' }`.
  - Invalid `kind=zzz` and `conf=9` are dropped.
  - `q` is trimmed, and an empty `q` is dropped.
  - `filterNotes` with `q: 'redis'` matches the body and topics, case-insensitively.
  - `sortNotes(…, 'weakest')` orders by confidence asc, then oldest `created_at` first.
  - `groupNotes(…, 'topic')` puts a note with 2 topics in both groups. Notes without topics go in a `key: '—'` group labelled `NO TOPIC`. Groups are ordered by size desc.
  - `groupNotes(…, 'none')` returns one group with `key: 'all'`.
- [ ] **Step 2: Run** `npx vitest run src/lib/domain/__tests__/roadmap-library.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the four functions in `roadmap-library.ts`. Labels are uppercased slugs or kind labels; confidence groups are `CONFIDENCE 1/2/3`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/domain/roadmap-library.ts src/lib/domain/__tests__/roadmap-library.test.ts` then `git commit -m "feat(roadmap): library params, filtering, sorting and grouping"`

### Task 4: Migration 1, schemas, data layer, actions

**Files:**
- Create: `supabase/migrations/20261027120000_roadmap.sql`, `src/lib/schemas/roadmap.ts`, `src/lib/data/roadmap.ts`, `src/lib/actions/roadmap.ts`
- Modify: `src/lib/schemas/index.ts` (re-export), `src/lib/data/cache-tags.ts` (`'roadmap_item_status', 'roadmap_notes'`), `src/app/api/export/route.ts` (`TABLES`)
- Test: `tests/unit/schemas/roadmap.test.ts`, `src/lib/actions/__tests__/roadmap.test.ts`

**Interfaces:**
- Consumes: `Track`, `NoteKind`, `itemText`, `itemHash`, `normalizeTopic` (Task 2); `RoadmapNote` (Task 3).
- Produces:
  - `ItemStatusInputSchema`: `{ week: 1..28 int, track, status: 'done'|'skipped'|null }`
  - `CreateRoadmapNoteSchema`: `{ week, track?: Track|null, kind, confidence: 1|2|3 default 2, body trim 1..4000, topics: string[] }`. Topics are transformed with `normalizeTopic`, then empties dropped, de-duplicated and capped at 8. Type `CreateRoadmapNoteInput`.
  - `UpdateRoadmapNoteSchema = CreateRoadmapNoteSchema.partial().extend({ id: z.uuid() })`
  - Data, in `src/lib/data/roadmap.ts`. The anon or admin client are both accepted, and every query filters `user_id`.
    - `loadStatuses(sb, userId): Promise<ItemStatus[]>`
    - `loadNotes(sb, userId, opts?: { week?: number }): Promise<RoadmapNote[]>`, newest first
    - `writeItemStatus(sb, userId, week, track, status): Promise<{ error?: string }>`: upsert with `onConflict: 'user_id,week,track'` and a server-computed `item_hash`, or delete when null
    - `insertNote(sb, userId, input: CreateRoadmapNoteInput): Promise<{ id: string } | { error: string }>`
  - Actions:
    - `setItemStatus(week, track, status): Promise<Result>`
    - `createRoadmapNote(input): Promise<{ success: true; id: string } | { error: string }>`
    - `updateRoadmapNote(input): Promise<Result>`, which sets `updated_at = now()`
    - `deleteRoadmapNote(id): Promise<Result>`

- [ ] **Step 1: Write the migration.** Both tables are exactly as in the spec's "Data model" section (`roadmap_item_status` unique `(user_id, week, track)`; `roadmap_notes` with checks, `(user_id, created_at desc)` index, GIN on `topics`). Make it re-runnable and add the RLS block for each table.
- [ ] **Step 2: Write failing schema tests.**
  - Topics `[' Go Concurrency', 'go-concurrency', '', 'Redis']` become `['go-concurrency','redis']`.
  - 9 topics are capped at 8.
  - A body of only whitespace is rejected.
  - `confidence` defaults to 2.
  - `week: 29` is rejected.
  - `status: null` is accepted.
- [ ] **Step 3: Write failing action tests.** Use the `vi.hoisted` + `vi.mock` + chainable `query()` pattern copied from `src/lib/actions/__tests__/cache-invalidation.test.ts`.
  - `setItemStatus(3,'go','done')` upserts `item_hash === itemHash(itemText(3,'go'))`, even when the client sends nothing. It then calls `invalidateUserData(userId,'roadmap_item_status')`.
  - `setItemStatus(3,'go',null)` deletes, with `.eq('user_id', userId)`.
  - `createRoadmapNote` with an invalid body returns `{ error }` and never touches the DB.
  - On success it returns `{ success: true, id }`.
- [ ] **Step 4: Run** `npx vitest run tests/unit/schemas/roadmap.test.ts src/lib/actions/__tests__/roadmap.test.ts`. Expected: FAIL.
- [ ] **Step 5: Implement** the schemas, data functions and actions. The actions call the data functions with `createClient()` from `@/lib/supabase/action`. Add the cache tags and export entries.
- [ ] **Step 6: Run** the same command plus `npx vitest run src/lib/actions/__tests__/cache-invalidation.test.ts`. Expected: PASS.
- [ ] **Step 7: Commit.** `git add supabase/migrations/20261027120000_roadmap.sql src/lib/schemas/roadmap.ts src/lib/schemas/index.ts src/lib/data/roadmap.ts src/lib/actions/roadmap.ts src/lib/data/cache-tags.ts src/app/api/export/route.ts tests/unit/schemas/roadmap.test.ts src/lib/actions/__tests__/roadmap.test.ts` then `git commit -m "feat(roadmap): schema, data layer and actions for items and notes"`
- [ ] **Step 8: ⏸ PAUSE.** Give Aki the path `supabase/migrations/20261027120000_roadmap.sql` to paste into the Supabase SQL editor. After Aki confirms, verify with the admin client (`select count(*)` on both tables returns without error). Paste it a second time to prove it is re-runnable. Do not continue until both succeed.

### Task 5: `/roadmap` page: hero, week items, navigation

**Files:**
- Create: `src/app/(app)/roadmap/page.tsx`, `src/app/(app)/roadmap/loading.tsx`, `src/components/roadmap/RoadmapHero.tsx`, `src/components/roadmap/WeekItems.tsx`, `src/components/roadmap/InlineMd.tsx`, `src/components/roadmap/RoadmapTabs.tsx`
- Test: `src/components/roadmap/__tests__/WeekItems.test.tsx`

**Interfaces:**
- Consumes: Tasks 1–4. `loadProfile(userId)` (`src/lib/data/profile.ts`) for `timezone`.
- Produces:
  - `RoadmapHero` props: `{ statuses: ItemStatus[]; selectedWeek: number; current: number | null; pace: ReturnType<typeof paceSummary>; dots: boolean[]; sentence: string }`
  - `WeekItems` props: `{ week: RoadmapWeek; statuses: ItemStatus[]; capstone: Capstone | null }`
  - `RoadmapTabs` props: `{ active: 'week' | 'library' | 'review' }` (`review` is used in Task 13)

- [ ] **Step 1: Write a failing component test.** Mock `@/lib/actions/roadmap` as in `src/components/goals/__tests__/AddGoalSheet.test.tsx`.
  - Five rows render with the labels DESIGN, GO, AI PLATFORM, ML RUNTIME and EVIDENCE.
  - Clicking `DONE` on GO calls `setItemStatus(6,'go','done')`. Clicking it again when it's already done calls `setItemStatus(6,'go',null)`.
  - An item whose stored hash differs shows the text `[ REVISED ]`.
  - A `{ error }` result renders `[ERROR: …]`.
- [ ] **Step 2: Run** `npx vitest run src/components/roadmap/__tests__/WeekItems.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the components and page.
  - `page.tsx` is async and takes `searchParams: Promise<{ w?: string }>`. Valid `w` is 1–28; otherwise use `currentWeek(...) ?? 28`.
  - It uses `requireUserId` and `createReadClient`, then `Promise.all([loadStatuses, loadNotes(week)])`.
  - The hero follows the spec's "Page 1: `/roadmap`" section (rail, Doto count, 28-cell week strip linking `?w=N`, `aria-live` annotation), plus the pace line `≈ {perWeek} ITEMS/WK · FINISH ≈ {finishMonth}` and 14 activity dots. The dots' timestamps are status `updated_at` + note `created_at`; Task 13 adds review times.
  - The masonry is `[ WEEK n · ITEMS ]` (WeekItems + capstone line + `← Wn-1 · Wn+1 →` links). `NoteComposer` and `NoteCard` slots render placeholders until Task 6.
  - `loading.tsx` shows the header and `[ LOADING… ]`.
- [ ] **Step 4: Run** the test. Expected: PASS. Then run `npm run typecheck`. Expected: no errors.
- [ ] **Step 5: Commit.** `git add 'src/app/(app)/roadmap' src/components/roadmap` then `git commit -m "feat(roadmap): week workspace page with hero and items"`

### Task 6: Capture: NoteComposer and NoteCard

**Files:**
- Create: `src/components/roadmap/NoteComposer.tsx`, `src/components/roadmap/NoteCard.tsx`
- Modify: `src/app/(app)/roadmap/page.tsx` (replace the placeholders with `[ CAPTURE ]` and `[ NOTES · WEEK n · count ]`)
- Test: `src/components/roadmap/__tests__/NoteComposer.test.tsx`, `src/components/roadmap/__tests__/NoteCard.test.tsx`

**Interfaces:**
- Consumes: `createRoadmapNote`, `updateRoadmapNote`, `deleteRoadmapNote` (Task 4); `suggestTopics`, `knownTopics`, `normalizeTopic` (Task 2).
- Produces:
  - `NoteComposer` props: `{ week: number; known: { slug: string; count: number }[]; initial?: RoadmapNote; onDone?: () => void }`
  - `NoteCard` props: `{ note: RoadmapNote; footer?: React.ReactNode }`. The `footer` slot is used by Task 14.

- [ ] **Step 1: Write failing tests.**
  - Typing `Go Concurrency` + Enter in the topic input adds the chip `go-concurrency`, and × removes it.
  - ⌘+Enter submits `{ week: 6, kind: 'learning', confidence: 2, body, topics, track: null }`.
  - After success the form resets and shows `[ SAVED ]`.
  - Clicking confidence dot 3 on `NoteCard` calls `updateRoadmapNote({ id, confidence: 3 })`.
  - DELETE then Yes calls `deleteRoadmapNote(id)`.
- [ ] **Step 2: Run** `npx vitest run src/components/roadmap/__tests__/NoteComposer.test.tsx src/components/roadmap/__tests__/NoteCard.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both components as the spec describes them ("Page 1" `[ CAPTURE ]` and "`NoteCard` (shared)").
  - Textarea `field` recipe and `run()` wrapper from `src/components/home/SelfImageList.tsx`.
  - Kind chips use `aria-pressed`.
  - The topic `<datalist>` is fed from `known`.
  - Dates go through `formatUTCDate` (`src/lib/utils/workout-metrics.ts`).
  - EDIT renders `NoteComposer` with `initial`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/components/roadmap/NoteComposer.tsx src/components/roadmap/NoteCard.tsx src/components/roadmap/__tests__ 'src/app/(app)/roadmap/page.tsx'` then `git commit -m "feat(roadmap): fast note capture and note cards"`

### Task 7: `/roadmap/library`

**Files:**
- Create: `src/app/(app)/roadmap/library/page.tsx`, `src/components/roadmap/LibraryFilters.tsx`
- Test: `src/components/roadmap/__tests__/LibraryFilters.test.tsx`

**Interfaces:**
- Consumes: `parseLibraryParams`, `filterNotes`, `sortNotes`, `groupNotes` (Task 3); `NoteCard` (Task 6); `RoadmapTabs` (Task 5).
- Produces: `LibraryFilters` props `{ params: LibraryParams; topics: { slug: string; count: number }[] }`.

- [ ] **Step 1: Write a failing test.**
  - Clicking GROUP `kind` yields an href containing `group=kind`.
  - Clicking an active topic chip removes `topic`.
  - CLEAR links to the bare pathname.
  - Mock `next/navigation` (`usePathname`, `useSearchParams`, `useRouter`).
- [ ] **Step 2: Run** `npx vitest run src/components/roadmap/__tests__/LibraryFilters.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Filters use `<Link>` hrefs built like `src/components/goals/GoalsFilter.tsx`. Search uses a 300 ms debounced `router.replace`.
  - The page loads all notes once, then filters, sorts and groups in memory.
  - The header instrument is `[ LIBRARY · n NOTES ]` + a confidence 1/2/3 segment bar + the sentence `"{k} notes you rated 1 — start there."`
  - There is one `WidgetCard` per group. The empty state is mono text.
- [ ] **Step 4: Run** the test and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add 'src/app/(app)/roadmap/library' src/components/roadmap/LibraryFilters.tsx src/components/roadmap/__tests__/LibraryFilters.test.tsx` then `git commit -m "feat(roadmap): knowledge library with topic/kind/confidence views"`

### Task 8: Navigation, e2e and RLS specs (Phase 1 done)

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx` (add `{ href: '/roadmap', icon: Route, label: 'Roadmap' }` after Goals), `src/components/keyboard/ShortcutsProvider.tsx` (add `{ prefix: 'g', key: 'r', href: '/roadmap' }`)
- Create: `tests/e2e/roadmap.spec.ts`, `tests/e2e/rls-roadmap.spec.ts`

- [ ] **Step 1: Write `rls-roadmap.spec.ts`,** modelled line for line on `tests/e2e/rls-goals.spec.ts`. Cover both `roadmap_item_status` and `roadmap_notes`: user B can't select, update or delete A's rows.
- [ ] **Step 2: Write `roadmap.spec.ts`** following `tests/e2e/goals.spec.ts`: `createTestUser`, log in through `/login` (labels `email`/`password`, button `sign in|log in`), and clean up in `finally`. Tick DONE on W1 GO, and the hero count reads `001`. Capture a note with topic `kafka-redpanda` and confidence 1. On `/roadmap/library?topic=kafka-redpanda&conf=1`, the note is visible.
- [ ] **Step 3: Add the nav item and shortcut.** Run `npm run typecheck && npm run lint && npm run test:unit`. Expected: all green.
- [ ] **Step 4: Run** `npx playwright test tests/e2e/rls-roadmap.spec.ts tests/e2e/roadmap.spec.ts`. Expected: PASS against the hosted project.
- [ ] **Step 5: Manual check** with the `run` skill, following the spec's "Phase 1 verification" list: mobile width and dark mode.
- [ ] **Step 6: Commit.** `git add src/components/layout/AppSidebar.tsx src/components/keyboard/ShortcutsProvider.tsx tests/e2e/roadmap.spec.ts tests/e2e/rls-roadmap.spec.ts` then `git commit -m "feat(roadmap): nav entry, g r shortcut, e2e and RLS specs"`

---

# Phase 2: Recall in Jarvis

### Task 9: Spaced repetition wrapper

**Files:**
- Create: `src/lib/domain/roadmap-srs.ts`
- Modify: `package.json` (`npm i ts-fsrs`)
- Test: `src/lib/domain/__tests__/roadmap-srs.test.ts`

**Interfaces:**
- Produces:
  - `type Rating = 1|2|3|4`, where 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  - `type SrsState = { due: string; stability: number; difficulty: number; elapsed_days: number; scheduled_days: number; learning_steps: number; reps: number; lapses: number; state: 0|1|2|3; last_review: string | null }`. Timestamps are ISO strings, matching the DB columns.
  - `newCardState(now: Date): SrsState`
  - `rate(state: SrsState, rating: Rating, now: Date): SrsState`
  - `retrievability(state: SrsState, now: Date): number`, in 0..1 and 0 for `state === 0` (new)

- [ ] **Step 1: Write failing tests.**
  - `newCardState(now)` has `state 0`, `reps 0` and `due === now.toISOString()`.
  - `rate(new, 3, now)` gives `reps 1` and `due > now`.
  - Rating 4 schedules later than rating 3 from the same state.
  - On a reviewed card (state 2), rating 1 increments `lapses` and lowers `stability`.
  - `retrievability` is 0 for a new card and lies in (0,1] right after a review.
- [ ] **Step 2: Run** `npx vitest run src/lib/domain/__tests__/roadmap-srs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with `ts-fsrs`: `fsrs()`, `createEmptyCard`, `.next(card, now, grade)`, `.get_retrievability(card, now, false)`. Confirm the exact names against the installed package's `.d.ts`. Convert `Date` ⇄ ISO at the boundary.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add package.json package-lock.json src/lib/domain/roadmap-srs.ts src/lib/domain/__tests__/roadmap-srs.test.ts` then `git commit -m "feat(roadmap): FSRS spaced-repetition wrapper"`

### Task 10: Review queue, re-entry, warm-up, weak topics, auto-draft rule

**Files:**
- Create: `src/lib/domain/roadmap-review.ts`
- Test: `src/lib/domain/__tests__/roadmap-review.test.ts`

**Interfaces:**
- Consumes: `SrsState`, `retrievability` (Task 9); `ItemStatus`, `TRACKS` (Task 2); `ROADMAP_TOPICS`.
- Produces:
  - `type ReviewCard = SrsState & { id: string; week: number; topic: string; front: string; back: string; created_at: string }`
  - `type ReviewCaps = { maxReviews: number; maxNew: number }`
  - `DEFAULT_CAPS: ReviewCaps = { maxReviews: 20, maxNew: 10 }`
  - `buildReviewQueue(cards: ReviewCard[], today: { ratings: number; newIntroduced: number }, caps: ReviewCaps, now: Date): ReviewCard[]`
  - `isReentry(lastActivity: string | null, today: string, tz: string): boolean`
  - `lastResolvedWeek(statuses: ItemStatus[]): number | null`
  - `warmupQueue(cards: ReviewCard[], statuses: ItemStatus[], now: Date, size?: number): ReviewCard[]`, with `size` defaulting to 10
  - `weakTopics(cards: ReviewCard[], now: Date): { topic: string; retention: number; count: number }[]`
  - `shouldAutoDraft(note: { kind: NoteKind; body: string }): boolean`

- [ ] **Step 1: Write failing tests.**
  - The queue lists due review cards (state ≠ 0, `due ≤ now`) first, ordered by lowest retrievability. New cards come after them, oldest `created_at` first.
  - New cards are capped at `maxNew − newIntroduced`, and the total at `maxReviews − ratings`.
  - With `ratings: 20` the queue is `[]`.
  - Cards with `due > now` are excluded.
  - `isReentry(null, …)` is false. `isReentry('2026-10-25T10:00:00Z', '2026-10-28', 'Asia/Tashkent')` is true. A last activity 2 days ago is false.
  - `lastResolvedWeek` is the highest week whose 5 items are all resolved, or null.
  - `warmupQueue` picks cards whose `week` equals that week, or whose topic is in that week's vocabulary topics. It ignores `due`, takes the lowest retrievability first, and returns at most 10.
  - `weakTopics` excludes new cards and sorts by mean retrievability asc.
  - `shouldAutoDraft` is true for `learning` with 120 trimmed characters, false for `resource`, and false for `learning` with 119 characters.
- [ ] **Step 2: Run** `npx vitest run src/lib/domain/__tests__/roadmap-review.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the functions in `roadmap-review.ts`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/domain/roadmap-review.ts src/lib/domain/__tests__/roadmap-review.test.ts` then `git commit -m "feat(roadmap): review queue, re-entry and warm-up rules"`

### Task 11: Migration 2, card data layer, expireUserData, card actions

**Files:**
- Create: `supabase/migrations/20261028120000_roadmap_recall.sql`
- Modify: `src/lib/data/invalidate.ts` (+ `expireUserData`), `src/lib/data/invalidate.test.ts`, `src/lib/data/roadmap.ts`, `src/lib/schemas/roadmap.ts`, `src/lib/actions/roadmap.ts`, `src/lib/data/cache-tags.ts` (`'roadmap_cards','roadmap_reviews'`), `src/app/api/export/route.ts`
- Test: `src/lib/data/__tests__/roadmap-cards.test.ts`, `src/lib/actions/__tests__/roadmap.test.ts` (extend)

**Interfaces:**
- Consumes: `rate`, `newCardState` (Task 9); `ReviewCard` (Task 10).
- Produces:
  - `expireUserData(userId: string, ...tables: UserDataTable[]): void`, which calls `revalidateTag(userDataTag(userId, t), { expire: 0 })`
  - `type CardStatus = 'draft'|'active'|'suspended'`
  - `type StoredCard = ReviewCard & { status: CardStatus; note_id: string | null }`
  - `type DraftCard = { front: string; back: string; topic: string }`
  - In `src/lib/data/roadmap.ts`:
    - `loadCards(sb, userId, statuses: CardStatus[]): Promise<StoredCard[]>`
    - `loadReviewsSince(sb, userId, sinceISO: string): Promise<{ card_id: string; reviewed_at: string; was_new: boolean }[]>`
    - `recordReview(sb, userId, cardId: string, rating: Rating, via: 'web'|'telegram', now: Date, expectedReps?: number): Promise<{ ok: true; card: StoredCard } | { stale: true } | { error: string }>`
    - `insertDraftCards(sb, userId, noteId: string | null, week: number, cards: DraftCard[], status?: CardStatus): Promise<{ count: number } | { error: string }>`, with `status` defaulting to `'draft'`. A new card gets `newCardState(now)`.
    - `setCardStatus(sb, userId, cardId, status: CardStatus): Promise<{ error?: string }>`
    - `deleteCard(sb, userId, cardId): Promise<{ error?: string }>`
  - Schemas:
    - `RatingSchema`: int 1..4
    - `CardInputSchema`: `{ week 1..28, topic normalized, non-empty; front trim 1..500; back trim 1..1000 }`
    - `CardEditSchema = CardInputSchema.omit({ week: true }).extend({ id: z.uuid() })`
  - Actions, all returning `Result` unless noted:
    - `rateCard(cardId, rating)`
    - `keepDraft(cardId)` (status → active)
    - `dropDraft(cardId)` (delete)
    - `editCard(input)`
    - `addCard(input)` (active immediately)
    - `suspendCard(cardId)`

- [ ] **Step 1: Write the migration.**
  - `roadmap_cards` takes its columns from the spec's Phase 2 table: `note_id` references `roadmap_notes(id) on delete set null`; `status` check; `front`/`back` length checks of 1..500 and 1..1000; FSRS columns with `state smallint check (state between 0 and 3)`; `created_at`/`updated_at`; index `(user_id, status, due)`.
  - `roadmap_reviews` gets `was_new boolean not null default false`, `rating` check 1..4, `via` check, `card_id` with cascade, and index `(user_id, reviewed_at desc)`.
  - Use the re-runnable RLS block for both.
- [ ] **Step 2: Write failing tests.**
  - `expireUserData('u','roadmap_cards')` calls `revalidateTag('jarvis:user:u:roadmap_cards', { expire: 0 })`. Mock `next/cache` with both `updateTag` and `revalidateTag`.
  - `recordReview` with `expectedReps: 2` on a card whose `reps` is 3 returns `{ stale: true }` and performs no update or insert (Review Focus 1).
  - On success, `recordReview` updates the card with `rate()`'s output, filtered by `id` and `user_id`. It inserts a review with `was_new: true` when the prior `state === 0`.
  - `insertDraftCards` writes `status: 'draft'` rows with the `newCardState` fields.
  - `rateCard('bad-id', 3)` returns `{ error }`.
  - `keepDraft` updates `status: 'active'` and invalidates `roadmap_cards`.
- [ ] **Step 3: Run** `npx vitest run src/lib/data src/lib/actions/__tests__/roadmap.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement** the code. `recordReview` loads the card with `.eq('id', cardId).eq('user_id', userId).single()`, then calls `rate()`, updates, and inserts the review.
- [ ] **Step 5: Run** the same command. Expected: PASS.
- [ ] **Step 6: Commit.** `git add supabase/migrations/20261028120000_roadmap_recall.sql src/lib/data/invalidate.ts src/lib/data/invalidate.test.ts src/lib/data/roadmap.ts src/lib/data/__tests__/roadmap-cards.test.ts src/lib/schemas/roadmap.ts src/lib/actions/roadmap.ts src/lib/actions/__tests__/roadmap.test.ts src/lib/data/cache-tags.ts src/app/api/export/route.ts` then `git commit -m "feat(roadmap): cards and reviews storage, card actions"`
- [ ] **Step 7: ⏸ PAUSE.** Aki pastes `20261028120000_roadmap_recall.sql`. Verify both tables exist, then paste it again to prove it re-runs.

### Task 12: Claude card drafting

**Files:**
- Create: `src/lib/ai/draft-cards.ts`
- Modify: `package.json` (`npm i @anthropic-ai/sdk`), `src/lib/data/roadmap.ts` (+ `draftAndStoreCards`), `src/lib/actions/roadmap.ts` (`createRoadmapNote` schedules `after()`; + `draftCardsForNote`), `.env.example` (`ANTHROPIC_API_KEY=`)
- Test: `src/lib/ai/__tests__/draft-cards.test.ts`, `src/lib/actions/__tests__/roadmap.test.ts` (extend)

**Interfaces:**
- Consumes: `DraftCard`, `insertDraftCards` (Task 11); `shouldAutoDraft` (Task 10); `itemText`, `suggestTopics` (Task 2); `expireUserData` (Task 11); `createAdminClient`.
- Produces:
  - `class DraftUnavailableError extends Error {}`
  - `draftCards(input: { week: number; itemText: string; kind: NoteKind; body: string; topics: string[] }, client?: Anthropic): Promise<DraftCard[]>`. It throws `DraftUnavailableError` when `ANTHROPIC_API_KEY` is unset and no client is passed. It returns 3–5 cards, and any `topic` outside the allowed set is replaced with `allowed[0]`. The allowed set is the note's topics, or else `suggestTopics(week)`.
  - `draftAndStoreCards(sb, userId, noteId, drafter = draftCards): Promise<{ count: number } | { error: string }>`
  - `draftCardsForNote(noteId): Promise<{ success: true; count: number } | { error: string }>`

- [ ] **Step 1: Write failing tests** with a fake client object exposing `beta.messages.parse`.
  - The request uses `model: 'claude-opus-5-5'`, `output_config.effort: 'low'`, the `server-side-fallback-2026-07-01` beta and `fallbacks: 'default'`.
  - A returned topic not in the allowed set is rewritten.
  - 7 returned cards are trimmed to 5.
  - `stop_reason: 'refusal'` throws.
  - An unset key with no client throws `DraftUnavailableError`.
  - `createRoadmapNote` for a 130-character `learning` note calls the mocked `after` (`vi.mock('next/server', …)`) exactly once. A `resource` note doesn't call it.
  - A drafting failure inside the callback is caught and logged, never rethrown.
- [ ] **Step 2: Run** `npx vitest run src/lib/ai src/lib/actions/__tests__/roadmap.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Invoke the `claude-api` skill first and follow its TypeScript structured-outputs docs (`zodOutputFormat` from `@anthropic-ai/sdk/helpers/zod`). If `client.beta.messages.parse` isn't available in the installed SDK, use `client.beta.messages.create` with `output_config.format` and validate with zod.
  - The system prompt holds the rules from the spec's "AI drafting" section, verbatim.
  - The `after()` callback uses `createAdminClient()`, calls `draftAndStoreCards`, then `expireUserData(userId,'roadmap_cards')`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add package.json package-lock.json src/lib/ai src/lib/data/roadmap.ts src/lib/actions/roadmap.ts src/lib/actions/__tests__/roadmap.test.ts .env.example` then `git commit -m "feat(roadmap): Claude drafts flashcards from notes"`

### Task 13: Review session page

**Files:**
- Create: `src/app/(app)/roadmap/review/page.tsx`, `src/components/roadmap/ReviewSession.tsx`
- Modify: `src/components/roadmap/RoadmapTabs.tsx` (REVIEW tab)
- Test: `src/components/roadmap/__tests__/ReviewSession.test.tsx`

**Interfaces:**
- Consumes: `buildReviewQueue`, `warmupQueue`, `DEFAULT_CAPS` (Task 10); `loadCards`, `loadReviewsSince` (Task 11); `rateCard` (Task 11); `userDayBounds` (`src/lib/domain/timezone.ts`).
- Produces: `ReviewSession` props `{ queue: { id: string; front: string; back: string; topic: string; week: number }[]; mode: 'daily' | 'warmup' }`.

- [ ] **Step 1: Write a failing test.**
  - The front shows first. Space reveals the back. Key `3` calls `rateCard(id, 3)` and advances to the next card.
  - Keys 1–4 are ignored before reveal.
  - After the last card it shows `[ DONE FOR TODAY · 2 ]`.
  - A `{ error }` result shows `[ERROR: …]` and moves the card to the end.
- [ ] **Step 2: Run** `npx vitest run src/components/roadmap/__tests__/ReviewSession.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** The page computes local `today` from `loadProfile(userId).timezone`.
  - It loads active cards and today's reviews (`since = userDayBounds(today, tz).startUtc`).
  - `ratings = reviews.length` and `newIntroduced = reviews.filter(r => r.was_new).length`.
  - The queue is `?warmup=1` ? `warmupQueue(...)` : `buildReviewQueue(...)`.
  - Rating updates the UI optimistically.
- [ ] **Step 4: Run** the test and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add 'src/app/(app)/roadmap/review' src/components/roadmap/ReviewSession.tsx src/components/roadmap/RoadmapTabs.tsx src/components/roadmap/__tests__/ReviewSession.test.tsx` then `git commit -m "feat(roadmap): keyboard-first review session"`

### Task 14: Recall on `/roadmap` and the library (Phase 2 done)

**Files:**
- Create: `src/components/roadmap/ReviewDueCard.tsx`, `src/components/roadmap/DraftsCard.tsx`
- Modify: `src/app/(app)/roadmap/page.tsx`, `src/app/(app)/roadmap/library/page.tsx`, `src/components/roadmap/NoteCard.tsx` (footer: card count + `DRAFT CARDS`)
- Create: `tests/e2e/rls-roadmap-cards.spec.ts`
- Test: `src/components/roadmap/__tests__/DraftsCard.test.tsx`

**Interfaces:**
- Consumes: Tasks 10–13.
- Produces:
  - `ReviewDueCard` props: `{ due: number; reentry: boolean }`. It links to `/roadmap/review`, or to `/roadmap/review?warmup=1` when `reentry`.
  - `DraftsCard` props: `{ drafts: StoredCard[] }`.

- [ ] **Step 1: Write a failing test.** `DraftsCard` KEEP calls `keepDraft(id)`, DROP calls `dropDraft(id)`, and EDIT saves through `editCard({ id, front, back, topic })`.
- [ ] **Step 2: Run** `npx vitest run src/components/roadmap/__tests__/DraftsCard.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `/roadmap` adds `[ REVIEW · n DUE ]` and `[ DRAFTS · n ]`.
  - The hero sentence becomes "Welcome back. 10-card warm-up first." when `isReentry(lastActivity, today, tz)`. `lastActivity` is the max of status `updated_at`, note `created_at` and review `reviewed_at`.
  - Review timestamps are added to `activityDots`.
  - The library adds `· R {retention}%` from `weakTopics` to topic group titles.
  - The `NoteCard` footer shows `n CARDS` and a `DRAFT CARDS` button that calls `draftCardsForNote`.
- [ ] **Step 4: Write `rls-roadmap-cards.spec.ts`** (the `rls-goals` pattern on `roadmap_cards`).
- [ ] **Step 5: Run** `npm run typecheck && npm run lint && npm run test:unit` and `npx playwright test tests/e2e/rls-roadmap-cards.spec.ts`. Expected: green.
- [ ] **Step 6: Manual check (needs `ANTHROPIC_API_KEY`).** Write a ≥120-character `learning` note and refresh: drafts appear. Keep 2, review them at `/roadmap/review`, and confirm 2 `roadmap_reviews` rows.
- [ ] **Step 7: Commit.** `git add src/components/roadmap 'src/app/(app)/roadmap' tests/e2e/rls-roadmap-cards.spec.ts` then `git commit -m "feat(roadmap): review and drafts on the week page, retention in library"`

---

# Phase 3: Telegram bot

### Task 15: Bot API client, callback codec, renderers, link tokens

**Files:**
- Create: `src/lib/telegram/bot-api.ts`, `src/lib/telegram/callback-data.ts`, `src/lib/telegram/render.ts`, `src/lib/telegram/link-token.ts`
- Test: `src/lib/telegram/__tests__/callback-data.test.ts`, `src/lib/telegram/__tests__/bot-api.test.ts`, `src/lib/telegram/__tests__/render.test.ts`, `src/lib/telegram/__tests__/link-token.test.ts`

**Interfaces:**
- Produces:
  - `type InlineButton = { text: string; data?: string; url?: string }`
  - `createBotApi(token: string, fetcher?: typeof fetch)` returns:
    - `sendMessage(chatId: number, text: string, buttons?: InlineButton[][]): Promise<{ message_id: number }>`
    - `editMessageText(chatId: number, messageId: number, text: string, buttons?: InlineButton[][]): Promise<void>`
    - `answerCallbackQuery(id: string, text?: string): Promise<void>`
    - `setWebhook(url: string, secret: string): Promise<void>`
  - `type Callback`:
    - `{ t: 'show'; cardId: string }`
    - `{ t: 'rate'; cardId: string; rating: Rating; reps: number }`
    - `{ t: 'keep' | 'drop'; cardId: string }`
    - `{ t: 'item'; week: number; track: Track; status: 'done'|'skipped' }`
    - `{ t: 'review' }`
  - `encodeCallback(c: Callback): string`, using the forms `s:<id>`, `r:<id>:<1-4>:<reps>`, `k:<id>`, `d:<id>`, `i:<w>:<track>:<d|s>`, `rv`
  - `decodeCallback(s: string): Callback | null`
  - `type Rendered = { text: string; buttons?: InlineButton[][] }`, produced by:
    - `renderToday(week: RoadmapWeek, statuses: ItemStatus[], due: number, appUrl: string): Rendered`
    - `renderFront(card: StoredCard): Rendered`
    - `renderBack(card: StoredCard): Rendered`
    - `renderDraft(card: StoredCard): Rendered`
    - `renderDone(count: number, appUrl: string): Rendered`
  - `newLinkToken(): { token: string; hash: string }`, where the token is 32 random bytes in base64url
  - `hashLinkToken(token: string): string`, sha256 hex

- [ ] **Step 1: Write failing tests.**
  - `decodeCallback(encodeCallback(c))` round-trips every variant.
  - The longest encoding (a rating with reps 9999) is ≤ 64 bytes (`Buffer.byteLength`).
  - Garbage, unknown prefixes and a non-UUID id decode to `null`.
  - `sendMessage` posts to `https://api.telegram.org/bot<token>/sendMessage` with `reply_markup.inline_keyboard`, and the body has **no** `parse_mode`.
  - Text with `` _*[`]( `` is passed through unchanged (Review Focus 4).
  - `renderToday` shows 5 lines with `✓`/`–`/`·` markers and buttons `[Done][Skip]` for open items only, plus `[Review n]` when `due > 0`.
  - Rendered texts are ≤ 4096 characters.
  - The token is base64url, ≤ 64 characters, and matches `/^[A-Za-z0-9_-]+$/`. `hashLinkToken(token) === hash`.
- [ ] **Step 2: Run** `npx vitest run src/lib/telegram`. Expected: FAIL.
- [ ] **Step 3: Implement** the four modules. They are pure apart from `fetch` and `node:crypto`. `bot-api` throws on `ok: false`, with Telegram's `description` in the message.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/telegram` then `git commit -m "feat(telegram): bot API client, callback codec, renderers, link tokens"`

### Task 16: Migration 3, settings data/actions, Settings section

**Files:**
- Create: `supabase/migrations/20261029120000_roadmap_telegram.sql`, `src/components/roadmap/RoadmapSettingsForm.tsx`
- Modify: `src/lib/schemas/roadmap.ts`, `src/lib/data/roadmap.ts`, `src/lib/actions/roadmap.ts`, `src/app/(app)/settings/page.tsx`, `src/lib/data/cache-tags.ts` (`'roadmap_settings'`), `src/app/api/export/route.ts` (`roadmap_settings`), `.env.example` (3 `ROADMAP_TELEGRAM_*` names)
- Test: `tests/unit/schemas/roadmap.test.ts` (extend), `src/lib/actions/__tests__/roadmap.test.ts` (extend)

**Interfaces:**
- Consumes: `newLinkToken` (Task 15); `DEFAULT_CAPS` (Task 10).
- Produces:
  - `type RoadmapSettings = { max_reviews_per_day: number; max_new_per_day: number; morning_nudge: string; evening_nudge: string; nudges_enabled: boolean; paused_until: string | null; telegram_chat_id: number | null }`. The nudge times are `'HH:MM'`.
  - `DEFAULT_ROADMAP_SETTINGS`: 20, 10, `'08:00'`, `'21:30'`, true, null, null
  - `RoadmapSettingsInputSchema`: caps 1..200 and 0..50, `HH:MM` regex, morning < evening, enabled, paused_until date|null
  - `loadRoadmapSettings(sb, userId): Promise<RoadmapSettings>`, which falls back to the defaults when there is no row
  - `capsFrom(s: RoadmapSettings): ReviewCaps`
  - Actions:
    - `updateRoadmapSettings(input): Promise<Result>`
    - `createTelegramLink(): Promise<{ success: true; url: string } | { error: string }>`, which stores the hash and expiry (now + 15 min) and returns `https://t.me/${ROADMAP_TELEGRAM_BOT_USERNAME}?start=${token}`
    - `disconnectTelegram(): Promise<Result>`

- [ ] **Step 1: Write the migration.**
  - `roadmap_settings` (pk `user_id`) gets the spec's columns and the full re-runnable RLS block.
  - `roadmap_nudges` (pk `user_id, kind, local_date`, `kind` check `('morning','evening')`, `sent_at default now()`) gets `enable row level security` + `revoke all on public.roadmap_nudges from anon, authenticated;`, with no grants and no policies.
- [ ] **Step 2: Write failing tests.**
  - The schema rejects `evening_nudge: '07:00'` when morning is `'08:00'`, and rejects `'25:00'`.
  - `createTelegramLink` upserts a `telegram_link_token_hash` that is 64 hex characters, and the returned URL's token hashes to it.
  - It returns `{ error }` when `ROADMAP_TELEGRAM_BOT_USERNAME` is unset.
  - The page's existing review queue reads caps via `capsFrom(await loadRoadmapSettings(...))` (update Task 13's page).
- [ ] **Step 3: Run** `npx vitest run tests/unit/schemas/roadmap.test.ts src/lib/actions/__tests__/roadmap.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement.** `RoadmapSettingsForm` follows `src/components/salah/SalahSettingsForm.tsx` (React Hook Form + zod).
  - It has a CONNECT TELEGRAM button that opens the returned URL.
  - When connected, it shows `CONNECTED · chat …1234` + DISCONNECT.
  - Add it to `settings/page.tsx` as a "Roadmap" card.
  - Switch the review page to the settings caps.
- [ ] **Step 5: Run** the tests and `npm run typecheck`. Expected: PASS.
- [ ] **Step 6: Commit.** `git add supabase/migrations/20261029120000_roadmap_telegram.sql src/components/roadmap/RoadmapSettingsForm.tsx src/lib/schemas/roadmap.ts src/lib/data/roadmap.ts src/lib/actions/roadmap.ts 'src/app/(app)/settings/page.tsx' 'src/app/(app)/roadmap/review/page.tsx' src/lib/data/cache-tags.ts src/app/api/export/route.ts .env.example tests/unit/schemas/roadmap.test.ts src/lib/actions/__tests__/roadmap.test.ts` then `git commit -m "feat(roadmap): settings, Telegram linking and nudge tables"`
- [ ] **Step 7: ⏸ PAUSE.** Aki pastes `20261029120000_roadmap_telegram.sql` and re-runs it once. Verify that `roadmap_nudges` is **not** readable with the anon key (select returns a permission error or 0 rows).

### Task 17: Update handlers

**Files:**
- Create: `src/lib/telegram/handlers.ts`
- Test: `src/lib/telegram/__tests__/handlers.test.ts`

**Interfaces:**
- Consumes: Tasks 4, 10, 11, 12, 15, 16 data functions (`loadStatuses`, `writeItemStatus`, `insertNote`, `loadCards`, `loadReviewsSince`, `recordReview`, `setCardStatus`, `deleteCard`, `draftAndStoreCards`, `loadRoadmapSettings`); `buildReviewQueue`, `currentWeek`, `ROADMAP_WEEKS`.
- Produces:
  - `type HandlerDeps = { sb: SupabaseClient; bot: ReturnType<typeof createBotApi>; now: () => Date; appUrl: string; schedule: (task: () => Promise<void>) => void; expire: (userId: string, ...t: UserDataTable[]) => void }`
  - `handleUpdate(update: TgUpdate, deps: HandlerDeps): Promise<void>`
  - `type TgUpdate`: the minimal `message`/`callback_query` shape you need, declared in the same file

- [ ] **Step 1: Write failing tests.** Use a fake `sb` built with the `query()` chain helper and a fake `bot` made of `vi.fn`s.
  - A message from an unknown `chat.id` that isn't `/start` sends nothing.
  - `/start <token>` with a matching unexpired hash sets `telegram_chat_id`, clears the hash, and replies "Connected.".
  - An expired or unknown token replies "Link expired. Create a new one in Settings.".
  - `/today` sends `renderToday` for `currentWeek`.
  - The callback `i:6:go:d` calls `writeItemStatus(sb, userId, 6, 'go', 'done')`, `expire(userId, 'roadmap_item_status')` and `answerCallbackQuery`, then edits the message with the fresh `/today` render.
  - `/review` sends the front of the first queued card with `[Show answer]`.
  - `s:<id>` edits to the back with 4 rating buttons carrying the card's `reps`.
  - `r:<id>:3:<reps>` calls `recordReview(…, 'telegram', now, reps)` and then sends the next front, or `renderDone`.
  - A `{ stale: true }` result answers the callback "Already rated." and sends nothing else (Review Focus 1).
  - `/note` with no text, or with more than 4000 characters, replies with the schema's first issue (Review Focus 5).
  - `/note Learned X #Kafka Redpanda` inserts kind `learning`, the current week and topics `['kafka']`. It passes a drafting task to `schedule`, and that task sends `renderDraft` per card when run.
  - `/pause 3` sets `paused_until` to today + 3 local days.
- [ ] **Step 2: Run** `npx vitest run src/lib/telegram/__tests__/handlers.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `handleUpdate`.
  - Resolve `userId` with `sb.from('roadmap_settings').select('user_id').eq('telegram_chat_id', chatId).maybeSingle()`.
  - Every later query filters that `user_id`.
  - Hashtags are matched with `/#([\p{L}\p{N}_-]+)/gu`, run through `normalizeTopic`, and removed from the body.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/telegram/handlers.ts src/lib/telegram/__tests__/handlers.test.ts` then `git commit -m "feat(telegram): today, review, note and pause handlers"`

### Task 18: Webhook route and set-webhook script (Phase 3 done)

**Files:**
- Create: `src/app/api/telegram/webhook/route.ts`, `scripts/telegram-set-webhook.ts`, `src/lib/auth/secret.ts`
- Test: `src/app/api/telegram/webhook/__tests__/route.test.ts`, `src/lib/auth/__tests__/secret.test.ts`

**Interfaces:**
- Consumes: `handleUpdate` (Task 17); `createBotApi` (Task 15); `createAdminClient`; `expireUserData` (Task 11); `after` from `next/server`.
- Produces: `safeEqual(a: string | null, b: string | undefined): boolean` (timing-safe; false when either is missing). It is reused by Task 21.

- [ ] **Step 1: Write failing tests** (`// @vitest-environment node`). Mock `@/lib/telegram/handlers`, `@/lib/supabase/admin` and `next/server`'s `after`.
  - A missing or wrong `X-Telegram-Bot-Api-Secret-Token` returns 401 and never calls `handleUpdate`.
  - The correct secret returns 200 `{ ok: true }` and calls `handleUpdate` once.
  - When `handleUpdate` throws, the route still returns 200 and logs `[telegram-webhook]`.
  - `safeEqual('a', 'a')` is true; `safeEqual('a', 'b')`, `safeEqual(null, 'a')` and `safeEqual('a', undefined)` are false.
- [ ] **Step 2: Run** `npx vitest run src/app/api/telegram src/lib/auth/__tests__/secret.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The route has `export const maxDuration = 60`. It POSTs only, uses `deps.schedule = (task) => after(task)` and `deps.expire = expireUserData`, and takes `appUrl` from `process.env.ROADMAP_APP_URL`. Add `ROADMAP_APP_URL` (the production https origin) to `.env.example`.
  - Script: `npx tsx scripts/telegram-set-webhook.ts https://<prod-host>`. It exits 1 unless the argument starts with `https://` and is not localhost. It calls `setWebhook(`${arg}/api/telegram/webhook`, ROADMAP_TELEGRAM_WEBHOOK_SECRET)` with `allowed_updates: ['message','callback_query']`.
- [ ] **Step 4: Run** the tests and the full gate `npm run typecheck && npm run lint && npm run test:unit`. Expected: green.
- [ ] **Step 5: Commit.** `git add src/app/api/telegram scripts/telegram-set-webhook.ts src/lib/auth/secret.ts src/lib/auth/__tests__/secret.test.ts .env.example` then `git commit -m "feat(telegram): authenticated webhook route and setup script"`
- [ ] **Step 6: ⏸ Hand-off for manual verification** (needs Aki):
  1. Create a new bot in BotFather.
  2. Set `ROADMAP_TELEGRAM_BOT_TOKEN/USERNAME/WEBHOOK_SECRET`, `ROADMAP_APP_URL` and `ANTHROPIC_API_KEY` in Vercel, and deploy the branch (preview).
  3. Run the script with the preview URL.
  4. Confirm the Claude Code Telegram plugin still works.
  5. Connect from Settings and try `/today` (tick an item; `/roadmap` reflects it within a refresh), `/review` (3 cards), `/note … #kafka-redpanda` (drafts arrive) and a double-tap on a rating ("Already rated.").

---

# Phase 4: Daily nudges

### Task 19: Nudge rules and messages

**Files:**
- Create: `src/lib/domain/roadmap-nudges.ts`
- Modify: `src/lib/telegram/render.ts` (+ `renderMorning`, `renderEvening`)
- Test: `src/lib/domain/__tests__/roadmap-nudges.test.ts`, `src/lib/telegram/__tests__/render.test.ts` (extend)

**Interfaces:**
- Consumes: `RoadmapSettings` (Task 16).
- Produces:
  - `type NudgeKind = 'morning' | 'evening'`
  - `dueNudges(input: { settings: RoadmapSettings; localDate: string; localTime: string; sent: NudgeKind[]; activeToday: boolean }): NudgeKind[]`
  - `renderMorning(input: { week: number; open: number; due: number; reentry: boolean; lastNote: string | null; appUrl: string }): Rendered`
  - `renderEvening(due: number, appUrl: string): Rendered`

- [ ] **Step 1: Write failing tests.**
  - 07:59 gives `[]`.
  - 08:00 gives `['morning']`.
  - 08:00 with `sent: ['morning']` gives `[]`.
  - 21:30 with `activeToday: false` gives `['evening']`, and with `activeToday: true` gives `[]`.
  - **At 22:10 with nothing sent, the result is `['evening']` only** (Review Focus 2).
  - `nudges_enabled: false`, or `paused_until >= localDate`, gives `[]`.
  - No `telegram_chat_id` gives `[]`.
  - `renderMorning` in re-entry mode starts with `Welcome back` and includes the first 80 characters of `lastNote`. Otherwise it reads `W{week} · {open}/5 left · {due} cards due`.
  - Buttons are `[Review now]` (`rv`) and `[Open Jarvis]` (url).
- [ ] **Step 2: Run** `npx vitest run src/lib/domain/__tests__/roadmap-nudges.test.ts src/lib/telegram/__tests__/render.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Compare times as `HH:MM` strings.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/domain/roadmap-nudges.ts src/lib/domain/__tests__/roadmap-nudges.test.ts src/lib/telegram/render.ts src/lib/telegram/__tests__/render.test.ts` then `git commit -m "feat(roadmap): nudge timing rules and messages"`

### Task 20: Cron route and timer SQL (Phase 4 done)

**Files:**
- Create: `src/app/api/cron/roadmap-nudges/route.ts`, `supabase/manual/roadmap-cron.sql`
- Modify: `.env.example` (`CRON_SECRET=`)
- Test: `src/app/api/cron/roadmap-nudges/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `dueNudges`, `renderMorning`, `renderEvening` (Task 19); `safeEqual` (Task 18); `loadStatuses`, `loadCards`, `loadReviewsSince`, `loadNotes`, `loadRoadmapSettings`; `buildReviewQueue`, `isReentry`, `currentWeek`, `weekTally`; `formatInTimeZone` (date-fns-tz); `userDayBounds`.

- [ ] **Step 1: Write failing tests** (`// @vitest-environment node`). Mock the admin client, the bot and the time (`vi.setSystemTime`).
  - No bearer, or a wrong one, returns 401.
  - With system time `2026-10-28T03:05:00Z` (08:05 Tashkent) and one linked user, it inserts into `roadmap_nudges` with `kind 'morning', local_date '2026-10-28'` via `upsert(…, { onConflict: 'user_id,kind,local_date', ignoreDuplicates: true }).select()`, sends one message, and responds `{ sent: 1 }`.
  - When that upsert returns 0 rows (already sent), nothing is sent.
  - **At `2026-10-28T19:30:00Z` (00:30 local on 10-29), `local_date` is `'2026-10-29'` and no nudge is due** (Review Focus 3).
  - A `bot.sendMessage` failure for one user doesn't stop the others.
- [ ] **Step 2: Run** `npx vitest run src/app/api/cron`. Expected: FAIL.
- [ ] **Step 3: Implement** the route (POST).
  - Load settings rows with `telegram_chat_id is not null`. Per user:
    - get `profiles.timezone`;
    - compute `localDate`/`localTime` with `formatInTimeZone`;
    - load today's nudges, statuses, notes and reviews;
    - `activeToday` = any status, note or review timestamp at or after the local day start;
    - call `dueNudges`;
    - claim the row first, then send.
  - Write `supabase/manual/roadmap-cron.sql`, with comments in this order: (1) deploy the route, (2) `select vault.create_secret('<https-url>/api/cron/roadmap-nudges','roadmap_nudges_url'); select vault.create_secret('<CRON_SECRET>','roadmap_cron_secret');`, (3) `create extension if not exists pg_cron; create extension if not exists pg_net;`, (4) `select cron.schedule('roadmap-nudges','*/15 * * * *', $$ select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='roadmap_nudges_url'), headers := jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='roadmap_cron_secret'),'Content-Type','application/json'), body := '{}'::jsonb) $$);`, plus an unschedule line.
- [ ] **Step 4: Run** the tests and the full gate. Expected: green.
- [ ] **Step 5: Commit.** `git add src/app/api/cron supabase/manual/roadmap-cron.sql .env.example` then `git commit -m "feat(roadmap): daily Telegram nudges via protected cron route"`
- [ ] **Step 6: ⏸ Hand-off** (needs Aki):
  1. Set `CRON_SECRET` in Vercel and deploy.
  2. Run `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/roadmap-nudges` twice after 08:00 local. Expect exactly one message.
  3. Paste `supabase/manual/roadmap-cron.sql` steps 2–4.
  4. After 15 minutes, check `select * from cron.job_run_details order by start_time desc limit 3` shows `succeeded`.

### Task 21 (optional): Home `RoadmapGlance`

Do this only if Aki asks after Phase 4. It's a small card on `/` showing `W{n} · {open}/5 · {due} DUE`, linking to `/roadmap`, in the pattern of `src/components/home/SalahGlance.tsx`.
