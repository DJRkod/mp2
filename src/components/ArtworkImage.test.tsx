import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtworkImage } from './ArtworkImage'
import { preloadImage } from './artworkTransition'

type Decode = () => Promise<void>
const imagePrototype = HTMLImageElement.prototype as { decode?: Decode }

afterEach(() => {
  delete imagePrototype.decode
  vi.useRealTimers()
})

function picture() {
  return screen.getByRole('img', { name: 'Statue' })
}

function size() {
  return picture().getAttribute('src')?.match(/\/full\/([^/]+)\//)?.[1]
}

function full(imageId = 'statue') {
  return render(<ArtworkImage imageId={imageId} title="Statue" size="full" fit="natural" eager />)
}

describe('a full-size picture', () => {
  it('asks first for the size the museum keeps ready', () => {
    full()
    expect(size()).toBe('843,')
  })

  it('falls back to a best fit when that size is refused, as for a small original', () => {
    full()
    fireEvent.error(picture())
    expect(size()).toBe('!843,843')
  })

  it('falls back to the thumbnail when no large size can be had', () => {
    full()
    fireEvent.error(picture())
    fireEvent.error(picture())
    expect(size()).toBe('200,')
  })

  it('says the picture is unavailable only when every size has failed', () => {
    full()
    fireEvent.error(picture())
    fireEvent.error(picture())
    expect(screen.queryByText('Image unavailable')).toBeNull()
    fireEvent.error(picture())
    expect(picture()).toHaveTextContent('Image unavailable')
  })

  it('says it is loading until the picture arrives', () => {
    full()
    expect(screen.getByText('Loading the picture…')).toBeVisible()
    fireEvent.load(picture())
    expect(screen.queryByText('Loading the picture…')).toBeNull()
  })

  it('stops waiting for a size that takes too long and tries the next', () => {
    vi.useFakeTimers()
    full()
    act(() => void vi.advanceTimersByTime(7999))
    expect(size()).toBe('843,')
    act(() => void vi.advanceTimersByTime(1))
    expect(size()).toBe('!843,843')
    act(() => void vi.advanceTimersByTime(8000))
    expect(size()).toBe('200,')
  })

  it('does not give up on a picture that has arrived', () => {
    vi.useFakeTimers()
    full()
    fireEvent.load(picture())
    act(() => void vi.advanceTimersByTime(20000))
    expect(size()).toBe('843,')
  })

  it('starts again from the first size for a different artwork', () => {
    const view = full('first')
    fireEvent.error(picture())
    expect(size()).toBe('!843,843')
    view.rerender(<ArtworkImage imageId="second" title="Statue" size="full" fit="natural" eager />)
    expect(size()).toBe('843,')
    expect(picture().getAttribute('src')).toContain('/second/')
  })

  it('starts from the size that loading ahead found to work', async () => {
    let calls = 0
    imagePrototype.decode = () => (++calls === 1 ? Promise.reject(new Error('refused')) : Promise.resolve())
    await preloadImage('small-original')
    full('small-original')
    expect(size()).toBe('!843,843')
  })

  it('shows a picture loaded ahead of time at once, with no loading message', async () => {
    imagePrototype.decode = () => Promise.resolve()
    await preloadImage('ready')
    full('ready')
    expect(screen.queryByText('Loading the picture…')).toBeNull()
    expect(size()).toBe('843,')
  })
})

describe('a thumbnail', () => {
  it('has no loading message, and falls back to a best fit', () => {
    render(<ArtworkImage imageId="statue" title="Statue" size="thumb" />)
    expect(screen.queryByText('Loading the picture…')).toBeNull()
    expect(size()).toBe('200,')
    fireEvent.error(picture())
    expect(size()).toBe('!200,200')
    fireEvent.error(picture())
    expect(picture()).toHaveTextContent('Image unavailable')
  })
})
