import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { loadTrail, makeTrail, navigate as navigateTrail, toEntry } from '../browse/trail'
import type { TrailEntry } from '../browse/trail'
import { useCollection } from '../collection/CollectionContext'
import { ArtworkImage } from '../components/ArtworkImage'
import { preloadImage, withViewTransition } from '../components/artworkTransition'
import type { Travel } from '../components/artworkTransition'
import { Filmstrip } from '../components/Filmstrip'
import { StatusMessage } from '../components/StatusMessage'
import { usePageTitle } from '../components/usePageTitle'
import type { Artwork } from '../types/artwork'
import styles from './DetailView.module.css'
import { orUnknown } from './format'

type FactKey =
  | 'artist'
  | 'date'
  | 'medium'
  | 'department'
  | 'type'
  | 'origin'
  | 'style'

type Fetched =
  | { id: number; status: 'found'; work: Artwork }
  | { id: number; status: 'unavailable' }
  | { id: number; status: 'error'; message: string }

function backLabel(returnTo: string): string {
  if (returnTo.startsWith('/rooms')) return 'Back to the gallery'
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
    return { ...navigateTrail(trail, toEntry(work)), trail, returnTo: trail.returnTo }
  }, [work, ready, starter])

  // The work a step is heading for, from the press until that work is on the
  // page, and a count that lets a newer step call off an older one.
  const heading = useRef<TrailEntry | null>(null)
  const latestStep = useRef(0)

  useEffect(() => {
    if (heading.current?.id === id) heading.current = null
  }, [id])

  useEffect(
    () => () => {
      // Leaving the detail page calls off a step that is still waiting.
      latestStep.current += 1
    },
    [],
  )

  const stepTo = useCallback(
    async (entry: TrailEntry, travel: Travel) => {
      const step = ++latestStep.current
      heading.current = entry
      // Wait for the picture, so the change never shows an empty frame.
      await preloadImage(entry.imageId)
      if (step !== latestStep.current) return
      withViewTransition(() => goTo(`/artwork/${entry.id}`), travel)
    },
    [goTo],
  )

  /** One step along the trail, by key or by button. */
  const stepBy = useCallback(
    (travel: Travel) => {
      if (!navigation) return
      // A step made while a picture loads carries on from where the last one
      // was heading, so that none is lost.
      const from = heading.current
        ? navigateTrail(navigation.trail, heading.current)
        : navigation
      void stepTo(travel === 'back' ? from.previous : from.next, travel)
    },
    [navigation, stepTo],
  )

  useEffect(() => {
    if (!navigation) return
    // Have the neighbours' pictures ready before they are asked for.
    void preloadImage(navigation.previous.imageId)
    void preloadImage(navigation.next.imageId)

    function onKey(event: KeyboardEvent) {
      // A held key repeats; one press is one step.
      if (event.repeat) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (isTyping(event.target)) return
      if (event.key === 'ArrowLeft') stepBy('back')
      if (event.key === 'ArrowRight') stepBy('forward')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigation, stepBy])

  /** True for a plain click; one that opens a new tab is left to the browser. */
  function takesOver(event: MouseEvent<HTMLAnchorElement>): boolean {
    if (event.button !== 0) return false
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
    event.preventDefault()
    return true
  }

  function onStep(event: MouseEvent<HTMLAnchorElement>, travel: Travel) {
    if (takesOver(event)) stepBy(travel)
  }

  function onJump(
    event: MouseEvent<HTMLAnchorElement>,
    entry: TrailEntry,
    travel: Travel,
  ) {
    if (takesOver(event)) void stepTo(entry, travel)
  }

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

  // The key names the row in the styles, so each can move on its own.
  const facts: [FactKey, string, string | null][] = [
    ['artist', 'Artist', work.artist],
    ['date', 'Date', work.dateDisplay],
    ['medium', 'Medium', work.medium],
    ['department', 'Department', work.department],
    ['type', 'Type', work.artworkType],
    ['origin', 'Place of origin', work.placeOfOrigin],
    ['style', 'Style', work.style],
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
            {facts.map(([key, name, value]) => (
              <div key={key} className={`${styles.fact} ${styles[key]}`}>
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
            onClick={(event) => onStep(event, 'back')}
          >
            <span aria-hidden="true">←</span> Previous
          </Link>
          <Filmstrip
            strip={navigation.strip}
            currentId={work.id}
            onStep={onJump}
          />
          <Link
            className={styles.step}
            to={`/artwork/${navigation.next.id}`}
            rel="next"
            onClick={(event) => onStep(event, 'forward')}
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
