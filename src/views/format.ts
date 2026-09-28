export const UNKNOWN = 'Unknown'

export function orUnknown(value: string | null, fallback = UNKNOWN): string {
  return value ?? fallback
}

/** A start year for display: 1889, or 600 BCE for a negative year. */
export function formatYear(year: number | null): string {
  if (year === null) return UNKNOWN
  return year < 0 ? `${-year} BCE` : String(year)
}
