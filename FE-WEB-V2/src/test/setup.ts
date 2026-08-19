import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom implements neither of these, and several components rely on them.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Components confirm destructive actions; tests opt in per-case instead of blocking on a real dialog.
window.confirm ??= vi.fn(() => true) as unknown as typeof window.confirm;

/**
 * Storage for tests.
 *
 * Node 22 installs its own experimental `localStorage`/`sessionStorage` getters, and they return
 * `undefined` unless the process was started with `--localstorage-file`. Under vitest's jsdom
 * environment `globalThis === window`, so those getters land on the jsdom window itself and shadow
 * the implementation jsdom would otherwise provide — `localStorage` is undefined everywhere, and
 * every test that touched storage threw `Cannot read properties of undefined`.
 *
 * Rather than requiring a Node flag on every future test run, the globals are replaced with a
 * spec-shaped in-memory Storage. Behaviour matches what the app actually uses: string keys and
 * values, `null` for a miss, and a `clear()` that tests call between cases.
 */
function createStorage(): Storage {
  let entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => (entries.has(key) ? entries.get(key)! : null),
    setItem: (key: string, value: string) => void entries.set(String(key), String(value)),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => {
      entries = new Map();
    },
  } as Storage;
}

for (const key of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, key, {
    value: createStorage(),
    configurable: true,
    writable: true,
  });
}
