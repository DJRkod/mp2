import { createContext, useContext } from 'react'
import type { Artwork } from '../types/artwork'
import type { CollectionState } from './collectionReducer'

export interface CollectionValue {
  state: CollectionState
  /** Every work in the collection, starter works first. */
  works: Artwork[]
  /** The starter collection in its default order. */
  starter: Artwork[]
  searchMuseum: (query: string) => Promise<void>
  clearSearch: () => void
}

export const CollectionContext = createContext<CollectionValue | null>(null)

export function useCollection(): CollectionValue {
  const value = useContext(CollectionContext)
  if (!value) throw new Error('useCollection needs a CollectionProvider')
  return value
}
