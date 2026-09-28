import type { Artwork } from '../types/artwork'

/** Lower case, with accents removed, so "cezanne" finds "Cézanne". */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Works whose title and artist together contain every word of the query, so
 * "monet water" finds Water Lilies by Claude Monet.
 */
export function searchWorks(works: Artwork[], query: string): Artwork[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return works
  return works.filter((work) => {
    const text = normalize(`${work.title ?? ''} ${work.artist ?? ''}`)
    return words.every((word) => text.includes(word))
  })
}
