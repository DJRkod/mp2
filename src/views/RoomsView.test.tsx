import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadTrail } from '../browse/trail'
import { work } from '../test/fixtures'
import { renderApp } from '../test/renderApp'

const works = [
  work({ id: 1, title: 'Scroll', department: 'Arts of Asia', artworkType: 'Painting' }),
  work({ id: 2, title: 'Buddha', department: 'Arts of Asia', artworkType: 'Sculpture' }),
  work({ id: 3, title: 'Woodblock', department: 'Arts of Asia', artworkType: 'Print' }),
  work({ id: 4, title: 'Tapestry', department: 'Textiles', artworkType: 'Textile' }),
  work({ id: 5, title: 'Cannons', department: 'Modern Art', artworkType: 'Painting' }),
]

function room(name: string) {
  return screen.getByRole('region', { name })
}

function worksIn(name: string) {
  return within(room(name))
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href'))
}

async function ready() {
  await screen.findByText(/^\d+ artworks? (in \d+ rooms|match(es)? your filters)$/)
}

function typesGroup() {
  return screen.getByRole('group', { name: /^Type of artwork/ })
}

function typeChips() {
  return within(typesGroup())
    .queryAllByRole('button', { pressed: undefined })
    .filter((button) => button.hasAttribute('aria-pressed'))
    .map((button) => button.textContent)
}

describe('RoomsView', () => {
  it('renders a room for every department with works', async () => {
    renderApp('/rooms', { works })
    await ready()
    expect(worksIn('Arts of Asia')).toEqual(['/artwork/1', '/artwork/2', '/artwork/3'])
    expect(worksIn('Textiles')).toEqual(['/artwork/4'])
    expect(worksIn('Modern Art')).toEqual(['/artwork/5'])
    expect(screen.getByText('5 artworks in 3 rooms')).toBeVisible()
  })

  it('shows the departments, and keeps the artwork types behind a toggle', async () => {
    renderApp('/rooms', { works })
    await ready()
    const departments = screen.getByRole('group', { name: /^Department/ })
    expect(within(departments).getAllByRole('button')).toHaveLength(3)
    expect(typeChips()).toEqual([])
    const toggle = within(typesGroup()).getByRole('button', { name: 'Show all 4 types' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('offers the artwork types found in the starter collection when opened', async () => {
    const user = userEvent.setup()
    renderApp('/rooms', { works })
    await ready()
    await user.click(screen.getByRole('button', { name: 'Show all 4 types' }))
    expect(typeChips()).toEqual(['Painting', 'Print', 'Sculpture', 'Textile'])
    const toggle = within(typesGroup()).getByRole('button', { name: 'Show fewer types' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(typeChips()).toEqual([])
  })

  it('keeps the chosen types in view while the rest are tucked away', async () => {
    const user = userEvent.setup()
    renderApp('/rooms?type=Print', { works })
    await ready()
    expect(typeChips()).toEqual(['Print'])
    await user.click(screen.getByRole('button', { name: 'Print' }))
    expect(typeChips()).toEqual([])
    expect(worksIn('Arts of Asia')).toHaveLength(3)
  })

  it('says that a row of filters scrolls sideways, where there is a row', async () => {
    const user = userEvent.setup()
    renderApp('/rooms', { works })
    await ready()
    expect(screen.getAllByText('Scroll sideways for more')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Show all 4 types' }))
    expect(screen.getAllByText('Scroll sideways for more')).toHaveLength(2)
  })

  it('shows works of either type when two types are selected', async () => {
    const user = userEvent.setup()
    renderApp('/rooms', { works })
    await ready()
    await user.click(screen.getByRole('button', { name: 'Show all 4 types' }))
    await user.click(screen.getByRole('button', { name: 'Painting' }))
    await user.click(screen.getByRole('button', { name: 'Print' }))
    expect(worksIn('Arts of Asia')).toEqual(['/artwork/1', '/artwork/3'])
    expect(worksIn('Modern Art')).toEqual(['/artwork/5'])
    expect(screen.getByRole('button', { name: 'Painting' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('address')).toHaveTextContent('/rooms?type=Painting&type=Print')
    expect(screen.getByText('3 artworks match your filters')).toBeVisible()
    expect(screen.getByRole('group', { name: /^Type of artwork.*Painting, Print$/ })).toBeVisible()
  })

  it('dims a room with no matching works and shows none of its artworks (AE2)', async () => {
    renderApp('/rooms?type=Painting&dept=Arts+of+Asia', { works })
    await ready()
    expect(worksIn('Arts of Asia')).toEqual(['/artwork/1'])
    expect(worksIn('Textiles')).toEqual([])
    expect(room('Textiles').className).toContain('dimmed')
    expect(within(room('Textiles')).getByText('Nothing here matches your filters')).toBeVisible()
    expect(room('Arts of Asia').className).not.toContain('dimmed')
  })

  it('restores every room when the filters are cleared', async () => {
    const user = userEvent.setup()
    renderApp('/rooms?type=Textile', { works })
    await ready()
    expect(worksIn('Arts of Asia')).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(worksIn('Arts of Asia')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
    expect(screen.getByTestId('address')).toHaveTextContent('/rooms')
  })

  it('opens an artwork and saves that room’s visible works as the trail', async () => {
    const user = userEvent.setup()
    renderApp('/rooms?type=Painting&type=Print', { works })
    await ready()
    await user.click(within(room('Arts of Asia')).getByRole('link', { name: 'Woodblock' }))
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/3')
    expect(loadTrail()?.entries.map((entry) => entry.id)).toEqual([1, 3])
    expect(loadTrail()?.returnTo).toBe('/rooms?type=Painting&type=Print')
  })

  it('puts works added by a full-museum search in their department’s room', async () => {
    const user = userEvent.setup()
    const museum = [work({ id: 50, title: 'Haystack', department: 'Modern Art', artworkType: 'Mask' })]
    renderApp('/?q=hay', { works, museum })
    await user.click(await screen.findByRole('button', { name: /Search the full museum/ }))
    await screen.findByRole('link', { name: /Haystack/ })
    await user.click(screen.getByRole('link', { name: 'Gallery' }))
    await ready()
    expect(worksIn('Modern Art')).toEqual(['/artwork/5', '/artwork/50'])
    await user.click(screen.getByRole('button', { name: 'Show all 4 types' }))
    expect(screen.queryByRole('button', { name: 'Mask' })).toBeNull()
  })
})
