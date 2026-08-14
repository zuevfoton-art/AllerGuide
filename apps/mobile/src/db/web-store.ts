/**
 * Web persistence backend for the offline-first data layer.
 *
 * The data layer (`init.ts`) needs synchronous reads/writes, but IndexedDB is
 * async-only. So we keep an authoritative in-memory cache that is:
 *   - hydrated once from IndexedDB at startup (`hydrateWebStore`),
 *   - read/written synchronously (`loadJson` / `saveJson`),
 *   - persisted back to IndexedDB asynchronously (debounced write-through).
 *
 * This removes the previous localStorage limitations: the ~5–10 MB quota, the
 * main-thread blocking on every access, and the O(n) JSON re-serialization of
 * the whole store on each read. A one-time migration copies any existing
 * localStorage data into IndexedDB on first run.
 */
const DB_NAME = 'allerguide';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

const KNOWN_KEYS = [
  'ag_profiles',
  'ag_diary',
  'ag_scan_history',
  'ag_barcode_cache',
  'ag_profile_sos',
  'ag_settings',
  'ag_users',
  'ag_emergency_contacts',
] as const;

const memory = new Map<string, unknown>();
let hydrated = false;
let writeDb: IDBDatabase | null = null;
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadJson<T>(key: string, fallback: T): T {
  if (memory.has(key)) return memory.get(key) as T;

  // Safety net for reads before hydration completes (or no IndexedDB).
  if (hasLocalStorage()) {
    const raw = localStorage.getItem(key);
    if (raw != null) {
      try {
        const value = JSON.parse(raw) as T;
        memory.set(key, value);
        return value;
      } catch {
        /* ignore malformed value */
      }
    }
  }

  memory.set(key, fallback);
  return fallback;
}

export function saveJson(key: string, value: unknown): void {
  memory.set(key, value);

  if (!hasIndexedDb()) {
    if (hasLocalStorage()) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* quota or serialization failure — in-memory copy is still valid */
      }
    }
    return;
  }

  dirty.add(key);
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer != null) return;

  const run = () => {
    flushTimer = null;
    void flush();
  };

  if (typeof requestIdleCallback === 'function') {
    const idleId = requestIdleCallback(run, { timeout: 500 });
    flushTimer = idleId as unknown as ReturnType<typeof setTimeout>;
    return;
  }

  flushTimer = setTimeout(run, 120);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function ensureWriteDb(): Promise<IDBDatabase> {
  if (!writeDb) writeDb = await openDb();
  return writeDb;
}

async function flush(): Promise<void> {
  if (dirty.size === 0) return;

  const keys = [...dirty];
  dirty.clear();

  try {
    const db = await ensureWriteDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const key of keys) {
        store.put(memory.get(key), key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // Re-queue so a later write retries persistence.
    for (const key of keys) dirty.add(key);
  }
}

/** Commit pending writes before a user-visible mutation reports success. */
export async function flushWebStore(): Promise<void> {
  await flush();
}

function readAll(db: IDBDatabase): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const keysReq = store.getAllKeys();
    const valuesReq = store.getAll();
    tx.oncomplete = () => {
      const result: Record<string, unknown> = {};
      const keys = keysReq.result as IDBValidKey[];
      const values = valuesReq.result as unknown[];
      keys.forEach((key, index) => {
        result[String(key)] = values[index];
      });
      resolve(result);
    };
    tx.onerror = () => reject(tx.error);
  });
}

function hydrateFromLocalStorage(): void {
  if (!hasLocalStorage()) return;
  for (const key of KNOWN_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw == null) continue;
    try {
      memory.set(key, JSON.parse(raw));
    } catch {
      /* ignore malformed value */
    }
  }
}

export async function hydrateWebStore(): Promise<void> {
  if (hydrated) return;
  hydrated = true;

  if (!hasIndexedDb()) {
    hydrateFromLocalStorage();
    return;
  }

  try {
    const db = await openDb();
    writeDb = db;
    const existing = await readAll(db);
    const existingKeys = Object.keys(existing);

    if (existingKeys.length === 0 && hasLocalStorage()) {
      // First run: migrate any legacy localStorage data into IndexedDB.
      for (const key of KNOWN_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw == null) continue;
        try {
          const value = JSON.parse(raw);
          memory.set(key, value);
          dirty.add(key);
        } catch {
          /* ignore malformed value */
        }
      }
      await flush();
    } else {
      for (const [key, value] of Object.entries(existing)) {
        memory.set(key, value);
      }
    }
  } catch {
    hydrateFromLocalStorage();
  }
}

/** Test/diagnostic helper. */
export function getWebStoreDiagnostics(): {
  hydrated: boolean;
  memoryKeys: number;
  dirtyKeys: number;
} {
  return {
    hydrated,
    memoryKeys: memory.size,
    dirtyKeys: dirty.size,
  };
}

/** Test/diagnostic helper. */
export function __resetWebStoreForTests(): void {
  memory.clear();
  dirty.clear();
  hydrated = false;
  writeDb = null;
}
