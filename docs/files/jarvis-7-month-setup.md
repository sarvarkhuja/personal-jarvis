# Jarvis Setup for the 7-Month Senior AI/ML Plan

> What to create in **Goals**, **Habits**, and **Pills** so Personal Jarvis becomes the
> tracking layer for the plan in [`ai-engineer.md`](./ai-engineer.md) and the daily system in
> [`plan.jsx`](./plan.jsx).
>
> **Start date:** 2026-06-27 · **Finish line:** ~2027-01-27 (7 months)
> Dates below use the **27th of each month** as month boundaries to match the start date.

---

## How the three subsystems fit together

Personal Jarvis models these three things differently, and one constraint drives the whole setup:

- **A habit cannot exist without a goal** — `habits.goal_id` is `NOT NULL`. Create the goals **first**, then attach habits to them.
- **Day-part sections (Morning / Afternoon / Evening / Night) only appear for `timer` habits** — `scheduled_time` is only allowed when `kind = 'timer'`. `check` and `counter` habits always live under **Anytime**. So the time-anchored items below (deep work, CrossFit, nap, Qur'an) are set up as **timer** habits to slot them into the right section; the rest are simple checkboxes.
- **A pill stores only a `name`** — no dose/schedule field. Bake the timing into the name (e.g. `Magnesium glycinate (PM)`) and check it off on the 7-day grid.

Build order: **Goals → Habits → Pills.**

---

## 1. Goals

Your "solid goals" sit at the **outcome + capstone** altitude: one North Star, the seven monthly
capstones as milestones, the Month-7 success criteria as measurable end goals, and one process goal
that exists to anchor the habits.

In the app, a goal needs only a **title**; `target date`, `description`, and `parent goal` are
optional. Create the North Star first, then add the rest as **sub-goals** (set their *Parent goal* to
the North Star).

### 🌟 North Star (top-level)

| Field | Value |
|---|---|
| **Title** | Land a Senior AI/ML Engineer role |
| **Target date** | 2027-01-27 |
| **Description** | 7-month transformation: classical ML + LLMs + infra + EU AI Act. Proof-of-work on GitHub, 7 capstones, applications out. |

### 📦 Monthly capstones (sub-goals of the North Star)

One per month — the thing that has to be *shipped, public, and documented* by month's end.

| # | Title | Target date | What "done" means (from the plan) |
|---|---|---|---|
| M1 | Deployed observable service | 2026-07-27 | A real service (feed reader / expense tracker / link shortener) on a VPS behind Caddy, CI/CD from `main`, full Grafana LGTM observability + Sentry. Blog post: "What I shipped in Month 1." |
| M2 | Data pipeline + distributed backend | 2026-08-27 | End-to-end PySpark → Delta Lake → dbt → Airflow pipeline **and** the transactional-outbox pattern across two services on Kafka. `ARCHITECTURE.md` + diagrams. |
| M3 | Classical ML + DL, ML feature served | 2026-09-27 | Kaggle tabular model in top-20% (XGBoost/LightGBM/CatBoost + Optuna + SHAP), a from-scratch `mininet`, and an ML feature tracked in MLflow/W&B and served via Triton on K8s. |
| M4 | Production RAG + fine-tuned model | 2026-10-27 | Transformer-from-scratch (CS336 A1), a production RAG (hybrid search + rerank + citations + eval flywheel), and a fine-tuned model on HuggingFace with a real model card. |
| M5 | Agents/MCP + drift + EU AI Act | 2026-11-27 | PPO/GRPO reps, a coding agent + custom MCP server, Evidently drift monitoring on a deployed model, and a Model Card + Fairlearn bias eval. |
| M6 | Ship the integrated product to users | 2026-12-27 | The capstone: backend + fine-tuned + frontier model + RAG + full observability + auth + frontend, live for **real users**, with `ARCHITECTURE.md` / `DECISIONS.md` / `THREAT_MODEL.md`. |
| M7 | Scale-hardened + applications out | 2027-01-27 | Profiled, load-tested and chaos-tested to thousands of users; CV/LinkedIn/portfolio rewritten; tailored applications to 10 target companies sent. |

### 🎯 Outcome goals (sub-goals of the North Star — the "Month 7 success" checklist)

The capstones above already cover "7 capstones live" and "1 live product with users." These are the
remaining measurable outcomes:

| Title | Target date | Note |
|---|---|---|
| Publish 7 long-form blog posts | 2027-01-27 | One per month — the writing *is* the proof-of-work. |
| Merge 1 OSS PR into a major AI framework | 2027-01-27 | LangGraph / smolagents / DSPy / Evidently / a Postgres docs fix all count. |
| Ship 1 HuggingFace model with a model card | 2026-10-27 | Falls out of the Month-4 fine-tune; also seeds the EU AI Act technical doc. |
| Send applications to 10 target companies | 2027-01-27 | 5 EU + 5 Djinni, each with a tailored cover note. |

### ⚙️ Daily Operating System (sub-goal of the North Star — *anchors the habits*)

| Field | Value |
|---|---|
| **Title** | Hold the daily system (salah · deep work · strength · sleep) |
| **Target date** | *(leave blank — this is an ongoing process goal)* |
| **Description** | The unsexy multiplier. Anchored to salah, two deep-work blocks, CrossFit 3×/week, and a 7.5 h sleep total. Every keystone habit rolls up here or to the North Star. |

> This goal exists because **habits require a parent goal**. The lifestyle habits below attach to it;
> the learning habits attach to the North Star.

---

## 2. Habits

A keystone set of **11** — the high-leverage drivers, not the full minute-by-minute schedule (that
already lives in the schedule view of `plan.jsx`). Habits are for the things you want a **streak** on.

When you add each habit, the form asks for: **Name**, **Goal**, **Kind** (checkbox / counter / timer),
**Frequency** (which weekdays), **Color**, and — for timer habits only — a **Time**.

> **Frequency mapping:** "daily" = all 7 weekdays selected. "Mon–Sat" = deselect Sunday.
> "Mon/Wed/Sat" = select only those three. "Sun" = select only Sunday.
> **Day-part:** the *Time* you set buckets the habit — Morning 05:00–11:59 · Afternoon 12:00–16:59 ·
> Evening 17:00–21:59 · Night 22:00–04:59. Checkbox/counter habits show under **Anytime**.

| # | Name | Kind | Frequency | Time → section | Color | Goal |
|---|------|------|-----------|----------------|-------|------|
| 1 | Fajr wake (04:30) | check | daily | — (Anytime) | teal | Daily Operating System |
| 2 | Salah (5 daily) | counter | daily | — (Anytime) | emerald | Daily Operating System |
| 3 | Qur'an + intention (20 min) | timer | daily | 04:50 → Morning | green | Daily Operating System |
| 4 | Deep-work learning block | timer | Mon–Sat | 05:05 → Morning | indigo | North Star |
| 5 | Ship to GitHub (commit/PR) | check | Mon–Sat | — (Anytime) | sky | North Star |
| 6 | Write 200 words (learning log) | check | daily | — (Anytime) | amber | North Star |
| 7 | Weekly review & plan | check | Sun | — (Anytime) | blue | North Star |
| 8 | CrossFit session | timer | Mon/Wed/Sat | 19:00 → Evening | rose | Daily Operating System |
| 9 | Hit protein target (1.6–2.2 g/kg) | check | daily | — (Anytime) | orange | Daily Operating System |
| 10 | Qailūlah nap | timer | Mon–Sat | 16:45 → Afternoon | violet | Daily Operating System |
| 11 | Sleep ≥ 7.5 h | check | daily | — (Anytime) | purple | Daily Operating System |

**Notes on a few choices**

- **#2 Salah (5 daily)** is a `counter` so you can tap it five times a day. The add-form doesn't expose
  a numeric *target*, so it won't display "/5" — it just counts. (If you want the target shown, it can
  be set directly on the row later.) Prefer simplicity? Make it a `check` = "prayed all 5 today."
- **#3 / #4 / #8 / #10** are `timer` kind purely so they land in the right day-part section *and* let you
  track elapsed minutes. If you don't care about the section, a `check` is lower friction.
- The two deep-work *Core/Stretch* blocks and the office blocks are intentionally **not** habits — track
  those in the schedule view; the single "Deep-work learning block" streak is what protects the plan.

---

## 3. Pills

A **full tiered stack** tuned to this lifestyle: a 04:30 rise, CrossFit 3×/week, two deep-work blocks,
and a 7.5 h sleep target. Add each as a pill (name only) and tick it on the 7-day grid. Timing is baked
into the name because the pill model has no schedule field.

> ⚠️ **Not medical advice.** Get bloodwork first (at minimum: vitamin D, B12, ferritin, lipid panel)
> and confirm with a doctor — especially before creatine if you have any kidney concern, and before
> ashwagandha if you have thyroid issues. Introduce **one supplement at a time** so you can attribute
> effects. Look for **halal-certified** brands (gelatin capsules → choose veg-cap or halal versions;
> creatine, fish oil, and most powders are fine). Food first; supplements fill gaps, they don't replace
> protein, sleep, or sunlight.

### Tier 1 — Core daily (the foundation)

| Pill name to create | Dose / timing | Why |
|---|---|---|
| `Vitamin D3 + K2 (AM)` | 2,000–4,000 IU D3, morning with a fatty meal | Near-universal deficiency for indoor / early-rise workers; K2 directs calcium. Supports mood, immunity, bone. |
| `Omega-3 (EPA/DHA)` | ~1–2 g combined EPA+DHA/day | Recovery, joint and brain support for the CrossFit + deep-work load. |
| `Magnesium glycinate (PM)` | 200–400 mg, evening | Sleep quality and muscle recovery — directly serves the 7.5 h sleep target. Glycinate form is gentle on the gut. |
| `Creatine monohydrate` | 5 g/day, any time, daily | The most-evidenced sports supplement: strength, power, **and** cognition. No loading needed. |

### Tier 2 — Training & recovery

| Pill name to create | Dose / timing | Why |
|---|---|---|
| `Whey protein` | 1–2 scoops, post-CrossFit or to fill the day | Hit 1.6–2.2 g/kg protein (habit #9) when whole food falls short. Whey is fine; vegans → pea/soy blend. |
| `Electrolytes (around CrossFit)` | Sodium + potassium + magnesium, intra/post-session | Early/fasted training and sweat loss; protects performance and next-day recovery. |
| `Zinc (optional)` | 15–25 mg, with food, *not* daily-forever | Common in active men if intake is low; pairs with magnesium. Don't megadose — cycle it. |

### Tier 3 — Optional / cognitive / situational

| Pill name to create | Dose / timing | Why |
|---|---|---|
| `L-theanine + caffeine` | 100–200 mg L-theanine : 50–100 mg caffeine, before deep work | Smooths caffeine's focus for the 05:05 block without the jitter/crash. |
| `Caffeine (deep-work only)` | timed for the morning block, **none after ~14:00** | Protects the qailūlah nap and the 7.5 h sleep total. |
| `B12 / B-complex (optional)` | morning, if energy dips or red-meat intake is low | Energy metabolism; cheap insurance if bloodwork shows a gap. |
| `Ashwagandha (cycle)` | 300–600 mg KSM-66, evening, 6–8 wks on / off | Situational stress + sleep support during heavy capstone months. Skip if thyroid issues. |

---

## Quick build checklist

1. **Goals** — create the North Star, then add the 7 capstones, 4 outcome goals, and the Daily
   Operating System as sub-goals of it.
2. **Habits** — create the 11 keystone habits, each pointed at its goal (timer habits get a time).
3. **Pills** — create the Tier 1 four first; add Tier 2/3 one at a time after bloodwork.
4. Re-read the plan's **"What success looks like by Month 7"** checklist at each weekly review (habit #7).
