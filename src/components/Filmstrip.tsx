import { Link } from 'react-router-dom'
import type { TrailEntry } from '../browse/trail'
import { ArtworkImage } from './ArtworkImage'
import styles from './Filmstrip.module.css'

interface Props {
  strip: TrailEntry[]
  currentId: number
}

export function Filmstrip({ strip, currentId }: Props) {
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
            >
              <ArtworkImage imageId={entry.imageId} title={entry.title} size="thumb" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
