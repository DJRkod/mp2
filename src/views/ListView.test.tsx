import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/artic'
import { loadTrail } from '../browse/trail'
import { work } from '../test/fixtures'
import { renderApp } from '../test/renderApp'

const works = [
  work({ id: 1, title: 'Paris Street; Rainy Day', artist: 'Gustave Caillebotte', year: 1877, department: 'Arts of Asia' }),
  work({ id: 2, title: 'Water Lilies', artist: 'Claude Monet', year: 1906, department: 'Arts of Asia' }),
  work({ id: 3, title: 'Rain Forest Study', artist: null, year: 1850, department: 'Textiles' }),
  work({ id: 4, title: 'American Gothic', artist: 'Grant Wood', year: 1930, department: 'Modern Art' }),
]

function rowLinks() {
  return screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('href')?.startsWith('/artwork/'))
    .map((link) => link.getAttribute('href'))
}

async function ready() {
  await screen.findByText(/^\d+ artworks?/)
}

describe('ListView', () => {
  it('shows every artwork sorted by title', async () => {
    renderApp('/', { works })
    await ready()
    expect(rowLinks()).toEqual(['/artwork/4', '/artwork/1', '/artwork/3', '/artwork/2'])
    expect(screen.getByText('4 artworks')).toBeVisible()
  })

  it('filters as the visitor types', async () => {
    const user = userEvent.setup()
    renderApp('/', { works })
    await ready()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'rain')
    expect(rowLinks()).toEqual(['/artwork/1', '/artwork/3'])
    expect(screen.getByText('2 artworks matching “rain”')).toBeVisible()
    expect(screen.getByTestId('address')).toHaveTextContent('/?q=rain')
  })

  it('sorts by year, latest first', async () => {
    const user = userEvent.setup()
    renderApp('/', { works })
    await ready()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'year')
    await user.click(screen.getByRole('button', { name: 'Descending' }))
    expect(rowLinks()).toEqual(['/artwork/4', '/artwork/2', '/artwork/1', '/artwork/3'])
    expect(screen.getByRole('button', { name: 'Descending' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('address')).toHaveTextContent('/?sort=year&dir=desc')
  })

  it('keeps the sort while searching (AE1)', async () => {
    const user = userEvent.setup()
    renderApp('/?sort=year&dir=desc', { works })
    await ready()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'rain')
    expect(rowLinks()).toEqual(['/artwork/1', '/artwork/3'])
  })

  it('shows the state held in the address', async () => {
    renderApp('/?q=rain&sort=year&dir=asc', { works })
    await ready()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('rain')
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('year')
    expect(rowLinks()).toEqual(['/artwork/3', '/artwork/1'])
  })

  it('shows "Unknown" for a missing artist', async () => {
    renderApp('/?q=forest', { works })
    await ready()
    const row = screen.getByRole('link', { name: /Rain Forest Study/ })
    expect(within(row).getByText('Unknown')).toBeVisible()
  })

  it('opens an artwork and saves the visible order as the trail', async () => {
    const user = userEvent.setup()
    renderApp('/?q=rain&sort=year', { works })
    await ready()
    await user.click(screen.getByRole('link', { name: /Paris Street/ }))
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/1')
    expect(loadTrail()?.entries.map((entry) => entry.id)).toEqual([3, 1])
    expect(loadTrail()?.returnTo).toBe('/?q=rain&sort=year')
  })

  it('shows an empty message and the full-museum button when nothing matches', async () => {
    renderApp('/?q=zzzz', { works })
    await ready()
    expect(screen.getByText('No artworks in the collection match “zzzz”.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Search the full museum for “zzzz”' })).toBeVisible()
  })

  it('hides the full-museum button when the search box is empty', async () => {
    renderApp('/', { works })
    await ready()
    expect(screen.queryByRole('button', { name: /Search the full museum/ })).toBeNull()
  })

  it('adds full-museum matches to the rows', async () => {
    const user = userEvent.setup()
    const museum = [
      work({ id: 2, title: 'Water Lilies', artist: 'Claude Monet' }),
      work({ id: 50, title: 'Stacks of Wheat', artist: 'Claude Monet', department: 'Modern Art' }),
    ]
    const { client } = renderApp('/?q=monet', { works, museum })
    await ready()
    await user.click(screen.getByRole('button', { name: /Search the full museum/ }))
    expect(await screen.findByRole('link', { name: /Stacks of Wheat/ })).toBeVisible()
    expect(client.searchMuseum).toHaveBeenCalledWith('monet')
    expect(
      screen.getByText('The full museum returned 2 of its best matches; 1 were new and have been added.'),
    ).toBeVisible()
    expect(rowLinks()).toEqual(['/artwork/50', '/artwork/2'])
  })

  it('shows a museum match that the plain text match would leave out', async () => {
    const user = userEvent.setup()
    const museum = [work({ id: 60, title: 'Water Lily Pond', artist: 'Claude Monet', department: 'Modern Art' })]
    renderApp('/?q=lilies', { works, museum })
    await ready()
    expect(rowLinks()).toEqual(['/artwork/2'])
    await user.click(screen.getByRole('button', { name: /Search the full museum/ }))
    expect(await screen.findByRole('link', { name: /Water Lily Pond/ })).toBeVisible()
    expect(rowLinks()).toEqual(['/artwork/2', '/artwork/60'])
  })

  it('keeps the typed text when editing the middle of a search', async () => {
    const user = userEvent.setup()
    renderApp('/?q=rain', { works })
    await ready()
    const box = screen.getByRole('searchbox', { name: 'Search' })
    await user.type(box, 'T', { initialSelectionStart: 0, initialSelectionEnd: 0 })
    expect(box).toHaveValue('Train')
    expect(screen.getByTestId('address')).toHaveTextContent('/?q=Train')
  })

  it('shows an error and keeps the rows when the full-museum search fails (AE5)', async () => {
    const user = userEvent.setup()
    renderApp('/?q=rain', { works, museum: new ApiError('Could not reach the Art Institute API.') })
    await ready()
    await user.click(screen.getByRole('button', { name: /Search the full museum/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the Art Institute API. The artworks below are unchanged.',
    )
    expect(rowLinks()).toEqual(['/artwork/1', '/artwork/3'])
  })
})
