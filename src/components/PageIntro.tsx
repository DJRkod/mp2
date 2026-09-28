import type { ReactNode } from 'react'
import styles from './PageIntro.module.css'

interface Props {
  /** The id the surrounding section points to with aria-labelledby. */
  headingId: string
  title: string
  children: ReactNode
}

export function PageIntro({ headingId, title, children }: Props) {
  return (
    <header className={styles.intro}>
      <h1 id={headingId}>{title}</h1>
      <p>{children}</p>
    </header>
  )
}
