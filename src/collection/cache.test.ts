import { describe, expect, it, vi } from 'vitest'
import { work } from '../test/fixtures'
import { CACHE_KEY, MAX_AGE_MS, readCache, writeCache } from './cache'

const NOW = Date.UTC(2026, 8, 28, 12)

describe('collection cache', () => {
  it('returns what was written', () => {
    const works = [work({ id: 1 }), work({ id: 2 })]
    writeCache(works, NOW)
    expect(readCache(NOW + 1000)).toEqual(works)
  })

  it('is empty when nothing was written', () => {
    expect(readCache(NOW)).toBeNull()
  })

  it('treats an entry older than 24 hours as missing', () => {
    writeCache([work({ id: 1 })], NOW)
    expect(readCache(NOW + MAX_AGE_MS - 1)).not.toBeNull()
    expect(readCache(NOW + MAX_AGE_MS + 1)).toBeNull()
  })

  it('treats an entry under another version key as missing', () => {
    window.localStorage.setItem(
      'mp2.collection.v0',
      JSON.stringify({ savedAt: NOW, works: [work({ id: 1 })] }),
    )
    expect(CACHE_KEY).not.toBe('mp2.collection.v0')
    expect(readCache(NOW)).toBeNull()
  })

  it('treats a damaged entry as missing', () => {
    window.localStorage.setItem(CACHE_KEY, '{not json')
    expect(readCache(NOW)).toBeNull()
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: NOW, works: [] }))
    expect(readCache(NOW)).toBeNull()
  })

  it('does not throw when storage refuses the write', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError')
      })
    expect(() => writeCache([work({ id: 1 })], NOW)).not.toThrow()
    spy.mockRestore()
  })
})
