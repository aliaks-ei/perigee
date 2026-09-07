import type { QualityTier } from '../../../app/types/perigee'

/** Lambert phase function for the Earth illuminated by the Sun, as seen at Moon. */
export function lambertPhase(cosine: number): number {
  const angle = Math.acos(Math.max(-1, Math.min(1, cosine)))
  return (Math.sin(angle) + (Math.PI - angle) * Math.cos(angle)) / Math.PI
}

/** Reflected solar irradiance from Earth relative to direct solar irradiance. */
export function earthshineRatio(sunViewCosine: number, distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 6371) return 0
  return .3 * (6371 / distanceKm) ** 2 * lambertPhase(-sunViewCosine)
}

/** Packed RG16 values interpolate linearly, unlike lossy height/normal images. */
export function decodePackedRG(red: number, green: number): number {
  return (red * 65280 + green * 255) / 65535
}

export function terrainVisibility(pixels: number, tier: QualityTier): number {
  if (!Number.isFinite(pixels) || tier === 'safe') return 0
  const t = Math.max(0, Math.min(1, (pixels - 600) / 900))
  return t * t * (3 - 2 * t)
}

export function terrainSegments(pixels: number, tier: QualityTier): number {
  if (tier === 'safe' || pixels < 600) return 128
  return tier === 'high' && pixels > 1500 ? 512 : 256
}

/** Unit sphere using Three SphereGeometry's longitude convention, north-up map. */
export function planetPoint(u: number, v: number): [number, number, number] {
  const longitude = u * Math.PI * 2
  const latitude = v * Math.PI
  return [-Math.cos(longitude) * Math.sin(latitude), Math.cos(latitude), Math.sin(longitude) * Math.sin(latitude)]
}

/** Geographic to planetocentric latitude on an oblate reference ellipsoid. */
export function planetocentricLatitude(graphic: number, polarRatio: number): number {
  return Math.atan(Math.tan(graphic) * polarRatio ** 2)
}
