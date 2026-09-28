import type { Artwork } from '../types/artwork'

export type StarterSource = 'cache' | 'live' | 'mixed' | 'snapshot'

export type SearchState =
  | { status: 'idle' }
  | { status: 'searching'; query: string }
  | { status: 'done'; query: string; found: number; added: number; ids: number[] }
  | { status: 'error'; query: string; message: string }

export interface CollectionState {
  status: 'loading' | 'ready'
  byId: Record<number, Artwork>
  /** Every work: the starter collection, then works added by searches. */
  order: number[]
  /** The starter collection only; the default order for previous and next. */
  starterOrder: number[]
  source: StarterSource | null
  /** A non-blocking message about how the starter collection loaded. */
  notice: string | null
  /** Fixed for the session once the starter collection has loaded. */
  typeOptions: string[]
  search: SearchState
}

export type CollectionAction =
  | {
      type: 'starterLoaded'
      works: Artwork[]
      source: StarterSource
      notice: string | null
    }
  | { type: 'searchStarted'; query: string }
  | { type: 'searchSucceeded'; query: string; works: Artwork[] }
  | { type: 'searchFailed'; query: string; message: string }
  | { type: 'searchCleared' }

export const initialState: CollectionState = {
  status: 'loading',
  byId: {},
  order: [],
  starterOrder: [],
  source: null,
  notice: null,
  typeOptions: [],
  search: { status: 'idle' },
}

function typesOf(works: Artwork[]): string[] {
  const types = new Set(works.flatMap((work) => work.artworkType ?? []))
  return [...types].sort((a, b) => a.localeCompare(b))
}

export function collectionReducer(
  state: CollectionState,
  action: CollectionAction,
): CollectionState {
  switch (action.type) {
    case 'starterLoaded': {
      const order = action.works.map((work) => work.id)
      return {
        ...state,
        status: 'ready',
        byId: Object.fromEntries(action.works.map((work) => [work.id, work])),
        order,
        starterOrder: order,
        source: action.source,
        notice: action.notice,
        typeOptions: typesOf(action.works),
      }
    }
    case 'searchStarted':
      return { ...state, search: { status: 'searching', query: action.query } }
    case 'searchSucceeded': {
      const fresh = action.works.filter((work) => !(work.id in state.byId))
      const byId = { ...state.byId }
      for (const work of fresh) byId[work.id] = work
      return {
        ...state,
        byId,
        order: [...state.order, ...fresh.map((work) => work.id)],
        search: {
          status: 'done',
          query: action.query,
          found: action.works.length,
          added: fresh.length,
          ids: action.works.map((work) => work.id),
        },
      }
    }
    case 'searchFailed':
      return {
        ...state,
        search: { status: 'error', query: action.query, message: action.message },
      }
    case 'searchCleared':
      return { ...state, search: { status: 'idle' } }
  }
}

export function allWorks(state: CollectionState): Artwork[] {
  return state.order.map((id) => state.byId[id])
}

export function starterWorks(state: CollectionState): Artwork[] {
  return state.starterOrder.map((id) => state.byId[id])
}
