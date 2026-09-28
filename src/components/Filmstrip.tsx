import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { TrailEntry } from '../browse/trail'
import type { Travel } from './artworkTransition'
import { ArtworkImage } from './ArtworkImage'
import styles from './Filmstrip.module.css'

interface Props {
  strip: TrailEntry[]
  currentId: number
  /** Called when a thumbnail is clicked, before the link is followed. */
  onStep?: (
    event: MouseEvent<HTMLAnchorElement>,
    entry: TrailEntry,
    travel: Travel,
  ) => void
}

export function Filmstrip({ strip, currentId, onStep }: Props) {
  const currentAt = strip.findIndex((entry) => entry.id === currentId)

  return (
    <ul className={styles.strip} aria-label="Neighbouring artworks">
      {strip.map((entry, at) => {
        const current = entry.id === currentId
        // A thumbnail to the left of the current work is a step back.
        const travel: Travel = at < currentAt ? 'back' : 'forward'
        return (
          <li key={entry.id} className={styles.cell}>
            <Link
              className={current ? `${styles.thumb} ${styles.current}` : styles.thumb}
              to={`/artwork/${entry.id}`}
              aria-current={current ? 'page' : undefined}
              onClick={(event) => onStep?.(event, entry, travel)}
            >
              <ArtworkImage imageId={entry.imageId} title={entry.title} size="thumb" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
