/**
 * The cosmic layer is one static tonal centre with no progression, no rhythm,
 * and no melody. Movement comes from timbre and from voices that never line up
 * again, not from notes changing.
 */

/** Root, fifth, octave, octave plus fifth. Open intervals, no third. */
export const DRONE_INTERVALS = [0, 7, 12, 19] as const

/** The sustained bed leans on its lowest voice. */
export const DRONE_WEIGHTS = [1, 0.55, 0.4, 0.22] as const

/** Octave, twelfth, double octave, and a major ninth above that. */
export const SWELL_INTERVALS = [12, 19, 24, 26] as const

export const SWELL_WEIGHTS = [1, 0.72, 0.5, 0.36] as const

/**
 * Coprime cycle lengths, the tape-loop trick behind Music for Airports: the
 * four swells drift apart forever instead of settling into a loop.
 */
export const SWELL_CYCLE_SECONDS = [23, 29, 37, 41] as const

/** Kept under the audio memory budget: one mono buffer, ~960 KB decoded. */
export const REVERB_SECONDS = 5
export const REVERB_PREDELAY_SECONDS = 0.04

/** Fixed taps. They widen the field; they never move across it. */
export const SPREAD_SECONDS = [0.019, 0.031] as const
export const SPREAD_PAN = [-0.75, 0.75] as const

export const COSMOS_DRY_GAIN = 0.7
export const SWELL_CUTOFF_HZ = 1_400
export const SWELL_FLOOR_GAIN = 0.0001

export interface CosmicLayer {
  /** Tonal centre in hertz. Every voice is derived from it. */
  rootHz: number
  droneGain: number
  droneDetuneCents: number
  /** The bed breathes between these two low-pass cutoffs. */
  droneCutoffHz: readonly [number, number]
  swellGain: number
  swellAttackSeconds: readonly [number, number]
  swellReleaseSeconds: readonly [number, number]
  reverbWet: number
  spreadGain: number
}

export function intervalFrequency(rootHz: number, semitones: number): number {
  return rootHz * 2 ** (semitones / 12)
}
