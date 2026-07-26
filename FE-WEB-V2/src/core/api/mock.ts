// Shared helpers for feature `api/*Api.ts` modules that are mocked pending real backend wiring.
// See MOCK_API_TODO.md at repo root for the full list of mock endpoints and what to replace them with.

const DEFAULT_DELAY_MS = 350;

export function mockDelay<T>(value: T, ms: number = DEFAULT_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function storageKey(name: string): string {
  return `taskgenie.mock.${name}`;
}

export function loadMockState<T>(name: string, seed: T): T {
  try {
    const raw = localStorage.getItem(storageKey(name));
    if (!raw) return seed;
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

export function saveMockState<T>(name: string, value: T): void {
  try {
    localStorage.setItem(storageKey(name), JSON.stringify(value));
  } catch {
    // ignore quota/serialization errors in mock mode
  }
}

export function nextMockId<T>(items: T[], field: keyof T): number {
  return items.reduce((max, item) => Math.max(max, Number(item[field]) || 0), 0) + 1;
}
