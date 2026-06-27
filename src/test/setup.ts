import '@testing-library/jest-dom'

// jsdom under this vitest/node combo doesn't always expose a working
// localStorage (it warns about `--localstorage-file`). Provide a simple
// in-memory implementation so client components that touch storage can render.
if (
  typeof window !== 'undefined' &&
  typeof window.localStorage?.getItem !== 'function'
) {
  const store = new Map<string, string>()
  const localStorageStub: Storage = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageStub,
  })
}
