import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { TrailEntry } from '../browse/trail'
import { ArtworkImage } from './ArtworkImage'
import styles from './Filmstrip.module.css'

interface Props {
  strip: TrailEntry[]
  currentId: number
  /** Called when a thumbnail is clicked, before the link is followed. */
  onStep?: (event: MouseEvent<HTMLAnchorElement>, entry: TrailEntry) => void
}

export function Filmstrip({ strip, currentId, onStep }: Props) {
  return (
    <ul className={styles.strip} aria-label="Neighbouring artworks">
      {strip.map((entry) => {
        const current = entry.id === currentId
        return (
          <li key={entry.id} className={styles.cell}>
            <Link
              className={current ? `${styles.thumb} ${styles.current}` : styles.thumb}
              to={`/artwork/${entry.id}`}
              aria-current={current ? 'page' : undefined}
              onClick={(event) => onStep?.(event, entry)}
            >
              <ArtworkImage imageId={entry.imageId} title={entry.title} size="thumb" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
