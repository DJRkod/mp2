import { createContext, useContext } from 'react'
import type { Artwork } from '../types/artwork'
import type { CollectionState } from './collectionReducer'

export interface CollectionValue {
  state: CollectionState
  /** Every work in the collection, starter works first. */
  works: Artwork[]
  /** The starter collection in its default order. */
  starter: Artwork[]
  /** Department names in room order. */
  departments: string[]
  searchMuseum: (query: string) => Promise<void>
  clearSearch: () => void
  /** One artwork by id, or null when it may not be shown. */
  fetchArtwork: (id: number) => Promise<Artwork | null>
}

export const CollectionContext = createContext<CollectionValue | null>(null)

export function useCollection(): CollectionValue {
  const value = useContext(CollectionContext)
  if (!value) throw new Error('useCollection needs a CollectionProvider')
  return value
}
