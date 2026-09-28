import type { ReactNode } from 'react'
import styles from './StatusMessage.module.css'

interface Props {
  kind: 'loading' | 'error' | 'empty' | 'info'
  children: ReactNode
}

export function StatusMessage({ kind, children }: Props) {
  return (
    <div
      className={`${styles.message} ${styles[kind]}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      {kind === 'loading' && <span className={styles.spinner} aria-hidden="true" />}
      <div>{children}</div>
    </div>
  )
}
