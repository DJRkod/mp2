import { describe, expect, it } from 'vitest'
import { ids, work } from '../test/fixtures'
import {
  allWorks,
  collectionReducer,
  initialState,
  starterWorks,
} from './collectionReducer'

function loaded(count: number) {
  const works = Array.from({ length: count }, (_, i) =>
    work({ id: i + 1, artworkType: i % 2 ? 'Print' : 'Painting' }),
  )
  return collectionReducer(initialState, {
    type: 'starterLoaded',
    works,
    source: 'live',
    notice: null,
  })
}

describe('collectionReducer', () => {
  it('starts loading and empty', () => {
    expect(initialState.status).toBe('loading')
    expect(allWorks(initialState)).toEqual([])
  })

  it('holds the starter works in default order', () => {
    const state = loaded(30)
    expect(state.status).toBe('ready')
    expect(ids(allWorks(state))).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
    expect(ids(starterWorks(state))).toEqual(ids(allWorks(state)))
  })

  it('computes the artwork-type options from the starter works, by name', () => {
    expect(loaded(4).typeOptions).toEqual(['Painting', 'Print'])
  })

  it('merges search results, keeping one copy of a work already present', () => {
    const state = collectionReducer(loaded(3), {
      type: 'searchSucceeded',
      query: 'monet',
      works: [work({ id: 2, title: 'Changed' }), work({ id: 50 }), work({ id: 51 })],
    })
    expect(ids(allWorks(state))).toEqual([1, 2, 3, 50, 51])
    expect(state.search).toEqual({ status: 'done', query: 'monet', found: 3, added: 2 })
  })

  it('keeps the default order to the starter works after a search', () => {
    const state = collectionReducer(loaded(3), {
      type: 'searchSucceeded',
      query: 'monet',
      works: [work({ id: 50 })],
    })
    expect(ids(starterWorks(state))).toEqual([1, 2, 3])
  })

  it('keeps the filter options when a search adds a new artwork type', () => {
    const state = collectionReducer(loaded(4), {
      type: 'searchSucceeded',
      query: 'mask',
      works: [work({ id: 50, artworkType: 'Mask' })],
    })
    expect(state.typeOptions).toEqual(['Painting', 'Print'])
  })

  it('marks a search in progress', () => {
    const state = collectionReducer(loaded(3), { type: 'searchStarted', query: 'monet' })
    expect(state.search).toEqual({ status: 'searching', query: 'monet' })
  })

  it('records a failed search and leaves the collection unchanged (AE5)', () => {
    const before = loaded(3)
    const state = collectionReducer(before, {
      type: 'searchFailed',
      query: 'monet',
      message: 'Could not reach the Art Institute API.',
    })
    expect(state.search).toEqual({
      status: 'error',
      query: 'monet',
      message: 'Could not reach the Art Institute API.',
    })
    expect(allWorks(state)).toEqual(allWorks(before))
  })
})
