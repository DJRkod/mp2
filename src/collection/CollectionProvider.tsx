import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { artic } from '../api/artic'
import type { ArticClient } from '../api/artic'
import type { Artwork } from '../types/artwork'
import { CollectionContext } from './CollectionContext'
import type { CollectionValue } from './CollectionContext'
import {
  allWorks,
  collectionReducer,
  initialState,
  starterWorks,
} from './collectionReducer'
import { DEPARTMENTS } from './departments'
import { LOAD_FAILED, loadStarter } from './loadStarter'

async function loadBundledSnapshot(): Promise<Artwork[]> {
  const module = await import('../data/starter-snapshot.json')
  return module.default as Artwork[]
}

interface Props {
  children: ReactNode
  client?: Pick<ArticClient, 'loadDepartment' | 'searchMuseum' | 'fetchArtwork'>
  departments?: string[]
  loadSnapshot?: () => Promise<Artwork[]>
  /** Loads the starter collection; replaced in tests. */
  load?: typeof loadStarter
}

export function CollectionProvider({
  children,
  client = artic,
  departments = DEPARTMENTS,
  loadSnapshot = loadBundledSnapshot,
  load = loadStarter,
}: Props) {
  const [state, dispatch] = useReducer(collectionReducer, initialState)
  const started = useRef(false)

  useEffect(() => {
    // StrictMode runs effects twice in development; load only once.
    if (started.current) return
    started.current = true
    load({
      loadDepartment: client.loadDepartment,
      loadSnapshot,
      departments,
      now: Date.now(),
    }).then(
      (result) => dispatch({ type: 'starterLoaded', ...result }),
      // The loader handles the failures it knows about. This is the last
      // resort for one it does not, so the app never stays on "loading".
      () =>
        dispatch({
          type: 'starterLoaded',
          works: [],
          source: 'snapshot',
          notice: LOAD_FAILED,
          noticeKind: 'error',
        }),
    )
  }, [client, departments, loadSnapshot, load])

  const searchMuseum = useCallback(
    async (query: string) => {
      dispatch({ type: 'searchStarted', query })
      try {
        const works = await client.searchMuseum(query)
        dispatch({ type: 'searchSucceeded', query, works })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'The search failed.'
        dispatch({ type: 'searchFailed', query, message })
      }
    },
    [client],
  )

  const clearSearch = useCallback(() => dispatch({ type: 'searchCleared' }), [])

  const value = useMemo<CollectionValue>(
    () => ({
      state,
      works: allWorks(state),
      starter: starterWorks(state),
      departments,
      searchMuseum,
      clearSearch,
      fetchArtwork: client.fetchArtwork,
    }),
    [state, searchMuseum, clearSearch, client, departments],
  )

  return <CollectionContext value={value}>{children}</CollectionContext>
}
