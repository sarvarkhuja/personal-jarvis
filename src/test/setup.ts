import '@testing-library/jest-dom'

// ProseMirror (Tiptap) measures selections with Range client rects and scrolls the
// caret into view; jsdom implements neither. Zero-size rects keep it happy.
if (typeof Range !== 'undefined') {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }
  Range.prototype.getBoundingClientRect = () => rect as DOMRect
  Range.prototype.getClientRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
}
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {}
}
if (typeof document !== 'undefined' && typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null
}

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
