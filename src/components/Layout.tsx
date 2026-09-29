import { Link, NavLink, Outlet } from 'react-router-dom'
import { useCollection } from '../collection/CollectionContext'
import styles from './Layout.module.css'
import { StatusMessage } from './StatusMessage'

const VIEWS = [
  { to: '/', label: 'List', end: true },
  { to: '/rooms', label: 'Gallery', end: false },
  { to: '/timeline', label: 'Timeline', end: false },
]

export function Layout() {
  const { state } = useCollection()

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true" />
            <span>
              <span className={styles.brandName}>The Rooms</span>
              <span className={styles.brandSub}>Art Institute of Chicago</span>
            </span>
          </Link>
          <nav aria-label="Views">
            <ul className={styles.nav}>
              {VIEWS.map((view) => (
                <li key={view.to}>
                  <NavLink
                    to={view.to}
                    end={view.end}
                    className={({ isActive }) =>
                      isActive ? `${styles.link} ${styles.current}` : styles.link
                    }
                  >
                    {view.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className={styles.main}>
        {state.notice && (
          <StatusMessage kind={state.noticeKind}>{state.notice}</StatusMessage>
        )}
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>
          Images and data from the{' '}
          <a href="https://api.artic.edu/docs/">Art Institute of Chicago API</a>
          . Public-domain works only.
        </p>
      </footer>
    </div>
  )
}
