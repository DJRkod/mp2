import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { hasActiveFilters } from '../browse/filter'
import type { Filters } from '../browse/filter'
import { buildRooms } from '../browse/rooms'
import type { Room } from '../browse/rooms'
import { makeTrail, saveTrail } from '../browse/trail'
import { useCollection } from '../collection/CollectionContext'
import { ArtworkImage } from '../components/ArtworkImage'
import { FilterChips } from '../components/FilterChips'
import { StatusMessage } from '../components/StatusMessage'
import { usePageTitle } from '../components/usePageTitle'
import styles from './RoomsView.module.css'

export function RoomsView() {
  usePageTitle('Rooms')
  const { state, works, departments: roomOrder } = useCollection()
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const departments = params.getAll('dept')
  const types = params.getAll('type')
  const departmentKey = departments.join('|')
  const typeKey = types.join('|')

  const filters = useMemo<Filters>(
    () => ({
      departments: departmentKey ? departmentKey.split('|') : [],
      types: typeKey ? typeKey.split('|') : [],
    }),
    [departmentKey, typeKey],
  )
  const rooms = useMemo(
    () => buildRooms(works, roomOrder, filters),
    [works, roomOrder, filters],
  )

  const filtering = hasActiveFilters(filters)
  const shown = rooms.reduce((count, room) => count + room.works.length, 0)

  function toggle(name: 'dept' | 'type', option: string) {
    const current = params.getAll(name)
    const next = new URLSearchParams(params)
    next.delete(name)
    const values = current.includes(option)
      ? current.filter((value) => value !== option)
      : [...current, option]
    values.forEach((value) => next.append(name, value))
    setParams(next, { replace: true })
  }

  function rememberTrail(room: Room) {
    saveTrail(makeTrail(room.works, location.pathname + location.search))
  }

  return (
    <section aria-labelledby="rooms-heading">
      <header className={styles.intro}>
        <h1 id="rooms-heading">The rooms</h1>
        <p>
          One room for each department. Choose any number of filters; rooms with
          nothing to show are dimmed.
        </p>
      </header>

      {state.status === 'loading' ? (
        <StatusMessage kind="loading">Hanging the collection…</StatusMessage>
      ) : (
        <>
          <div className={styles.filters}>
            <FilterChips
              legend="Department"
              options={roomOrder}
              selected={filters.departments}
              onToggle={(option) => toggle('dept', option)}
            />
            <FilterChips
              legend="Type of artwork"
              options={state.typeOptions}
              selected={filters.types}
              onToggle={(option) => toggle('type', option)}
            />
            <div className={styles.filterSummary}>
              <p aria-live="polite">
                {filtering
                  ? `${shown} ${shown === 1 ? 'artwork matches' : 'artworks match'} your filters`
                  : `${shown} artworks in ${rooms.length} rooms`}
              </p>
              {filtering && (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => setParams({}, { replace: true })}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          <p className={styles.hint}>Scroll sideways to walk through the rooms.</p>
          <div
            className={styles.corridor}
            role="group"
            aria-label="Rooms, scroll sideways"
            tabIndex={0}
          >
            {rooms.map((room) => (
              <section
                key={room.department}
                className={
                  room.dimmed ? `${styles.room} ${styles.dimmed}` : styles.room
                }
                aria-label={room.department}
              >
                <header className={styles.sign}>
                  <h2>{room.department}</h2>
                  <p>
                    {room.dimmed
                      ? 'Nothing here matches your filters'
                      : `${room.works.length} ${room.works.length === 1 ? 'work' : 'works'}`}
                  </p>
                </header>
                <ul className={styles.wall}>
                  {room.works.map((work) => (
                    <li key={work.id}>
                      <Link
                        className={styles.frame}
                        to={`/artwork/${work.id}`}
                        onClick={() => rememberTrail(room)}
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
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
