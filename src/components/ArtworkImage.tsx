import { useState } from 'react'
import { imageUrl } from '../api/artic'
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

export function ArtworkImage({
  imageId,
  title,
  size,
  fit = 'cover',
  eager = false,
}: Props) {
  const [failedId, setFailedId] = useState<string | null>(null)
  const alt = title ?? 'Untitled artwork'

  if (failedId === imageId) {
    return (
      <span className={styles.placeholder} role="img" aria-label={alt}>
        Image unavailable
      </span>
    )
  }

  return (
    <img
      className={`${styles.image} ${styles[fit]}`}
      src={imageUrl(imageId, size)}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      // The image server refuses requests referred from localhost.
      referrerPolicy="no-referrer"
      onError={() => setFailedId(imageId)}
    />
  )
}
