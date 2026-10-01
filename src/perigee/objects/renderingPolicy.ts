import type { SkyObjectId } from '../../../app/types/perigee'

/** Code-only review and rollback selector. Production defaults live below. */
export interface RenderingReview {
  sun?: 'portrait' | 'globe-pilot' | 'globe-differential'
  /** Bounded review epochs, not observation dates or public motion controls. */
  solarDays?: number
  solarEvolutionDays?: number
  moon?: 'portrait' | 'globe-pilot'
  jupiter?: 'portrait' | 'globe-pilot'
  saturn?: 'portrait' | 'globe-pilot' | 'globe-motion'
  mars?: 'portrait' | 'globe-pilot' | 'globe-motion'
  neptune?: 'portrait' | 'globe-pilot' | 'globe-motion'
  betelgeuse?: 'portrait' | 'globe-pilot'
  sirius?: 'portrait' | 'globe-pilot'
  rigel?: 'portrait' | 'globe-pilot'
  longitudeDegrees?: number
}
export const renderingPolicy: Record<SkyObjectId, { renderer: 'portrait' | 'globe', target: string, accepted: boolean }> = {
  moon: { renderer: 'globe', target: 'regolith', accepted: true },
  mars: { renderer: 'globe', target: 'rocky-globe', accepted: true },
  jupiter: { renderer: 'globe', target: 'globe', accepted: true },
  saturn: { renderer: 'globe', target: 'globe-and-rings', accepted: true },
  neptune: { renderer: 'globe', target: 'cloud-globe', accepted: true },
  sun: { renderer: 'globe', target: 'differential-stellar', accepted: true },
  betelgeuse: { renderer: 'globe', target: 'convective-stellar', accepted: true },
  sirius: { renderer: 'globe', target: 'emissive-stellar', accepted: true },
  rigel: { renderer: 'globe', target: 'emissive-stellar', accepted: true },
  andromeda: { renderer: 'portrait', target: 'portrait', accepted: false },
}
export function rendererFor(id: SkyObjectId, review: RenderingReview): 'portrait' | 'globe' {
  if (id === 'sun' && review.sun) return review.sun === 'portrait' ? 'portrait' : 'globe'
  if (id === 'moon' && review.moon) return review.moon === 'portrait' ? 'portrait' : 'globe'
  if (id === 'jupiter' && review.jupiter) return review.jupiter === 'portrait' ? 'portrait' : 'globe'
  if (id === 'saturn' && review.saturn) return review.saturn === 'portrait' ? 'portrait' : 'globe'
  if (id === 'mars' && review.mars) return review.mars === 'portrait' ? 'portrait' : 'globe'
  if (id === 'neptune' && review.neptune) return review.neptune === 'portrait' ? 'portrait' : 'globe'
  if (id === 'betelgeuse' && review.betelgeuse) return review.betelgeuse === 'portrait' ? 'portrait' : 'globe'
  if (id === 'sirius' && review.sirius) return review.sirius === 'portrait' ? 'portrait' : 'globe'
  if (id === 'rigel' && review.rigel) return review.rigel === 'portrait' ? 'portrait' : 'globe'
  return renderingPolicy[id].renderer
}

/** Approved shot calibration. These are authored coordinates, not ephemerides. */
export const jupiterReference = {
  initialPhaseRadians: -.24,
  sunDirection: [.85, -.12, 1] as const,
}

/** NASA/JPL/SSI PIA07782, native planetocentric global map, December 2000. */
export const jupiterGlobeMap = '/assets/objects/jupiter-cassini-pia07782.jpg'

/** User-approved shot, not an ephemeris. The rings and pole never inherit longitude. */
export const saturnReference = {
  initialPhaseRadians: .38,
  polePitch: .54,
  poleRoll: -.16,
  sunDirection: [-1.5, .35, 1] as const,
}

export const saturnGlobeMap = '/assets/objects/saturn-observational-composite-v1.webp'

/** User-approved shot: east-positive Viking map, north along local +Y; no ephemeris. */
export const marsReference = {
  initialPhaseRadians: -.25,
  polePitch: .4,
  poleRoll: -.18,
  sunDirection: [-.65, .2, 1] as const,
}

export const marsGlobeSource = {
  version: 'mars-observational-v3', width: 23040,
  baseUrl: '/assets/objects/planets/mars-observational-v3',
}

/** User-approved review-v9 shot, not an ephemeris or measured astronomical pole. */
export const neptuneReference = {
  initialPhaseRadians: -Math.PI / 2 + .02,
  polePitch: .14,
  poleRoll: -.08,
  sunDirection: [-.9, .2, 1.2] as const,
}
export const neptuneGlobeMap = '/assets/objects/neptune-voyager-reconstruction-v4.webp'

/** User-approved synthetic convection artwork; not a measured stellar surface map. */
export const betelgeuseGlobeMap = '/assets/objects/betelgeuse-convection-v1.webp'

/** User-approved synthetic artwork; no resolved global Sirius A observation exists. */
export const siriusGlobeMap = '/assets/objects/sirius-granulation-review-v1.webp'

/** Original synthetic review art; no observational pixels, disc, limb or sky. */
export const sunGlobeMap = '/assets/objects/sun-granulation-review-v1.webp'
/** Same synthetic field in orthographic patches, avoiding polar UV singularities. */
export const sunPolarMap = '/assets/objects/sun-poles-review-v1.webp'

/** User-approved original synthetic mottling; no measured photospheric map. */
export const rigelGlobeMap = '/assets/objects/rigel-mottling-review-v1.webp'
export const rigelPolarMap = '/assets/objects/rigel-poles-review-v1.webp'

/** Earth-facing near side. Authored fixed shot, not a dated lunar ephemeris.
 * Longitude is a deterministic review offset only; no public free spin. */
export const moonReference = {
  initialPhaseRadians: -Math.PI / 2 + .04,
  polePitch: .23,
  poleRoll: -.02,
  sunDirection: [.42, -.15, 1] as const,
}
