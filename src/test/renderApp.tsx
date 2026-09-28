import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App'
import { CollectionProvider } from '../collection/CollectionProvider'
import type { Artwork } from '../types/artwork'

export const TEST_DEPARTMENTS = ['Arts of Asia', 'Textiles', 'Modern Art']

interface Options {
  works: Artwork[]
  /** What a full-museum search returns, or an error to reject with. */
  museum?: Artwork[] | Error
  /** Works that exist in the museum but not in the starter collection. */
  elsewhere?: Artwork[]
  fetchError?: Error
}

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

/** The whole app at a route, backed by a fake API holding the given works. */
export function renderApp(route: string, options: Options) {
  const { works, museum = [], elsewhere = [], fetchError } = options
  const client = {
    loadDepartment: vi.fn(async (department: string) =>
      works.filter((work) => work.department === department),
    ),
    searchMuseum: vi.fn(async () => {
      if (museum instanceof Error) throw museum
      return museum
    }),
    fetchArtwork: vi.fn(async (id: number) => {
      if (fetchError) throw fetchError
      return [...works, ...elsewhere].find((work) => work.id === id) ?? null
    }),
  }

  const view = render(
    <MemoryRouter initialEntries={[route]} useTransitions={false}>
      <CollectionProvider
        client={client}
        departments={TEST_DEPARTMENTS}
        loadSnapshot={async () => []}
      >
        <App />
        <Address />
      </CollectionProvider>
    </MemoryRouter>,
  )
  return { ...view, client }
}
