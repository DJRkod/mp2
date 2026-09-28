import type { Artwork } from '../types/artwork'

/** Enough of an artwork to draw a filmstrip thumbnail and link to it. */
export interface TrailEntry {
  id: number
  title: string | null
  imageId: string
}

/** The ordered works a visitor was browsing, and where to send them back. */
export interface Trail {
  entries: TrailEntry[]
  returnTo: string
}

export interface Navigation {
  previous: TrailEntry
  next: TrailEntry
  /** The current work with its neighbours, in trail order. */
  strip: TrailEntry[]
  /** 1-based place in the trail, or null when the work is not in it. */
  position: number | null
  total: number
  inTrail: boolean
}

const STORAGE_KEY = 'mp2.trail.v1'
const REACH = 2

export function toEntry(work: Artwork): TrailEntry {
  return { id: work.id, title: work.title, imageId: work.imageId }
}

export function makeTrail(works: Artwork[], returnTo: string): Trail {
  return { entries: works.map(toEntry), returnTo }
}

export function navigate(trail: Trail, current: TrailEntry): Navigation {
  const { entries } = trail
  const total = entries.length
  const index = entries.findIndex((entry) => entry.id === current.id)

  if (index === -1) {
    // Outside the trail: treated as sitting just before the first work.
    if (total === 0) {
      return {
        previous: current,
        next: current,
        strip: [current],
        position: null,
        total,
        inTrail: false,
      }
    }
    const first = entries[0]
    const last = entries[total - 1]
    return {
      previous: last,
      next: first,
      strip: total === 1 ? [current, first] : [last, current, first],
      position: null,
      total,
      inTrail: false,
    }
  }

  const wrap = (offset: number) => entries[(index + offset + total) % total]
  const strip =
    total < REACH * 2 + 1
      ? entries
      : Array.from({ length: REACH * 2 + 1 }, (_, i) => wrap(i - REACH))

  return {
    previous: wrap(-1),
    next: wrap(1),
    strip,
    position: index + 1,
    total,
    inTrail: true,
  }
}

function isTrail(value: unknown): value is Trail {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Trail>
  return (
    typeof candidate.returnTo === 'string' &&
    Array.isArray(candidate.entries) &&
    candidate.entries.every(
      (entry) =>
        typeof entry?.id === 'number' && typeof entry?.imageId === 'string',
    )
  )
}

export function saveTrail(trail: Trail): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trail))
  } catch {
    // Storage full or blocked: previous and next fall back to default order.
  }
}

export function loadTrail(): Trail | null {
  try {
    const saved = window.sessionStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed: unknown = JSON.parse(saved)
    return isTrail(parsed) ? parsed : null
  } catch {
    return null
  }
}
