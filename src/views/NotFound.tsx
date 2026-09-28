import { Link } from 'react-router-dom'
import { usePageTitle } from '../components/usePageTitle'
import styles from './NotFound.module.css'

export function NotFound() {
  usePageTitle('Page not found')
  return (
    <section className={styles.notFound}>
      <h1>This room does not exist</h1>
      <p>The address you opened does not match any page.</p>
      <p>
        <Link to="/">Go to the list of artworks</Link>
      </p>
    </section>
  )
}
