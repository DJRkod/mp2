import { useState } from 'react'
import { imageUrl } from '../api/artic'
import type { ImageSize } from '../api/artic'
import styles from './ArtworkImage.module.css'

interface Props {
  imageId: string
  title: string | null
  size: 'thumb' | 'full'
  /** Cropped to fill its box, or shown whole at its own proportions. */
  fit?: 'cover' | 'natural'
  /** Load at once instead of when scrolled into view. */
  eager?: boolean
}

/** The sizes to try, in order. A thumbnail has a best-fit size to fall back on. */
const ATTEMPTS: Record<Props['size'], ImageSize[]> = {
  thumb: ['thumb', 'thumb-fit'],
  full: ['full'],
}

export function ArtworkImage({
  imageId,
  title,
  size,
  fit = 'cover',
  eager = false,
}: Props) {
  const [failures, setFailures] = useState({ imageId, count: 0 })
  const failed = failures.imageId === imageId ? failures.count : 0
  const attempt = ATTEMPTS[size][failed]
  const alt = title ?? 'Untitled artwork'

  if (!attempt) {
    return (
      <span className={styles.placeholder} role="img" aria-label={alt}>
        Image unavailable
      </span>
    )
  }

  return (
    <img
      className={`${styles.image} ${styles[fit]}`}
      src={imageUrl(imageId, attempt)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      // The image server refuses requests referred from localhost.
      referrerPolicy="no-referrer"
      onError={() => setFailures({ imageId, count: failed + 1 })}
    />
  )
}
