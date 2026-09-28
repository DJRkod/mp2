import { describe, expect, it } from 'vitest'
import { columnSize } from '../browse/timelinePeriods'
import { formatYear, orUnknown } from './format'

describe('formatYear', () => {
  it('shows a year of the common era as it is', () => {
    expect(formatYear(1889)).toBe('1889')
  })

  it('shows a negative year as BCE', () => {
    expect(formatYear(-600)).toBe('600 BCE')
  })

  it('shows a missing year as Unknown', () => {
    expect(formatYear(null)).toBe('Unknown')
  })
})

describe('orUnknown', () => {
  it('keeps a value and replaces a missing one', () => {
    expect(orUnknown('Paris')).toBe('Paris')
    expect(orUnknown(null)).toBe('Unknown')
    expect(orUnknown(null, 'Untitled')).toBe('Untitled')
  })
})

describe('columnSize', () => {
  it('grows with the number of works', () => {
    expect(columnSize(0)).toBe('small')
    expect(columnSize(18)).toBe('small')
    expect(columnSize(19)).toBe('medium')
    expect(columnSize(40)).toBe('medium')
    expect(columnSize(41)).toBe('large')
  })
})
