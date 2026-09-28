import { makePeriods } from './periods'
import type { Period } from './periods'

/**
 * Period boundaries chosen from the real spread of dates in the starter
 * collection (2026-09-28). About half the dated works fall after 1850, so
 * recent periods are narrower; no period holds more than about 60 works.
 */
const BOUNDARIES = [-500, 1, 1000, 1500, 1700, 1800, 1850, 1875, 1900, 1920, 1935]

export const TIMELINE_PERIODS: Period[] = makePeriods(BOUNDARIES)

export type ColumnSize = 'small' | 'medium' | 'large'

/** Busier periods get wider columns, so no column grows very tall. */
export function columnSize(count: number): ColumnSize {
  if (count > 40) return 'large'
  if (count > 18) return 'medium'
  return 'small'
}
