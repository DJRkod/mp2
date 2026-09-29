import { flushSync } from 'react-dom'
import { imageUrl } from '../api/artic'
import type { ImageSize } from '../api/artic'

/** How long a step waits for the next picture before going ahead anyway. */
const PRELOAD_LIMIT_MS = 1200

const pictures = new Map<string, Promise<void>>()

/**
 * Loads and decodes an artwork's full picture ahead of time, so it can be
 * shown the moment it is needed. Resolves when the picture is ready, has
 * failed, or has taken longer than the limit.
 */
export function preloadImage(
  imageId: string,
  limitMs = PRELOAD_LIMIT_MS,
): Promise<void> {
  let ready = pictures.get(imageId)
  if (!ready) {
    ready = loadFirstThatWorks(imageId)
    pictures.set(imageId, ready)
  }
  const limit = new Promise<void>((resolve) => setTimeout(resolve, limitMs))
  return Promise.race([ready, limit])
}

/** The large sizes to try, in order. See the note on sizes in the API client. */
export const FULL_SIZES: ImageSize[] = ['full', 'full-fit']

const working = new Map<string, ImageSize>()

/** The large size known to load for a picture, if one has been found. */
export function workingSize(imageId: string): ImageSize | undefined {
  return working.get(imageId)
}

export function rememberWorkingSize(imageId: string, size: ImageSize): void {
  working.set(imageId, size)
}

async function loadFirstThatWorks(imageId: string): Promise<void> {
  for (const size of FULL_SIZES) {
    const image = new Image()
    image.referrerPolicy = 'no-referrer'
    image.src = imageUrl(imageId, size)
    // A browser that cannot decode ahead of time has nothing to wait for.
    if (typeof image.decode !== 'function') return
    try {
      await image.decode()
      working.set(imageId, size)
      return
    } catch {
      // Refused or failed: try the next size.
    }
  }
}

/** Forgets which pictures were loaded, so each test starts afresh. */
export function forgetPreloadedImages(): void {
  pictures.clear()
  working.clear()
}

/** Forward for Next, back for Previous. */
export type Travel = 'forward' | 'back'

/**
 * Makes a change to the page inside a view transition, so the browser can
 * animate from the old state to the new one. The direction of travel is
 * written on the root element for the styles to read. Browsers without view
 * transitions make the change directly.
 */
export function withViewTransition(change: () => void, travel: Travel): void {
  document.documentElement.dataset.travel = travel
  if (typeof document.startViewTransition !== 'function') {
    change()
    return
  }
  // The browser pictures the new state as soon as this returns, so the
  // change has to reach the page before then.
  const transition = document.startViewTransition(() => {
    flushSync(change)
  })
  // A newer transition cuts an older one short. The change itself has still
  // been made, so there is nothing to report.
  const ignore = () => undefined
  transition?.ready?.catch(ignore)
  transition?.finished?.catch(ignore)
}
