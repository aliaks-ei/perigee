const AU_KM = 149_597_870.7
const LY_KM = 9_460_730_472_580.8

/** Bare angular measure, for places that already carry their own label. */
export function formatDegrees(degrees: number): string {
  if (degrees < 0.1) return `${degrees.toFixed(2)}°`
  if (degrees < 100) return `${degrees.toFixed(1)}°`
  return `${Math.round(degrees).toLocaleString('en-US')}°`
}

export function formatAngularDiameter(degrees: number): string {
  return `${formatDegrees(degrees)} across your sky`
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm >= LY_KM * 0.01) {
    const lightYears = distanceKm / LY_KM
    const digits = lightYears < 1 ? 2 : lightYears < 10 ? 1 : 0
    return `${lightYears.toLocaleString('en-US', { maximumFractionDigits: digits })} ly`
  }

  if (distanceKm >= AU_KM * 2) {
    const au = distanceKm / AU_KM
    return `${au.toLocaleString('en-US', { maximumFractionDigits: au < 100 ? 1 : 0 })} AU`
  }

  return `${Math.round(distanceKm).toLocaleString('en-US')} km`
}
