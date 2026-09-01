import { describe, expect, it } from 'vitest'
import {
  encountersById,
  featuredEncounters,
} from '../app/data/editorial'
import {
  featureArchive,
  featureForMonth,
  formatFeatureMonth,
  utcMonthKey,
} from '../app/utils/monthlyFeatures'

describe('monthly featured encounters', () => {
  /** Resolved by Vite at collection time, so the test needs no Node types. */
  const socialCards = new Set(
    Object.keys(import.meta.glob('../public/assets/encounters/*.jpg'))
      .map((path) => path.split('/').pop()),
  )

  it('selects only the exact approved UTC month', () => {
    expect(utcMonthKey(new Date('2026-09-30T23:59:59Z'))).toBe('2026-09')
    expect(featureForMonth(featuredEncounters, new Date('2026-09-15T12:00:00Z'))?.id)
      .toBe('2026-09-andromeda')
    expect(featureForMonth(featuredEncounters, new Date('2026-10-01T00:00:00Z')))
      .toBeNull()
  })

  it('keeps only previous approved entries in the newest-first archive', () => {
    expect(featureArchive(featuredEncounters, new Date('2026-09-15T12:00:00Z'))
      .map((feature) => feature.id))
      .toEqual(['2026-08-saturn-cabo'])
    expect(featureArchive(featuredEncounters, new Date('2026-10-01T00:00:00Z'))
      .map((feature) => feature.id))
      .toEqual(['2026-09-andromeda', '2026-08-saturn-cabo'])
  })

  it('references approved curated routes with social cards', () => {
    expect(new Set(featuredEncounters.map((feature) => feature.id)).size)
      .toBe(featuredEncounters.length)
    expect(new Set(featuredEncounters.map((feature) => feature.month)).size)
      .toBe(featuredEncounters.length)

    for (const feature of featuredEncounters) {
      expect(feature.month).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
      expect(feature.reviewState).toBe('approved')
      expect(feature.summary).toMatch(/\.$/)
      const encounter = encountersById[feature.encounterId]
      expect(encounter?.reviewState).toBe('approved')
      expect(socialCards.has(`${encounter?.slug}.jpg`)).toBe(true)
    }
  })

  it('formats editorial months without depending on the local timezone', () => {
    expect(formatFeatureMonth('2026-09')).toBe('September 2026')
  })
})
