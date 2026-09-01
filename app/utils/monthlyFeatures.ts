import type { FeaturedEncounterDefinition } from '../types/editorial'

export function utcMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Exact-month lookup prevents an old feature from appearing falsely current. */
export function featureForMonth(
  features: readonly FeaturedEncounterDefinition[],
  date: Date,
): FeaturedEncounterDefinition | null {
  const month = utcMonthKey(date)
  return features.find((feature) =>
    feature.month === month && feature.reviewState === 'approved',
  ) ?? null
}

/** Previous approved features only, newest first; future drafts never leak. */
export function featureArchive(
  features: readonly FeaturedEncounterDefinition[],
  date: Date,
): FeaturedEncounterDefinition[] {
  const month = utcMonthKey(date)
  return features
    .filter((feature) => feature.month < month && feature.reviewState === 'approved')
    .toSorted((left, right) => right.month.localeCompare(left.month))
}

export function formatFeatureMonth(month: string): string {
  const [year, numericMonth] = month.split('-').map(Number)
  if (!year || !numericMonth || numericMonth < 1 || numericMonth > 12) return month
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, numericMonth - 1, 1)))
}
