import { fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { CollectionProvider } from './collection/CollectionProvider'
import { work } from './test/fixtures'
import { TEST_DEPARTMENTS, renderApp } from './test/renderApp'

const works = [
  work({ id: 27992, title: 'A Sunday on La Grande Jatte', department: 'Arts of Asia' }),
  work({ id: 2, department: 'Textiles' }),
]

describe('routes', () => {
  it('shows the List at the root', async () => {
    renderApp('/', { works })
    expect(await screen.findByRole('heading', { level: 1, name: 'The collection' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the Rooms view and marks its link current', async () => {
    renderApp('/rooms', { works })
    expect(await screen.findByRole('heading', { level: 1, name: 'The rooms' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Rooms' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'List' })).not.toHaveAttribute('aria-current')
  })

  it('shows the Timeline view', async () => {
    renderApp('/timeline', { works })
    expect(await screen.findByRole('heading', { level: 1, name: 'The timeline' })).toBeVisible()
  })

  it('shows the Detail view for an artwork address', async () => {
    renderApp('/artwork/27992', { works })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'A Sunday on La Grande Jatte' }),
    ).toBeVisible()
  })

  it('shows Not found with a link to the List for an unknown address', async () => {
    renderApp('/nowhere', { works })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This room does not exist' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Go to the list of artworks' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})

describe('starter collection', () => {
  it('loads each department once under StrictMode', async () => {
    const loadDepartment = vi.fn(async (department: string) =>
      works.filter((item) => item.department === department),
    )
    render(
      <StrictMode>
        <MemoryRouter>
          <CollectionProvider
            client={{ loadDepartment, searchMuseum: async () => [], fetchArtwork: async () => null }}
            departments={TEST_DEPARTMENTS}
            loadSnapshot={async () => []}
          >
            <App />
          </CollectionProvider>
        </MemoryRouter>
      </StrictMode>,
    )
    await screen.findByText('2 artworks')
    expect(loadDepartment).toHaveBeenCalledTimes(TEST_DEPARTMENTS.length)
  })

  it('leaves the loading state and says so when nothing can be loaded', async () => {
    render(
      <MemoryRouter>
        <CollectionProvider
          client={{
            loadDepartment: async () => {
              throw new Error('down')
            },
            searchMuseum: async () => [],
            fetchArtwork: async () => null,
          }}
          departments={TEST_DEPARTMENTS}
          loadSnapshot={async () => {
            throw new Error('chunk failed to load')
          }}
        >
          <App />
        </CollectionProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/The collection could not be loaded/)).toBeVisible()
    expect(screen.queryByText('Loading the collection…')).toBeNull()
  })
})

describe('artwork images', () => {
  it('use the title as alt text', async () => {
    renderApp('/', { works })
    const image = await screen.findByRole('img', { name: 'A Sunday on La Grande Jatte' })
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(image.getAttribute('src')).toContain('/full/200,/0/default.jpg')
  })

  it('fall back to "Untitled artwork" when there is no title', async () => {
    renderApp('/', { works: [work({ id: 5, title: null, department: 'Textiles' })] })
    expect(await screen.findByRole('img', { name: 'Untitled artwork' })).toBeVisible()
  })

  it('show a placeholder when the image fails to load', async () => {
    renderApp('/', { works })
    const image = await screen.findByRole('img', { name: 'A Sunday on La Grande Jatte' })
    fireEvent.error(image)
    const placeholder = await screen.findByRole('img', { name: 'A Sunday on La Grande Jatte' })
    expect(placeholder).toHaveTextContent('Image unavailable')
  })
})
