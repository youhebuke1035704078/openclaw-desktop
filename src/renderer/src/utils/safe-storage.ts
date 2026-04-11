/**
 * Safe localStorage wrapper.
 *
 * Direct localStorage calls can throw in several real scenarios:
 *   - Safari private browsing (quota is 0)
 *   - Storage quota exhausted (QuotaExceededError)
 *   - Disabled in browser settings (SecurityError)
 *   - window.localStorage undefined (older runtimes / iframes)
 *
 * An uncaught throw during store setup crashes the entire Pinia store,
 * which prevents the renderer from booting. Wrap every access so a
 * storage failure degrades gracefully to defaults instead of a white screen.
 */

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage ?? null
  } catch {
    return null
  }
}

export function safeGet(key: string): string | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemove(key: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    /* ignored */
  }
}
