// GENERATED — run npm run roadmap:gen
import type { Capstone, RoadmapWeek } from "./roadmap-parse";

export const ROADMAP_WEEKS: RoadmapWeek[] = [
  {
    "week": 1,
    "month": 1,
    "go": "Go stdlib, module boundaries, HTTP, `context`, error handling, table tests",
    "ai": "API and basic numerical/data contracts",
    "ml": "ML environment as a system: `uv` lockfile, CUDA/driver/PyTorch wheel matrix, CPU-only baseline container",
    "evidence": "Go API with tests and documented design; `LAB.md` version matrix",
    "capstone": null
  },
  {
    "week": 2,
    "month": 1,
    "go": "Concurrency, mutex/channels, bounded pools, cancellation, race detection",
    "ai": "Cost of parallel model calls; concurrency limits",
    "ml": "PyTorch execution model: async CUDA kernels, `synchronize`, why naive timing lies; GIL vs processes; `torch.utils.benchmark`",
    "evidence": "Worker benchmark and leak/race regression tests",
    "capstone": null
  },
  {
    "week": 3,
    "month": 1,
    "go": "PostgreSQL/pgx, EXPLAIN/indexes, Redis caching, keyset pagination",
    "ai": "Retrieval and embedding metadata schemas",
    "ml": "Embedding throughput vs batch size and sequence length; vector dtype/storage cost (`vector` vs `halfvec`)",
    "evidence": "Query benchmarks plus migrations",
    "capstone": null
  },
  {
    "week": 4,
    "month": 1,
    "go": "Docker, CI/CD, OTel, profiling, reverse proxy, TLS, SLOs",
    "ai": "Stubbed model backend with timeouts",
    "ml": "Model sidecar container: CPU vs CUDA image size, model load and warm-up time, readiness gating",
    "evidence": "**Capstone 1:** Go API gateway on a Proxmox VM + incident report",
    "capstone": 1
  },
  {
    "week": 5,
    "month": 2,
    "go": "gRPC/Connect vs HTTP, API versioning, idempotency, retry budgets",
    "ai": "Streaming token proxy (SSE), client cancellation",
    "ml": "Tokenizers and chat templates: Go/Python token-count parity, streaming detokenization, template-mismatch failures",
    "evidence": "Model-proxy contract tests",
    "capstone": null
  },
  {
    "week": 6,
    "month": 2,
    "go": "Kafka/Redpanda, transactional outbox, dedup, replay",
    "ai": "Asynchronous inference/request jobs",
    "ml": "Python batch-inference consumer: batch sizing, OOM back-off to smaller batches, idempotent outputs",
    "evidence": "Crash-recovery assertions + traces",
    "capstone": null
  },
  {
    "week": 7,
    "month": 2,
    "go": "Partitioning, overload, backpressure, consistency, sagas where applicable",
    "ai": "Batching, queue fairness and tenant quotas",
    "ml": "GPU memory math: weights + KV cache + activations by dtype; predict now, verify with `torch.cuda.memory_summary` once the GPU gate passes",
    "evidence": "Capacity model and failure matrix",
    "capstone": null
  },
  {
    "week": 8,
    "month": 2,
    "go": "Deploy broker/workers safely; data correctness drills",
    "ai": "Distributed event-driven ingestion",
    "ml": "`torch.profiler` + Chrome trace on an embedding job: tokenization (CPU) vs compute vs data loading",
    "evidence": "**Capstone 2:** durable Go job platform + replay runbook",
    "capstone": 2
  },
  {
    "week": 9,
    "month": 3,
    "go": "Kubernetes Pods/Deployments/Services/Ingress/ConfigMaps/Secrets on your **k3s** cluster (`kind` in CI)",
    "ai": "Containerized model endpoint interface",
    "ml": "Model artifacts: `safetensors` vs pickle risk, HF cache layout, model download via init container/PVC, revision pinning",
    "evidence": "Deployment manifests, probes, smoke tests",
    "capstone": null
  },
  {
    "week": 10,
    "month": 3,
    "go": "Helm, GitOps (Argo CD or Flux) on k3s, Zot/GHCR registry, safe rollouts, rollback",
    "ai": "Model/config version routing, canary evaluation",
    "ml": "Model registry (self-hosted MLflow or HF revision pins); ONNX export of a small classifier/reranker + numerical parity test",
    "evidence": "Rollout/rollback demo",
    "capstone": null
  },
  {
    "week": 11,
    "month": 3,
    "go": "OpenTofu/Terraform: `bpg/proxmox` VMs + cloud-init → k3s; GCP Always Free module (IAM/WIF, Artifact Registry, Secret Manager, Cloud Run, monitoring, budgets)",
    "ai": "Cost tags, token accounting and provider budgets",
    "ml": "ONNX Runtime CPU serving for the Cloud Run deployment: latency vs PyTorch eager",
    "evidence": "Lab rebuilt from `tofu apply`; GCP budget alert + destroy log",
    "capstone": null
  },
  {
    "week": 12,
    "month": 3,
    "go": "Kubebuilder and Go controllers: CRDs, reconcile loop, finalizers, RBAC; `envtest` + e2e on k3s",
    "ai": "Reconcile an `InferenceDeployment` against simulated GPU node pools (`fake-gpu-operator`)",
    "ml": "Map vLLM engine arguments (model, revision, quantization, `max-model-len`, `gpu-memory-utilization`) into the CRD spec + validation",
    "evidence": "**Capstone 3:** Kubernetes operator on k3s + Cloud Run deployment",
    "capstone": 3
  },
  {
    "week": 13,
    "month": 4,
    "go": "Search service architecture, ingestion pipelines, access control",
    "ai": "Embeddings, BM25/dense/hybrid retrieval",
    "ml": "Embedding model choice as a systems decision: dimensions, latency, GPU vs CPU, batch, re-embedding cost",
    "evidence": "Retrieval baseline + recall@k",
    "capstone": null
  },
  {
    "week": 14,
    "month": 4,
    "go": "Index versioning/rebuild, event processing, ACL filters",
    "ai": "Rerankers, citations, dataset/eval quality",
    "ml": "Cross-encoder reranker cost: batch, truncation length, p95 on GPU vs CPU; sizing a re-embedding job for model upgrades",
    "evidence": "End-to-end trace from query to answer",
    "capstone": null
  },
  {
    "week": 15,
    "month": 4,
    "go": "Multi-tenancy, authn/authz, prompt injection and data exfiltration defenses",
    "ai": "100-case retrieval/answer eval, adversarial cases",
    "ml": "Python eval harness as a system: versioned datasets, seeds, judge calibration (Cohen's κ / QWK), CI runtime budget",
    "evidence": "Tenant-isolation and red-team tests",
    "capstone": null
  },
  {
    "week": 16,
    "month": 4,
    "go": "Adaptive cache, rate limits, quotas and provider fallback",
    "ai": "Structured output, model quality-cost comparison",
    "ml": "Constrained decoding (xgrammar / vLLM guided decoding): schema-validity rate vs latency cost",
    "evidence": "**Capstone 4:** production Go RAG gateway + eval gate",
    "capstone": 4
  },
  {
    "week": 17,
    "month": 5,
    "go": "Go inference reverse proxy and admission control",
    "ai": "Local vLLM/SGLang (GPU LXC) + Go mock provider for load; hosted free tiers for correctness only; token budgets",
    "ml": "vLLM engine internals: scheduler, PagedAttention, continuous batching, `/metrics` (waiting requests, KV-cache usage); engine-argument tuning on 8 GB",
    "evidence": "TTFT/TPOT/p95/load results",
    "capstone": null
  },
  {
    "week": 18,
    "month": 5,
    "go": "Queueing, batching, autoscaling, GPU scheduling fundamentals",
    "ai": "KV/prefix caching, quantization and context tradeoffs",
    "ml": "Quantization on Ada: AWQ vs GPTQ vs GGUF vs FP8 — memory, speed and quality on your own eval set; KV-cache dtype",
    "evidence": "Cost-per-successful-answer dashboard (local energy + amortisation vs hosted list price)",
    "capstone": null
  },
  {
    "week": 19,
    "month": 5,
    "go": "KEDA/HPA, GPU scheduling with `fake-gpu-operator` node pools (labels/taints/quotas); optional VFIO weekend with device plugin + time-slicing; optional KServe",
    "ai": "Compare local vs hosted model on quality, local vs mock fleet under load",
    "ml": "Multi-LoRA adapter serving in vLLM (hot-load, per-tenant adapters) vs SGLang",
    "evidence": "Architecture and capacity ADR",
    "capstone": null
  },
  {
    "week": 20,
    "month": 5,
    "go": "Load shedding, failure isolation, performance profiling and rollback",
    "ai": "Structured-output/streaming resilience",
    "ml": "Runtime failure drills: CUDA OOM, driver/kernel mismatch after a host update, model-load timeout, `torch.compile`/CUDA-graph warm-up vs `--enforce-eager`",
    "evidence": "**Capstone 5:** scalable inference gateway + failure drills",
    "capstone": 5
  },
  {
    "week": 21,
    "month": 6,
    "go": "Go state machines, job persistence, compensation and human checkpoints",
    "ai": "Deterministic workflow vs agent; tool-eval metrics",
    "ml": "Small local models for tool calling: function-call formats, parser failures, guard/classifier sidecar latency",
    "evidence": "Crash-resumable job and tests",
    "capstone": null
  },
  {
    "week": 22,
    "month": 6,
    "go": "Go MCP server/client (official Go SDK v1.7+, 2026-07-28 spec, stateless streamable HTTP), OAuth or service identity, per-tool authorization",
    "ai": "Tool schema validation, prompt/tool-injection defenses",
    "ml": "Python-backed tools behind MCP: timeouts, payload caps, returning references (paths/IDs) instead of large payloads",
    "evidence": "Hardened read-only tool service",
    "capstone": null
  },
  {
    "week": 23,
    "month": 6,
    "go": "Durable tasks, event audit, retries, outbox, timeouts",
    "ai": "Context compaction, memory boundaries and evals",
    "ml": "Tokenizer-accurate context budgets; prefix stability vs KV-cache reuse measured on local vLLM",
    "evidence": "Long-horizon task benchmark",
    "capstone": null
  },
  {
    "week": 24,
    "month": 6,
    "go": "Go operator/controller integration with safe agent workflows",
    "ai": "Model/tool/provider failure handling, optional A2A comparison",
    "ml": "QLoRA fine-tune (Unsloth/PEFT) of a small model on the 4060 as a *pipeline*: data version → train → eval gate → adapter served via the operator",
    "evidence": "**Capstone 6:** audited AI workflow platform",
    "capstone": 6
  },
  {
    "week": 25,
    "month": 7,
    "go": "Senior system-design drills: AI support, search, rate-limited inference",
    "ai": "Estimating retrieval/model performance and unit cost",
    "ml": "ML system-design drills: training pipeline, feature store, serving fleet — draw the Go/Python boundary each time",
    "evidence": "Three timed design docs",
    "capstone": null
  },
  {
    "week": 26,
    "month": 7,
    "go": "SRE: chaos, capacity, bottleneck diagnosis, error budgets",
    "ai": "Quality degradation and regression alerts",
    "ml": "GPU observability: DCGM/`nvidia-smi` exporters, Xid errors, thermal throttling; runbook entries",
    "evidence": "Runbooks + dashboards + postmortem",
    "capstone": null
  },
  {
    "week": 27,
    "month": 7,
    "go": "K8s RBAC and network policies, GCP IAM/WIF review, secret rotations, threat model",
    "ai": "Model and dataset boundaries; data retention/deletion",
    "ml": "Model supply chain: `safetensors`, hashes, licences, model/dataset cards",
    "evidence": "Security evidence and review",
    "capstone": null
  },
  {
    "week": 28,
    "month": 7,
    "go": "Operational hardening, reliability architecture defense",
    "ai": "End-to-end AI quality, cost and tracing review",
    "ml": "ML-runtime review: memory budget, engine settings and quantization choices defended with your own measurements",
    "evidence": "**Capstone 7:** integrated platform, public demo (Cloudflare Tunnel/Tailscale Funnel + recorded video) and 10-min design defense",
    "capstone": 7
  }
];

export const CAPSTONES: Capstone[] = [
  {
    "n": 1,
    "title": "Go AI API gateway",
    "description": "request admission, auth, quotas, SSE streams, cancellation, Redis, OTel and load tests; mock model so no GPU is required; deployed to a Proxmox VM."
  },
  {
    "n": 2,
    "title": "Durable job and event platform",
    "description": "Go workers, Postgres transactional outbox, Kafka/Redpanda consumers, dedup, replay and chaos tests."
  },
  {
    "n": 3,
    "title": "Kubernetes inference operator",
    "description": "Kubebuilder CRD/controller, retries/reconciliation/status conditions, RBAC and rollback; tested with `envtest` and on k3s against simulated GPU pools (`fake-gpu-operator`); the gateway image is also deployed to Cloud Run via Terraform. Prove operator behavior under failure, not just creation of CRD YAML."
  },
  {
    "n": 4,
    "title": "Secure retrieval platform",
    "description": "Go RAG orchestration + pgvector/Qdrant + hybrid retrieval, tenant-level authorization, citeable answers, 100-case evals and cost dashboards."
  },
  {
    "n": 5,
    "title": "Inference routing platform",
    "description": "Go gateway routing hosted + self-hosted models, token-aware admission, latency/TTFT/TPOT/load, fallback and quota cost accounting; local RTX 4060 for self-hosted serving, a Go mock provider for load, free or pay-per-call hosted APIs for correctness — no GPU rental."
  },
  {
    "n": 6,
    "title": "Durable agent workflow system",
    "description": "Go job/state machine and official MCP SDK integration, structured tool contracts, human approval for side effects, recovery and trace-linked evaluation."
  },
  {
    "n": 7,
    "title": "Integrated AI systems platform",
    "description": "k3s on Proxmox plus the GCP free-tier module, operator, gateway, retrieval, model service, observability, security and incident rehearsals—with an architecture document explaining tradeoffs at 10× and 100× scale."
  }
];
