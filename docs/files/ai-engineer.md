# senior-ai-ml-engineer-resources-and-exercises
 
# Canonical Resources & Exercises — Senior AI/ML Engineer 7-Month Plan
 
> Topic-organized resources (GitHub + Kaggle weighted) **with calibrated exercises**. Each topic ends with three exercises: a **Warm-up** (1-2 hours, get into the codebase), a **Core** (1-2 days, ships an artifact), and a **Stretch** (multi-day, portfolio-worthy). Designed as a living companion to `senior-ai-ml-engineer-plan.md`.
> 
 
**Exercise philosophy**
 
1. **Every exercise produces an output.** A pushed commit, a blog post, a notebook, a benchmark — something verifiable.
2. **Read-then-build, not read-only.** Reading source code with no follow-up build is cosplay.
3. **Public by default.** Your GitHub becomes the proof-of-work that no CV bullet can match.
4. **Honest difficulty labels.** If you can’t finish a Stretch exercise, the gap is information — don’t skip it, downgrade it to Core, document what blocked you.
---
 
## 1. Foundations — Linux, Networking, Shell, Git
 
Non-negotiable substrate. Fluency here multiplies every later topic.
 
**GitHub**
- **jlevy/the-art-of-command-line** (~155k★) — https://github.com/jlevy/the-art-of-command-line — condensed CLI checklist.
- **trimstray/the-book-of-secret-knowledge** (~180k★) — https://github.com/trimstray/the-book-of-secret-knowledge — sysadmin/networking cheatsheets, active.
- **denysdovhan/bash-handbook** (~7k★) — https://github.com/denysdovhan/bash-handbook — bash 80/20.
- **kamranahmedse/developer-roadmap** — https://github.com/kamranahmedse/developer-roadmap — gap-finder, not a curriculum.
- **donnemartin/system-design-primer** (~348k★) — https://github.com/donnemartin/system-design-primer — networking/CDN refreshers.
**Kaggle** — Skip for this topic. Use **Linux Journey** (https://linuxjourney.com) and **TLDR pages** (https://tldr.sh) instead.
 
**One must-read** — Julia Evans’ zines (https://wizardzines.com).
 
### Exercises
 
**Warm-up (1-2 hr)** — Clone `trimstray/the-book-of-secret-knowledge`. Pick 10 CLI tools or networking commands you’ve never used (`tcpdump`, `ss`, `ip route`, `nft`, `iotop`, `mtr`, `dig +trace`, etc.). For each, write one paragraph in your own words explaining what it does and *when you’d reach for it*. Push as `cli-notes.md` to a personal `engineering-notes` repo.
 
**Core (1-2 days)** — Spin up a €5 Hetzner VPS. Write a ~200-line bash hardening script: non-root user, SSH keys only, ufw, fail2ban, unattended-upgrades, Docker, Caddy. Run it on three fresh VPSes from cold-boot to ready-state in <5 minutes each. Commit to a public `vps-playbook` repo with a README that includes a tcpdump-annotated TLS 1.3 handshake screenshot.
 
**Stretch (multi-day)** — Build a personal “homelab” on one VPS: Caddy reverse proxy, Tailscale mesh, Watchtower auto-updates, Uptime Kuma monitoring, a Gitea mirror of your repos, and one self-hosted service you actually use (Vaultwarden, Miniflux, or similar). Document everything as a “Day 1 onboarding guide” as if a teammate had to recreate it from scratch. Bonus: publish as a blog post.
 
- [ ]  Spin up a €5 Hetzner VPS. Write a 200-line bash hardening script: non-root user, SSH key only, ufw, fail2ban, unattended-upgrades, Docker installed. Run it on 3 fresh VPSes.
- [ ]  Write a systemd unit for a FastAPI service with restart policy, journal logging, healthcheck, and resource limits. Verify it survives `reboot`.
- [ ]  Capture a TLS 1.3 handshake to your VPS with `tcpdump`. Annotate every packet by hand in a markdown file.
- [ ]  Identify 3 listening services with `ss -tlnp` + `lsof -i`. Explain what each does in your notes.
- [ ]  Use `strace` to find which config file a Python script reads. Use `dig` to fetch all 6 record types for a domain.
**Ship:** Public `vps-playbook` repo with hardening script + a one-page playbook you'll reuse all year.
 
**Resources:** Julia Evans' networking zines · `man bash` · the Linux Performance tools tour by Brendan Gregg.
 
---
 
## 2. Databases & SQL — Postgres, Redis, Analytical SQL
 
A senior should read EXPLAIN plans like prose. Postgres + Redis + DuckDB is the modern default.
 
**GitHub**
- **dhamaniasad/awesome-postgres** — https://github.com/dhamaniasad/awesome-postgres — extensions, GUIs, replication.
- **postgres/postgres** — https://github.com/postgres/postgres — `src/backend/optimizer/README` is required reading once.
- **duckdb/duckdb** — https://github.com/duckdb/duckdb — modern columnar query execution.
- **redis/redis** — https://github.com/redis/redis — `src/t_*.c` files (one per data type) are a master class.
**Kaggle**
- **Intro to SQL** — https://www.kaggle.com/learn/intro-to-sql.
- **Advanced SQL** — https://www.kaggle.com/learn/advanced-sql — best for window-function fluency.
**One must-read** — Markus Winand’s **Use The Index, Luke!** (https://use-the-index-luke.com).
 
### Exercises
 
**Warm-up (1-2 hr)** — Complete the Kaggle **Advanced SQL** course end to end. Every exercise, every hidden cell. Push the notebook to a `sql-portfolio` repo with brief commentary at each step on *why* the technique works (not just that it does).
 
**Core (1-2 days)** — Download a Stack Exchange data dump (or the Stack Overflow Public Dataset on BigQuery). Write 20 progressively harder queries: simple joins → window functions → CTEs → recursive queries → gaps-and-islands. Run `EXPLAIN ANALYZE` on each in Postgres. Include the pagination challenge: page 10,000 of a 10M-row table in under 50ms using keyset pagination. Document trade-offs in a `BENCHMARKS.md`.
 
**Stretch (multi-day)** — Clone `postgres/postgres`, read `src/backend/optimizer/README`. Then on your 10M-row table, *deliberately* force three different query plans (seq-scan vs index-scan vs bitmap heap scan) using `set enable_seqscan = off` and similar knobs. For each, measure actual runtime, predict the planner’s choice with cost numbers, and explain in writing why the planner chose what it chose. Bonus: contribute a documentation fix or a typo PR to `postgres/postgres` (their `doc/` directory is great for first-time contributors).
 
- [ ]  Load the Stack Overflow dump into Postgres (~50 GB). Write 20 queries progressing join-heavy → window-function-heavy. EXPLAIN ANALYZE each.
- [ ]  Pagination challenge: 10M rows, page 10,000, under 50 ms. Solve with keyset pagination; write up why OFFSET fails.
- [ ]  Force a deadlock between two transactions on purpose. Resolve it. Document the chain from `pg_locks`.
- [ ]  Migrate a column type on a 10M-row table with zero downtime: dual-write → backfill → rename. Time each step.
- [ ]  Implement a Redis distributed lock. Read the Redlock debate. Add probabilistic early expiration to defeat cache stampedes.
- [ ]  Write 10 analytical-SQL queries: rolling averages, dense_rank, gaps-and-islands, sessionisation, cumulative distribution, top-N-per-group.
---
 
## 3. Containers, Kubernetes, CI/CD
 
You don’t need to be a K8s wizard, but you must debug a `CrashLoopBackOff` at 2am.
 
**GitHub**
- **kelseyhightower/kubernetes-the-hard-way** (~42k★) — https://github.com/kelseyhightower/kubernetes-the-hard-way — manual cluster provisioning.
- **docker/awesome-compose** — https://github.com/docker/awesome-compose — production-shaped compose stacks.
- **kubernetes/examples** — https://github.com/kubernetes/examples — official YAML examples.
- **actions/starter-workflows** — https://github.com/actions/starter-workflows — reference GitHub Actions.
**Kaggle** — No good content. Use **KodeKloud free labs** + **CNCF YouTube**.
 
**One must-read** — Nigel Poulton, *The Kubernetes Book* (paid, ~$15).
 
### Exercises
 
**Warm-up (1-2 hr)** — Hand-write Dockerfiles (no AI assist) for a Python FastAPI service, a .NET API, and a Go service. Use multi-stage builds + BuildKit cache mounts. Take any one image from 1.2 GB+ down to under 100 MB. Push to GHCR. Document the size-reduction steps as `DOCKER_OPTIMIZATION.md`.
 
**Core (1-2 days)** — Pick any 3-service stack from `docker/awesome-compose` (e.g., Nginx + Flask + Postgres). Convert it to raw Kubernetes YAML: Deployments, Services, ConfigMaps, Secrets, Ingress, liveness/readiness probes, resource requests/limits. Deploy to `kind` first, then to a real DigitalOcean managed cluster (€20/mo). No Helm yet. Push the manifests + a README explaining each resource.
 
**Stretch (multi-day)** — Walk through `kelseyhightower/kubernetes-the-hard-way` on a local Multipass setup (free, faster than GCP, identical learning). Spin up control plane and workers by hand. When it works, deliberately kill the controller-manager pod and observe what happens. Document each step with screenshots. Then write a GitHub Actions pipeline that lints → tests → builds → Trivy-scans → pushes to GHCR → deploys via SSH or Argo CD. Break it three different ways on purpose and fix each in under 10 minutes.
 
- [ ]  Hand-write Dockerfiles (no AI assist) for Python, .NET, Node, Go. Use multi-stage builds + BuildKit cache mounts. Shrink one image from 1.2 GB to under 100 MB.
- [ ]  docker-compose stack: Postgres + Redis + API + nginx + Grafana + Prometheus, with healthchecks and `depends_on` conditions.
- [ ]  Install `kind`. Deploy a 3-service app — pods, deployments, services, ingress, configmaps, secrets, probes. Raw YAML, no Helm yet.
- [ ]  GitHub Actions pipeline: lint → test → build → Trivy scan → push to GHCR → deploy via SSH. Add a matrix build and a reusable workflow.
- [ ]  Break your own pipeline three ways (bad cache, missing secret, failing test). Fix each in under 10 minutes.
---
 
## 4. Observability & SRE
 
If you can’t see your system, you don’t own it.
 
**GitHub**
- **open-telemetry/opentelemetry-python** — https://github.com/open-telemetry/opentelemetry-python.
- **grafana/grafana** + **grafana/loki** + **grafana/tempo** — https://github.com/grafana.
- **prometheus/prometheus** — https://github.com/prometheus/prometheus — read `docs/querying/basics.md`.
- **adriannovegil/awesome-observability** — https://github.com/adriannovegil/awesome-observability.
**Kaggle** — Skip.
 
**One must-read** — Google’s **SRE Books**, Chapter 6 (https://sre.google/books/).
 
### Exercises
 
**Warm-up (1-2 hr)** — Stand up the full Grafana LGTM stack with docker-compose: Grafana + Loki + Tempo + Mimir/Prometheus + OTel Collector. Get a green dashboard before any application code exists. Push the compose file + dashboard JSON to a `lgtm-starter` repo.
 
**Core (1-2 days)** — Take your VPS service from §1 (or any FastAPI app). Instrument with OpenTelemetry: traces with `user_id` and `request_id` span attributes; RED metrics (rate, errors, duration) as a Prometheus counter + histogram; structured JSON logs with trace correlation IDs. Define one SLO (99.5% of requests under 300ms over 30 days). Build a multi-window burn-rate alert (1h-fast / 6h-slow).
 
**Stretch (multi-day)** — Inject five different failures into your service: slow DB, memory leak, dependency timeout, partial outage, bad deploy. Watch each surface in your dashboards. Write a Google-SRE-Workbook-style postmortem for *each* failure: timeline, impact, root cause, contributing factors, action items. Publish them as `POSTMORTEMS.md` in the repo. This is the single most senior-shaped writing skill you can develop.
 
- [ ]  docker-compose: Grafana + Loki + Tempo + Prometheus + OTel Collector. One green dashboard before adding code.
- [ ]  Instrument your service: OTel traces with `user_id` / `request_id` attributes; RED metrics; structured JSON logs correlated to traces.
- [ ]  Define an SLO (99.5% of requests under 300 ms over 30 days). Build a 1h-fast / 6h-slow burn-rate alert.
- [ ]  Inject 5 failures (slow DB, memory leak, dependency timeout, partial outage, bad deploy). Write a runbook for each.
- [ ]  A real deployed service of your choice (feed reader, expense tracker, link shortener with analytics). Postgres + Redis, Dockerised, CI/CD from `main`, on your VPS behind Caddy with auto-TLS, full observability stack co-located, Sentry on errors. Public repo, real README, blog post: *"What I shipped in Month 1; what surprised me."*
---
 
## 5. Backend — APIs, Async Python, Security
 
FastAPI + Pydantic v2 is the modern default; gRPC is the high-performance escape hatch.
 
**GitHub**
- **fastapi/fastapi** (~80k★) — https://github.com/fastapi/fastapi.
- **pydantic/pydantic** — https://github.com/pydantic/pydantic — v2 migration guide is required reading.
- **zhanymkanov/fastapi-best-practices** (~12k★) — https://github.com/zhanymkanov/fastapi-best-practices.
- **fastapi/full-stack-fastapi-template** — official scaffolding.
- **OWASP/CheatSheetSeries** — https://github.com/OWASP/CheatSheetSeries.
Google AIP · Zalando RESTful Guidelines · FastAPI advanced docs · Pydantic v2 migration guide.
 
**One must-read** — *High Performance Python* (3rd ed., 2025) — chapters on `asyncio`.
 
### Exercises
 
**Warm-up (1-2 hr)** — Clone `fastapi/full-stack-fastapi-template`. Get it running locally with Docker. Identify and document five design decisions you’d make differently for your own production app, with rationale.
 
**Core (1-2 days)** — Build a FastAPI service with both sync and async paths for the same endpoint (e.g., one calls a slow external API, the other uses `httpx.AsyncClient` + `anyio.gather`). Load-test both with `k6` at 1k RPS. Profile with `py-spy`. Write a `BENCHMARK.md` documenting where async actually wins, where it doesn’t, and *why* (Python GIL, event loop, I/O vs CPU bound). Include flame graphs.
 
**Stretch (multi-day)** — Audit your own project line by line against `zhanymkanov/fastapi-best-practices` and the OWASP API Top 10. Find at least 10 deviations (you will — the list is opinionated). Write a blog post titled *“10 things I was doing wrong in my FastAPI services.”* Bonus: run OWASP ZAP + Trivy + Semgrep against your service, file issues for everything they catch, and fix them in a single PR with a `SECURITY.md` write-up.
 
- [ ]  Build a FastAPI service with proper resource modelling, cursor pagination, idempotency keys, ETags, RFC 7807 errors. Document with OpenAPI.
- [ ]  Add the same service in gRPC. Compare wire size + latency.
- [ ]  Write an async retry/cancel/timeout wrapper for an external HTTP call (use `httpx` + `anyio`). Add a semaphore-based rate limiter.
- [ ]  Implement Pydantic v2 structured-output validation: a model that ingests messy LLM JSON and either coerces or raises with a clear path.
- [ ]  Add SSE and WebSocket endpoints that survive client reconnect.
---
 
## 6. Data Engineering — Spark, Airflow, dbt, Delta Lake
 
The bridge between “I have data” and “I have a pipeline.”
 
**GitHub**
- **DataExpert-io/data-engineer-handbook** — https://github.com/DataExpert-io/data-engineer-handbook — Zach Wilson’s bootcamp, very active.
- **igorbarinov/awesome-data-engineering** — https://github.com/igorbarinov/awesome-data-engineering — landscape (~4.5k★).
- **apache/airflow** — https://github.com/apache/airflow — `airflow/example_dags/` for canonical patterns.
- **dbt-labs/jaffle-shop** — https://github.com/dbt-labs/jaffle-shop — canonical example.
- **delta-io/delta** — https://github.com/delta-io/delta — read the protocol spec.
**Kaggle**
- **Pandas** — https://www.kaggle.com/learn/pandas — necessary baseline.
- **Data Cleaning** — https://www.kaggle.com/learn/data-cleaning.
- Dataset: **NYC Taxi Trip Records** — the canonical big-data exercise.
**One must-read** — Andreas Kretz, *The Data Engineering Cookbook* (free PDF: https://github.com/andkret/Cookbook).
 
**Resources:** OAuth 2.0 Threat Model RFC · OWASP API Top 10 · EU AI Act consolidated text · NIST AI RMF Playbook.
 
- [ ]  Run an OIDC flow end-to-end with token rotation.
- [ ]  Threat-model your own service.
- [ ]  Speak compliance vocabulary fluently (GDPR, EU AI Act phasing, NIST AI RMF).
### Exercises
 
**Warm-up (1-2 hr)** — Complete `DataExpert-io/data-engineer-handbook` Week 1 (dimensional modeling). Push the resulting SQL + diagrams to your portfolio repo.
 
**Core (1-2 days)** — Build an end-to-end daily pipeline on NYC Taxi data: PySpark ingest from raw Parquet → Delta Lake bronze/silver/gold layers → dbt models with `unique` / `not_null` / `relationships` tests → Airflow DAG with retries, sensors, SLA monitoring → Grafana dashboard reading the gold table. Run on local Docker; document in `ARCHITECTURE.md` with a dataflow diagram. This is one of the single most CV-worthy artifacts you can produce.
 
**Stretch (multi-day)** — Reproduce `dbt-labs/jaffle-shop` on a completely different domain — your own GitHub events via the public API (commits, issues, PRs, stars across your repos). Build the full three-layer dimensional model. Add SCD Type-2 snapshots on `repo_state`. Generate `dbt docs`. Deploy to a free BigQuery sandbox. Write a blog post: *“Modeling my own GitHub activity as a data warehouse.”*
 
- [ ]  Run Keycloak locally. Integrate with your FastAPI service: auth code + PKCE, refresh-token rotation, RBAC, step-up auth.
- [ ]  Run OWASP Juice Shop. Exploit and fix three vulnerabilities (SQLi, XSS, broken auth).
- [ ]  Run ZAP + Trivy + Semgrep against last month's capstone. Fix everything that's flagged.
- [ ]  Write a STRIDE threat model for your service in a `THREAT_MODEL.md`. Identify three real risks; document mitigations.
- [ ]  Read EU AI Act Articles 9–15 + Annex IV. Write a one-page summary mapping each to engineering work (data lineage, monitoring, model cards, technical doc).
- [ ]  Take a 100M-row CSV (NYC taxi or similar). Compute monthly aggregates with PySpark. Tune partition count + broadcast joins; record before/after timings.
- [ ]  Write a custom UDF and a pandas UDF; compare performance.
- [ ]  Author an Airflow DAG: extract → transform → load → notify. Use sensors (FileSensor, ExternalTaskSensor), retries, SLA, on-failure callbacks.
- [ ]  Deploy Airflow with Docker; build a custom image with your DAG + a simple Postgres backend.
- [ ]  Write a PySpark job that runs *both* on local mode and against Databricks Community Edition.
**Ship:** `data-pipeline-lab` repo: a PySpark + Airflow pipeline running on your laptop and (bonus) Databricks Community.
 
**Resources:** *Learning Spark* (2nd ed, free PDF chapters) · Astronomer's Airflow docs · Databricks Academy free tie
 
CAPSTONE PROJECT
 
*Why:* dbt + a lakehouse format is the analytical-engineering layer most ML teams now own.
 
**Objectives**
 
- Build a dbt project with tests, snapshots, and lineage docs.
- Understand Delta Lake ACID semantics and time travel.
**Exercises**
 
1. dbt Core project against DuckDB or BigQuery free tier: 3-layer dimensional model (staging, intermediate, marts), with `unique` / `not_null` / `relationships` tests + a custom singular test.
2. Add `snapshots` for SCD Type-2 history on one table.
3. Generate `dbt docs`; export the lineage graph.
4. Convert one table to Delta. Run an `UPDATE`, an `OPTIMIZE`, and a time-travel query.
5. Bonus: same dataset on Apache Iceberg via PyIceberg; note the differences.
**Capstone:** End-to-end pipeline. Source data → Spark transform → Delta Lake → dbt models → analytical views consumed by your Month 1 service. Orchestrated by Airflow. Documented data lineage. Public repo + a `DATA_DECISIONS.md` (mini-ADR file) explaining schema and tradeoffs.
 
**Resources:** *Fundamentals of Data Engineering* (Reis & Housley) · dbt Learn · Delta Lake docs.
 
---
 
## 7. Distributed Systems & Messaging
 
CAP, consensus, sagas, outbox. Kafka as the durable log; RabbitMQ as the smart broker.
 
**GitHub**
- **donnemartin/system-design-primer** (~348k★) — already listed.
- **theanalyst/awesome-distributed-systems** — https://github.com/theanalyst/awesome-distributed-systems — paper list.
- **etcd-io/raft** — https://github.com/etcd-io/raft — cleanest readable consensus code in the wild.
- **apache/kafka** — https://github.com/apache/kafka — `clients/` + `streams/` teach exactly-once.
- **ByteByteGoHq/system-design-101** (~70k★) — https://github.com/ByteByteGoHq/system-design-101.
**One must-read** — Kleppmann, *“Please stop calling databases CP or AP”* (https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html).
 
*Why:* DDIA-level fluency separates seniors from "I've used Kafka."
 
**Objectives**
 
- Internalise CAP / PACELC / consistency models / quorums / consensus.
- Solve the four classic cache problems (stampede, hot key, invalidation, negative caching).
### Exercises
 
**Warm-up (1-2 hr)** — Read the original Raft paper (https://raft.github.io/raft.pdf) and watch the *Secret Lives of Data* Raft visualization (https://thesecretlivesofdata.com/raft/). Sketch the leader-election + log-replication flows on paper in your own diagrams.
 
**Core (1-2 days)** — Pick three design exercises from `donnemartin/system-design-primer` — URL shortener, distributed rate limiter, news feed. For each: whiteboard the design first (no peeking), capacity-estimate it, sketch the data model + API + components + failure modes, *then* compare to the reference solution. Write up each in your `system-design-notebook` repo. Articulate at least three explicit tradeoffs per design.
 
**Stretch (multi-day)** — Build the **transactional outbox pattern** between two services on Kafka in your strongest language. Service A writes an order to Postgres + an event to an `outbox` table in the *same transaction*; a relay process publishes outbox entries to Kafka; Service B consumes idempotently with a dedupe table. Then deliberately crash Service A mid-transaction, crash the relay mid-publish, and crash Service B mid-processing. Prove with assertions that no message is lost and none is double-applied. This single pattern, well-implemented, marks you as senior in any backend interview.
 
- [ ]  Read DDIA chapters 5, 7, 8, 9. Write a 1-page summary of each, in your own words, with one diagram.
- [ ]  Implement Raft leader election in your language of choice. Use the Secret Lives of Data viz to verify behavior.
- [ ]  Build a cache-aside layer over Postgres. Hammer it with 500 concurrent requests after key expiry to reproduce a stampede. Implement single-flight + probabilistic early expiration; show the origin-load drop.
- [ ]  Build a hot-key resolver: client-side caching for a tiny set of identifiers, fall through to Redis for everything else.
*Why:* Once you have >1 service, this layer is the spine. The outbox pattern is the single most senior-coded pattern in CRUD apps.
 
**Objectives**
 
- Operate Kafka and RabbitMQ at the level where you can debug consumer-lag and routing problems.
- Implement transactional outbox + a saga (both choreography and orchestration variants).
**Exercises**
 
1. RabbitMQ: build direct + topic + fanout exchanges; add a DLQ + TTL + lazy queue. Crash a consumer mid-message; prove no loss.
2. Kafka (or Redpanda): write a producer + 2 consumer-group consumers; demonstrate offset replay; understand log compaction with a hands-on test.
3. Implement the **outbox pattern** in your Month 2 capstone: events get written transactionally into an `events` table, a separate publisher relays to Kafka.
4. Implement a saga across 3 services: payment → inventory → shipping. Build choreography first; refactor to orchestration. Crash at every step; verify compensation.
5. Build idempotent consumers using a deduplication table keyed by event ID.
**Ship:** `messaging-lab` repo with both brokers, the outbox pattern, and both saga variants. Diagrams in `ARCHITECTURE.md`.
 
**Resources:** *Microservices Patterns* (Richardson) chapters 4-6 · Confluent's Kafka Streams blog · "Pattern: Transactional Outbox" on microservices.io.
 
## MLOps Platforms (MLflow, W&B, SageMaker, Vertex AI) + Month 3 Capstone
 
*Why:* MUST-ADD #1 — the single most-cited cluster of vendor names in EU + Djinni JDs.
 
**Objectives**
 
- Use MLflow as a tracker + registry + serving target.
- Use W&B for experiment tracking, sweeps, and reports.
- Run one end-to-end pipeline on SageMaker AND one on Vertex AI.
**Exercises**
 
1. Train a small classifier locally; track everything in MLflow (params, metrics, artifacts). Register the best model in the registry; serve via `mlflow models serve`.
2. Reproduce the same experiment in W&B; run a Bayesian hyper-parameter sweep; export a W&B Report.
3. SageMaker pipeline: training job → Hyperparameter Tuner → Model Monitor (data quality) → endpoint → Inference Recommender. Run via SDK, not the console.
4. Vertex AI Pipelines: same shape using Kubeflow components on the GCP free tier.
5. Compare both: cost, latency, dev-loop friction. One-page write-up.
**Capstone:** Take your Month 1 + Month 2 service. Add an ML-powered feature (spam filter, anomaly detector, recommender — whatever fits your data). Train + track in MLflow + W&B; serve via Triton on K8s; deploy via Argo CD or Flux GitOps from a `main` push. Full OTel tracing across services.
 
**Resources:** MLflow docs · W&B Educational courses · SageMaker workshops · Vertex AI Pipelines codelabs.
 
---
 
## 8. Math & Statistics for ML
 
Read-the-paper level, not prove-the-theorem level.
 
**GitHub**
- **mml-book/mml-book.github.io** — https://github.com/mml-book/mml-book.github.io — free PDF, canonical.
- **fastai/numerical-linear-algebra** — https://github.com/fastai/numerical-linear-algebra — SVD/PCA on real notebooks.
- **rasbt/machine-learning-book** — https://github.com/rasbt/machine-learning-book — chapters 1-3 cover the math you need.
**Kaggle**
- **Intro to Machine Learning** — https://www.kaggle.com/learn/intro-to-machine-learning.
- Top notebook: Pedro Marcelino’s *“Comprehensive data exploration with Python”* on House Prices.
**One must-read** — Cosma Shalizi, *Advanced Data Analysis from an Elementary Point of View* (free: https://www.stat.cmu.edu/~cshalizi/ADAfaEPoV/).
 
### Exercises
 
**Warm-up (1-2 hr)** — Read MML book chapter 2 (Linear Algebra) end to end. Work every exercise by hand in a notebook. Push as `mml-chapter-2.ipynb`.
 
**Core (1-2 days)** — Implement SVD and PCA *from scratch* in NumPy from first principles, then verify on a real dataset that your output matches `numpy.linalg.svd` and `sklearn.decomposition.PCA`. Implement gradient descent + a 100-line autograd engine in NumPy. Add KL divergence and cross-entropy by hand on two distributions; verify against `scipy.special.rel_entr`. Push to a `math-from-scratch` repo with a notebook for each.
 
**Stretch (multi-day)** — Pick one paper from a recent ML conference (NeurIPS, ICML, ICLR) that uses non-trivial linear algebra (e.g., anything with attention math, Sinkhorn iterations, or low-rank decompositions). Annotate every equation in the paper in your own words, with the linear algebra and probability background spelled out at high-school+ level. Publish as a blog post: *“The math in [paper], explained line by line.”*
 
- Implement matrix multiplication, eigendecomposition, SVD, PCA — all in pure NumPy from formulas.
- Implement gradient descent, Newton's method, automatic differentiation (a 100-line autograd) from scratch.
- Probability lab: draw 100k samples from custom distributions; verify CLT empirically; implement Bayes' rule on a real spam-classification toy.
- Compute KL divergence and cross-entropy by hand on two distributions; verify against `scipy`.
- Information-theory exercise: implement Huffman coding; compute mutual information on a small dataset.
---
 
## 9. Classical Machine Learning
 
Despite LLM hype, tabular ML still wins most production problems.
 
**GitHub**
- **scikit-learn/scikit-learn** — read `Pipeline` + `ColumnTransformer` source end to end.
- **dmlc/xgboost** + **microsoft/LightGBM** + **catboost/catboost** — benchmark all three personally.
- **optuna/optuna** — modern Bayesian HPO.
- **eugeneyan/applied-ml** (~28.8k★) — https://github.com/eugeneyan/applied-ml — best “what does this look like in production” resource.
- **josephmisiti/awesome-machine-learning** — landscape map.
**Kaggle**
- **Intermediate Machine Learning** — https://www.kaggle.com/learn/intermediate-machine-learning.
- **Feature Engineering** — https://www.kaggle.com/learn/feature-engineering.
- Competitions: **Titanic**, **House Prices**, **Otto Group**.
- Top notebook: Serigne, *“Stacked Regressions to predict House Prices”*.
**One must-read** — Chip Huyen’s *Designing Machine Learning Systems* (see Top 5).
 
### Exercises
 
**Warm-up (1-2 hr)** — Complete Kaggle’s **Intermediate ML** course. Submit your Titanic solution using a full `sklearn.pipeline.Pipeline` with `ColumnTransformer` — no notebook-as-script, no `df['x'] = ...` mutations. Achieve a clean reproducible run from raw CSV to submission.
 
**Core (1-2 days)** — Enter an active Kaggle tabular competition (or **House Prices** if no active one fits). Train XGBoost + LightGBM + CatBoost with Optuna hyperparameter tuning. Add probability calibration (isotonic + Platt). Address class imbalance with SMOTE *and* with class weights, compare. Compute SHAP feature importance + partial dependence plots. Aim for top 20% on the leaderboard. Write up the *whole approach* including failures in a `MODELING.md`.
 
**Stretch (multi-day)** — From `eugeneyan/applied-ml`, pick one company case study (e.g., Stitch Fix’s recommender, Booking.com’s rankers, Uber’s Michelangelo). Read every linked blog post. Then *reproduce their approach at a tiny scale* on a Kaggle dataset of your choice. Publish as a blog post: *“Reproducing [Company]’s ML approach on a public dataset.”* This kind of write-up gets shared in EU senior-engineering circles.
 
*Why:* MUST-ADD #2. 88% of EU MLE postings mention generic ML; gradient boosting is standard. Most "AI Engineers" can't do this.
 
**Objectives**
 
- Build sklearn `Pipeline` + `ColumnTransformer` flows that are actually production-shaped.
- Tune XGBoost and LightGBM with Optuna.
- Handle calibration, imbalance, and feature drift.
**Exercises** *(combines repo `phases/02-ml-fundamentals` with vendor stacks)*
 
1. Implement linear and logistic regression from scratch in NumPy; verify gradients match sklearn.
2. Build a sklearn `Pipeline` that handles numeric + categorical + text features via `ColumnTransformer`. Wrap with custom transformers (a `BaseEstimator` subclass).
3. Take a Kaggle tabular dataset (e.g., Otto, Home Credit, IEEE Fraud). Train XGBoost + LightGBM; tune with Optuna; compare against a CatBoost baseline.
4. Address class imbalance: SMOTE, class weights, focal loss. Compare AUC + Brier score + calibration plot.
5. Calibration: train an isotonic + Platt-scaled wrapper around your boosted model. Check reliability diagram.
6. Implement SHAP feature importance; produce a partial-dependence plot.
**Ship:** A Kaggle-style notebook + a `tabular-ml` repo: pipelines, sweeps, calibration, SHAP. Score on a public leaderboard.
 
**Resources:** repo phases/02 · *Hands-On ML* (Géron) chapters 1-7 · Optuna docs · XGBoost / LightGBM docs.
 
---
 
## 10. Experimentation & Causal Inference
 
A/B testing done wrong costs companies tens of millions.
 
**GitHub**
- **matheusfacure/python-causality-handbook** — https://github.com/matheusfacure/python-causality-handbook — repo for the free book.
- **microsoft/EconML** — https://github.com/microsoft/EconML — heterogeneous treatment effects.
- **uber/causalml** — https://github.com/uber/causalml — uplift modeling, meta-learners.
- **facebook/Ax** — https://github.com/facebook/Ax — Bayesian optimization + adaptive experimentation.
**Kaggle** — Limited fit; **Riiid Answer Correctness** is the closest classic. Skip Kaggle for this topic.
 
**One must-read** — Kohavi/Tang/Xu, *Trustworthy Online Controlled Experiments* (paid; in Top 5).
 
### Exercises
 
**Warm-up (1-2 hr)** — Complete the first 5 chapters of `matheusfacure/python-causality-handbook` end to end, exercises included. Push as `causal-inference-fundamentals.ipynb`.
 
**Core (1-2 days)** — Design a complete A/B test for a real-world business question (use your own product or invent one — e.g., “does adding a button color change increase conversion?”). Compute: required sample size given baseline rate + MDE + α + β; primary + 2 secondary metrics; guardrail metrics; how to detect interaction effects. Then simulate the experiment with synthetic data, including a *peeking-with-naive-tests* scenario — show how stopping at significance inflates Type-I error to 30%+. Demonstrate the fix with sequential testing (`mSPRT`) or always-valid p-values. Push as `ab-test-design.ipynb`.
 
**Stretch (multi-day)** — Take the Lalonde NSW dataset (public, classic causal-inference benchmark with known ground truth). Estimate the ATT (average treatment effect on the treated) four different ways: naive OLS, propensity-score matching, IPW, and double machine learning (`econml.DML`). Compare to the experimental ground-truth ATT. Document *why* naive OLS gives a wildly wrong answer here and which assumptions each method relies on. Publish as a blog post: *“Why OLS lies to you, and what to do about it.”*
 
*Why:* MUST-ADD #3 — the #1 differentiator between mid and senior ML in EU interviews.
 
**Objectives**
 
- Run an A/B test correctly, including sample-size calculation and multiple-testing correction.
- Apply causal-inference methods when randomisation isn't possible.
- Choose between A/B, switchback, MAB, and bandits-with-context for the situation.
**Exercises**
 
1. Power calculation: write a function that, given baseline rate + MDE + α + β, returns required sample size. Verify with `statsmodels`.
2. Build a CUPED variance-reduction implementation; show the variance reduction on synthetic data.
3. Causal inference lab: on the Lalonde dataset, estimate ATT via OLS, propensity-score matching, IPW, and double machine learning (`econml.DoubleML`). Compare estimates.
4. Implement a multi-armed bandit (ε-greedy + UCB1 + Thompson sampling) on the MovieLens dataset; plot regret curves.
5. Implement a contextual bandit with LinUCB; compare to a flat MAB.
6. Sequential testing: implement an `mSPRT` test; show alpha control vs naive peeking.
**Ship:** `experimentation-lab` repo with all of the above as runnable notebooks + a one-page decision tree: *"When do I A/B vs switchback vs MAB vs causal?"*
 
**Resources:** Kohavi, *Trustworthy Online Controlled Experiments* (read all of it) · Matheus Facure, *Causal Inference for the Brave and True* (free online) · Sutton & Barto chapter 2 · `econml`, `DoubleML`, `dowhy` docs.
 
---
 
## 11. Recommender Systems
 
Two-tower retrieval + re-ranking is the modern stack.
 
**GitHub**
- **microsoft/recommenders** (~21k★) — https://github.com/recommenders-team/recommenders — production-grade examples.
- **facebookresearch/faiss** — https://github.com/facebookresearch/faiss — canonical billion-vector ANN.
- **NVIDIA-Merlin/Merlin** — https://github.com/NVIDIA-Merlin/Merlin — end-to-end recsys on GPU.
- **google-research/scann** — https://github.com/google-research/google-research/tree/master/scann.
- **eugeneyan/applied-ml** (recsys section).
**Kaggle**
- Competitions: **H&M Personalized Fashion Recommendations**, **OTTO – Multi-Objective Recommender**.
- Top notebook: Radek’s polars baseline for OTTO.
**One must-read** — Pinterest’s PinnerSAGE blog post.
 
### Exercises
 
**Warm-up (1-2 hr)** — Run `microsoft/recommenders` SAR (Smart Adaptive Recommendations) notebook on MovieLens-1M. Get top-N recommendations for 10 users. Compare with a baseline of “most popular items.” Note which users get personalization that beats popularity and which don’t.
 
**Core (1-2 days)** — Build a two-tower retrieval model in PyTorch on the H&M or MovieLens-25M dataset: user tower + item tower, in-batch negatives, sampled softmax. Build an ANN index over item embeddings with FAISS, ScaNN, and HNSW. Benchmark recall@k vs. latency for each. Add a LightGBM `LambdaRank` re-ranker. Evaluate NDCG@10, MAP, MRR on a held-out test split. Submit to the H&M leaderboard if active. Push as `two-tower-recsys` repo.
 
**Stretch (multi-day)** — Reproduce Pinterest’s PinnerSAGE approach (random-walk + GraphSAGE-style item embeddings) at small scale on a public dataset — Steam game reviews work well, ~30k items, ~5M reviews. Include the cold-start fallback (content-based blending). Implement online vs offline evaluation simulation: show that NDCG improvements don’t always lift simulated online CTR. Write up as a blog post: *“What I learned building a tiny PinnerSAGE.”*
 
*Why:* MUST-ADD #7. Verbatim ask at GR8 Tech, Interexy, HP IQ; standard topic at Booking, Adyen, Spotify, Bol, Zalando.
 
**Objectives**
 
- Build the full candidate-generation → ranking → re-ranking pipeline.
- Implement a two-tower retriever and an LTR ranker.
**Exercises**
 
1. Two-tower retrieval in PyTorch: user tower + item tower, in-batch negatives, sampled softmax. Train on MovieLens-25M.
2. Build an ANN index with FAISS, ScaNN, and HNSW (`hnswlib`). Benchmark recall@k vs latency.
3. Build a learning-to-rank ranker with LightGBM (`LambdaRank`); evaluate NDCG@10, MAP, MRR.
4. Cold-start lab: implement content-based fallback via embeddings of titles; blend with collaborative filter.
5. Online vs offline metrics: simulate an A/B; show that NDCG improvements don't always lift online CTR.
6. Build a 3-layer pipeline: ANN candidate gen → LightGBM ranker → diversity-aware re-rank.
**Ship:** `recsys-lab` repo + a write-up post: *"What I learned building a two-tower from scratch."*
 
**Resources:** Eugene Yan's recsys posts (entire archive) · Coursera "Recommender Systems Specialisation" (audit) · the Two-Tower paper (Yi et al. 2019).
 
---
 
## 12. Deep Learning Fundamentals
 
Backprop, optimizers, regularization in your bones before transformers.
 
**GitHub**
- **karpathy/micrograd** (~15.8k★) — https://github.com/karpathy/micrograd — best way to *feel* backprop.
- **karpathy/makemore** — https://github.com/karpathy/makemore — char-level LM from MLP up.
- **karpathy/nn-zero-to-hero** (~21.7k★) — https://github.com/karpathy/nn-zero-to-hero — Jupyter notebooks for the lecture series.
- **rasbt/deeplearning-models** (~17.5k★) — https://github.com/rasbt/deeplearning-models.
- **labmlai/annotated_deep_learning_paper_implementations** — https://github.com/labmlai/annotated_deep_learning_paper_implementations.
**Kaggle**
- **Intro to Deep Learning** — https://www.kaggle.com/learn/intro-to-deep-learning.
- **Computer Vision** — https://www.kaggle.com/learn/computer-vision.
- Competition: **Digit Recognizer (MNIST)**.
**One must-read** — Karpathy, *A Recipe for Training Neural Networks* (https://karpathy.github.io/2019/04/25/recipe/).
 
*Why:* This is the single biggest interview-credibility week in the plan. Once you've written backprop by hand, every PyTorch debugging session is easier.
 
**Objectives**
 
- Implement a feed-forward net + backprop in NumPy.
- Understand what every optimizer is actually doing.
**Exercises** *(uses repo `phases/03-deep-learning-core`)*
 
1. NumPy MLP: forward pass, backward pass, SGD. Train on MNIST to >95% accuracy. No PyTorch.
2. Implement Adam, RMSProp, AdamW from formulas; reproduce known training curves on MNIST.
3. Add dropout, batch-norm, layer-norm by hand. Show empirically how each changes the loss curve.
4. Build a `nn.Module`style API in pure Python (your own micrograd-style framework). Use it to train a small CNN.
5. Diagnose three trained models that "fail": vanishing gradients, exploding gradients, dead ReLU. Document fixes.
**Ship:** A `mininet` framework (~500 lines) + MNIST notebook reaching 98% with your own optimizer.
 
**Resources:** repo phases/03 · Karpathy's "micrograd" + "makemore" lectures · *Deep Learning* (Goodfellow, Bengio, Courville) chapters 6-8.
 
### Exercises
 
**Warm-up (1-2 hr)** — Clone `karpathy/micrograd`. Read every line. Add inline comments explaining what each line does. On a 2-input → 1-output toy problem, verify that your micrograd autograd produces *bit-identical* gradients to PyTorch. Push your annotated fork.
 
**Core (1-2 days)** — Watch Karpathy’s “Zero to Hero” lectures 1-3. Reproduce `makemore` chapters 1-3 *from scratch* without copying his code — pause his videos, type your own version, then compare. Reach the same loss numbers he reaches. Extend with one experiment of your own (e.g., a new optimizer, layer norm, a different dataset). Push as your fork with a `MY_EXPERIMENTS.md`.
 
**Stretch (multi-day)** — Train a CNN on CIFAR-10 to >88% test accuracy using *only your own micrograd-style framework* (no PyTorch, no TensorFlow). You’ll need to implement convolution, max-pool, batch norm, dropout, Adam, and a data loader from scratch. This is brutally hard. The point isn’t the score — it’s the experience of building every primitive. Write up failures (vanishing gradients, dead ReLU, exploding loss) and fixes in a `LESSONS.md`. Publish as a blog post.
 
---
 
## 13. Transformers & Large Language Models
 
The center of gravity. Implement once from scratch, then specialize.
 
**GitHub**
- **karpathy/nanoGPT** (~57.8k★) — https://github.com/karpathy/nanoGPT — reference; Karpathy now points to nanochat.
- **karpathy/nanochat** (~53k★) — https://github.com/karpathy/nanochat — modern: pretrain + SFT + RL + inference in ~8k lines.
- **karpathy/build-nanogpt** — https://github.com/karpathy/build-nanogpt — step-by-step GPT-2 reproduction.
- **karpathy/llm.c** (~29.8k★) — https://github.com/karpathy/llm.c — GPT training in pure CUDA/C.
- **rasbt/LLMs-from-scratch** (~92k★) — https://github.com/rasbt/LLMs-from-scratch — cleanest pedagogical implementation.
- **stanford-cs336/assignment1-basics** — https://github.com/stanford-cs336 — CS336 from-scratch assignments, brutally good.
- **mlabonne/llm-course** (~70k+★) — https://github.com/mlabonne/llm-course — most maintained LLM curriculum.
- **Hannibal046/Awesome-LLM** (~26k★) — best weekly-reading feed.
**Kaggle**
- **Intro to NLP** — https://www.kaggle.com/learn/natural-language-processing.
- Competitions: **LMSYS Chatbot Arena**, **LLM Prompt Recovery**.
- Datasets: Wikipedia dumps, **OpenAssistant Conversations**.
**One must-read** — Sebastian Raschka’s *Understanding Large Language Models* reading list (https://sebastianraschka.com/blog/2023/llm-reading-list.html) + Jay Alammar’s *Illustrated Transformer*.
 
### Exercises
 
**Warm-up (1-2 hr)** — Clone `karpathy/nanoGPT`. Read `model.py` and `train.py` line by line. Add inline comments explaining attention math, position embeddings, the training loop, and the optimizer config. Push your annotated fork.
 
**Core (1-2 days)** — Train nanoGPT (or nanochat for a richer pipeline) on TinyShakespeare on a single GPU. Reach the canonical loss. *Then* swap the dataset to something personal — your own writing, all your Slack exports, your favorite author’s public-domain texts. Tune hyperparameters: context length, embed dim, layers, learning rate. Document loss curves and sample outputs at each step in a `TRAINING_LOG.md`. Push samples + the trained model card.
 
**Stretch (multi-day)** — Complete **Stanford CS336 Assignment 1** (the tokenizer + transformer-from-scratch assignment) using only the assignment skeleton + course lectures. Treat `rasbt/LLMs-from-scratch` as a reference you check *after* solving each part, not before. Implement BPE tokenization, scaled dot-product attention, multi-head attention, RoPE, an entire transformer block, training loop, and decoding from scratch. Push as `cs336-a1` repo with a write-up. This single exercise is worth more on a CV than ten LangChain tutorials.
 
*Why:* You'll fine-tune and serve transformers all year. Build one once, by hand.
 
**Objectives**
 
- Implement scaled dot-product attention, multi-head attention, positional encoding, KV-cache, masked decoding from formulas.
- Train a tiny GPT.
**Exercises** *(uses repo `phases/07-transformers`)*
 
1. Implement scaled dot-product attention in NumPy. Verify against `torch.nn.functional.scaled_dot_product_attention`.
2. Add multi-head attention; reproduce the figures from "Attention Is All You Need" on toy data.
3. Implement RoPE (rotary positional embedding) by hand. Plot the rotations.
4. KV-cache: implement greedy decoding both with and without; show speedup.
5. Train a 6-layer GPT on TinyShakespeare (Karpathy-style); reach reasonable loss in <1 hour on a single GPU.
6. Implement a `MoE` toy layer (top-2 routing, load-balancing loss).
**Ship:** `tiny-transformer` repo + a sample of generated text + a write-up: *"What I now understand about attention that I didn't a week ago."*
 
**Resources:** repo phases/07 · "Attention Is All You Need" · Karpathy's nanoGPT and "Let's build GPT" · Jay Alammar's "Illustrated Transformer."
 
---
 
## 14. Tokenisation, Sampling, vLLM, Quantisation, Distributed Training
 
*Why:* The infra side of LLMs. Quantisation + multi-GPU lift you from "I can call OpenAI" to "I can run my own."
 
**Objectives**
 
- Implement BPE; understand why "Strawberry has how many R's" is a tokeniser problem.
- Run a 7B model with vLLM under load.
- Run a multi-GPU fine-tune with `accelerate` + FSDP.
**Exercises**
 
1. Implement BPE from scratch; train it on Wikipedia text; compare merges to `tiktoken` vs `tokenizers`.
2. Implement and test 5 sampling strategies (greedy, temperature, top-k, top-p, min-p, repetition penalty); plot output diversity.
3. Run a 7B model under vLLM + SGLang + TGI on a Runpod GPU. Benchmark throughput at batch 1, 8, 32.
4. Quantise a 7B model to GPTQ-int4 + AWQ-int4; compare quality on MMLU subset.
5. Multi-GPU: fine-tune a 1B model with `accelerate launch` + FSDP on 2× GPUs; verify ZeRO-3 sharding by inspecting GPU memory.
6. Profile a forward pass with `torch.profiler`; identify the slowest op; explain why.
**Ship:** A `llm-infra-lab` repo with quantisation comparisons + a vLLM-served endpoint hitting >X tokens/sec.
 
**Resources:** vLLM docs · `accelerate` docs · *FSDP under the hood* blog by HuggingFace · Sebastian Raschka's distributed-training posts.
 
---
 
## 15. LLM Engineering — RAG, Fine-tuning, Inference
 
Where most senior AI/ML engineers spend their cycles in 2026.
 
**GitHub**
- **NirDiamant/RAG_Techniques** — https://github.com/NirDiamant/RAG_Techniques — 30+ techniques in runnable notebooks.
- **Shubhamsaboo/awesome-llm-apps** (~60k+★) — https://github.com/Shubhamsaboo/awesome-llm-apps — 100+ runnable apps.
- **vllm-project/vllm** (~75k★) — https://github.com/vllm-project/vllm — de-facto serving engine.
- **ggerganov/llama.cpp** — https://github.com/ggerganov/llama.cpp — quantization (GGUF Q4/Q5/Q8).
- **unslothai/unsloth** + **axolotl-ai-cloud/axolotl** + **huggingface/trl** — modern fine-tuning stacks.
- **patchy631/ai-engineering-hub** — https://github.com/patchy631/ai-engineering-hub — active 2024-2026 tutorials.
- **anthropics/claude-cookbooks** (~42.6k★) + **openai/openai-cookbook** (~72k★) + **huggingface/cookbook** — vendor recipes.
**Kaggle**
- Competitions: **LMSYS Chatbot Arena**, **LLM Prompt Recovery**.
- Datasets: Wikipedia mirror, arXiv metadata.
**One must-read** — Anthropic, *Building Effective Agents* (https://www.anthropic.com/engineering/building-effective-agents) + the LangChain blog *Is RAG Really Dead?*.
 
### Exercises
 
**Warm-up (1-2 hr)** — Pick three techniques from `NirDiamant/RAG_Techniques` (e.g., hybrid search, HyDE, reranking). Run each on your own personal notes corpus (Obsidian vault, blog posts, or any 100+ documents you own). Note which ones produce visibly better answers and which add cost without gain. Push as `rag-techniques-on-my-notes` repo with example queries.
 
**Core (1-2 days)** — Generate a synthetic dataset (1k examples, with rejection sampling using a frontier model as judge) for a narrow task — NL → API JSON, structured extraction, style transfer, whatever fits your domain. Fine-tune Llama 3.2 3B (or Qwen 2.5 1.5B) with Unsloth or Axolotl. Build a 100-example golden eval set. Compare fine-tuned vs base via LLM-as-judge. Push to HuggingFace with a real model card (this also seeds your EU AI Act technical doc — see §20). Write up the whole pipeline.
 
**Stretch (multi-day)** — Build a production RAG over a real corpus (your company’s docs if allowed, or a public corpus you actually use — Postgres docs, Kubernetes docs, etc.). Include: hybrid search (BM25 + dense), reranking (Cohere or `bge-reranker`), structured outputs with citations including file paths and line numbers, hallucination evals, semantic caching with near-miss safety. Serve behind vLLM. Add Langfuse instrumentation (see §16). Deploy to your K8s cluster. Document architecture, tradeoffs, and cost-per-query. This is portfolio gold.
 
*Why:* Naive RAG demos in tutorials; production RAG is its own engineering discipline.
 
**Objectives**
 
- Build retrieval that's actually good.
- Articulate Pinecone vs Qdrant vs Weaviate vs Milvus tradeoffs from experience.
**Exercises**
 
1. Build a "chat with your codebase" tool over your own GitHub repos. Output must include correct file paths + line numbers.
2. Implement hybrid search (BM25 + dense) with a reranker (Cohere Rerank or `bge-reranker`). Measure recall@k against a held-out 100-question eval set.
3. Try 4 chunking strategies: fixed, recursive, semantic, structure-aware (markdown / code AST). Measure retrieval quality of each.
4. Stand up Qdrant + Pinecone + Weaviate with the same 1M-vector dataset. Benchmark recall, p95 latency, cost. Write a one-pager.
5. Add HyDE (hypothetical document embeddings) and query rewriting; measure lift.
6. Add semantic caching with a near-miss safety check; measure cost reduction vs hallucination risk.
**Ship:** A production-shaped RAG service for your own data + a public benchmark write-up.
 
**Resources:** Jason Liu's blog (entire RAG archive) · Anthropic's contextual retrieval post · the RAGAS paper.
 
## Synthetic Data + Fine-tuning a Small LLM
 
*Why:* Separates "uses LLMs" from "ships LLMs."
 
**Objectives**
 
- Generate a high-quality synthetic dataset by distillation + rejection sampling.
- LoRA / QLoRA fine-tune a 1-3B model that beats its base on your task.
**Exercises** *(uses repo `phases/10-llms-from-scratch`)*
 
1. Pick a narrow task (NL → API JSON, style transfer, structured extraction). Generate seed examples with Claude or GPT.
2. Run rejection sampling: 5 candidates per input, judge-model + heuristic filter, keep best. Aim for 2-5k clean examples + 200-example held-out eval set.
3. Diversity sampling (Self-Instruct + Evol-Instruct); dedup with MinHash.
4. LoRA fine-tune Qwen 2.5 1.5B with Unsloth or Axolotl; track in W&B; evaluate vs base via LLM-as-judge.
5. Quantise the fine-tune to GGUF; run with llama.cpp on a CPU.
6. Push to HuggingFace with a real model card (covers EU AI Act technical-doc bones).
**Ship:** A HuggingFace model that beats its base on your held-out set + a write-up of how you got there.
 
**Resources:** repo phases/10 · Unsloth docs · Axolotl examples · TRL docs · Self-Instruct + Evol-Instruct papers.
 
---
 
## 16. Evaluations & LLM Observability
 
The 2026 senior engineer’s competitive edge.
 
**GitHub**
- **openai/evals** — https://github.com/openai/evals.
- **promptfoo/promptfoo** — https://github.com/promptfoo/promptfoo — config-file-driven, great for CI.
- **UKGovernmentBEIS/inspect_ai** — https://github.com/UKGovernmentBEIS/inspect_ai — UK AISI’s framework.
- **langfuse/langfuse** — https://github.com/langfuse/langfuse — open-source LangSmith alternative.
- **confident-ai/deepeval** — https://github.com/confident-ai/deepeval — pytest-style.
- **Arize-ai/phoenix** — https://github.com/Arize-ai/phoenix — open-source tracing + evals.
**Kaggle** — Limited; **LMSYS Chatbot Arena** is the closest eval-design exercise.
 
**One must-read** — Hamel Husain, *Your AI Product Needs Evals* (https://hamel.dev/blog/posts/evals/).
 
### Exercises
 
**Warm-up (1-2 hr)** — Install `promptfoo`. Build a 20-example test suite against any LLM service you’ve built or any public API. Include programmatic checks (regex, JSON schema), LLM-as-judge, and pairwise comparisons. Run via `promptfoo eval` from the CLI. Push the config + example outputs.
 
**Core (1-2 days)** — For your RAG project from §15, build a *real* golden eval set: 100 questions with hand-curated reference answers, organized by difficulty (easy retrieval, multi-hop, requires reasoning, adversarial). Implement LLM-as-judge with **calibration**: validate the judge against 50 human labels, report agreement. Use three different judge models, compute variance, flag examples where judges disagree. Integrate evals into GitHub Actions — every prompt change runs evals, PRs blocked on regressions. Push as `rag-eval-flywheel`.
 
**Stretch (multi-day)** — Self-host Langfuse (docker-compose). Instrument your RAG with full traces, cost tracking, token usage. Build a Grafana dashboard reading from Langfuse showing: p50/p95/p99 latency by query type, cost-per-query trend, eval score over time, retrieval recall@k as a real-time metric. Set up alerts on regressions. Pipe production traces back into your eval set automatically (the eval flywheel). Write up: *“Building an eval flywheel from scratch.”*
 
*Why:* MUST-ADD #1 fundamental discipline. The most undervalued skill in AI engineering.
 
**Objectives**
 
- Build evals like you'd build CI: deterministic, regression-protected, fast feedback.
- Instrument an LLM service for traces, cost, and hallucination signals.
**Exercises**
 
1. Build a golden eval set (200 examples) for your Week 21 RAG service: programmatic checks (regex / schema), LLM-as-judge with calibration (validate judge against 50 human-labelled), pairwise preference.
2. Wire evals into CI: every prompt change runs evals; PRs blocked on regressions. Use `promptfoo` or roll your own.
3. Instrument with **Langfuse** + **LangSmith**: full trace, cost per request, token usage dashboards.
4. Build a hallucination detector: NLI-based or LLM-as-judge faithfulness on your RAG outputs.
5. Pipe production traces back into your eval set (the eval flywheel).
**Ship:** `eval-flywheel` repo + a public dashboard showing eval scores improving over time.
 
**Resources:** Hamel Husain, *"Your AI product needs evals"* · Eugene Yan's eval posts · Anthropic's evaluation guidelines · `promptfoo` / Inspect / Braintrust docs.
 
---
 
## 17. Reinforcement Learning & Reasoning
 
PPO for fundamentals; GRPO for reasoning models post-R1.
 
**GitHub**
- **vwxyzjn/cleanrl** — https://github.com/vwxyzjn/cleanrl — single-file PPO/DQN/SAC.
- **DLR-RM/stable-baselines3** — https://github.com/DLR-RM/stable-baselines3 — production-grade.
- **huggingface/trl** — https://github.com/huggingface/trl — PPO/DPO/GRPO for LLMs.
- **rasbt/reasoning-from-scratch** (~4.3k★) — https://github.com/rasbt/reasoning-from-scratch — Raschka’s 2025 reasoning-model book companion.
- **Farama-Foundation/Gymnasium** — https://github.com/Farama-Foundation/Gymnasium.
**Kaggle**
- **Intro to Game AI and Reinforcement Learning** — https://www.kaggle.com/learn/intro-to-game-ai-and-reinforcement-learning.
- Competition: **ConnectX** — long-running RL competition with active leaderboard.
**One must-read** — Karpathy, *Deep RL: Pong from Pixels* (http://karpathy.github.io/2016/05/31/rl/).
 
### Exercises
 
**Warm-up (1-2 hr)** — Run `vwxyzjn/cleanrl`’s PPO single-file implementation on CartPole. Read every line of `ppo.py`. Modify three hyperparameters one at a time (learning rate, clip ratio, num epochs); document what breaks first and why. Push your annotated fork.
 
**Core (1-2 days)** — Write your own PPO from scratch (~300 lines, no deps beyond PyTorch + Gymnasium). Use CleanRL as a reference *after* you’ve sketched your own version. Verify on CartPole and LunarLander; reproduce known reward curves. Then implement GRPO with TRL on a math-reasoning task (GSM8K subset). Train 3-6 hours. Plot reward curves vs base model accuracy. Document at least one reward-hacking failure mode you observed.
 
**Stretch (multi-day)** — Compete on Kaggle’s **ConnectX**. Implement your own from-scratch PPO agent (no Stable-Baselines3). Reach top-50% on the leaderboard. Document what worked, what didn’t, and where you’d go next (self-play, AlphaZero-style MCTS, etc.). RL is notoriously unstable; the honest write-up of your debugging journey *is* the portfolio piece.
 
## Reasoning Models + RL on a Game Environment
 
*Why:* Research-adjacent. You'll feel out of your depth — the point is mileage on instability.
 
**Objectives**
 
- Implement GRPO on a verifiable task; watch a model learn to reason longer.
- Get something measurable working with PPO on a Gym environment.
**Exercises** *(uses repo `phases/09-rl`)*
 
1. Read DeepSeek R1 + GRPO papers; produce a one-page summary.
2. PPO with CleanRL on CartPole + LunarLander; reproduce reward curves.
3. Write your own PPO from scratch (~300 lines) after reading CleanRL's; verify on CartPole.
4. GRPO with TRL on a math-reasoning task (GSM8K subset); train for ~3-6 hours; document reward curves; plot vs base model accuracy.
5. LLM-as-agent RL on a tiny custom text game (5-room dungeon); reward task completion; document at least one reward-hacking failure.
**Ship:** `rl-lab` repo + a recorded reward-curve plot + an honest write-up of what didn't work.
 
**Resources:** repo phases/09 · DeepSeek-R1 paper · CleanRL implementations · Sutton & Barto chapters 6-13.
 
---
 
## 18. AI Agents & Tools — MCP, LangGraph, smolagents, DSPy
 
The 2026 frontier.
 
**GitHub**
- **huggingface/smolagents** — https://github.com/huggingface/smolagents — minimalist code-agent framework.
- **huggingface/agents-course** — https://github.com/huggingface/agents-course — free course with certification.
- **langchain-ai/langgraph** — https://github.com/langchain-ai/langgraph — stateful, cyclic agents.
- **stanfordnlp/dspy** — https://github.com/stanfordnlp/dspy — declarative LM programs.
- **modelcontextprotocol/servers** — https://github.com/modelcontextprotocol/servers — MCP reference servers.
- **e2b-dev/awesome-ai-agents** (~12.5k★) — https://github.com/e2b-dev/awesome-ai-agents — landscape; use as a directory.
- **microsoft/ai-agents-for-beginners** — https://github.com/microsoft/ai-agents-for-beginners — 12 lessons.
**Kaggle** — Skip.
 
**One must-read** — Anthropic, *Building Effective Agents* (already cited in §15).
 
### Exercises
 
**Warm-up (1-2 hr)** — Complete `huggingface/agents-course` Unit 1. Build a `smolagent` that does one genuinely useful task in your daily workflow — e.g., reads your terminal history and summarizes what you did today, fetches and triages your unread GitHub notifications, or generates a daily standup message from your git activity. Push as `daily-agent` repo.
 
**Core (1-2 days)** — Write the agent loop from scratch in <300 lines, no frameworks. Tools: `read_file`, `write_file`, `list_dir`, `run_bash`, `web_search`. Make it fix one real bug in a test repo (e.g., a failing test, a typo in a function name). Then rebuild it on LangGraph with proper state management, a planning step, scratchpad memory, and a test-verify loop. Benchmark both on a 10-task held-out set (you can use SWE-bench-Lite tasks or invent your own). Push as `agent-from-scratch-vs-langgraph` with comparison metrics.
 
**Stretch (multi-day)** — Write a custom **MCP server** exposing real services you use: your calendar (Google or CalDAV), your notes (Obsidian via filesystem), your codebase (read-only file ops), your tasks (Todoist or Linear). Implement the protocol from the MCP spec, not from a wrapper library. Connect from Claude Desktop or any MCP client. Document protocol decisions, security model (tool-confirmation patterns, scope limits), and lessons learned in a blog post: *“Building a personal MCP server: what the spec doesn’t tell you.”*
 
*Why:* Agentic systems and MCP appear in late-2025/2026 Djinni postings (Uvik, Kozak Agency); MCP is now the default tool-exposure protocol.
 
**Objectives**
 
- Build a coding agent from scratch in <300 lines.
- Build a deep-research agent with planning + source verification.
- Expose your tools via MCP.
**Exercises** *(uses repo `phases/13-tools-and-protocols` + `phases/14-agent-engineering`)*
 
1. Day 1: write the agent loop from scratch (~120 lines, no deps). Tools: read_file, write_file, list_dir, run_bash, search. Make it fix one typo bug in a test repo.
2. Day 2-3: read SWE-agent + OpenHands + Aider source code; sketch each architecture in a notebook.
3. Day 4-5: rebuild your coding agent with planning + scratchpad + test-verify loop + context-window manager.
4. Day 6: build a deep-research agent: planner → parallel search → source dedup + trust scoring → synthesis with citations. Stop-criterion is the hard part.
5. Day 7: expose your agent's tools via an MCP server. Connect from Claude Code or your own MCP client.
6. Eval both agents on a held-out task set; document failure modes.
**Ship:** Two agent repos + a working MCP server.
 
**Resources:** repo phases/13 + 14 · MCP spec · Anthropic's "Building effective agents" post · SWE-agent paper.
 
---
 
## 19. MLOps, Model Serving & Drift Monitoring
 
The boring infrastructure that determines whether your model survives prod.
 
**GitHub**
- **kelvins/awesome-mlops** (~5.1k★) — https://github.com/kelvins/awesome-mlops.
- **visenger/awesome-mlops** — sister list, more pedagogical.
- **tensorchord/Awesome-LLMOps** (~5.4k★) — https://github.com/tensorchord/Awesome-LLMOps — active.
- **mlflow/mlflow** — read tracking and registry source.
- **bentoml/BentoML** — model serving with great docs.
- **triton-inference-server/server** — NVIDIA Triton.
- **ray-project/ray** — Ray Serve + Ray Train.
- **evidentlyai/evidently** — open-source drift monitoring.
- **DataTalksClub/mlops-zoomcamp** — practical project-doing alternative.
**Kaggle** — Not a Kaggle topic. Use MLOps Zoomcamp.
 
**One must-read** — Sculley et al., *Hidden Technical Debt in ML Systems* (NeurIPS 2015, free PDF).
 
### Exercises
 
**Warm-up (1-2 hr)** — Take your best model from §9 (the Kaggle tabular work). Register it in MLflow with full lineage (params, metrics, artifacts). Wrap it in BentoML and serve as an HTTP endpoint. Hit it with `curl`. Push the whole flow to a repo so a stranger could reproduce.
 
**Core (1-2 days)** — Set up the **DataTalks MLOps Zoomcamp** project (https://github.com/DataTalksClub/mlops-zoomcamp). Deploy a model end to end with: MLflow tracking + registry, Prefect or Airflow orchestration, evidence-monitoring with Evidently for drift detection, and a CI/CD deploy to a kind cluster. Get all the way to the final capstone module. Push your version with a `LESSONS.md`.
 
**Stretch (multi-day)** — Pick any model from earlier exercises (recsys from §11, fine-tuned LLM from §15, CV from §14). Build a *full production deployment*: MLflow registry → BentoML packaging → Triton optimization with ONNX → deploy to KServe on your K8s cluster (or compare KServe vs Ray Serve vs BentoML direct). Add Evidently data-quality and drift monitoring with schedules, output to Grafana, alerts on threshold breaches. Document the whole stack in `ARCHITECTURE.md` with a sequence diagram showing request flow + retraining trigger flow.
 
**Objectives**
 
- Land a real PR in a major agent or ML framework.
- Wire up Evidently + Arize-style monitoring on a deployed model.
**Exercises**
 
1. Pick one: LangGraph, smolagents, DSPy, Letta, pydantic-ai, Pixeltable, or Inspect. Read the codebase for 2-3 days.
2. Find a "good first issue" or "help wanted" tagged item. Open a real PR.
3. Wire **Evidently** into your Month 4 Kaggle model: data-quality, drift, and target-drift reports running on a schedule, output to Grafana.
4. Compute PSI, KS, and Wasserstein drift on a real production-shaped dataset; trigger an alert when threshold breached.
5. Sign up for an Arize or Fiddler trial; instrument an LLM service for embedding-drift dashboards; one-pager comparing the experience to Evidently.
**Ship:** Merged (or pending) OSS PR + a `drift-monitoring` repo deployed alongside a real model.
 
**Resources:** the chosen framework's `CONTRIBUTING.md` · Evidently docs · Arize / Fiddler product tours.
 
---
 
## 20. Responsible AI, EU AI Act & Compliance
 
No longer optional for senior engineers shipping in the EU.
 
**GitHub**
- Official **AI Act text** at https://artificialintelligenceact.eu.
- **microsoft/responsible-ai-toolbox** — https://github.com/microsoft/responsible-ai-toolbox.
- **Trusted-AI/AIF360** + **fairlearn/fairlearn** — two production fairness toolkits.
- **EthicalML/awesome-production-machine-learning** (~18k★) — Alejandro Saucedo’s curated list.
**Kaggle**
- **Intro to AI Ethics** — https://www.kaggle.com/learn/intro-to-ai-ethics.
**One must-read** — Mitchell et al., *Model Cards for Model Reporting* (arXiv 2019).
 
### Exercises
 
**Warm-up (1-2 hr)** — Read EU AI Act Articles 6-15 (high-risk obligations) and Annex IV (technical documentation) end to end. Write a 1-page summary in your own words mapping each Article/Annex section to *engineering work* a senior would actually need to do. Push as `eu-ai-act-notes.md`.
 
**Core (1-2 days)** — Pick any model from your portfolio. Produce a full **Model Card** following Mitchell et al.’s template (intended use, factors, metrics, evaluation data, training data, quantitative analysis, ethical considerations, caveats). Run a bias evaluation using `fairlearn`: compute demographic parity difference, equalized odds difference. Document mitigations attempted and residual risks. Push as `MODEL_CARD.md` + `BIAS_EVAL.ipynb` in the model’s repo.
 
**Stretch (multi-day)** — Write a complete **EU AI Act Readiness Assessment** for a hypothetical (or real) high-risk product — a CV screening tool, a credit-scoring model, or an educational assessment system. Cover: risk classification (which Annex III category, why), Article 9 risk management system design, Article 10 data governance (training/validation/test data quality), Article 11+13 technical documentation and transparency, Article 14 human oversight design, Article 15 accuracy/robustness/cybersecurity. End with a gap analysis: what would you need to build/document/test before launching in the EU after August 2026? Publish as a blog post — this is unusually high-signal writing for senior EU AI/ML hiring.
 
*Why:* This is the portfolio piece that gets you the role.
 
**Objectives**
 
- Ship one cohesive, real product that integrates everything.
- Demonstrate EU AI Act fluency in your documentation.
**Capstone requirements:**
 
- Real problem (not a tutorial). Examples: vertical-specific AI assistant, code review bot tuned to a style guide, research agent for a specific domain, fine-tuned model wrapper for a niche task.
- Backend in your strongest language; talks to a fine-tuned model + at least one frontier model.
- RAG layer with proper evals running in CI.
- Postgres + Redis + a queue + outbox pattern; deployed to K8s.
- Full observability: logs, metrics, traces, SLOs, cost dashboards, drift monitoring.
- Auth (real OIDC), rate limiting, prompt-injection defenses.
- Frontend (Angular fine; consider React/SvelteKit version for breadth).
- Public, documented, with `ARCHITECTURE.md`, `DECISIONS.md` (ADRs), `THREAT_MODEL.md`.
- Costs under €50/month, scales to thousands of users.
- **EU AI Act compliance package:** a `MODEL_CARD.md` + `DATASHEET.md` + an Annex-IV-shaped technical document covering data lineage, training data provenance, evaluation, monitoring, human oversight, risk management, and biases. Add Fairlearn fairness reports to your eval CI.
- Ship to real users. Even ten. Watch what breaks.
**Resources:** EU AI Act consolidated text · Fairlearn docs · Mitchell et al. *Model Cards for Model Reporting* · Gebru et al. *Datasheets for Datasets*.
 
**Performance + scale (3 days)**
 
1. Profile your capstone with `pyroscope` / `py-spy` / `torch.profiler`. Find the actual bottleneck. Fix it.
2. Load test with `k6` or `Vegeta` to find breaking point. Tune.
3. Run chaos experiments on your K8s cluster (Litmus or Chaos Mesh). Watch SLOs burn; fix.
4. Write a real blameless postmortem for something that broke during the build. Include 5-whys + action items.
**Interview prep (3 days)**
 
1. System design: 3 mocks/week with a peer or interviewing.io. Framework: requirements → estimates → API → data model → high-level → deep-dives → tradeoffs → bottlenecks → "at 100x scale, what would I do differently?"
2. ML system design (separate skill): recommendation, search, fraud, an LLM product.
3. Coding: 2 mediums/day, breadth over depth; you're staying sharp, not optimising for FAANG L5.
4. Behavioural: write a story bank — 8 STAR-format stories (leadership, conflict, ambiguity, failure, technical depth, mentorship, scope-cut, pivot). Practice them out loud.
5. Project deep-dives: prepare a 5-minute walkthrough for each of your 7 monthly capstones.
**Positioning (1 day)**
 
1. Update CV: lead with shipped artifacts, not titles. One bullet per capstone.
2. LinkedIn / public profile: rewrite headline to "Senior ML Engineer | LLMs in production | EU AI Act-aware".
3. Portfolio site: simple HTML on your VPS; one card per capstone; link to repo + write-up.
4. Pick 5 EU companies + 5 Djinni companies you actually want to work for. Write a tailored cover note for each.
---
 
## 21. System Design & Senior Engineering Skills
 
The staff-level glue: performance, chaos, postmortems, system design under pressure.
 
**GitHub**
- **donnemartin/system-design-primer** (~348k★) — re-read once a year.
- **ByteByteGoHq/system-design-101** (~70k★) — visual, modern.
- **karanpratapsingh/system-design** (~37k★) — long-form Markdown course.
- **ashishps1/awesome-system-design-resources** — actively maintained.
- **Netflix/chaosmonkey** — historical but canonical.
- **brendangregg/perf-tools** — Linux performance profiling.
**Kaggle** — Not applicable.
 
**One must-read** — Google SRE Workbook, *Postmortem Culture* (https://sre.google/workbook/postmortem-culture/).
 
### Exercises
 
**Warm-up (1-2 hr)** — Pick the “Design a chat application” walkthrough from `karanpratapsingh/system-design` or ByteByteGo. Read the requirements only, then *whiteboard your own design* before reading the solution. Cover: capacity estimates, API, data model, components, failure modes. Compare your version to the reference. Note three things you missed and three you got right. Push as `design-doc-1-chat.md`.
 
**Core (1-2 days)** — Pick five different systems from `donnemartin/system-design-primer` you haven’t studied (Uber, Yelp, Twitter feed, distributed cache, key-value store). For each, set a 30-minute timer and write your own design doc before reading the reference. Articulate at least three explicit tradeoffs per design. The compound effect of doing five in two days is dramatically more useful than one done over a week. Push as `system-design-portfolio` repo.
 
**Stretch (multi-day)** — Pick a real production system you’ve worked on (from your 8 years of experience). Write a comprehensive **architecture retrospective**: what the system does, scale today, key design decisions you’d defend, decisions you’d reverse with hindsight, what would change at 10x scale, what would change at 100x scale. Include a sequence diagram + a deployment diagram. Anonymize as needed but keep the engineering substance. This is the single most senior-shaped piece of writing in your portfolio. Optional: publish as a blog post if non-confidential.
 
---
 
## Top 5 General Books (May 2026)
 
Five books spanning multiple plan topics, selected for **breadth × leverage × freshness**.
 
### 1. *Designing Data-Intensive Applications* — Martin Kleppmann (paid)
 
The single most important book for any senior backend or ML engineer. Replication, partitioning, transactions, consensus, batch + stream processing. Second edition in early-access as of 2025-26; first edition (2017) still 95% relevant. **Companion exercise:** maintain a personal `ddia-notes` repo with one notebook per chapter — for each, implement the simplest possible version of the concept (a B-tree, an LSM tree, a CRDT, a vector clock). Reading without coding is half the value.
 
### 2. *AI Engineering: Building Applications with Foundation Models* — Chip Huyen (paid, O’Reilly 2025)
 
The successor in spirit to her *Designing ML Systems*. Prompt engineering, RAG, fine-tuning, evals, agents, inference optimization at a senior level. Vendor-neutral. Best book to read **first** if your goal is shipping foundation-model products. **Companion exercise:** as you read each chapter, apply its frame to your §15 RAG project — write a one-page “audit” per chapter.
 
### 3. *Build a Large Language Model (From Scratch)* — Sebastian Raschka (paid, Manning 2024)
 
The clearest path from “I know PyTorch” to “I have written a working GPT + tokenizer + fine-tuning loop.” Companion repo (https://github.com/rasbt/LLMs-from-scratch, ~92k★) is the most-starred book repo on GitHub. The 2025 follow-up *Build a Reasoning Model From Scratch* is the natural next step. **Companion exercise:** work every chapter, push your notebook copies + extensions to a public fork — this becomes a portfolio piece on its own.
 
### 4. *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow* (3rd ed.) — Aurélien Géron (paid, O’Reilly 2022; 4th ed. rumored for late 2025)
 
Best “I know engineering, teach me ML in book form” reference. Notebooks (https://github.com/ageron/handson-ml3) are excellent and free. Even seniors find gaps filled. **Companion exercise:** for each of Parts I and II, pick one chapter and reimplement its key example in a *different* dataset — your work data, a Kaggle dataset, anything that isn’t the book’s example. Push as `geron-on-real-data` repo.
 
### 5. *Mathematics for Machine Learning* — Deisenroth, Faisal & Ong (FREE PDF — https://mml-book.github.io)
 
The math reference. Linear algebra, calculus, probability — written for engineers, not pure mathematicians. ~400 pages. Use as reference; chapters 2 (Linear Algebra), 5 (Vector Calculus), 6 (Probability) are the high-leverage core. **Companion exercise:** see §8 exercises — work the exercises by hand, in a notebook, push them.
 
### Honorable mentions
 
- *Trustworthy Online Controlled Experiments* (Kohavi/Tang/Xu, paid) — A/B testing bible. Non-negotiable if you ship to users.
- *Causal Inference for the Brave and True* (Facure, **FREE** — https://matheusfacure.github.io/python-causality-handbook) — friendliest causal-inference book in existence.
- *Machine Learning Engineering* (Burkov, paid; companion at http://www.mlebook.com) — production lifecycle.
- *Designing Machine Learning Systems* (Chip Huyen, paid, 2022) — slightly pre-LLM but system-design framing is gold.
- *Deep Learning* (Goodfellow/Bengio/Courville, **FREE** — https://www.deeplearningbook.org) — canonical theory reference, 2016.
---
 
## How to use this document
 
1. **Map exercises to weekly plan slots.** Pick one Warm-up per week as low-friction practice. Schedule Core exercises into weekend blocks. Save Stretch exercises for monthly capstone weeks where the plan already calls for shipping a portfolio artifact.
2. **Public output is the multiplier.** Every Core and Stretch exercise pushes to a public repo or blog. Your GitHub becomes the proof-of-work that no resume bullet can match.
3. **Honest difficulty downgrades.** If you can’t finish a Stretch in the expected time, *write up what blocked you*. The gap is information — it tells you which fundamental needs more time. Skipping silently is the failure mode.
4. **Re-use across topics.** Exercise outputs compound: your §9 Kaggle model becomes the §19 MLOps deployment which becomes the §20 model card which becomes the §27-week capstone. The plan and this document are designed to make this kind of layering trivial.
5. **Iterate quarterly.** Star counts and active-maintenance status drift. Recheck repo activity tabs every 3 months; swap out anything that’s clearly abandoned for the modern equivalent.
---
 
*Companion document to `senior-ai-ml-engineer-plan.md`. Exercise difficulty is calibrated for an experienced engineer (8+ years) actively transitioning into senior AI/ML work. Star counts and tool currency reflect May 2026; verify before committing serious time.*
 
# Tools & stack (consolidated)
 
**Editor + shell:** Neovim or VS Code + Cursor + Claude Code; `zsh` / `fish`; `tmux`, `fzf`, `ripgrep`, `lazygit`.
**Local infra:** Docker, `kind`, `k9s`, `dive`, devcontainer.
**Backend langs:** Python (primary AI), C# (existing), Go (Month 2 onwards), bonus Rust.
**Frontend:** Angular base + one React/SvelteKit project for breadth.
**Databases:** Postgres + pgvector + PgBouncer + Redis + ClickHouse (Month 7 if needed).
**Data engineering:** Spark / PySpark, Airflow, dbt, Delta Lake, DuckDB.
**Messaging:** Kafka or Redpanda, RabbitMQ.
**Observability:** Grafana stack (Loki, Tempo, Mimir/Prometheus, Pyroscope), OpenTelemetry SDK, Sentry.
**ML platforms:** MLflow + W&B + SageMaker + Vertex AI (touch all).
**Model serving:** vLLM + SGLang for LLMs; Triton + BentoML + Ray Serve + KServe for non-LLM.
**ML monitoring:** Evidently (free) + Arize Phoenix or Fiddler trial.
**LLM observability:** Langfuse (self-host) + LangSmith + `promptfoo`.
**Vector DBs:** pgvector + Qdrant + (touch Pinecone, Weaviate, Milvus).
**Fine-tuning:** Unsloth + Axolotl + TRL + `accelerate` (FSDP) + DeepSpeed.
**Compute:** Hetzner / DO VPS for cheap real deploys (€5-20/mo); managed K8s (€20/mo); RunPod / Lambda / Vast.ai for GPUs.
**IaC + GitOps:** Terraform + Argo CD or Flux.
**Notes + writing:** Obsidian or Logseq, daily log; weekly review every Friday.
 
# Lifestyle (the unsexy multiplier)
 
- **Sleep 7.5-8h.** Non-negotiable. Engineers who skip sleep produce worse code and feel more productive.
- **Train 4×/week.** Mix strength + cardio. Cognitive endurance and physical endurance are correlated.
- **Two 90-minute deep-work blocks daily**, phone in another room. One 90-minute shallow block for code review / email / PRs. Five hours of real work beats ten hours of distracted work.
- **One full off-day per week.** Brain consolidates during rest. People who skip this plateau by month 4.
- **Cut social media** to a hard time-box. Replace with one paper a week from arXiv, one chapter of DDIA / *Designing ML Systems* / *AI Engineering* (Chip Huyen), and short-form writing from people who build (Simon Willison, Eugene Yan, Chip Huyen, Hamel Husain, Mitchell Hashimoto, Dan Luu, Armin Ronacher).
- **Find one peer.** Pair-program weekly. Solo growth is real but capped.
- **Write daily.** 200 words is enough. Writing exposes the gap between "I think I understand" and "I understand."
- **Cook at home most days.** Mood, energy, money — all matter for a 7-month commitment.
- **Public commitment.** Pick one place (X, LinkedIn, blog) and post weekly progress. Not for clout — for the consistency it forces.
---
 
# What success looks like by Month 7
 
- 7 monthly capstones live, public, documented.
- One merged or pending PR in a major OSS AI framework.
- One model on HuggingFace with a real model card.
- One blog post per month — 7 long-form posts.
- A capstone product handling real users with full observability + EU AI Act-shaped technical doc.
- A CV that reads "Senior ML Engineer who can do classical ML *and* LLMs *and* infra *and* compliance" — the rare profile that hiring managers in EU senior + lead AI roles say they want and rarely actually find.
---
 
# Top-15 priority skills (from market gap analysis, mapped to weeks)
 
| # | Skill | Priority | Covered in |
| --- | --- | --- | --- |
| 1 | MLflow + W&B + SageMaker / Vertex AI | MUST | Week 12 |
| 2 | Classical ML — sklearn, XGBoost, LightGBM, Optuna | MUST | Week 14 |
| 3 | Stats + A/B testing + causal inference + bandits | MUST | Week 15 |
| 4 | Spark + Airflow + dbt + Delta Lake | MUST | Weeks 7-8 |
| 5 | Drift / monitoring (Evidently, Arize) | MUST | Week 26 |
| 6 | Production serving — Triton, BentoML, Ray Serve, KServe | MUST | Week 11 |
| 7 | Recommender systems — two-tower, ANN, LTR | MUST | Week 16 |
| 8 | EU AI Act + responsible-AI plumbing | MUST (EU) | Weeks 6, 27 |
| 9 | LangChain / LangGraph + LangSmith / Langfuse | HIGH | Weeks 23, 25 |
| 10 | Vector-DB production tradeoffs | HIGH | Week 21 |
| 11 | Async Python + Pydantic v2 + FastAPI | HIGH | Week 5 |
| 12 | CV stack (YOLO, ViT, ONNX/TensorRT) | HIGH (Djinni/DACH) | Week 20 |
| 13 | Distributed training (FSDP, DeepSpeed, accelerate) | HIGH | Week 19 |
| 14 | Feature stores (Feast) | HIGH | Week 12 (bonus) |
| 15 | MCP + AutoGen / CrewAI / Agents SDK | HIGH (rising) | Week 25 |
 
[Week 1 Foundations — Linux, Networking, Shell, Git](https://www.notion.so/Week-1-Foundations-Linux-Networking-Shell-Git-363055780eff80ec9c34cb4e9a703674?pvs=21)