import type { Artwork } from '../types/artwork'
import { readCache, writeCache } from './cache'
import type { StarterSource } from './collectionReducer'

export interface StarterResult {
  works: Artwork[]
  source: StarterSource
  notice: string | null
}

interface Options {
  loadDepartment: (department: string) => Promise<Artwork[]>
  loadSnapshot: () => Promise<Artwork[]>
  departments: string[]
  now: number
}

function unique(works: Artwork[]): Artwork[] {
  const seen = new Set<number>()
  return works.filter((work) => !seen.has(work.id) && seen.add(work.id))
}

/**
 * The starter collection: from the cache when fresh, otherwise one request per
 * department. A department that fails or comes back empty is filled from the
 * bundled snapshot, and only a fully live load is cached.
 */
export async function loadStarter({
  loadDepartment,
  loadSnapshot,
  departments,
  now,
}: Options): Promise<StarterResult> {
  const cached = readCache(now)
  if (cached) return { works: cached, source: 'cache', notice: null }

  const settled = await Promise.allSettled(departments.map(loadDepartment))
  const rooms = settled.map((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )
  const missing = departments.filter((_, index) => rooms[index].length === 0)

  if (missing.length === 0) {
    const works = unique(rooms.flat())
    writeCache(works, now)
    return { works, source: 'live', notice: null }
  }

  const snapshot = await loadSnapshot()
  const filled = rooms.map((room, index) =>
    room.length > 0
      ? room
      : snapshot.filter((work) => work.department === departments[index]),
  )
  const works = unique(filled.flat())

  if (missing.length === departments.length) {
    return {
      works,
      source: 'snapshot',
      notice:
        'The Art Institute API could not be reached, so this is a saved copy of the collection.',
    }
  }
  return {
    works,
    source: 'mixed',
    notice: `Some rooms are showing a saved copy because they could not be loaded: ${missing.join(', ')}.`,
  }
}
