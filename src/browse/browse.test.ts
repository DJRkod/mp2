import { describe, expect, it } from 'vitest'
import { ids, work } from '../test/fixtures'
import { filterWorks, hasActiveFilters } from './filter'
import { bucketWorks, makePeriods } from './periods'
import { buildRooms } from './rooms'
import { searchWorks } from './search'
import { sortWorks } from './sort'

describe('searchWorks', () => {
  const works = [
    work({ id: 1, title: 'Water Lilies', artist: 'Claude Monet' }),
    work({ id: 2, title: 'Paris Street; Rainy Day', artist: 'Gustave Caillebotte' }),
    work({ id: 3, title: 'Portrait of Monet', artist: 'Pierre-Auguste Renoir' }),
    work({ id: 4, title: 'The Basket of Apples', artist: 'Paul Cézanne' }),
    work({ id: 5, title: null, artist: null }),
  ]

  it('matches on title or artist, ignoring case', () => {
    expect(ids(searchWorks(works, 'MONET'))).toEqual([1, 3])
  })

  it('returns the full list for an empty or blank search', () => {
    expect(searchWorks(works, '')).toHaveLength(5)
    expect(searchWorks(works, '   ')).toHaveLength(5)
  })

  it('ignores accents', () => {
    expect(ids(searchWorks(works, 'cezanne'))).toEqual([4])
  })

  it('returns nothing when no work matches', () => {
    expect(searchWorks(works, 'zzzz')).toEqual([])
  })

  it('keeps order when combined with a sort (AE1)', () => {
    const dated = [
      work({ id: 1, artist: 'Claude Monet', year: 1906 }),
      work({ id: 2, artist: 'Edgar Degas', year: 1880 }),
      work({ id: 3, artist: 'Claude Monet', year: 1891 }),
      work({ id: 4, artist: 'Claude Monet', year: 1872 }),
    ]
    const sorted = sortWorks(dated, 'year', 'desc')
    expect(ids(searchWorks(sorted, 'monet'))).toEqual([1, 3, 4])
  })
})

describe('sortWorks', () => {
  const works = [
    work({ id: 1, title: 'Nighthawks', artist: 'Edward Hopper', year: 1942 }),
    work({ id: 2, title: 'American Gothic', artist: 'Grant Wood', year: 1930 }),
    work({ id: 3, title: 'the bedroom', artist: 'Vincent van Gogh', year: 1889 }),
  ]

  it('sorts by title in both directions', () => {
    expect(ids(sortWorks(works, 'title', 'asc'))).toEqual([2, 1, 3])
    expect(ids(sortWorks(works, 'title', 'desc'))).toEqual([3, 1, 2])
  })

  it('sorts by artist', () => {
    expect(ids(sortWorks(works, 'artist', 'asc'))).toEqual([1, 2, 3])
  })

  it('sorts by year in both directions', () => {
    expect(ids(sortWorks(works, 'year', 'asc'))).toEqual([3, 2, 1])
    expect(ids(sortWorks(works, 'year', 'desc'))).toEqual([1, 2, 3])
  })

  it('puts works missing the field last in either direction', () => {
    const withGap = [work({ id: 9, artist: null }), ...works]
    expect(ids(sortWorks(withGap, 'artist', 'asc'))).toEqual([1, 2, 3, 9])
    expect(ids(sortWorks(withGap, 'artist', 'desc'))).toEqual([3, 2, 1, 9])
  })

  it('sorts years before the common era first', () => {
    const ancient = [
      work({ id: 1, year: 1200 }),
      work({ id: 2, year: -600 }),
      work({ id: 3, year: 0 }),
    ]
    expect(ids(sortWorks(ancient, 'year', 'asc'))).toEqual([2, 3, 1])
  })

  it('does not change the list it was given', () => {
    const before = ids(works)
    sortWorks(works, 'year', 'asc')
    expect(ids(works)).toEqual(before)
  })
})

describe('filterWorks', () => {
  const works = [
    work({ id: 1, department: 'Arts of Asia', artworkType: 'Painting' }),
    work({ id: 2, department: 'Arts of Asia', artworkType: 'Sculpture' }),
    work({ id: 3, department: 'Textiles', artworkType: 'Textile' }),
    work({ id: 4, department: 'Prints and Drawings', artworkType: 'Print' }),
    work({ id: 5, department: 'Prints and Drawings', artworkType: null }),
  ]

  it('returns everything when no filter is selected', () => {
    expect(filterWorks(works, { departments: [], types: [] })).toHaveLength(5)
    expect(hasActiveFilters({ departments: [], types: [] })).toBe(false)
  })

  it('treats two values in one group as alternatives', () => {
    const result = filterWorks(works, { departments: [], types: ['Painting', 'Print'] })
    expect(ids(result)).toEqual([1, 4])
  })

  it('requires both groups to match', () => {
    const result = filterWorks(works, {
      departments: ['Arts of Asia'],
      types: ['Sculpture', 'Print'],
    })
    expect(ids(result)).toEqual([2])
  })
})

describe('buildRooms', () => {
  const departments = ['Arts of Asia', 'Textiles', 'Modern Art']
  const works = [
    work({ id: 1, department: 'Textiles', artworkType: 'Textile' }),
    work({ id: 2, department: 'Arts of Asia', artworkType: 'Painting' }),
    work({ id: 3, department: 'Arts of Asia', artworkType: 'Sculpture' }),
    work({ id: 4, department: 'Photography and Media', artworkType: 'Photograph' }),
  ]

  it('makes one room per department that has works, in the given order', () => {
    const rooms = buildRooms(works, departments, { departments: [], types: [] })
    expect(rooms.map((r) => r.department)).toEqual([
      'Arts of Asia',
      'Textiles',
      'Photography and Media',
    ])
    expect(rooms.every((r) => !r.dimmed)).toBe(true)
    expect(ids(rooms[0].works)).toEqual([2, 3])
  })

  it('dims a room with no matching works and empties it (AE2)', () => {
    const rooms = buildRooms(works, departments, {
      departments: ['Arts of Asia'],
      types: ['Painting'],
    })
    const asia = rooms.find((r) => r.department === 'Arts of Asia')
    const textiles = rooms.find((r) => r.department === 'Textiles')
    expect(ids(asia!.works)).toEqual([2])
    expect(asia!.dimmed).toBe(false)
    expect(textiles!.works).toEqual([])
    expect(textiles!.dimmed).toBe(true)
  })
})

describe('bucketWorks', () => {
  const periods = makePeriods([1600, 1800, 1900])

  it('labels the periods', () => {
    expect(periods.map((p) => p.label)).toEqual([
      'Before 1600',
      '1600–1799',
      '1800–1899',
      '1900 and later',
    ])
  })

  it('puts works in period columns in year order', () => {
    const works = [
      work({ id: 1, year: 1930 }),
      work({ id: 2, year: 1642 }),
      work({ id: 3, year: 1877 }),
      work({ id: 4, year: 1801 }),
    ]
    const { columns } = bucketWorks(works, periods)
    expect(columns.map((c) => ids(c.works))).toEqual([[], [2], [4, 3], [1]])
  })

  it('leaves out works with no year and counts them (AE4)', () => {
    const works = [work({ id: 1, year: null }), work({ id: 2, year: 1700 })]
    const { columns, undated } = bucketWorks(works, periods)
    expect(columns.flatMap((c) => ids(c.works))).toEqual([2])
    expect(undated).toBe(1)
  })

  it('puts a work dated before the first boundary in the first column', () => {
    const { columns } = bucketWorks([work({ id: 1, year: -600 })], periods)
    expect(ids(columns[0].works)).toEqual([1])
  })

  it('puts a work dated on a boundary in the later column', () => {
    const { columns } = bucketWorks([work({ id: 1, year: 1800 })], periods)
    expect(ids(columns[2].works)).toEqual([1])
  })
})
