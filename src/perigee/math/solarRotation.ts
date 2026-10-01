/** Snodgrass & Ulrich (1990), ApJ 351, 309: rounded abstract coefficients.
 * Doppler-feature pattern, 1967–1987; not a unique plasma/sunspot rotation law.
 * https://articles.adsabs.harvard.edu/pdf/1990ApJ...351..309S
 * Latitude from equator; sidereal deg/day; +Y north, right-handed prograde.
 */
export const solarRotation = {
  a: 14.71, b: -2.39, c: -1.78,
  maxReviewDays: 8,
  source: 'https://articles.adsabs.harvard.edu/pdf/1990ApJ...351..309S',
} as const

export function solarRateDegreesPerDay(latitudeRadians: number): number {
  if (!Number.isFinite(latitudeRadians) || Math.abs(latitudeRadians) > Math.PI / 2) {
    throw new Error('INVALID_SOLAR_LATITUDE')
  }
  const s2 = Math.sin(latitudeRadians) ** 2
  return solarRotation.a + solarRotation.b * s2 + solarRotation.c * s2 * s2
}

/** Stop at a finite epoch; never wrap/reset or indefinitely shear a fixed map. */
export function boundedSolarDays(days: number): number {
  if (!Number.isFinite(days)) throw new Error('INVALID_SOLAR_REVIEW_TIME')
  return Math.max(0, Math.min(solarRotation.maxReviewDays, days))
}

export function solarLongitudeRadians(latitudeRadians: number, days: number): number {
  return solarRateDegreesPerDay(latitudeRadians) * boundedSolarDays(days) * Math.PI / 180
}
