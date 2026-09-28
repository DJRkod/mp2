import axios, { isAxiosError } from 'axios'
import type { AxiosAdapter, AxiosRequestConfig } from 'axios'
import type { Artwork } from '../types/artwork'

const API_BASE = 'https://api.artic.edu/api/v1'
const IIIF_BASE = 'https://www.artic.edu/iiif/2'
const TIMEOUT_MS = 8000

export const STARTER_PER_DEPARTMENT = 30
export const SEARCH_LIMIT = 100

const FIELDS = [
  'id',
  'title',
  'artist_title',
  'date_start',
  'date_display',
  'medium_display',
  'department_title',
  'artwork_type_title',
  'place_of_origin',
  'style_title',
  'image_id',
  'is_public_domain',
].join(',')

interface ApiArtwork {
  id: number
  title?: string | null
  artist_title?: string | null
  date_start?: number | null
  date_display?: string | null
  medium_display?: string | null
  department_title?: string | null
  artwork_type_title?: string | null
  place_of_origin?: string | null
  style_title?: string | null
  image_id?: string | null
  is_public_domain?: boolean
}

export class ApiError extends Error {}

const PUBLIC_WITH_IMAGE = [
  { term: { is_public_domain: true } },
  { exists: { field: 'image_id' } },
]

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function toArtwork(raw: ApiArtwork): Artwork | null {
  const imageId = text(raw.image_id)
  if (!imageId) return null
  return {
    id: raw.id,
    title: text(raw.title),
    artist: text(raw.artist_title),
    year: typeof raw.date_start === 'number' ? raw.date_start : null,
    dateDisplay: text(raw.date_display),
    medium: text(raw.medium_display),
    department: text(raw.department_title),
    artworkType: text(raw.artwork_type_title),
    placeOfOrigin: text(raw.place_of_origin),
    style: text(raw.style_title),
    imageId,
  }
}

function toArtworks(raws: ApiArtwork[] | undefined): Artwork[] {
  return (raws ?? []).flatMap((raw) => toArtwork(raw) ?? [])
}

function displayable(error: unknown): ApiError {
  if (isAxiosError(error) && error.response) {
    return new ApiError(
      `The Art Institute API returned an error (${error.response.status}).`,
    )
  }
  return new ApiError(
    'Could not reach the Art Institute API. Check your connection and try again.',
  )
}

export function imageUrl(imageId: string, size: 'thumb' | 'full'): string {
  const width = size === 'full' ? 843 : 200
  return `${IIIF_BASE}/${imageId}/full/${width},/0/default.jpg`
}

export function createArticClient(adapter?: AxiosAdapter) {
  const http = axios.create({
    baseURL: API_BASE,
    timeout: TIMEOUT_MS,
    // The API reads nested queries as query[bool][filter][0][term][...]=...
    paramsSerializer: { indexes: true },
    ...(adapter ? { adapter } : {}),
  })

  async function search(query: object, limit: number): Promise<Artwork[]> {
    try {
      const response = await http.get<{ data: ApiArtwork[] }>(
        '/artworks/search',
        { params: { query, limit, fields: FIELDS } },
      )
      return toArtworks(response.data.data)
    } catch (error) {
      throw displayable(error)
    }
  }

  return {
    /** The starter works for one department, best known first. */
    async loadDepartment(department: string): Promise<Artwork[]> {
      const works = await search(
        {
          bool: {
            filter: [
              ...PUBLIC_WITH_IMAGE,
              // The .keyword form is an exact match; the plain field matches
              // single words and returns works from other departments.
              { term: { 'department_title.keyword': department } },
            ],
          },
        },
        STARTER_PER_DEPARTMENT,
      )
      return works.filter((work) => work.department === department)
    },

    /** The top matches on title or artist across the whole museum. */
    searchMuseum(searchText: string): Promise<Artwork[]> {
      return search(
        {
          bool: {
            filter: PUBLIC_WITH_IMAGE,
            must: {
              multi_match: {
                query: searchText,
                fields: ['title', 'artist_title'],
              },
            },
          },
        },
        SEARCH_LIMIT,
      )
    },

    /** One artwork, or null when it does not exist or may not be shown. */
    async fetchArtwork(id: number): Promise<Artwork | null> {
      try {
        const response = await http.get<{ data: ApiArtwork }>(
          `/artworks/${id}`,
          { params: { fields: FIELDS } },
        )
        const raw = response.data.data
        if (!raw || raw.is_public_domain !== true) return null
        return toArtwork(raw)
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null
        throw displayable(error)
      }
    },

    uriFor(config: AxiosRequestConfig): string {
      return http.getUri(config)
    },
  }
}

export type ArticClient = ReturnType<typeof createArticClient>

export const artic = createArticClient()
