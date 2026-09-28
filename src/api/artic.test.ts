import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import { createArticClient, imageUrl } from './artic'

const EUROPE = 'Painting and Sculpture of Europe'

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 28560,
    title: 'The Bedroom',
    artist_title: 'Vincent van Gogh',
    date_start: 1889,
    date_display: '1889',
    medium_display: 'Oil on canvas',
    department_title: 'Painting and Sculpture of Europe',
    artwork_type_title: 'Painting',
    place_of_origin: 'Saint-Rémy-de-Provence',
    style_title: 'Post-Impressionism',
    image_id: 'abc-123',
    is_public_domain: true,
    ...overrides,
  }
}

function readable(uri: string) {
  return decodeURIComponent(uri.replaceAll('+', ' '))
}

function respondWith(data: unknown, status = 200) {
  const requests: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config)
    if (status >= 400) {
      throw new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
        data,
        status,
        statusText: 'Error',
        headers: {},
        config,
      })
    }
    return { data, status, statusText: 'OK', headers: {}, config }
  }
  return { client: createArticClient(adapter), requests }
}

function failWith(code: string) {
  const adapter: AxiosAdapter = async (config) => {
    throw new AxiosError('boom', code, config)
  }
  return createArticClient(adapter)
}

describe('mapping', () => {
  it('maps three records to three artworks', async () => {
    const { client } = respondWith({
      data: [record({ id: 1 }), record({ id: 2 }), record({ id: 3 })],
    })
    const works = await client.loadDepartment(EUROPE)
    expect(works.map((w) => w.id)).toEqual([1, 2, 3])
    expect(works[0]).toEqual({
      id: 1,
      title: 'The Bedroom',
      artist: 'Vincent van Gogh',
      year: 1889,
      dateDisplay: '1889',
      medium: 'Oil on canvas',
      department: 'Painting and Sculpture of Europe',
      artworkType: 'Painting',
      placeOfOrigin: 'Saint-Rémy-de-Provence',
      style: 'Post-Impressionism',
      imageId: 'abc-123',
    })
  })

  it('keeps null artist and null year as null', async () => {
    const { client } = respondWith({
      data: [record({ artist_title: null, date_start: null })],
    })
    const [work] = await client.loadDepartment(EUROPE)
    expect(work.artist).toBeNull()
    expect(work.year).toBeNull()
  })

  it('treats blank text as missing', async () => {
    const { client } = respondWith({ data: [record({ title: '  ' })] })
    const [work] = await client.loadDepartment(EUROPE)
    expect(work.title).toBeNull()
  })

  it('drops a record with no image id', async () => {
    const { client } = respondWith({
      data: [record({ id: 1, image_id: null }), record({ id: 2 })],
    })
    const works = await client.loadDepartment(EUROPE)
    expect(works.map((w) => w.id)).toEqual([2])
  })

  it('keeps a year before the common era negative', async () => {
    const { client } = respondWith({ data: [record({ date_start: -600 })] })
    const [work] = await client.loadDepartment(EUROPE)
    expect(work.year).toBe(-600)
  })
})

describe('loadDepartment', () => {
  it('filters on the exact department name, public domain and image', async () => {
    const { client, requests } = respondWith({ data: [] })
    await client.loadDepartment('Modern Art')
    const uri = readable(client.uriFor(requests[0]))
    expect(uri).toContain('[term][department_title.keyword]=Modern Art')
    expect(uri).toContain('[term][is_public_domain]=true')
    expect(uri).toContain('[exists][field]=image_id')
    expect(uri).toContain('limit=30')
  })

  it('drops works the API returns for another department', async () => {
    const { client } = respondWith({
      data: [
        record({ id: 1, department_title: 'Modern Art' }),
        record({ id: 2, department_title: 'Arts of Asia' }),
      ],
    })
    const works = await client.loadDepartment('Modern Art')
    expect(works.map((w) => w.department)).toEqual(['Modern Art'])
  })
})

describe('searchMuseum', () => {
  it('sends the text as a required match on title and artist, not q', async () => {
    const { client, requests } = respondWith({ data: [record()] })
    const works = await client.searchMuseum('monet')
    expect(works).toHaveLength(1)
    const uri = readable(client.uriFor(requests[0]))
    expect(uri).toContain('[must][multi_match][query]=monet')
    expect(uri).toContain('[must][multi_match][fields][0]=title')
    expect(uri).toContain('[must][multi_match][fields][1]=artist_title')
    expect(uri).toContain('[must][multi_match][type]=cross_fields')
    expect(uri).toContain('[must][multi_match][operator]=and')
    expect(uri).toContain('limit=100')
    expect(uri).not.toMatch(/[?&]q=/)
  })

  it('resolves to an empty list when nothing matches', async () => {
    const { client } = respondWith({ data: [] })
    expect(await client.searchMuseum('zzzzqqq')).toEqual([])
  })
})

describe('fetchArtwork', () => {
  it('returns the artwork', async () => {
    const { client } = respondWith({ data: record({ id: 27992 }) })
    expect((await client.fetchArtwork(27992))?.id).toBe(27992)
  })

  it('resolves to null for a work that is not public domain', async () => {
    const { client } = respondWith({ data: record({ is_public_domain: false }) })
    expect(await client.fetchArtwork(1)).toBeNull()
  })

  it('resolves to null for a work with no image', async () => {
    const { client } = respondWith({ data: record({ image_id: null }) })
    expect(await client.fetchArtwork(1)).toBeNull()
  })

  it('resolves to null when the id does not exist', async () => {
    const { client } = respondWith({ status: 404 }, 404)
    expect(await client.fetchArtwork(999999999)).toBeNull()
  })
})

describe('failures', () => {
  it('rejects with a displayable message on a network failure', async () => {
    const client = failWith('ERR_NETWORK')
    await expect(client.searchMuseum('monet')).rejects.toThrow(
      /could not reach the art institute/i,
    )
  })

  it('rejects the same way when the request times out', async () => {
    const client = failWith('ECONNABORTED')
    await expect(client.loadDepartment('Modern Art')).rejects.toThrow(
      /could not reach the art institute/i,
    )
  })

  it('sets an 8 second timeout', async () => {
    const { client, requests } = respondWith({ data: [] })
    await client.searchMuseum('monet')
    expect(requests[0].timeout).toBe(8000)
  })
})

describe('imageUrl', () => {
  it('builds thumbnail and full image addresses', () => {
    expect(imageUrl('abc', 'thumb')).toBe(
      'https://www.artic.edu/iiif/2/abc/full/200,/0/default.jpg',
    )
    expect(imageUrl('abc', 'full')).toBe(
      'https://www.artic.edu/iiif/2/abc/full/843,/0/default.jpg',
    )
  })
})
