import { describe, expect, it } from 'vitest'
import { work } from '../test/fixtures'
import { loadTrail, makeTrail, navigate, saveTrail, toEntry } from './trail'

function trailOf(count: number) {
  const works = Array.from({ length: count }, (_, i) => work({ id: i + 1 }))
  return makeTrail(works, '/?q=rain')
}

function at(id: number) {
  return toEntry(work({ id }))
}

describe('makeTrail', () => {
  it('keeps id, title and image id for each work, and the return address', () => {
    const trail = makeTrail([work({ id: 7, title: 'Nighthawks', imageId: 'x' })], '/rooms')
    expect(trail).toEqual({
      entries: [{ id: 7, title: 'Nighthawks', imageId: 'x' }],
      returnTo: '/rooms',
    })
  })
})

describe('navigate', () => {
  it('steps through and wraps from last to first (AE3)', () => {
    const trail = trailOf(5)
    const fromThird = navigate(trail, at(3))
    expect(fromThird.position).toBe(3)
    expect(fromThird.total).toBe(5)
    expect(fromThird.next.id).toBe(4)
    expect(navigate(trail, at(4)).next.id).toBe(5)
    expect(navigate(trail, at(5)).next.id).toBe(1)
  })

  it('wraps from first to last going back', () => {
    expect(navigate(trailOf(5), at(1)).previous.id).toBe(5)
  })

  it('returns the work itself in a trail of one', () => {
    const nav = navigate(trailOf(1), at(1))
    expect(nav.previous.id).toBe(1)
    expect(nav.next.id).toBe(1)
    expect(nav.strip.map((e) => e.id)).toEqual([1])
  })

  it('shows two neighbours on each side in a long trail', () => {
    const nav = navigate(trailOf(9), at(5))
    expect(nav.strip.map((e) => e.id)).toEqual([3, 4, 5, 6, 7])
  })

  it('wraps the strip at the ends of a long trail', () => {
    const nav = navigate(trailOf(9), at(1))
    expect(nav.strip.map((e) => e.id)).toEqual([8, 9, 1, 2, 3])
  })

  it('shows each work once when the trail has fewer than five', () => {
    const nav = navigate(trailOf(3), at(2))
    expect(nav.strip.map((e) => e.id)).toEqual([1, 2, 3])
  })

  it('reports a work that is not in the trail', () => {
    const nav = navigate(trailOf(5), at(99))
    expect(nav.inTrail).toBe(false)
    expect(nav.position).toBeNull()
  })

  it('treats a work outside the trail as sitting before the first work', () => {
    const nav = navigate(trailOf(5), at(99))
    expect(nav.next.id).toBe(1)
    expect(nav.previous.id).toBe(5)
    expect(nav.strip.map((e) => e.id)).toEqual([5, 99, 1])
  })

  it('handles an empty trail', () => {
    const nav = navigate(makeTrail([], '/'), at(99))
    expect(nav.next.id).toBe(99)
    expect(nav.previous.id).toBe(99)
    expect(nav.strip.map((e) => e.id)).toEqual([99])
  })
})

describe('saved trail', () => {
  it('survives a save and load', () => {
    const trail = trailOf(3)
    saveTrail(trail)
    expect(loadTrail()).toEqual(trail)
  })

  it('is null when nothing was saved', () => {
    expect(loadTrail()).toBeNull()
  })

  it('is null when the saved value is damaged', () => {
    window.sessionStorage.setItem('mp2.trail.v1', '{not json')
    expect(loadTrail()).toBeNull()
  })
})
