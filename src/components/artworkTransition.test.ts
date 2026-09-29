import { afterEach, describe, expect, it, vi } from 'vitest'
import { preloadImage, withViewTransition, workingSize } from './artworkTransition'

type Decode = () => Promise<void>
const imagePrototype = HTMLImageElement.prototype as { decode?: Decode }

// The test runner reports a promise nobody handled through this.
interface Runner {
  on(event: 'unhandledRejection', listener: () => void): void
  off(event: 'unhandledRejection', listener: () => void): void
}
const runner = (globalThis as unknown as { process: Runner }).process

function stubDecode(decode: Decode) {
  imagePrototype.decode = decode
}

afterEach(() => {
  delete imagePrototype.decode
  delete (document as { startViewTransition?: unknown }).startViewTransition
  delete document.documentElement.dataset.travel
  vi.useRealTimers()
})

describe('preloadImage', () => {
  it('is ready once the picture has been decoded', async () => {
    const decode = vi.fn(async () => {})
    stubDecode(decode)
    await preloadImage('decoded-image')
    expect(decode).toHaveBeenCalledTimes(1)
  })

  it('asks for a picture only once', async () => {
    const decode = vi.fn(async () => {})
    stubDecode(decode)
    await preloadImage('asked-once')
    await preloadImage('asked-once')
    expect(decode).toHaveBeenCalledTimes(1)
  })

  it('tries a best fit when the usual size is refused, and remembers which worked', async () => {
    const asked: string[] = []
    imagePrototype.decode = function (this: HTMLImageElement) {
      asked.push(this.src)
      return asked.length === 1 ? Promise.reject(new Error('refused')) : Promise.resolve()
    }
    await preloadImage('small-original')
    expect(asked.map((src) => src.match(/\/full\/([^/]+)\//)?.[1])).toEqual(['843,', '!843,843'])
    expect(workingSize('small-original')).toBe('full-fit')
  })

  it('remembers the usual size when it works', async () => {
    stubDecode(async () => {})
    await preloadImage('large-original')
    expect(workingSize('large-original')).toBe('full')
  })

  it('remembers nothing for a picture it has not loaded', () => {
    expect(workingSize('never-asked')).toBeUndefined()
  })

  it('is ready even when the picture fails to load', async () => {
    stubDecode(async () => {
      throw new Error('broken image')
    })
    await expect(preloadImage('broken-image')).resolves.toBeUndefined()
  })

  it('stops waiting for a slow picture', async () => {
    vi.useFakeTimers()
    stubDecode(() => new Promise(() => {}))
    let done = false
    preloadImage('slow-image', 1200).then(() => {
      done = true
    })
    await vi.advanceTimersByTimeAsync(1199)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toBe(true)
  })

  it('is ready at once in a browser that cannot decode ahead of time', async () => {
    await expect(preloadImage('no-decode')).resolves.toBeUndefined()
  })
})

describe('withViewTransition', () => {
  it('makes the change inside a view transition when the browser has them', () => {
    const order: string[] = []
    const start = vi.fn((update: () => void) => {
      order.push('transition')
      update()
    })
    ;(document as { startViewTransition?: unknown }).startViewTransition = start
    withViewTransition(() => order.push('change'), 'forward')
    expect(order).toEqual(['transition', 'change'])
  })

  it('is not troubled when a newer transition cuts this one short', async () => {
    const unhandled = vi.fn()
    runner.on('unhandledRejection', unhandled)
    const skipped = () => Promise.reject(new DOMException('Transition was skipped', 'AbortError'))
    ;(document as { startViewTransition?: unknown }).startViewTransition = (update: () => void) => {
      update()
      return { ready: skipped(), finished: skipped(), updateCallbackDone: Promise.resolve() }
    }
    const change = vi.fn()
    withViewTransition(change, 'forward')
    await new Promise((resolve) => setTimeout(resolve, 20))
    runner.off('unhandledRejection', unhandled)
    expect(change).toHaveBeenCalledTimes(1)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('makes the change directly when the browser has none', () => {
    const change = vi.fn()
    withViewTransition(change, 'back')
    expect(change).toHaveBeenCalledTimes(1)
  })

  it('writes the direction of travel on the page before the change', () => {
    const seen: (string | undefined)[] = []
    withViewTransition(() => seen.push(document.documentElement.dataset.travel), 'back')
    withViewTransition(() => seen.push(document.documentElement.dataset.travel), 'forward')
    expect(seen).toEqual(['back', 'forward'])
  })
})
