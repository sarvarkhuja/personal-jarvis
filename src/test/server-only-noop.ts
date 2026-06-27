// Test-only stub. The real `server-only` package throws at import time when
// loaded by a client bundle; vitest's environment doesn't distinguish, so we
// alias it to a no-op for tests via `vitest.config.ts`.
export {};
