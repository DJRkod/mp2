import { useEffect, useState } from 'react'
import { imageUrl } from '../api/artic'
import type { ImageSize } from '../api/artic'
import styles from './ArtworkImage.module.css'
import { FULL_SIZES, rememberWorkingSize, workingSize } from './artworkTransition'

interface Props {
  imageId: string
  title: string | null
  size: 'thumb' | 'full'
  /** Cropped to fill its box, or shown whole at its own proportions. */
  fit?: 'cover' | 'natural'
  /** Load at once instead of when scrolled into view. */
  eager?: boolean
}

/**
 * The sizes to try, in order. A full-size picture ends with the thumbnail,
 * so that a visitor sees the artwork even when no large size can be had.
 */
const ATTEMPTS: Record<Props['size'], ImageSize[]> = {
  thumb: ['thumb', 'thumb-fit'],
  full: [...FULL_SIZES, 'thumb'],
}

/** How long to wait for a large size before trying the next. */
const PATIENCE_MS = 8000

export function ArtworkImage({
  imageId,
  title,
  size,
  fit = 'cover',
  eager = false,
}: Props) {
  const attempts = ATTEMPTS[size]
  // Everything below is about one picture; a new picture starts afresh.
  const [progress, setProgress] = useState({ imageId, failed: 0, loaded: false })
  const current =
    progress.imageId === imageId
      ? progress
      : { imageId, failed: 0, loaded: false }

  // Skip any size that loading ahead has already found not to work.
  const known = size === 'full' ? workingSize(imageId) : undefined
  const start = known ? Math.max(0, attempts.indexOf(known)) : 0
  const at = Math.max(start, current.failed)
  const attempt = attempts[at]
  // A picture loaded ahead of time is ready to show at once, which matters
  // when the page is pictured for a transition before "load" is reported.
  const ready = current.loaded || (known !== undefined && attempt === known)
  const waiting = size === 'full' && attempt !== undefined && !ready

  useEffect(() => {
    if (!waiting) return
    const timer = setTimeout(
      () => setProgress({ imageId, failed: at + 1, loaded: false }),
      PATIENCE_MS,
    )
    return () => clearTimeout(timer)
  }, [waiting, imageId, at])

  const alt = title ?? 'Untitled artwork'

  if (!attempt) {
    return (
      <span className={styles.placeholder} role="img" aria-label={alt}>
        Image unavailable
      </span>
    )
  }

  return (
    <>
      {waiting && <span className={styles.loading}>Loading the picture…</span>}
      <img
        className={`${styles.image} ${styles[fit]} ${waiting ? styles.arriving : ''}`}
        src={imageUrl(imageId, attempt)}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding={eager ? 'sync' : 'async'}
        // The image server refuses requests referred from localhost.
        referrerPolicy="no-referrer"
        onLoad={() => {
          if (size === 'full') rememberWorkingSize(imageId, attempt)
          setProgress({ imageId, failed: at, loaded: true })
        }}
        onError={() => setProgress({ imageId, failed: at + 1, loaded: false })}
      />
    </>
  )
}
