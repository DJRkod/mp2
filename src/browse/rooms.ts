import type { Artwork } from '../types/artwork'
import { filterWorks } from './filter'
import type { Filters } from './filter'

export interface Room {
  department: string
  works: Artwork[]
  /** True when filters are active and nothing in this room matches. */
  dimmed: boolean
}

export const OTHER_ROOM = 'Other works'

/**
 * One room per department that holds works, in the given order. Departments
 * not in the list follow, in the order their works appear.
 */
export function buildRooms(
  works: Artwork[],
  departments: string[],
  filters: Filters,
): Room[] {
  const byDepartment = new Map<string, Artwork[]>(
    departments.map((department) => [department, []]),
  )
  for (const work of works) {
    const department = work.department ?? OTHER_ROOM
    const room = byDepartment.get(department)
    if (room) room.push(work)
    else byDepartment.set(department, [work])
  }

  const rooms: Room[] = []
  for (const [department, all] of byDepartment) {
    if (all.length === 0) continue
    const matching = filterWorks(all, filters)
    rooms.push({ department, works: matching, dimmed: matching.length === 0 })
  }
  return rooms
}
