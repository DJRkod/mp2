import type { Artwork } from '../types/artwork'

/** Lower case, with accents removed, so "cezanne" finds "Cézanne". */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function searchWorks(works: Artwork[], query: string): Artwork[] {
  const needle = normalize(query)
  if (!needle) return works
  return works.filter(
    (work) =>
      normalize(work.title ?? '').includes(needle) ||
      normalize(work.artist ?? '').includes(needle),
  )
}
