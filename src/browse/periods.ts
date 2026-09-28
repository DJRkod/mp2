import type { Artwork } from '../types/artwork'
import { sortWorks } from './sort'

export interface Period {
  label: string
  /** First year in the period; null for the open-ended first period. */
  from: number | null
  /** First year after the period; null for the open-ended last period. */
  until: number | null
}

export interface PeriodColumn {
  period: Period
  works: Artwork[]
}

/** Periods split at the given years, which must be in ascending order. */
export function makePeriods(boundaries: number[]): Period[] {
  const periods: Period[] = [
    { label: `Before ${yearLabel(boundaries[0])}`, from: null, until: boundaries[0] },
  ]
  boundaries.forEach((from, index) => {
    const until = boundaries[index + 1] ?? null
    periods.push({ label: rangeLabel(from, until), from, until })
  })
  return periods
}

/** Years below 1 are before the common era: -500 is 500 BCE. */
function yearLabel(year: number): string {
  return year < 1 ? `${-year} BCE` : String(year)
}

function rangeLabel(from: number, until: number | null): string {
  if (until === null) return `${yearLabel(from)} and later`
  if (until <= 1) return `${-from}–${Math.max(1, 1 - until)} BCE`
  return `${yearLabel(from)}–${until - 1}`
}

function holds(period: Period, year: number): boolean {
  return (
    (period.from === null || year >= period.from) &&
    (period.until === null || year < period.until)
  )
}

/** Dated works in period columns, oldest first; undated works are counted. */
export function bucketWorks(
  works: Artwork[],
  periods: Period[],
): { columns: PeriodColumn[]; undated: number } {
  const dated = sortWorks(
    works.filter((work) => work.year !== null),
    'year',
    'asc',
  )
  const columns = periods.map((period) => ({
    period,
    works: dated.filter((work) => holds(period, work.year as number)),
  }))
  return { columns, undated: works.length - dated.length }
}
