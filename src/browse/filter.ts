import type { Artwork } from '../types/artwork'

export interface Filters {
  departments: string[]
  types: string[]
}

export function hasActiveFilters(filters: Filters): boolean {
  return filters.departments.length > 0 || filters.types.length > 0
}

function allows(selected: string[], value: string | null): boolean {
  return selected.length === 0 || (value !== null && selected.includes(value))
}

/** Values within a group are alternatives; the two groups must both match. */
export function filterWorks(works: Artwork[], filters: Filters): Artwork[] {
  if (!hasActiveFilters(filters)) return works
  return works.filter(
    (work) =>
      allows(filters.departments, work.department) &&
      allows(filters.types, work.artworkType),
  )
}
