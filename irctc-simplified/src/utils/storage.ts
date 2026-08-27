/**
 * Safe, JSON-aware wrapper around Web Storage.
 *
 * Every read/write is try/caught: storage can be unavailable (private
 * browsing, disabled by policy) or full, and per
 * spec/05-technical-spec.md §31, that should degrade gracefully
 * (fall back to doing nothing / returning undefined) rather than
 * throwing and breaking the app.
 */

type StorageArea = 'session' | 'local';

function getArea(area: StorageArea): Storage | undefined {
  try {
    return area === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readJSON<T>(area: StorageArea, key: string): T | undefined {
  const storage = getArea(area);
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeJSON<T>(area: StorageArea, key: string, value: T): void {
  const storage = getArea(area);
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — fail silently, per the graceful-
    // degradation decision in spec/05-technical-spec.md §31.
  }
}

export function removeKey(area: StorageArea, key: string): void {
  const storage = getArea(area);
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}
