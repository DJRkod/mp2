import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { bucketWorks } from '../browse/periods'
import { TIMELINE_PERIODS, columnSize } from '../browse/timelinePeriods'
import { makeTrail, saveTrail } from '../browse/trail'
import { useCollection } from '../collection/CollectionContext'
import { ArtworkImage } from '../components/ArtworkImage'
import { PageIntro } from '../components/PageIntro'
import { StatusMessage } from '../components/StatusMessage'
import { usePageTitle } from '../components/usePageTitle'
import styles from './TimelineView.module.css'

export function TimelineView() {
  usePageTitle('Timeline')
  const { state, works } = useCollection()
  const location = useLocation()

  const { columns, undated } = useMemo(
    () => bucketWorks(works, TIMELINE_PERIODS),
    [works],
  )
  const dated = useMemo(() => columns.flatMap((column) => column.works), [columns])

  function rememberTrail() {
    saveTrail(makeTrail(dated, location.pathname + location.search))
  }

  return (
    <section aria-labelledby="timeline-heading">
      <PageIntro headingId="timeline-heading" title="The timeline">
        The collection in order of date, oldest on the left. Previous and next
        on an artwork&rsquo;s page walk through time.
      </PageIntro>

      {state.status === 'loading' ? (
        <StatusMessage kind="loading">Dating the collection…</StatusMessage>
      ) : (
        <>
          <p className={styles.summary}>
            {dated.length} dated artworks.{' '}
            {undated > 0 &&
              `${undated} ${undated === 1 ? 'artwork has' : 'artworks have'} no date and ${undated === 1 ? 'is' : 'are'} not shown here.`}{' '}
            Scroll sideways to move through time.
          </p>
          <div
            className={styles.axis}
            role="group"
            aria-label="Timeline, scroll sideways"
            tabIndex={0}
          >
            {columns.map(({ period, works: periodWorks }) => (
              <section
                key={period.label}
                className={`${styles.period} ${styles[columnSize(periodWorks.length)]}`}
                aria-label={period.label}
              >
                <ul className={styles.stack}>
                  {periodWorks.map((work) => (
                    <li key={work.id}>
                      <Link
                        className={styles.item}
                        to={`/artwork/${work.id}`}
                        onClick={rememberTrail}
                      >
                        <ArtworkImage
                          imageId={work.imageId}
                          title={work.title}
                          size="thumb"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
                <header className={styles.tick}>
                  <h2>{period.label}</h2>
                  <p>
                    {periodWorks.length}{' '}
                    {periodWorks.length === 1 ? 'work' : 'works'}
                  </p>
                </header>
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
