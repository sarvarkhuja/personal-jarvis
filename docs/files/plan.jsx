import React, { useState, useEffect, useCallback } from "react";
import {
  Sunrise, Sun, CloudSun, Sunset, Moon, BookOpen, GraduationCap, Briefcase,
  Utensils, BedDouble, Dumbbell, NotebookPen, Sofa, Coffee, Footprints,
  Check, RotateCcw, ChevronLeft, ChevronRight, Target, Flame, Trophy,
  Info, X, CalendarDays, HeartPulse,
} from "lucide-react";

/* ----------------------------- safe storage ----------------------------- */
const store = {
  async get(k) {
    try { if (typeof window !== "undefined" && window.storage) { const r = await window.storage.get(k); return r ? r.value : null; } } catch (_) {}
    return null;
  },
  async set(k, v) {
    try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(k, v); } } catch (_) {}
  },
};

/* ------------------------------ type styles ------------------------------ */
const TYPE = {
  spiritual: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", label: "Spiritual" },
  prayer:    { dot: "bg-teal-500",    chip: "bg-teal-50 text-teal-700",       label: "Salah" },
  learn:     { dot: "bg-indigo-500",  chip: "bg-indigo-50 text-indigo-700",   label: "Deep work" },
  work:      { dot: "bg-slate-500",   chip: "bg-slate-100 text-slate-700",    label: "Office" },
  meal:      { dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700",     label: "Meal" },
  nap:       { dot: "bg-violet-500",  chip: "bg-violet-50 text-violet-700",   label: "Nap" },
  train:     { dot: "bg-rose-500",    chip: "bg-rose-50 text-rose-700",       label: "Training" },
  review:    { dot: "bg-sky-500",     chip: "bg-sky-50 text-sky-700",         label: "Review" },
  rest:      { dot: "bg-stone-400",   chip: "bg-stone-100 text-stone-600",    label: "Recovery" },
  free:      { dot: "bg-stone-300",   chip: "bg-stone-50 text-stone-500",     label: "Free" },
  sleep:     { dot: "bg-zinc-500",    chip: "bg-zinc-100 text-zinc-600",      label: "Sleep" },
};
const TYPE_ICON = {
  spiritual: BookOpen, prayer: Sun, learn: GraduationCap, work: Briefcase,
  meal: Utensils, nap: BedDouble, train: Dumbbell, review: NotebookPen,
  rest: Sofa, free: Coffee, sleep: Moon,
};

/* ------------------------------ schedule data ---------------------------- */
const morning = [
  { time: "04:30", title: "Fajr", type: "prayer", icon: Sunrise, note: "Wake & pray — start the day, no going back to sleep" },
  { time: "04:50", title: "Qur'an & intention", type: "spiritual", note: "20 min · set today's one main focus" },
  { time: "05:05 – 06:35", title: "Deep Work A — Learning", type: "learn", note: "Peak focus · the hardest task of the day" },
  { time: "06:35 – 07:00", title: "Breakfast", type: "meal" },
];

const weekdayDaytime = [
  { time: "07:00 – 09:00", title: "Office — Block 1", type: "work", note: "Focused work (2h)" },
  { time: "09:15 – 11:15", title: "Deep Work B — Learning", type: "learn", note: "This week's Core exercise (2h)" },
  { time: "11:15 – 13:00", title: "Office — Block 2", type: "work", note: "Focused work (1h 45m)" },
  { time: "13:00", title: "Dhuhr", type: "prayer", icon: Sun },
  { time: "13:10 – 14:00", title: "Lunch", type: "meal" },
  { time: "14:00 – 15:15", title: "Office — Block 3", type: "work", note: "Wrap up — 5 office hours done" },
];

const eveningRest = [
  { time: "15:15 – 16:30", title: "Light review & writing", type: "review", note: "Flashcards · 200-word learning log" },
  { time: "16:30", title: "Asr", type: "prayer", icon: CloudSun },
  { time: "16:45 – 18:30", title: "Qailūlah (nap)", type: "nap", note: "1h 45m · recover the early start" },
  { time: "18:30 – 20:00", title: "Free · family · mobility", type: "free" },
  { time: "20:00", title: "Maghrib", type: "prayer", icon: Sunset },
  { time: "20:10 – 20:50", title: "Dinner", type: "meal" },
  { time: "20:50 – 21:30", title: "Reading — DDIA / AI Engineering", type: "review", note: "Optional · 1 chapter" },
  { time: "21:30", title: "Isha", type: "prayer", icon: Moon },
  { time: "22:00", title: "Wind down → sleep", type: "sleep", note: "Lights out ~22:30 · ≈7.5h with the nap" },
];

const eveningTrain = (focus) => [
  { time: "15:15 – 16:30", title: "Light recovery / free", type: "rest", note: "Keep it light — protect tonight's session" },
  { time: "16:30", title: "Asr", type: "prayer", icon: CloudSun },
  { time: "16:45 – 18:15", title: "Qailūlah (nap)", type: "nap", note: "1h 30m" },
  { time: "18:15 – 18:45", title: "Pre-workout meal", type: "meal", note: "Carbs + protein" },
  { time: "19:00 – 21:00", title: "CrossFit", type: "train", note: focus },
  { time: "21:00", title: "Maghrib", type: "prayer", icon: Sunset, note: "Pray right after class" },
  { time: "21:05 – 21:30", title: "Post-workout dinner", type: "meal", note: "Protein + carbs for recovery" },
  { time: "21:30", title: "Isha", type: "prayer", icon: Moon },
  { time: "22:00", title: "Wind down → sleep", type: "sleep", note: "≈7.25h with the nap — extend a little if you can" },
];

const saturday = [
  ...morning,
  { time: "07:00 – 09:00", title: "Deep Work B — Learning", type: "learn", note: "Core / Stretch (2h)" },
  { time: "09:15 – 11:15", title: "Deep Work C — Learning", type: "learn", note: "Stretch · build the artifact (2h)" },
  { time: "11:15 – 13:00", title: "Build & ship → push to GitHub", type: "learn", note: "Commit code · open a PR" },
  { time: "13:00", title: "Dhuhr", type: "prayer", icon: Sun },
  { time: "13:10 – 14:00", title: "Lunch", type: "meal" },
  { time: "14:00 – 15:30", title: "Write-up / blog draft", type: "review", note: "Document what you built" },
  { time: "15:30 – 16:30", title: "Buffer · errands", type: "free" },
  { time: "16:30", title: "Asr", type: "prayer", icon: CloudSun },
  { time: "16:45 – 18:15", title: "Qailūlah (nap)", type: "nap", note: "1h 30m" },
  { time: "18:15 – 18:45", title: "Pre-workout meal", type: "meal", note: "Carbs + protein" },
  { time: "19:00 – 21:00", title: "CrossFit", type: "train", note: "Full-body · Olympic lifts + conditioning" },
  { time: "21:00", title: "Maghrib", type: "prayer", icon: Sunset, note: "Pray right after class" },
  { time: "21:05 – 21:30", title: "Post-workout dinner", type: "meal", note: "Protein + carbs" },
  { time: "21:30", title: "Isha", type: "prayer", icon: Moon },
  { time: "22:00", title: "Wind down → sleep", type: "sleep" },
];

const sunday = [
  ...morning,
  { time: "07:00 – 09:00", title: "Deep Work B — Learning", type: "learn", note: "Core / Stretch (2h)" },
  { time: "09:15 – 11:00", title: "Deep Work C — Learning", type: "learn", note: "Finish the week's Stretch" },
  { time: "11:00 – 12:30", title: "Catch-up & loose ends", type: "learn", note: "Anything that slipped this week" },
  { time: "12:30 – 13:00", title: "Active recovery — walk / mobility", type: "rest", icon: Footprints, note: "Light movement only (full rest from lifting)" },
  { time: "13:00", title: "Dhuhr", type: "prayer", icon: Sun },
  { time: "13:10 – 14:00", title: "Lunch", type: "meal" },
  { time: "14:00 – 15:00", title: "Light reading", type: "review" },
  { time: "15:00 – 16:30", title: "Free · family", type: "free" },
  { time: "16:30", title: "Asr", type: "prayer", icon: CloudSun },
  { time: "16:45 – 18:15", title: "Qailūlah (nap)", type: "nap" },
  { time: "18:30 – 20:00", title: "Family · rest", type: "free" },
  { time: "20:00", title: "Maghrib", type: "prayer", icon: Sunset },
  { time: "20:10 – 20:50", title: "Dinner", type: "meal" },
  { time: "20:50 – 21:30", title: "Weekly review & plan", type: "review", note: "Log training PRs · pick next topic · set next week's blocks" },
  { time: "21:30", title: "Isha", type: "prayer", icon: Moon },
  { time: "22:00", title: "Wind down → sleep", type: "sleep", note: "Full rest day — recover for Monday" },
];

const DAYS = {
  mon: { label: "Mon", train: true,  off: false, blocks: [...morning, ...weekdayDaytime, ...eveningTrain("Lower / posterior focus — push the strength portion")] },
  tue: { label: "Tue", train: false, off: false, blocks: [...morning, ...weekdayDaytime, ...eveningRest] },
  wed: { label: "Wed", train: true,  off: false, blocks: [...morning, ...weekdayDaytime, ...eveningTrain("Upper push-pull focus — press strength + accessories")] },
  thu: { label: "Thu", train: false, off: false, blocks: [...morning, ...weekdayDaytime, ...eveningRest] },
  fri: { label: "Fri", train: false, off: false, blocks: [...morning, ...weekdayDaytime, ...eveningRest] },
  sat: { label: "Sat", train: true,  off: true,  blocks: saturday },
  sun: { label: "Sun", train: false, off: true,  blocks: sunday },
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const JS_TO_KEY = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };

/* ------------------------------ learning data ---------------------------- */
const TOPICS = {
  1: {
    name: "Foundations — Linux, Networking, Shell, Git",
    warmup: "Clone trimstray/the-book-of-secret-knowledge. Pick 10 CLI / networking commands you've never used (tcpdump, ss, ip route, nft, mtr, dig +trace…). Write a paragraph on each → push as cli-notes.md.",
    core: "Spin up a €5 Hetzner VPS. Write a ~200-line bash hardening script (non-root user, SSH keys only, ufw, fail2ban, unattended-upgrades, Docker, Caddy). Run it cold-boot → ready on 3 fresh VPSes in <5 min each → public vps-playbook repo.",
    stretch: "Build a homelab: Caddy reverse proxy, Tailscale mesh, Watchtower, Uptime Kuma, a Gitea mirror + one self-hosted service you actually use. Write a \"Day 1 onboarding guide\". Tip: your Proxmox guide is a great basis for an even more ambitious bare-metal version.",
    ship: "Public vps-playbook repo + a reusable one-page playbook.",
    read: "Julia Evans' networking zines (wizardzines.com).",
  },
  2: {
    name: "Databases & SQL — Postgres, Redis, DuckDB",
    warmup: "Finish Kaggle Advanced SQL end to end → push the annotated notebook to a sql-portfolio repo.",
    core: "Load a Stack Exchange dump into Postgres. Write 20 progressively harder queries (joins → windows → CTEs → recursive → gaps-and-islands); EXPLAIN ANALYZE each; solve keyset pagination (page 10,000 of 10M rows in <50ms) → BENCHMARKS.md.",
    stretch: "Read src/backend/optimizer/README. Force seq-scan vs index-scan vs bitmap-heap plans on a 10M-row table; predict and explain the planner's choice with cost numbers. Bonus: a docs / typo PR to postgres/postgres.",
    ship: "sql-portfolio repo + BENCHMARKS.md.",
    read: "Markus Winand — Use The Index, Luke! (use-the-index-luke.com).",
  },
  3: {
    name: "Containers, Kubernetes, CI/CD",
    warmup: "Hand-write multi-stage Dockerfiles (no AI) for a FastAPI, a .NET and a Go service. Take one image from 1.2GB+ down to <100MB → DOCKER_OPTIMIZATION.md.",
    core: "Take a 3-service awesome-compose stack → raw Kubernetes YAML (Deployments, Services, ConfigMaps, Secrets, Ingress, probes, limits). Deploy to kind, then a real managed cluster. No Helm yet.",
    stretch: "Walk kubernetes-the-hard-way on Multipass; kill the controller-manager and watch. Then a GitHub Actions pipeline: lint → test → build → Trivy → GHCR → deploy. Break it three ways on purpose, fix each in <10 min.",
    ship: "Manifests repo + a working CI/CD pipeline.",
    read: "Nigel Poulton — The Kubernetes Book.",
  },
  4: {
    name: "Observability & SRE",
    warmup: "Stand up the Grafana LGTM stack (Grafana + Loki + Tempo + Prometheus + OTel Collector) with one green dashboard before any app code → lgtm-starter repo.",
    core: "Instrument your VPS service with OpenTelemetry: traces (user_id, request_id), RED metrics, JSON logs with trace IDs. Define one SLO (99.5% < 300ms over 30d); build a multi-window burn-rate alert.",
    stretch: "Inject 5 failures (slow DB, memory leak, dependency timeout, partial outage, bad deploy). Write an SRE-style postmortem for each → POSTMORTEMS.md.",
    ship: "Instrumented service + POSTMORTEMS.md.",
    read: "Google SRE Books — Chapter 6 (sre.google/books).",
  },
  5: {
    name: "Backend — APIs, Async Python, Security",
    warmup: "Clone fastapi/full-stack-fastapi-template, run it locally with Docker, and document 5 design decisions you'd make differently for production, with rationale.",
    core: "Build a FastAPI service with sync and async paths for the same endpoint (slow external API vs httpx.AsyncClient + anyio.gather). Load-test both with k6 at 1k RPS and profile with py-spy → BENCHMARK.md: where async wins, where it doesn't, and why (GIL, event loop, I/O vs CPU), with flame graphs.",
    stretch: "Audit your service line-by-line against zhanymkanov/fastapi-best-practices + the OWASP API Top 10 (find ≥10 deviations). Run ZAP + Trivy + Semgrep and fix everything in one PR with a SECURITY.md. Blog: \"10 things I was doing wrong in my FastAPI services.\"",
    ship: "A hardened FastAPI service + BENCHMARK.md + the blog post.",
    read: "High Performance Python (3rd ed.) — the asyncio chapters.",
  },
  6: {
    name: "Data Engineering — Spark, Airflow, dbt, Delta Lake",
    warmup: "Complete DataExpert-io/data-engineer-handbook Week 1 (dimensional modeling); push the SQL + diagrams to your portfolio.",
    core: "Build a daily NYC Taxi pipeline: PySpark ingest from raw Parquet → Delta Lake bronze/silver/gold → dbt models with unique/not_null/relationships tests → Airflow DAG (retries, sensors, SLA) → Grafana dashboard on the gold table. Document in ARCHITECTURE.md with a dataflow diagram.",
    stretch: "Reproduce dbt-labs/jaffle-shop on your own GitHub events (commits, issues, PRs, stars): full 3-layer model + SCD Type-2 snapshots on repo_state + dbt docs, deployed to a free BigQuery sandbox. Blog: \"Modeling my own GitHub activity as a data warehouse.\"",
    ship: "data-pipeline-lab repo (PySpark + Airflow, bonus on Databricks Community).",
    read: "Andreas Kretz — The Data Engineering Cookbook (free PDF).",
  },
  7: {
    name: "Distributed Systems & Messaging",
    warmup: "Read the Raft paper and watch the Secret Lives of Data visualization; sketch the leader-election + log-replication flows on paper in your own diagrams.",
    core: "Take 3 designs from system-design-primer (URL shortener, distributed rate limiter, news feed). For each: whiteboard first (no peeking), capacity-estimate, sketch data model + API + components + failure modes, then compare to the reference — ≥3 explicit tradeoffs each → system-design-notebook.",
    stretch: "Build the transactional outbox pattern across two services on Kafka: Service A writes the order + an outbox row in one transaction, a relay publishes, Service B consumes idempotently with a dedupe table. Crash A mid-transaction, the relay mid-publish, and B mid-processing — prove no message is lost or double-applied.",
    ship: "messaging-lab repo (both brokers, outbox, both saga variants) with ARCHITECTURE.md diagrams.",
    read: "Kleppmann — \"Please stop calling databases CP or AP\" (+ DDIA ch. 5, 7–9).",
  },
  8: {
    name: "Math & Statistics for ML",
    warmup: "Read MML book chapter 2 (Linear Algebra) end to end; work every exercise by hand → mml-chapter-2.ipynb.",
    core: "Implement SVD and PCA from scratch in NumPy and verify against numpy.linalg.svd + sklearn PCA. Build gradient descent + a 100-line autograd engine. Add KL divergence and cross-entropy by hand, verified against scipy.special.rel_entr → math-from-scratch repo.",
    stretch: "Pick a recent NeurIPS/ICML/ICLR paper with non-trivial linear algebra (attention math, Sinkhorn, low-rank). Annotate every equation in your own words at high-school+ level. Blog: \"The math in [paper], explained line by line.\"",
    ship: "math-from-scratch repo (SVD, PCA, autograd, KL/cross-entropy notebooks).",
    read: "Cosma Shalizi — Advanced Data Analysis from an Elementary Point of View (free).",
  },
  9: {
    name: "Classical Machine Learning",
    warmup: "Complete Kaggle Intermediate ML; submit Titanic using a full sklearn Pipeline + ColumnTransformer (no notebook-as-script, no df['x']=… mutations) — a clean run from raw CSV to submission.",
    core: "Enter an active Kaggle tabular competition (or House Prices). Train XGBoost + LightGBM + CatBoost tuned with Optuna; add probability calibration (isotonic + Platt); handle imbalance (SMOTE vs class weights); compute SHAP + partial dependence. Aim top 20% → MODELING.md including the failures.",
    stretch: "From eugeneyan/applied-ml, pick a company case study (Stitch Fix, Booking.com, Uber Michelangelo); read every linked post, then reproduce it at tiny scale on a Kaggle dataset. Blog: \"Reproducing [Company]'s ML approach on a public dataset.\"",
    ship: "tabular-ml repo (pipelines, sweeps, calibration, SHAP) scored on a public leaderboard.",
    read: "Chip Huyen — Designing Machine Learning Systems.",
  },
  10: {
    name: "Experimentation & Causal Inference",
    warmup: "Complete the first 5 chapters of matheusfacure/python-causality-handbook, exercises included → causal-inference-fundamentals.ipynb.",
    core: "Design a full A/B test for a real question: sample-size from baseline + MDE + α + β, primary + 2 secondary + guardrail metrics. Simulate it, including a naive-peeking scenario that inflates Type-I error past 30%, then fix it with sequential testing (mSPRT) → ab-test-design.ipynb.",
    stretch: "On the Lalonde NSW dataset, estimate the ATT four ways — naive OLS, propensity-score matching, IPW, and double ML (econml.DML) — vs the experimental ground truth. Explain why OLS lies and what each method assumes. Blog: \"Why OLS lies to you, and what to do about it.\"",
    ship: "experimentation-lab repo + a one-page decision tree: A/B vs switchback vs MAB vs causal.",
    read: "Kohavi/Tang/Xu — Trustworthy Online Controlled Experiments.",
  },
  11: {
    name: "Recommender Systems",
    warmup: "Run microsoft/recommenders' SAR notebook on MovieLens-1M; get top-N for 10 users and compare against a most-popular baseline — note who personalization beats popularity for, and who it doesn't.",
    core: "Build a two-tower retriever in PyTorch (user + item towers, in-batch negatives, sampled softmax) on MovieLens-25M / H&M. Index item embeddings with FAISS, ScaNN, and HNSW and benchmark recall@k vs latency. Add a LightGBM LambdaRank re-ranker; evaluate NDCG@10, MAP, MRR → two-tower-recsys.",
    stretch: "Reproduce PinnerSAGE at small scale on Steam reviews (~30k items, ~5M reviews): random-walk + GraphSAGE item embeddings, content-based cold-start blending, and an online-vs-offline eval showing NDCG gains don't always lift CTR. Blog: \"What I learned building a tiny PinnerSAGE.\"",
    ship: "recsys-lab repo + a \"two-tower from scratch\" write-up.",
    read: "Pinterest's PinnerSAGE blog post + the Two-Tower paper (Yi et al. 2019).",
  },
  12: {
    name: "Deep Learning Fundamentals",
    warmup: "Clone karpathy/micrograd, read every line, add inline comments. On a 2-input → 1-output toy, verify your autograd produces bit-identical gradients to PyTorch. Push your annotated fork.",
    core: "Watch Karpathy's Zero-to-Hero lectures 1–3 and reproduce makemore chapters 1–3 from scratch (pause, type your own, then compare); reach his loss numbers and add one experiment of your own → fork + MY_EXPERIMENTS.md.",
    stretch: "Train a CNN on CIFAR-10 to >88% test accuracy using only your own micrograd-style framework — convolution, max-pool, batch/layer norm, dropout, Adam, and a data loader all from scratch. Write up vanishing gradients / dead ReLU / exploding loss + fixes → LESSONS.md.",
    ship: "A ~500-line mininet framework + an MNIST notebook hitting 98% with your own optimizer.",
    read: "Karpathy — A Recipe for Training Neural Networks.",
  },
  13: {
    name: "Transformers & Large Language Models",
    warmup: "Clone karpathy/nanoGPT; read model.py and train.py line by line and annotate the attention math, position embeddings, training loop, and optimizer config. Push your annotated fork.",
    core: "Train nanoGPT on TinyShakespeare to the canonical loss on a single GPU, then swap to a personal dataset (your writing, a public-domain author). Tune context length, embed dim, layers, LR; log curves + samples → TRAINING_LOG.md + a model card.",
    stretch: "Complete Stanford CS336 Assignment 1 from the skeleton + lectures only: BPE tokenizer, scaled dot-product + multi-head attention, RoPE, a full transformer block, training loop, and decoding — all from scratch (rasbt/LLMs-from-scratch only as an after-the-fact reference) → cs336-a1 repo.",
    ship: "tiny-transformer repo + generated text + a \"what I now understand about attention\" write-up.",
    read: "Raschka's LLM reading list + Jay Alammar's Illustrated Transformer.",
  },
  14: {
    name: "Tokenisation, Sampling, vLLM, Quantisation",
    warmup: "Implement 5 sampling strategies (greedy, temperature, top-k, top-p, min-p, repetition penalty) and plot how each changes output diversity.",
    core: "Serve a 7B model under vLLM, SGLang, and TGI on a RunPod GPU (or your RTX 4060) and benchmark throughput at batch 1 / 8 / 32. Quantise it to GPTQ-int4 and AWQ-int4 and compare quality on an MMLU subset.",
    stretch: "Implement BPE from scratch on Wikipedia text (compare merges to tiktoken). Multi-GPU fine-tune a 1B model with accelerate + FSDP on 2× GPUs and verify ZeRO-3 sharding from GPU memory; profile a forward pass with torch.profiler and explain the slowest op.",
    ship: "llm-infra-lab repo with quantisation comparisons + a vLLM-served endpoint and its tok/s.",
    read: "vLLM docs + HuggingFace \"FSDP under the hood.\"",
  },
  15: {
    name: "LLM Engineering — RAG, Fine-tuning, Inference",
    warmup: "Run 3 techniques from NirDiamant/RAG_Techniques (hybrid search, HyDE, reranking) over your own 100+ document corpus and note which visibly improve answers vs add cost for nothing → rag-techniques-on-my-notes.",
    core: "Generate a 1k-example synthetic dataset (rejection sampling, frontier-model judge) for a narrow task; fine-tune Qwen 2.5 1.5B / Llama 3.2 3B with Unsloth; build a 100-example golden eval and compare fine-tuned vs base via LLM-as-judge. Push to HuggingFace with a real model card.",
    stretch: "Build a production RAG over a real corpus: hybrid search (BM25 + dense), reranking (bge-reranker), citations with file paths + line numbers, hallucination evals, semantic caching with a near-miss safety check. Serve behind vLLM, instrument with Langfuse, deploy to K8s; document cost-per-query.",
    ship: "A production-shaped RAG service + a HuggingFace model that beats its base + a benchmark write-up.",
    read: "Anthropic — Building Effective Agents + \"Is RAG Really Dead?\"",
  },
  16: {
    name: "Evaluations & LLM Observability",
    warmup: "Install promptfoo; build a 20-example suite (regex / JSON-schema checks, LLM-as-judge, pairwise) against a service you've built; run promptfoo eval from the CLI and push the config + outputs.",
    core: "For your §15 RAG, build a 100-question golden eval by difficulty (easy retrieval, multi-hop, reasoning, adversarial). Calibrate the LLM-as-judge against 50 human labels across 3 judge models and flag disagreements. Wire it into GitHub Actions so prompt changes run evals and PRs block on regressions → rag-eval-flywheel.",
    stretch: "Self-host Langfuse; instrument the RAG with full traces, cost, and token usage. Build a Grafana dashboard (p50/p95/p99 latency by query type, cost-per-query, eval score over time, recall@k) with regression alerts, and pipe production traces back into the eval set. Write-up: \"Building an eval flywheel from scratch.\"",
    ship: "eval-flywheel repo + a public dashboard showing eval scores improving over time.",
    read: "Hamel Husain — Your AI Product Needs Evals.",
  },
  17: {
    name: "Reinforcement Learning & Reasoning",
    warmup: "Run cleanrl's single-file PPO on CartPole; read every line of ppo.py and change 3 hyperparameters one at a time (LR, clip ratio, epochs), documenting what breaks first and why. Push your annotated fork.",
    core: "Write your own PPO from scratch (~300 lines, PyTorch + Gymnasium), verifying on CartPole + LunarLander against known reward curves. Then run GRPO with TRL on a GSM8K math-reasoning subset for 3–6h; plot reward vs base accuracy and document a reward-hacking failure you observed.",
    stretch: "Compete on Kaggle ConnectX with your own from-scratch PPO agent (no Stable-Baselines3); reach top-50%. Document what worked, what didn't, and where you'd go next (self-play, AlphaZero-style MCTS) — the honest debugging write-up is the portfolio piece.",
    ship: "rl-lab repo + a reward-curve plot + an honest \"what didn't work\" write-up.",
    read: "Karpathy — Deep RL: Pong from Pixels (+ the DeepSeek-R1 / GRPO papers).",
  },
  18: {
    name: "AI Agents & Tools — MCP, LangGraph, DSPy",
    warmup: "Complete huggingface/agents-course Unit 1 and build a smolagent that does one real daily task — triage your GitHub notifications, or generate your standup from git activity → daily-agent repo.",
    core: "Write an agent loop from scratch in <300 lines, no frameworks (tools: read_file, write_file, list_dir, run_bash, web_search) and make it fix one real bug in a test repo. Rebuild it on LangGraph with state, a planning step, scratchpad memory, and a test-verify loop; benchmark both on a 10-task set → agent-from-scratch-vs-langgraph.",
    stretch: "Write a custom MCP server from the spec (not a wrapper) exposing real services — calendar, Obsidian notes, read-only codebase, tasks. Connect it from Claude Desktop and document your protocol decisions + security model. Blog: \"Building a personal MCP server: what the spec doesn't tell you.\"",
    ship: "Two agent repos + a working MCP server.",
    read: "Anthropic — Building Effective Agents + the MCP spec.",
  },
  19: {
    name: "MLOps, Model Serving & Drift Monitoring",
    warmup: "Take your best model from §9, register it in MLflow with full lineage, wrap it in BentoML, serve it over HTTP, and hit it with curl — pushed so a stranger could reproduce it.",
    core: "Work the DataTalks MLOps Zoomcamp project end to end: MLflow tracking + registry, Prefect/Airflow orchestration, Evidently drift detection, and a CI/CD deploy to a kind cluster — through the final capstone module → version with LESSONS.md.",
    stretch: "Take a real model (recsys, fine-tuned LLM, or CV) to a full production deployment: MLflow registry → BentoML → Triton + ONNX → KServe on K8s (or compare KServe vs Ray Serve vs BentoML). Add scheduled Evidently drift + data-quality monitoring to Grafana with alerts → ARCHITECTURE.md with a sequence diagram.",
    ship: "A merged/pending OSS PR + a drift-monitoring repo deployed alongside a real model.",
    read: "Sculley et al. — Hidden Technical Debt in ML Systems.",
  },
  20: {
    name: "Responsible AI, EU AI Act & Compliance",
    warmup: "Read EU AI Act Articles 6–15 (high-risk obligations) + Annex IV; write a one-page summary mapping each section to the engineering work it implies (data lineage, monitoring, model cards, technical doc) → eu-ai-act-notes.md.",
    core: "Pick a portfolio model and produce a full Model Card (Mitchell et al. template) plus a fairlearn bias evaluation (demographic-parity and equalized-odds differences), documenting mitigations and residual risks → MODEL_CARD.md + BIAS_EVAL.ipynb.",
    stretch: "Write a complete EU AI Act Readiness Assessment for a high-risk product (CV screening, credit scoring, or educational assessment): risk classification, Article 9 risk management, Article 10 data governance, Articles 11+13 documentation/transparency, Article 14 human oversight, Article 15 robustness — ending in a launch-gap analysis. Blog it.",
    ship: "MODEL_CARD.md + BIAS_EVAL.ipynb + an EU AI Act Readiness Assessment post.",
    read: "Mitchell et al. — Model Cards for Model Reporting.",
  },
  21: {
    name: "System Design & Senior Engineering Skills",
    warmup: "Take the \"Design a chat application\" walkthrough; read the requirements only and whiteboard your own design first (capacity, API, data model, components, failure modes), then compare and note 3 things you missed and 3 you got right → design-doc-1-chat.md.",
    core: "Pick 5 systems from system-design-primer you haven't studied (Uber, Yelp, Twitter feed, distributed cache, key-value store); give each a 30-minute timer and write your own design doc before reading the reference, with ≥3 explicit tradeoffs each → system-design-portfolio.",
    stretch: "Write an architecture retrospective on a real system from your 8 years: what it does, scale today, decisions you'd defend, decisions you'd reverse, and what changes at 10x and 100x — with sequence + deployment diagrams. Anonymize but keep the substance; this is the most senior-shaped writing in your portfolio.",
    ship: "system-design-portfolio repo + the architecture retrospective.",
    read: "Google SRE Workbook — Postmortem Culture.",
  },
  22: {
    name: "Capstone — Backend & Infrastructure",
    warmup: "Scope the capstone: a real product (vertical AI assistant, code-review bot, domain research agent). Write a one-paragraph problem statement + a DECISIONS.md (ADR) for the stack choices.",
    core: "Stand up the backend in your strongest language: Postgres + Redis + a queue + the outbox pattern, deployed to K8s, with real OIDC auth and rate limiting.",
    stretch: "Wire CI/CD from main (lint → test → build → scan → deploy) and put it behind a reverse proxy with auto-TLS. Keep total cost under €50/month and start ARCHITECTURE.md.",
    ship: "A deployed, authenticated backend skeleton with CI/CD running.",
    read: "Reuse your own §3 / §4 / §7 repos.",
  },
  23: {
    name: "Capstone — Fine-tuned + Frontier Models",
    warmup: "Define the ML-powered feature and its golden eval set — what \"good\" means, in 50–100 examples.",
    core: "Integrate a fine-tuned model (from §15) and at least one frontier model behind a clean interface, plus the RAG layer with retrieval that's actually good (hybrid + reranking + citations).",
    stretch: "Put the evals in CI so every prompt or model change is regression-checked, add prompt-injection defenses, and instrument the LLM path with Langfuse traces + cost.",
    ship: "The ML feature live in the capstone with evals running in CI.",
    read: "Chip Huyen — AI Engineering (apply one chapter's frame per day).",
  },
  24: {
    name: "Capstone — Observability & EU AI Act",
    warmup: "Define your SLOs (latency, error rate) and the dashboards you need: logs, metrics, traces, cost, drift.",
    core: "Add full OpenTelemetry across services + Sentry on errors; wire Evidently drift monitoring on the model and cost dashboards on the LLM calls.",
    stretch: "Assemble the EU AI Act compliance package: MODEL_CARD.md + DATASHEET.md + an Annex-IV-shaped technical doc (data lineage, provenance, evaluation, monitoring, human oversight, risk, bias), with Fairlearn reports in the eval CI.",
    ship: "A fully observable capstone + its compliance package.",
    read: "EU AI Act consolidated text + Gebru et al. — Datasheets for Datasets.",
  },
  25: {
    name: "Capstone — Frontend & Ship to Users",
    warmup: "Sketch the frontend (Angular is fine; a React/SvelteKit version adds breadth) and the one user journey that matters most.",
    core: "Build the frontend, finish ARCHITECTURE.md + DECISIONS.md + THREAT_MODEL.md, and ship to real users — even ten.",
    stretch: "Watch what breaks under real use, fix the top issues, and write the launch blog post: what you built, the decisions, and what surprised you.",
    ship: "A live product with real users and complete docs.",
    read: "Google SRE Workbook — for the on-call mindset.",
  },
  26: {
    name: "Performance, Scale & Chaos",
    warmup: "Profile the capstone with py-spy / pyroscope / torch.profiler and find the actual bottleneck (not the one you assume) — then fix it.",
    core: "Load-test with k6 or Vegeta to the breaking point and tune (pools, caching, batch sizes, autoscaling) until it scales to thousands of users.",
    stretch: "Run chaos experiments on the K8s cluster (Litmus or Chaos Mesh), watch the SLOs burn, fix the weaknesses, and write a blameless postmortem with a 5-whys and action items.",
    ship: "A tuned system + a chaos-driven blameless postmortem.",
    read: "Google SRE Workbook — Postmortem Culture.",
  },
  27: {
    name: "Interview Prep — System & ML Design",
    warmup: "Run system-design mocks with the framework: requirements → estimates → API → data model → high-level → deep-dives → tradeoffs → bottlenecks → \"at 100x scale, what changes?\" (3 this week, peer or interviewing.io).",
    core: "Do ML system-design reps as a separate skill: a recommender, a search system, a fraud detector, and an LLM product — each whiteboarded end to end.",
    stretch: "Keep coding sharp with 2 mediums/day (breadth, not FAANG-L5 depth) and prep a 5-minute walkthrough for each of your monthly capstones.",
    ship: "A filled system-design-portfolio + crisp capstone walkthroughs.",
    read: "donnemartin/system-design-primer + ByteByteGo system-design-101.",
  },
  28: {
    name: "Interview Prep — Behavioral & Deep-Dives",
    warmup: "Write a story bank: 8 STAR-format stories (leadership, conflict, ambiguity, failure, technical depth, mentorship, scope-cut, pivot).",
    core: "Practice the stories out loud, record yourself, and tighten each to ~2 minutes with a clear result.",
    stretch: "Run full mock loops with a peer (system design → ML design → behavioral, back to back) and fix the weakest segment.",
    ship: "A rehearsed story bank + a clean mock-loop run.",
    read: "Your own DECISIONS.md / postmortems — your best behavioral material.",
  },
  29: {
    name: "Positioning — CV, Profile & Portfolio",
    warmup: "Rewrite your CV to lead with shipped artifacts, not titles — one bullet per capstone.",
    core: "Rewrite your LinkedIn headline (\"Senior ML Engineer | LLMs in production | EU AI Act-aware\") and stand up a simple portfolio site on your VPS: one card per capstone linking to repo + write-up.",
    stretch: "Pick 5 EU + 5 Djinni companies you actually want and write a tailored cover note for each, tied to their stack and a relevant capstone.",
    ship: "A shipped CV, profile, portfolio site, and 10 tailored notes.",
    read: "The job posts of your 10 target companies — mirror their language.",
  },
  30: {
    name: "Ship, Apply & Reflect",
    warmup: "Polish the READMEs of your top 3 repos so a stranger gets the value in 30 seconds.",
    core: "Submit applications to your target list, start outreach, and track responses.",
    stretch: "Write the 7th long-form post — a reflection on the 7-month journey: what compounded, what you'd cut, and what you'd tell someone starting.",
    ship: "Applications out + 7 blog posts live + a public proof-of-work trail.",
    read: "Re-read the roadmap's \"What success looks like by Month 7\" checklist.",
  },
};
const MAX_WEEK = 30;
const phaseForWeek = (w) => {
  if (w <= 4) return "Month 1 · Foundations & Infrastructure";
  if (w <= 8) return "Month 2 · Backend, Data & Distributed Systems";
  if (w <= 12) return "Month 3 · Classical ML & Deep Learning";
  if (w <= 16) return "Month 4 · Transformers & LLM Engineering";
  if (w <= 20) return "Month 5 · Frontier, MLOps & Responsible AI";
  if (w <= 25) return "Month 6 · System Design & Capstone";
  return "Month 7 · Scale, Interview Prep & Positioning";
};
const topicForWeek = (w) => (TOPICS[w] ? { ...TOPICS[w], seeded: true } : { name: "Open block — choose your focus", seeded: false });

/* ------------------------------ strength data ---------------------------- */
const SPLIT = [
  { day: "Mon", color: "bg-rose-500", focus: "Lower / posterior chain", main: "Back squat or deadlift variation",
    acc: ["RDLs / hip thrusts", "Walking lunges", "Hanging leg raises / core"] },
  { day: "Wed", color: "bg-sky-500", focus: "Upper — push & pull", main: "Strict / push press or bench",
    acc: ["Weighted pull-ups & rows", "Dips", "Curls + triceps"] },
  { day: "Sat", color: "bg-amber-500", focus: "Full-body — Olympic + conditioning", main: "Clean & jerk / snatch technique",
    acc: ["Weak-point work", "Grip & carries", "Core finisher"] },
];
const LIFTS = [
  { id: "squat", name: "Back squat", day: "Mon" },
  { id: "press", name: "Press / bench", day: "Wed" },
  { id: "dead",  name: "Deadlift", day: "Sat" },
];
const RECOVERY = [
  { id: "protein", t: "Protein ≈1.6–2.2 g per kg bodyweight, spread across meals" },
  { id: "postwo",  t: "Eat a protein + carb meal within ~2h of every CrossFit session" },
  { id: "sleep",   t: "≥7.5h total sleep each day (night + qailūlah nap)" },
  { id: "mobility",t: "Mobility or easy cardio on a rest day (Tue / Thu / Fri / Sun)" },
  { id: "log",     t: "Log every session — add load or a rep when you hit all your reps" },
  { id: "deload",  t: "Take a deload week every 4–6 weeks (≈60% volume)" },
];

/* ------------------------------ UI primitives ---------------------------- */
function CheckBox({ checked, onChange, large }) {
  const s = large ? "w-6 h-6" : "w-5 h-5";
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`shrink-0 ${s} rounded-md border flex items-center justify-center transition active:scale-95 ${
        checked ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-stone-300 hover:border-emerald-400"
      }`}
    >
      {checked && <Check className={large ? "w-4 h-4" : "w-3.5 h-3.5"} strokeWidth={3} />}
    </button>
  );
}

function Bar({ value }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}

/* --------------------------------- App ----------------------------------- */
export default function App() {
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(JS_TO_KEY[new Date().getDay()]);
  const [tab, setTab] = useState("schedule");
  const [checked, setChecked] = useState({});
  const [lifts, setLifts] = useState({ squat: "", press: "", dead: "" });
  const [showInfo, setShowInfo] = useState(true);

  // hydrate per-week state
  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await store.get(`state:w${week}`);
      if (!alive) return;
      try { setChecked(raw ? JSON.parse(raw) : {}); } catch (_) { setChecked({}); }
    })();
    return () => { alive = false; };
  }, [week]);

  // hydrate lifts once
  useEffect(() => {
    (async () => {
      const raw = await store.get("lifts");
      if (raw) { try { setLifts(JSON.parse(raw)); } catch (_) {} }
    })();
  }, []);

  const toggle = useCallback((key) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      store.set(`state:w${week}`, JSON.stringify(next));
      return next;
    });
  }, [week]);

  const resetDay = useCallback(() => {
    setChecked((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(`${day}:`)) delete next[k]; });
      store.set(`state:w${week}`, JSON.stringify(next));
      return next;
    });
  }, [day, week]);

  const setLift = (id, v) => {
    setLifts((prev) => {
      const next = { ...prev, [id]: v };
      store.set("lifts", JSON.stringify(next));
      return next;
    });
  };

  const blocks = DAYS[day].blocks;
  const total = blocks.length;
  const done = blocks.reduce((n, _, i) => n + (checked[`${day}:${i}`] ? 1 : 0), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const topic = topicForWeek(week);

  const font = { fontFamily: "'Outfit','Geist','Avenir Next',ui-sans-serif,system-ui,sans-serif" };

  return (
    <div style={font} className="min-h-screen w-full bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">

        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              <Flame className="w-3.5 h-3.5" /> 7-month plan
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">Senior AI/ML — Daily System</h1>
            <p className="mt-1 text-sm text-stone-500">Anchored to salah · deep-work learning · CrossFit strength</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={() => setWeek((w) => Math.max(1, w - 1))}
              className="rounded-lg p-2 hover:bg-stone-100 disabled:opacity-30" disabled={week <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-20 text-center">
              <div className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Week</div>
              <div className="text-lg font-bold leading-none">{week}</div>
            </div>
            <button type="button" onClick={() => setWeek((w) => Math.min(MAX_WEEK, w + 1))}
              className="rounded-lg p-2 hover:bg-stone-100 disabled:opacity-30" disabled={week >= MAX_WEEK}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* info banner */}
        {showInfo && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <Info className="mt-0.5 w-4 h-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              Times are <span className="font-semibold">examples anchored to typical prayer times</span> — shift every block to match your local Fajr / Dhuhr / Asr / Maghrib / Isha.
              CrossFit is assumed <span className="font-semibold">7–9 PM</span> (Mon · Wed · Sat); if yours is morning, swap it with the post-Fajr block.
              Night sleep + the afternoon nap together target <span className="font-semibold">≈7.5h</span> — keep that total even when prayer times move.
            </div>
            <button type="button" onClick={() => setShowInfo(false)} className="rounded-md p-1 hover:bg-emerald-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* tabs */}
        <div className="mt-5 inline-flex rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
          {[
            { id: "schedule", label: "Daily Schedule", icon: CalendarDays },
            { id: "learning", label: "Weekly Learning", icon: GraduationCap },
            { id: "strength", label: "Strength & Recovery", icon: HeartPulse },
          ].map((t) => {
            const Ic = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}>
                <Ic className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* ============================ SCHEDULE ============================ */}
        {tab === "schedule" && (
          <div className="mt-5">
            {/* day pills */}
            <div className="flex flex-wrap gap-2">
              {DAY_ORDER.map((d) => {
                const meta = DAYS[d];
                const active = d === day;
                return (
                  <button key={d} type="button" onClick={() => setDay(d)}
                    className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      active ? "border-stone-900 bg-stone-900 text-white"
                             : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                    }`}>
                    {meta.label}
                    {meta.train && <Dumbbell className={`w-3.5 h-3.5 ${active ? "text-rose-300" : "text-rose-500"}`} />}
                    {meta.off && <span className={`text-[10px] font-semibold uppercase ${active ? "text-stone-400" : "text-stone-400"}`}>off</span>}
                  </button>
                );
              })}
            </div>

            {/* progress */}
            <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-stone-700">
                  {DAYS[day].label} · {done}/{total} done {DAYS[day].train && <span className="ml-1 text-rose-500">· training day</span>}
                  {DAYS[day].off && !DAYS[day].train && <span className="ml-1 text-stone-400">· rest day</span>}
                </div>
                <button type="button" onClick={resetDay}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
              <Bar value={pct} />
            </div>

            {/* timeline */}
            <div className="mt-3 space-y-2">
              {blocks.map((b, i) => {
                const key = `${day}:${i}`;
                const isOn = !!checked[key];
                const Icon = b.icon || TYPE_ICON[b.type];
                const t = TYPE[b.type];
                return (
                  <div key={key}
                    className={`flex items-stretch gap-3 rounded-xl border bg-white p-3 shadow-sm transition ${
                      isOn ? "border-stone-100 opacity-60" : "border-stone-200"
                    }`}>
                    <div className={`w-1 shrink-0 self-stretch rounded-full ${t.dot}`} />
                    <CheckBox checked={isOn} onChange={() => toggle(key)} />
                    <div className="w-20 shrink-0 pt-0.5 text-right font-mono text-xs leading-tight text-stone-500">{b.time}</div>
                    <div className="min-w-0 flex-1">
                      <div className={`flex items-center gap-2 text-sm font-semibold ${isOn ? "text-stone-500 line-through" : "text-stone-900"}`}>
                        <Icon className="w-4 h-4 shrink-0 text-stone-400" />
                        <span className="truncate">{b.title}</span>
                      </div>
                      {b.note && <div className="mt-0.5 text-xs text-stone-500">{b.note}</div>}
                    </div>
                    <span className={`hidden shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block ${t.chip}`}>{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================ LEARNING ============================ */}
        {tab === "learning" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Week {week} focus</div>
                <div className="text-[11px] font-medium text-stone-400">{phaseForWeek(week)}</div>
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{topic.name}</h2>
              <p className="mt-1 text-sm text-stone-500">
                One Warm-up (slot it into a weekday), one Core (your weekday Deep Work B), one Stretch (Sat–Sun blocks). Every exercise ships a public artifact.
              </p>
              {topic.read && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span><span className="font-semibold">Must-read:</span> {topic.read}</span>
                </div>
              )}
            </div>

            {topic.seeded ? (
              <>
                {[
                  { id: "warmup", tag: "Warm-up", sub: "1–2 hr", text: topic.warmup, color: "bg-sky-50 text-sky-700" },
                  { id: "core", tag: "Core", sub: "1–2 days", text: topic.core, color: "bg-indigo-50 text-indigo-700" },
                  { id: "stretch", tag: "Stretch", sub: "multi-day", text: topic.stretch, color: "bg-rose-50 text-rose-700" },
                ].map((ex) => {
                  const key = `learn:${ex.id}`;
                  const isOn = !!checked[key];
                  return (
                    <div key={ex.id} className={`flex gap-3 rounded-xl border bg-white p-4 shadow-sm transition ${isOn ? "border-stone-100 opacity-60" : "border-stone-200"}`}>
                      <CheckBox checked={isOn} onChange={() => toggle(key)} large />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ex.color}`}>{ex.tag}</span>
                          <span className="text-xs text-stone-400">{ex.sub}</span>
                        </div>
                        <p className={`mt-1.5 text-sm leading-relaxed ${isOn ? "text-stone-400 line-through" : "text-stone-700"}`}>{ex.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-start gap-2 rounded-xl border border-stone-200 bg-stone-100 p-3 text-sm text-stone-600">
                  <Target className="mt-0.5 w-4 h-4 shrink-0 text-emerald-600" />
                  <span><span className="font-semibold">Ship this week:</span> {topic.ship}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <Info className="mt-0.5 w-4 h-4 shrink-0 text-amber-600" />
                  <span>Open the resource doc section for this topic and drop its <b>Warm-up / Core / Stretch</b> exercises in here. Tick them off as you go:</span>
                </div>
                {[
                  { id: "warmup", tag: "Warm-up", sub: "1–2 hr", color: "bg-sky-50 text-sky-700" },
                  { id: "core", tag: "Core", sub: "1–2 days", color: "bg-indigo-50 text-indigo-700" },
                  { id: "stretch", tag: "Stretch", sub: "multi-day", color: "bg-rose-50 text-rose-700" },
                ].map((ex) => {
                  const key = `learn:${ex.id}`;
                  const isOn = !!checked[key];
                  return (
                    <div key={ex.id} className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition ${isOn ? "border-stone-100 opacity-60" : "border-stone-200"}`}>
                      <CheckBox checked={isOn} onChange={() => toggle(key)} large />
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ex.color}`}>{ex.tag}</span>
                      <span className="text-xs text-stone-400">{ex.sub}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ============================ STRENGTH ============================ */}
        {tab === "strength" && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-600">
                <Dumbbell className="w-3.5 h-3.5" /> 3× / week · progressive overload
              </div>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Get stronger, keep growing</h2>
              <p className="mt-1 text-sm text-stone-500">
                CrossFit gives the engine; this layer biases it toward muscle + strength. Give each session a focus, push one main lift, and let the nap + 7.5h sleep do the building. Rest days are growth days.
              </p>
            </div>

            {/* split */}
            <div className="grid gap-3 sm:grid-cols-3">
              {SPLIT.map((s) => (
                <div key={s.day} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} />
                    <span className="font-bold">{s.day}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-stone-800">{s.focus}</div>
                  <div className="mt-2 text-xs font-medium text-stone-500">Push this lift</div>
                  <div className="text-sm text-stone-700">{s.main}</div>
                  <div className="mt-2 text-xs font-medium text-stone-500">Accessories (10–15 min after class)</div>
                  <ul className="mt-0.5 space-y-0.5 text-sm text-stone-700">
                    {s.acc.map((a) => <li key={a} className="flex gap-1.5"><span className="text-stone-300">•</span>{a}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            {/* lift tracker */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Trophy className="w-4 h-4 text-amber-500" /> Working weights (add ~2.5% or a rep when you hit all your reps)
              </div>
              <div className="mt-3 space-y-2">
                {LIFTS.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 rounded-lg border border-stone-100 bg-stone-50 p-2.5">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-stone-800">{l.name}</div>
                      <div className="text-xs text-stone-400">{l.day}</div>
                    </div>
                    <input
                      type="number" inputMode="decimal" placeholder="0"
                      value={lifts[l.id] ?? ""} onChange={(e) => setLift(l.id, e.target.value)}
                      className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-right text-sm font-semibold tabular-nums focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <span className="w-6 text-sm font-medium text-stone-400">kg</span>
                  </div>
                ))}
              </div>
            </div>

            {/* recovery checklist */}
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-stone-800">This weeks recovery & nutrition</div>
              <div className="mt-3 space-y-2">
                {RECOVERY.map((r) => {
                  const key = `str:${r.id}`;
                  const isOn = !!checked[key];
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <CheckBox checked={isOn} onChange={() => toggle(key)} />
                      <span className={`text-sm ${isOn ? "text-stone-400 line-through" : "text-stone-700"}`}>{r.t}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-stone-400">
          Progress saves per week on this device · move the week arrows to start a fresh checklist.
        </p>
      </div>
    </div>
  );
}