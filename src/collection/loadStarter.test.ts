import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/artic'
import { ids, work } from '../test/fixtures'
import { readCache, writeCache } from './cache'
import { loadStarter } from './loadStarter'

const NOW = Date.UTC(2026, 8, 28, 12)
const DEPARTMENTS = ['Arts of Asia', 'Textiles']

const live = {
  'Arts of Asia': [work({ id: 1, department: 'Arts of Asia' })],
  Textiles: [work({ id: 2, department: 'Textiles' })],
}
const snapshot = [
  work({ id: 101, department: 'Arts of Asia' }),
  work({ id: 102, department: 'Textiles' }),
]

function setup(loadDepartment: (department: string) => Promise<ReturnType<typeof work>[]>) {
  const spy = vi.fn(loadDepartment)
  return {
    spy,
    run: () =>
      loadStarter({
        loadDepartment: spy,
        loadSnapshot: async () => snapshot,
        departments: DEPARTMENTS,
        now: NOW,
      }),
  }
}

describe('loadStarter', () => {
  it('loads every department live, in room order, and caches the result', async () => {
    const { run } = setup(async (d) => live[d as keyof typeof live])
    const result = await run()
    expect(ids(result.works)).toEqual([1, 2])
    expect(result.source).toBe('live')
    expect(result.notice).toBeNull()
    expect(ids(readCache(NOW) ?? [])).toEqual([1, 2])
  })

  it('uses a fresh cache without calling the API', async () => {
    writeCache([work({ id: 9 })], NOW - 1000)
    const { run, spy } = setup(async () => [])
    const result = await run()
    expect(ids(result.works)).toEqual([9])
    expect(result.source).toBe('cache')
    expect(spy).not.toHaveBeenCalled()
  })

  it('fills one failed department from the snapshot and caches nothing', async () => {
    const { run } = setup(async (d) => {
      if (d === 'Textiles') throw new ApiError('down')
      return live[d as keyof typeof live]
    })
    const result = await run()
    expect(ids(result.works)).toEqual([1, 102])
    expect(result.source).toBe('mixed')
    expect(result.notice).toMatch(/Textiles/)
    expect(readCache(NOW)).toBeNull()
  })

  it('fills a department that returns nothing from the snapshot', async () => {
    const { run } = setup(async (d) => (d === 'Textiles' ? [] : live['Arts of Asia']))
    const result = await run()
    expect(ids(result.works)).toEqual([1, 102])
    expect(result.source).toBe('mixed')
  })

  it('falls back to the whole snapshot when every request fails', async () => {
    const { run } = setup(async () => {
      throw new ApiError('down')
    })
    const result = await run()
    expect(ids(result.works)).toEqual([101, 102])
    expect(result.source).toBe('snapshot')
    expect(result.notice).toMatch(/saved copy/i)
    expect(readCache(NOW)).toBeNull()
  })

  it('drops a work that appears twice', async () => {
    const { run } = setup(async () => [work({ id: 1, department: 'Arts of Asia' })])
    const result = await run()
    expect(ids(result.works)).toEqual([1])
  })
})
