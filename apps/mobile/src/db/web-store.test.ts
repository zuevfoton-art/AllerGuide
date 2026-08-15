import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MemoryObjectStore {
  private data = new Map<string, unknown>();

  get(key: string) {
    const request = {
      result: this.data.get(key),
      onsuccess: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  }

  put(value: unknown, key: string) {
    this.data.set(key, value);
    return { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null };
  }

  getAllKeys() {
    return { result: [...this.data.keys()], onsuccess: null as (() => void) | null };
  }

  getAll() {
    return { result: [...this.data.values()], onsuccess: null as (() => void) | null };
  }
}

class MemoryTransaction {
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor(
    private readonly store: MemoryObjectStore,
    private readonly mode: 'readonly' | 'readwrite',
  ) {}

  objectStore() {
    return this.store;
  }

  complete() {
    queueMicrotask(() => this.oncomplete?.());
  }
}

class MemoryDatabase {
  objectStoreNames = { contains: () => true };
  private readonly store = new MemoryObjectStore();

  transaction(_name: string, mode: 'readonly' | 'readwrite') {
    const tx = new MemoryTransaction(this.store, mode);
    queueMicrotask(() => tx.complete());
    return tx;
  }

  createObjectStore() {
    return this.store;
  }
}

describe('web-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('indexedDB', {
      open: () => {
        const request = {
          result: new MemoryDatabase(),
          onsuccess: null as (() => void) | null,
          onupgradeneeded: null as (() => void) | null,
          onerror: null as (() => void) | null,
        };
        queueMicrotask(() => {
          request.onsuccess?.();
        });
        return request;
      },
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    const { __resetWebStoreForTests } = await import('./web-store');
    __resetWebStoreForTests();
  });

  it('hydrates and persists writes through debounced flush', async () => {
    const { hydrateWebStore, loadJson, saveJson, getWebStoreDiagnostics } = await import('./web-store');

    await hydrateWebStore();
    expect(getWebStoreDiagnostics().hydrated).toBe(true);

    saveJson('ag_profiles', [{ id: 1, name: 'Test' }]);
    expect(loadJson('ag_profiles', [])).toHaveLength(1);
    expect(getWebStoreDiagnostics().dirtyKeys).toBe(1);

    await vi.advanceTimersByTimeAsync(150);
    expect(getWebStoreDiagnostics().dirtyKeys).toBe(0);
  });

  it('serves reads from memory without re-parsing', async () => {
    const { hydrateWebStore, loadJson, saveJson } = await import('./web-store');
    await hydrateWebStore();

    const payload = { profiles: 1 };
    saveJson('ag_settings', payload);
    const first = loadJson('ag_settings', {});
    const second = loadJson('ag_settings', {});
    expect(first).toBe(second);
  });

  it('commits a diary write without waiting for the deferred timer', async () => {
    const { flushWebStore, hydrateWebStore, saveJson, getWebStoreDiagnostics } =
      await import('./web-store');
    await hydrateWebStore();

    saveJson('ag_diary', [{ id: 1, profileId: 1 }]);
    await flushWebStore();

    expect(getWebStoreDiagnostics()).toMatchObject({ dirtyKeys: 0 });
  });
});
