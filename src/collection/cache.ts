import type { Artwork } from '../types/artwork'

/** Change the version when the shape of a cached artwork changes. */
export const CACHE_KEY = 'mp2.collection.v1'
export const MAX_AGE_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  savedAt: number
  works: Artwork[]
}

export function readCache(now: number): Artwork[] | null {
  try {
    const saved = window.localStorage.getItem(CACHE_KEY)
    if (!saved) return null
    const entry = JSON.parse(saved) as Partial<CacheEntry>
    if (typeof entry.savedAt !== 'number' || !Array.isArray(entry.works)) return null
    if (entry.works.length === 0) return null
    if (now - entry.savedAt > MAX_AGE_MS) return null
    return entry.works
  } catch {
    return null
  }
}

export function writeCache(works: Artwork[], now: number): void {
  try {
    const entry: CacheEntry = { savedAt: now, works }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Storage full or blocked: the next visit refetches.
  }
}
