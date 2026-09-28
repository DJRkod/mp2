import type { Artwork } from '../types/artwork'
import { readCache, writeCache } from './cache'
import type { StarterSource } from './collectionReducer'

export type NoticeKind = 'info' | 'error'

export interface StarterResult {
  works: Artwork[]
  source: StarterSource
  notice: string | null
  noticeKind: NoticeKind
}

interface Options {
  loadDepartment: (department: string) => Promise<Artwork[]>
  loadSnapshot: () => Promise<Artwork[]>
  departments: string[]
  now: number
}

export const LOAD_FAILED =
  'The collection could not be loaded. Check your connection and reload the page.'

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
  if (cached) {
    return { works: cached, source: 'cache', notice: null, noticeKind: 'info' }
  }

  const settled = await Promise.allSettled(departments.map(loadDepartment))
  const rooms = settled.map((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )
  const missing = departments.filter((_, index) => rooms[index].length === 0)

  if (missing.length === 0) {
    const works = unique(rooms.flat())
    writeCache(works, now)
    return { works, source: 'live', notice: null, noticeKind: 'info' }
  }

  // The snapshot is a separate download, so it can fail too.
  const snapshot = await loadSnapshot().catch((): Artwork[] => [])
  const filled = rooms.map((room, index) =>
    room.length > 0
      ? room
      : snapshot.filter((work) => work.department === departments[index]),
  )
  const works = unique(filled.flat())

  if (works.length === 0) {
    return { works, source: 'snapshot', notice: LOAD_FAILED, noticeKind: 'error' }
  }

  const source = missing.length === departments.length ? 'snapshot' : 'mixed'
  const stillEmpty = departments.filter((_, index) => filled[index].length === 0)
  const saved = missing.filter((department) => !stillEmpty.includes(department))

  if (source === 'snapshot' && stillEmpty.length === 0) {
    return {
      works,
      source,
      notice:
        'The Art Institute API could not be reached, so this is a saved copy of the collection.',
      noticeKind: 'info',
    }
  }

  const sentences = []
  if (saved.length > 0) {
    sentences.push(
      `Some rooms are showing a saved copy because they could not be loaded: ${saved.join(', ')}.`,
    )
  }
  if (stillEmpty.length > 0) {
    sentences.push(
      `Some rooms could not be loaded and are missing: ${stillEmpty.join(', ')}.`,
    )
  }
  return {
    works,
    source,
    notice: sentences.join(' '),
    noticeKind: stillEmpty.length > 0 ? 'error' : 'info',
  }
}
