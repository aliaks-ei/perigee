import type { SkyObjectId } from '../types/perigee'
import type { RotationModel } from '../../src/perigee/math/rotation'

/** Presentation speed affects only body spin, never the sky or surface evolution. */
export const rotationSpeeds = { real: 1, cinematic: 120 } as const

export interface ObjectMotion extends RotationModel {
  policy: 'bulk' | 'earth-facing' | 'differential' | 'disabled'
  referenceFrame: 'approximate-sidereal' | 'earth-observer' | 'unreviewed'
  confidence: 'sourced-approximation' | 'unknown'
  source: string | null
  pole: 'authored-shot-unmeasured'
}
const unknown: ObjectMotion = {
  periodSeconds: null, direction: 'prograde', initialPhaseRadians: 0,
  policy: 'disabled', referenceFrame: 'unreviewed', confidence: 'unknown',
  source: null, pole: 'authored-shot-unmeasured',
}

/** Deliberately independent of legacy rotationPeriodHours, whose stellar values are unaudited. */
export const objectMotion: Record<SkyObjectId, ObjectMotion> = {
  // 655.720 h is the inertial sidereal rotation, distinct from the 29.53 d
  // synodic phase cycle. In this fixed Earth-observer shot their synchronous
  // relationship is represented by no observer-relative spin, not no rotation.
  moon: { ...unknown, policy: 'earth-facing', referenceFrame: 'earth-observer',
    confidence: 'sourced-approximation',
    source: 'https://science.nasa.gov/moon/tidal-locking/' },
  // Sidereal solid-body period, not the 24.6597-hour solar day. The approved
  // globe rotates automatically; portrait rollback has no spin frame.
  mars: { ...unknown, periodSeconds: 24.6229 * 3600, policy: 'bulk',
    referenceFrame: 'approximate-sidereal', confidence: 'sourced-approximation',
    source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' },
  jupiter: { ...unknown, periodSeconds: 9.9 * 3600, policy: 'bulk',
    referenceFrame: 'approximate-sidereal', confidence: 'sourced-approximation',
    source: 'https://science.nasa.gov/jupiter/jupiter-facts/' },
  // Cassini ring seismology estimates the interior period. Advecting the entire
  // cloud map at this rate is a bulk approximation, not differential weather.
  saturn: { ...unknown, periodSeconds: 10 * 3600 + 33 * 60 + 38, policy: 'bulk',
    referenceFrame: 'approximate-sidereal', confidence: 'sourced-approximation',
    source: 'https://science.nasa.gov/solar-system/scientists-finally-know-what-time-it-is-on-saturn/' },
  // Voyager magnetic-coordinate period, not a common period for every cloud.
  // Approved globe: automatic 120x bulk approximation; rollback has no spin frame.
  neptune: { ...unknown, periodSeconds: 16.11 * 3600, policy: 'bulk',
    referenceFrame: 'approximate-sidereal', confidence: 'sourced-approximation',
    source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html' },
  sun: { ...unknown, policy: 'differential', source: 'https://science.nasa.gov/sun/facts/' },
  betelgeuse: { ...unknown },
  sirius: { ...unknown },
  rigel: { ...unknown },
  andromeda: { ...unknown },
}
