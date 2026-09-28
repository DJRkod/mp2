import type { Artwork } from '../types/artwork'

let nextId = 1

/** A complete artwork; pass only the fields a test cares about. */
export function work(overrides: Partial<Artwork> = {}): Artwork {
  const id = overrides.id ?? nextId++
  return {
    id,
    title: `Work ${id}`,
    artist: 'Unknown Maker',
    year: 1900,
    dateDisplay: '1900',
    medium: 'Oil on canvas',
    department: 'Painting and Sculpture of Europe',
    artworkType: 'Painting',
    placeOfOrigin: 'France',
    style: 'Impressionism',
    imageId: `image-${id}`,
    ...overrides,
  }
}

export function ids(works: { id: number }[]): number[] {
  return works.map((w) => w.id)
}
