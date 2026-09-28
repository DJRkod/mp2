import { flushSync } from 'react-dom'
import { imageUrl } from '../api/artic'

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
    const image = new Image()
    image.referrerPolicy = 'no-referrer'
    image.src = imageUrl(imageId, 'full')
    ready =
      typeof image.decode === 'function'
        ? image.decode().then(
            () => undefined,
            () => undefined,
          )
        : Promise.resolve()
    pictures.set(imageId, ready)
  }
  const limit = new Promise<void>((resolve) => setTimeout(resolve, limitMs))
  return Promise.race([ready, limit])
}

/** Forgets which pictures were loaded, so each test starts afresh. */
export function forgetPreloadedImages(): void {
  pictures.clear()
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
