import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { loadTrail } from '../browse/trail'
import { work } from '../test/fixtures'
import { renderApp } from '../test/renderApp'

const works = [
  work({ id: 1, title: 'Modern', year: 1930, department: 'Arts of Asia' }),
  work({ id: 2, title: 'Baroque', year: 1642, department: 'Arts of Asia' }),
  work({ id: 3, title: 'Impression', year: 1877, department: 'Textiles' }),
  work({ id: 4, title: 'Undated', year: null, department: 'Textiles' }),
  work({ id: 5, title: 'Ancient', year: -600, department: 'Modern Art' }),
]

function worksIn(period: string) {
  return within(screen.getByRole('region', { name: period }))
    .queryAllByRole('link')
    .map((link) => link.getAttribute('href'))
}

async function ready() {
  await screen.findByText(/dated artworks/)
}

describe('TimelineView', () => {
  it('puts works in different period columns in date order', async () => {
    renderApp('/timeline', { works })
    await ready()
    expect(worksIn('1500–1699')).toEqual(['/artwork/2'])
    expect(worksIn('1875–1899')).toEqual(['/artwork/3'])
    expect(worksIn('1920–1934')).toEqual(['/artwork/1'])
    const periods = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(periods.indexOf('1500–1699')).toBeLessThan(periods.indexOf('1875–1899'))
    expect(periods.indexOf('1875–1899')).toBeLessThan(periods.indexOf('1920–1934'))
  })

  it('leaves out a work with no year and says how many are missing (AE4)', async () => {
    renderApp('/timeline', { works })
    await ready()
    expect(screen.queryByRole('link', { name: 'Undated' })).toBeNull()
    expect(screen.getByText(/1 artwork has no date and is not shown here/)).toBeVisible()
    expect(screen.getByText(/4 dated artworks/)).toBeVisible()
  })

  it('puts a work from before the first boundary in the first column', async () => {
    renderApp('/timeline', { works })
    await ready()
    expect(worksIn('Before 500 BCE')).toEqual(['/artwork/5'])
  })

  it('gives a busy period a wider column', async () => {
    const busy = Array.from({ length: 45 }, (_, i) =>
      work({ id: 100 + i, year: 1880, department: 'Textiles' }),
    )
    renderApp('/timeline', { works: [...works, ...busy] })
    await ready()
    expect(screen.getByRole('region', { name: '1875–1899' }).className).toContain('large')
    expect(screen.getByRole('region', { name: '1500–1699' }).className).toContain('small')
  })

  it('opens an artwork and saves a trail ordered by year', async () => {
    const user = userEvent.setup()
    renderApp('/timeline', { works })
    await ready()
    await user.click(screen.getByRole('link', { name: 'Impression' }))
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/3')
    expect(loadTrail()?.entries.map((entry) => entry.id)).toEqual([5, 2, 3, 1])
    expect(loadTrail()?.returnTo).toBe('/timeline')
  })
})
