import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { searchWorks } from '../browse/search'
import { SORT_DIRECTIONS, SORT_KEYS, sortWorks } from '../browse/sort'
import type { SortDirection, SortKey } from '../browse/sort'
import { makeTrail, saveTrail } from '../browse/trail'
import { useCollection } from '../collection/CollectionContext'
import { ArtworkImage } from '../components/ArtworkImage'
import { PageIntro } from '../components/PageIntro'
import { StatusMessage } from '../components/StatusMessage'
import { usePageTitle } from '../components/usePageTitle'
import { formatYear, orUnknown } from './format'
import styles from './ListView.module.css'

const SORT_LABELS: Record<SortKey, string> = {
  title: 'Title',
  artist: 'Artist',
  year: 'Year',
}

const DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: 'Ascending',
  desc: 'Descending',
}

function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function ListView() {
  usePageTitle('List')
  const { state, works, searchMuseum } = useCollection()
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const urlQuery = params.get('q') ?? ''
  const sort = oneOf(params.get('sort'), SORT_KEYS, 'title')
  const direction = oneOf(params.get('dir'), SORT_DIRECTIONS, 'asc')

  // The box keeps its own text and copies it to the address. It takes the
  // address's text only when the address itself changes (back, forward, a
  // link), never because the box got ahead of it.
  const [query, setQuery] = useState(urlQuery)
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery)
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery)
    if (urlQuery !== query) setQuery(urlQuery)
  }

  const searchText = query.trim()
  const search = state.search
  const searchIsCurrent = search.status !== 'idle' && search.query === searchText
  const museumIds = searchIsCurrent && search.status === 'done' ? search.ids : null

  const visible = useMemo(() => {
    const matches = searchWorks(works, query)
    if (!museumIds) return sortWorks(matches, sort, direction)
    // The museum matches on word forms ("lilies" finds "Lily"), so its results
    // are shown even when the plain text match would leave them out.
    const shown = new Set(matches.map((work) => work.id))
    const extra = works.filter(
      (work) => museumIds.includes(work.id) && !shown.has(work.id),
    )
    return sortWorks([...matches, ...extra], sort, direction)
  }, [works, query, sort, direction, museumIds])

  function update(name: string, value: string, fallback: string) {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(name)
    else next.set(name, value)
    // Replace, so the back button is not filled with one entry per keystroke.
    setParams(next, { replace: true })
  }

  function rememberTrail() {
    saveTrail(makeTrail(visible, location.pathname + location.search))
  }

  function changeSearch(value: string) {
    setQuery(value)
    update('q', value, '')
  }

  return (
    <section aria-labelledby="list-heading">
      <PageIntro headingId="list-heading" title="The collection">
        Search by title or artist, and sort the results.
      </PageIntro>

      <form
        className={styles.controls}
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className={styles.searchField}>
          <span className={styles.label}>Search</span>
          <input
            className={styles.input}
            type="search"
            value={query}
            placeholder="Try “Monet” or “rain”"
            autoComplete="off"
            onChange={(event) => changeSearch(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Sort by</span>
          <select
            className={styles.input}
            value={sort}
            onChange={(event) => update('sort', event.target.value, 'title')}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className={styles.direction}>
          <legend className={styles.label}>Order</legend>
          <div className={styles.toggle}>
            {SORT_DIRECTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  option === direction
                    ? `${styles.toggleButton} ${styles.toggleOn}`
                    : styles.toggleButton
                }
                aria-pressed={option === direction}
                onClick={() => update('dir', option, 'asc')}
              >
                {DIRECTION_LABELS[option]}
              </button>
            ))}
          </div>
        </fieldset>
      </form>

      {state.status === 'loading' ? (
        <StatusMessage kind="loading">Loading the collection…</StatusMessage>
      ) : (
        <>
          <div className={styles.summary}>
            <p aria-live="polite">
              {visible.length === 1 ? '1 artwork' : `${visible.length} artworks`}
              {searchText && ` matching “${searchText}”`}
            </p>
            {searchText && (
              <button
                type="button"
                className={styles.museumButton}
                disabled={search.status === 'searching'}
                onClick={() => searchMuseum(searchText)}
              >
                Search the full museum for “{searchText}”
              </button>
            )}
          </div>

          {searchIsCurrent && search.status === 'searching' && (
            <StatusMessage kind="loading">Searching the full museum…</StatusMessage>
          )}
          {searchIsCurrent && search.status === 'error' && (
            <StatusMessage kind="error">
              {search.message} The artworks below are unchanged.
            </StatusMessage>
          )}
          {searchIsCurrent && search.status === 'done' && (
            <StatusMessage kind="info">
              {search.found === 0
                ? `The full museum has no public-domain works with pictures matching “${searchText}”.`
                : `The full museum returned ${search.found} of its best matches; ${search.added} were new and have been added.`}
            </StatusMessage>
          )}

          {visible.length === 0 ? (
            <StatusMessage kind="empty">
              {searchText ? (
                <>
                  <p>No artworks in the collection match “{searchText}”.</p>
                  <p>
                    This site shows only works in the public domain. Works
                    still in copyright, which includes much of the art of the
                    last hundred years, are not shown.
                  </p>
                </>
              ) : (
                'There are no artworks to show.'
              )}
            </StatusMessage>
          ) : (
            <ol className={styles.rows}>
              {visible.map((work) => (
                <li key={work.id}>
                  <Link
                    className={styles.row}
                    to={`/artwork/${work.id}`}
                    onClick={rememberTrail}
                  >
                    <span className={styles.thumb}>
                      <ArtworkImage
                        imageId={work.imageId}
                        title={work.title}
                        size="thumb"
                      />
                    </span>
                    <span className={styles.title}>{orUnknown(work.title, 'Untitled')}</span>
                    <span className={styles.artist}>{orUnknown(work.artist)}</span>
                    <span className={styles.year}>{formatYear(work.year)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
