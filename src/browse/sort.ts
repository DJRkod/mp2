import type { Artwork } from '../types/artwork'

export const SORT_KEYS = ['title', 'artist', 'year'] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const SORT_DIRECTIONS = ['asc', 'desc'] as const
export type SortDirection = (typeof SORT_DIRECTIONS)[number]

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return collator.compare(String(a), String(b))
}

/** Sorted copy. Works missing the sort field come last in either direction. */
export function sortWorks(
  works: Artwork[],
  key: SortKey,
  direction: SortDirection,
): Artwork[] {
  const sign = direction === 'asc' ? 1 : -1
  return [...works].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left === null && right === null) return a.id - b.id
    if (left === null) return 1
    if (right === null) return -1
    return sign * compareValues(left, right) || a.id - b.id
  })
}
