import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { loadTrail, makeTrail, navigate as navigateTrail, toEntry } from '../browse/trail'
import { useCollection } from '../collection/CollectionContext'
import { ArtworkImage } from '../components/ArtworkImage'
import { Filmstrip } from '../components/Filmstrip'
import { StatusMessage } from '../components/StatusMessage'
import { usePageTitle } from '../components/usePageTitle'
import type { Artwork } from '../types/artwork'
import styles from './DetailView.module.css'
import { orUnknown } from './format'

type Fetched =
  | { id: number; status: 'found'; work: Artwork }
  | { id: number; status: 'unavailable' }
  | { id: number; status: 'error'; message: string }

function backLabel(returnTo: string): string {
  if (returnTo.startsWith('/rooms')) return 'Back to the rooms'
  if (returnTo.startsWith('/timeline')) return 'Back to the timeline'
  return 'Back to the list'
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName))
  )
}

export function DetailView() {
  const params = useParams()
  const id = Number(params.id)
  const validId = Number.isInteger(id) && id > 0

  const { state, starter, fetchArtwork } = useCollection()
  const goTo = useNavigate()
  const [fetched, setFetched] = useState<Fetched | null>(null)

  const ready = state.status === 'ready'
  const collected: Artwork | undefined = validId ? state.byId[id] : undefined
  const needsFetch = validId && ready && !collected

  useEffect(() => {
    if (!needsFetch) return
    let cancelled = false
    fetchArtwork(id).then(
      (work) => {
        if (cancelled) return
        setFetched(work ? { id, status: 'found', work } : { id, status: 'unavailable' })
      },
      (error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Could not load this artwork.'
        setFetched({ id, status: 'error', message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [needsFetch, id, fetchArtwork])

  const result = fetched?.id === id ? fetched : null
  const work = collected ?? (result?.status === 'found' ? result.work : undefined)

  const navigation = useMemo(() => {
    if (!work || !ready) return null
    const saved = loadTrail()
    const trail =
      saved && saved.entries.some((entry) => entry.id === work.id)
        ? saved
        : makeTrail(starter, '/')
    return { ...navigateTrail(trail, toEntry(work)), returnTo: trail.returnTo }
  }, [work, ready, starter])

  const previousId = navigation?.previous.id
  const nextId = navigation?.next.id

  useEffect(() => {
    if (previousId === undefined || nextId === undefined) return
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isTyping(event.target)) return
      if (event.key === 'ArrowLeft') goTo(`/artwork/${previousId}`)
      if (event.key === 'ArrowRight') goTo(`/artwork/${nextId}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previousId, nextId, goTo])

  usePageTitle(work ? orUnknown(work.title, 'Untitled') : 'Artwork')

  if (!validId || result?.status === 'unavailable') {
    return (
      <section className={styles.missing}>
        <h1>This artwork is not available</h1>
        <p>
          It may not exist, or it may not be in the public domain with an image.
        </p>
        <p>
          <Link to="/">Go to the list of artworks</Link>
        </p>
      </section>
    )
  }

  if (result?.status === 'error') {
    return (
      <section className={styles.missing}>
        <h1>This artwork could not be loaded</h1>
        <StatusMessage kind="error">{result.message}</StatusMessage>
        <p>
          <Link to="/">Go to the list of artworks</Link>
        </p>
      </section>
    )
  }

  if (!work) {
    return <StatusMessage kind="loading">Loading the artwork…</StatusMessage>
  }

  const facts: [string, string | null][] = [
    ['Artist', work.artist],
    ['Date', work.dateDisplay],
    ['Medium', work.medium],
    ['Department', work.department],
    ['Type', work.artworkType],
    ['Place of origin', work.placeOfOrigin],
    ['Style', work.style],
  ]

  return (
    <article className={styles.detail} aria-labelledby="artwork-title">
      <div className={styles.top}>
        <Link className={styles.back} to={navigation?.inTrail ? navigation.returnTo : '/'}>
          <span aria-hidden="true">←</span>{' '}
          {navigation?.inTrail ? backLabel(navigation.returnTo) : 'Back to the list'}
        </Link>
        {navigation?.position != null && (
          <p className={styles.position}>
            {navigation.position} of {navigation.total}
          </p>
        )}
      </div>

      <div className={styles.body}>
        <figure className={styles.figure}>
          <div className={styles.frame}>
            <ArtworkImage
              key={work.imageId}
              imageId={work.imageId}
              title={work.title}
              size="full"
              fit="natural"
              eager
            />
          </div>
        </figure>

        <div className={styles.label}>
          <h1 id="artwork-title">{orUnknown(work.title, 'Untitled')}</h1>
          <dl className={styles.facts}>
            {facts.map(([name, value]) => (
              <div key={name} className={styles.fact}>
                <dt>{name}</dt>
                <dd>{orUnknown(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {navigation && (
        <nav className={styles.walk} aria-label="Previous and next artwork">
          <Link
            className={styles.step}
            to={`/artwork/${navigation.previous.id}`}
            rel="prev"
          >
            <span aria-hidden="true">←</span> Previous
          </Link>
          <Filmstrip strip={navigation.strip} currentId={work.id} />
          <Link
            className={styles.step}
            to={`/artwork/${navigation.next.id}`}
            rel="next"
          >
            Next <span aria-hidden="true">→</span>
          </Link>
        </nav>
      )}
      {navigation && (
        <p className={styles.keys}>
          You can also use the left and right arrow keys.
        </p>
      )}
    </article>
  )
}
