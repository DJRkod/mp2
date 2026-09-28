import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/artic'
import { makeTrail, saveTrail } from '../browse/trail'
import { work } from '../test/fixtures'
import { renderApp } from '../test/renderApp'

const works = [
  work({
    id: 1,
    title: 'The Bedroom',
    artist: 'Vincent van Gogh',
    dateDisplay: '1889',
    medium: 'Oil on canvas',
    department: 'Arts of Asia',
    artworkType: 'Painting',
    placeOfOrigin: 'Saint-Rémy-de-Provence',
    style: 'Post-Impressionism',
  }),
  work({ id: 2, title: 'Second', department: 'Arts of Asia' }),
  work({ id: 3, title: 'Third', department: 'Arts of Asia' }),
  work({ id: 4, title: 'Fourth', department: 'Textiles' }),
  work({ id: 5, title: 'Fifth', department: 'Textiles', placeOfOrigin: null }),
  work({ id: 6, title: 'Sixth', department: 'Modern Art' }),
  work({ id: 7, title: 'Seventh', department: 'Modern Art' }),
]

function title(name: string) {
  return screen.findByRole('heading', { level: 1, name })
}

function strip() {
  const list = screen.getByRole('list', { name: 'Neighbouring artworks' })
  return within(list)
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'))
}

function fact(name: string) {
  return screen.getByText(name, { selector: 'dt' }).nextElementSibling
}

type Decode = () => Promise<void>
const imagePrototype = HTMLImageElement.prototype as { decode?: Decode }
const transitions = document as { startViewTransition?: unknown }

afterEach(() => {
  delete imagePrototype.decode
  delete transitions.startViewTransition
})

describe('moving between artworks', () => {
  it('changes inside a view transition once the next picture is ready', async () => {
    const user = userEvent.setup()
    let pictureReady = () => {}
    imagePrototype.decode = () =>
      new Promise((resolve) => {
        pictureReady = resolve
      })
    const start = vi.fn((update: () => void) => update())
    transitions.startViewTransition = start
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')

    await user.click(screen.getByRole('link', { name: /Next/ }))
    expect(start).not.toHaveBeenCalled()
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/3')

    pictureReady()
    await title('Fourth')
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('counts every press when arrow keys are pressed faster than pictures load', async () => {
    const user = userEvent.setup()
    const ready: (() => void)[] = []
    imagePrototype.decode = () => new Promise((resolve) => ready.push(resolve))
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/1', { works })
    await title('The Bedroom')
    const before = ready.length

    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/1')
    ready.slice(before).forEach((resolve) => resolve())
    await title('Fourth')
  })

  it('leaves a click with a modifier key to the browser', async () => {
    const start = vi.fn((update: () => void) => update())
    transitions.startViewTransition = start
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')
    const next = screen.getByRole('link', { name: /Next/ })
    const allowed = fireEvent.click(next, { ctrlKey: true })
    expect(allowed).toBe(true)
    expect(start).not.toHaveBeenCalled()
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/3')
  })

  it('does not move after the visitor has left the page', async () => {
    const user = userEvent.setup()
    let pictureReady = () => {}
    imagePrototype.decode = () =>
      new Promise((resolve) => {
        pictureReady = resolve
      })
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')
    await user.click(screen.getByRole('link', { name: /Next/ }))
    await user.click(screen.getByRole('link', { name: 'Rooms' }))
    pictureReady()
    await screen.findByRole('heading', { level: 1, name: 'The rooms' })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByTestId('address')).toHaveTextContent('/rooms')
  })

  it('loads the neighbouring pictures ahead of time', async () => {
    const asked: string[] = []
    imagePrototype.decode = function (this: HTMLImageElement) {
      asked.push(this.src)
      return Promise.resolve()
    }
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')
    expect(asked.some((src) => src.includes('image-2/full/843'))).toBe(true)
    expect(asked.some((src) => src.includes('image-4/full/843'))).toBe(true)
  })
})

describe('DetailView', () => {
  it('shows the facts and the position in the trail', async () => {
    saveTrail(makeTrail(works, '/?q=e'))
    renderApp('/artwork/1', { works })
    await title('The Bedroom')
    expect(fact('Artist')).toHaveTextContent('Vincent van Gogh')
    expect(fact('Date')).toHaveTextContent('1889')
    expect(fact('Medium')).toHaveTextContent('Oil on canvas')
    expect(fact('Department')).toHaveTextContent('Arts of Asia')
    expect(fact('Type')).toHaveTextContent('Painting')
    expect(fact('Place of origin')).toHaveTextContent('Saint-Rémy-de-Provence')
    expect(fact('Style')).toHaveTextContent('Post-Impressionism')
    expect(screen.getByText('1 of 7')).toBeVisible()
    const figure = screen.getByRole('figure')
    expect(within(figure).getByRole('img', { name: 'The Bedroom' }).getAttribute('src')).toContain(
      '/full/843,/0/default.jpg',
    )
  })

  it('steps through a trail of five and wraps to the first (AE3)', async () => {
    const user = userEvent.setup()
    saveTrail(makeTrail(works.slice(0, 5), '/?q=e'))
    renderApp('/artwork/3', { works })
    await title('Third')
    expect(screen.getByText('3 of 5')).toBeVisible()
    await user.click(screen.getByRole('link', { name: /Next/ }))
    await title('Fourth')
    await user.click(screen.getByRole('link', { name: /Next/ }))
    await title('Fifth')
    expect(screen.getByText('5 of 5')).toBeVisible()
    await user.click(screen.getByRole('link', { name: /Next/ }))
    await title('The Bedroom')
    await user.click(screen.getByRole('link', { name: /Previous/ }))
    await title('Fifth')
  })

  it('moves with the arrow keys', async () => {
    const user = userEvent.setup()
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')
    await user.keyboard('{ArrowRight}')
    await title('Fourth')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    await title('Second')
  })

  it('ignores a held arrow key and one pressed with a modifier', async () => {
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/3')
  })

  it('ignores arrow keys pressed while typing in a field', async () => {
    saveTrail(makeTrail(works.slice(0, 5), '/'))
    renderApp('/artwork/3', { works })
    await title('Third')
    for (const tag of ['input', 'textarea', 'select']) {
      const field = document.body.appendChild(document.createElement(tag))
      field.focus()
      fireEvent.keyDown(field, { key: 'ArrowRight' })
      field.remove()
    }
    expect(screen.getByTestId('address')).toHaveTextContent('/artwork/3')
    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    await title('Fourth')
  })

  it('shows two neighbours on each side and opens one, keeping the trail', async () => {
    const user = userEvent.setup()
    saveTrail(makeTrail(works, '/rooms'))
    renderApp('/artwork/4', { works })
    await title('Fourth')
    expect(strip()).toEqual(['/artwork/2', '/artwork/3', '/artwork/4', '/artwork/5', '/artwork/6'])
    const list = screen.getByRole('list', { name: 'Neighbouring artworks' })
    expect(within(list).getByRole('link', { name: 'Fourth' })).toHaveAttribute('aria-current', 'page')
    await user.click(within(list).getByRole('link', { name: 'Sixth' }))
    await title('Sixth')
    expect(screen.getByText('6 of 7')).toBeVisible()
  })

  it('shows each work once when the trail has three works', async () => {
    saveTrail(makeTrail(works.slice(0, 3), '/rooms'))
    renderApp('/artwork/2', { works })
    await title('Second')
    expect(strip()).toEqual(['/artwork/1', '/artwork/2', '/artwork/3'])
  })

  it('uses the default order when opened with no trail (AE6)', async () => {
    renderApp('/artwork/7', { works })
    await title('Seventh')
    expect(screen.getByText('7 of 7')).toBeVisible()
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute('href', '/artwork/1')
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/artwork/6')
    expect(screen.getByRole('link', { name: /Back to the list/ })).toHaveAttribute('href', '/')
  })

  it('uses the default order when the saved trail does not hold the artwork', async () => {
    saveTrail(makeTrail(works.slice(0, 2), '/rooms'))
    renderApp('/artwork/6', { works })
    await title('Sixth')
    expect(screen.getByText('6 of 7')).toBeVisible()
    expect(screen.getByRole('link', { name: /Back to the list/ })).toBeVisible()
  })

  it('fetches an artwork outside the collection and places it before the first work', async () => {
    const elsewhere = [work({ id: 900, title: 'From Elsewhere', department: 'Modern Art' })]
    const { client } = renderApp('/artwork/900', { works, elsewhere })
    await title('From Elsewhere')
    expect(client.fetchArtwork).toHaveBeenCalledWith(900)
    expect(screen.getByRole('link', { name: /Next/ })).toHaveAttribute('href', '/artwork/1')
    expect(screen.getByRole('link', { name: /Previous/ })).toHaveAttribute('href', '/artwork/7')
    expect(screen.queryByText(/ of 7/)).toBeNull()
    expect(strip()).toEqual(['/artwork/7', '/artwork/900', '/artwork/1'])
  })

  it('does not fetch an artwork that is already in the collection', async () => {
    const { client } = renderApp('/artwork/2', { works })
    await title('Second')
    expect(client.fetchArtwork).not.toHaveBeenCalled()
  })

  it('draws the filmstrip from the trail alone after a refresh', async () => {
    const found = work({ id: 901, title: 'Search Find', department: 'Modern Art' })
    const lost = work({ id: 902, title: 'Lost Neighbour', imageId: 'lost-image' })
    window.sessionStorage.setItem(
      'mp2.trail.v1',
      JSON.stringify(makeTrail([found, lost], '/?q=find')),
    )
    renderApp('/artwork/901', { works, elsewhere: [found] })
    await title('Search Find')
    expect(screen.getByRole('img', { name: 'Lost Neighbour' }).getAttribute('src')).toContain(
      'lost-image',
    )
    expect(screen.getByText('1 of 2')).toBeVisible()
  })

  it('says an artwork is not available when the id does not exist', async () => {
    renderApp('/artwork/123456', { works })
    await title('This artwork is not available')
    expect(screen.getByRole('link', { name: 'Go to the list of artworks' })).toHaveAttribute('href', '/')
  })

  it('says an artwork is not available for an address that is not a number', async () => {
    renderApp('/artwork/abc', { works })
    await title('This artwork is not available')
  })

  it('shows an error when the artwork cannot be loaded', async () => {
    renderApp('/artwork/900', { works, fetchError: new ApiError('Could not reach the Art Institute API.') })
    await title('This artwork could not be loaded')
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the Art Institute API.')
  })

  it('shows "Unknown" for a missing fact', async () => {
    renderApp('/artwork/5', { works })
    await title('Fifth')
    expect(fact('Place of origin')).toHaveTextContent('Unknown')
  })

  it('returns to the List with the same search and sort', async () => {
    const user = userEvent.setup()
    renderApp('/?q=th&sort=year&dir=desc', { works })
    await user.click(await screen.findByRole('link', { name: /Third/ }))
    await title('Third')
    await user.click(screen.getByRole('link', { name: /Back to the list/ }))
    expect(screen.getByTestId('address')).toHaveTextContent('/?q=th&sort=year&dir=desc')
    expect(await screen.findByRole('searchbox', { name: 'Search' })).toHaveValue('th')
  })

  it('names the view it returns to', async () => {
    saveTrail(makeTrail(works, '/rooms?type=Painting'))
    renderApp('/artwork/2', { works })
    await title('Second')
    expect(screen.getByRole('link', { name: /Back to the rooms/ })).toHaveAttribute(
      'href',
      '/rooms?type=Painting',
    )
  })
})
