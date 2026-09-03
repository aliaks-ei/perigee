/**
 * The cosmic layer is built on four findings about why music reads as calm or
 * as threatening, because the obvious "space" choices are all horror cues.
 *
 * 1. Predictability. Listeners read unpredictable, slowly morphing sound as
 *    creepy. An endless drone "without change or deliverance" is the standard
 *    dread device. So every entry here lands on a fixed beat grid, every
 *    envelope has the same shape each time, and notes arrive and leave instead
 *    of sustaining forever. Nothing is randomised.
 * 2. Entrainment. A pulse near a resting heart rate, starting at 60 bpm and
 *    easing to 50, gives the listener something to settle onto. This is the
 *    mechanism behind Marconi Union's "Weightless".
 * 3. Consonance. Every pitch is a degree of the major pentatonic, so a minor
 *    second, a tritone and a major seventh are all impossible by construction.
 *    Bare fifths with no third are the ominous voicing; the bed carries a
 *    major tenth so the chord reads as warm.
 * 4. Timbre. Sines and triangles only. Sawtooth is a horror drone timbre, and
 *    detuning voices into audible beating is the same dissonance by other
 *    means.
 */

/**
 * Major pentatonic. Its pairwise intervals are only 2, 3, 4, 5, 7 and 9
 * semitones: the harsh ones cannot occur, whichever voices happen to overlap.
 */
export const PENTATONIC_DEGREES = [0, 2, 4, 7, 9] as const

/** Root, fifth, octave, major tenth. The tenth is what makes the bed warm. */
export const BED_INTERVALS = [0, 7, 12, 16] as const

/** Weighted onto the octave and tenth so the fundamental never dominates. */
export const BED_WEIGHTS = [0.35, 0.45, 1, 0.7] as const

/** Soft harmonics only. Nothing here has the bite of a sawtooth. */
export const BED_TYPES = ['sine', 'sine', 'triangle', 'triangle'] as const

/** Fixed. A slowly sweeping filter on an unsourced drone is a dread cue. */
export const BED_FILTER_Q = 0.5
/** One slow, periodic breath. Periodic, so the listener can predict it. */
export const BED_DRIFT_HZ = 0.011
export const BED_DRIFT_DEPTH = 0.18

/**
 * A major triad spread over two octaves: root, third, fifth, then the same
 * again an octave up. Six voices, entering two beats apart on a fixed cycle.
 */
export const VOICE_INTERVALS = [12, 16, 19, 24, 28, 31] as const
export const VOICE_WEIGHTS = [1, 0.85, 0.72, 0.58, 0.44, 0.32] as const
export const VOICE_CYCLE_BEATS = 48
export const VOICE_OFFSET_BEATS = [0, 8, 16, 24, 32, 40] as const
export const VOICE_ATTACK_BEATS = 6
export const VOICE_RELEASE_BEATS = 18
export const VOICE_FLOOR_GAIN = 0.0001
export const VOICE_CUTOFF_HZ = 2_600

/**
 * The entrainment pulse. It starts at a resting heart rate and eases down
 * over five minutes; the listener's own rhythm follows it rather than the
 * other way round. The envelope is shorter than the beat at both tempos, so
 * each pulse completes before the next begins.
 */
export const PULSE_START_BPM = 60
export const PULSE_END_BPM = 50
export const PULSE_RAMP_SECONDS = 300
export const PULSE_INTERVAL = 12
export const PULSE_ATTACK_SECONDS = 0.25
export const PULSE_RELEASE_SECONDS = 0.6
export const PULSE_FLOOR_GAIN = 0.00005
/** Felt more than heard. A sine this soft has no transient to tick on. */
export const PULSE_CUTOFF_HZ = 900

/** Kept under the audio memory budget: one mono buffer, ~960 KB decoded. */
export const REVERB_SECONDS = 5
export const REVERB_PREDELAY_SECONDS = 0.04
/** Gentler than a real room. The tail is what makes the space feel open. */
export const REVERB_DECAY_POWER = 2.2

/**
 * Fixed taps. They widen the field; they never move across it. Both sit past
 * 80 ms so they read as reflections. Short taps comb-filter the bed instead:
 * a 19 ms tap notches every 53 Hz, straight through the bed fundamentals.
 */
export const SPREAD_SECONDS = [0.087, 0.139] as const
export const SPREAD_PAN = [-0.72, 0.72] as const
/** Reflections come back darker than the direct sound. */
export const SPREAD_LOWPASS_HZ = 1_800

/**
 * One shared tone stage below the master. The high-pass throws away rumble
 * nobody hears; sub-bass content is itself a source of unease. The shelves
 * tilt weight out of the low-mids and give the top a little air.
 */
export const TONE_HIGHPASS_HZ = 45
export const TONE_HIGHPASS_Q = 0.7
export const TONE_LOW_SHELF_HZ = 150
export const TONE_LOW_SHELF_DB = -3
export const TONE_HIGH_SHELF_HZ = 3_200
export const TONE_HIGH_SHELF_DB = 2

export const COSMOS_DRY_GAIN = 0.7

export interface CosmicLayer {
  /** Tonal centre in hertz. Every voice is a pentatonic degree above it. */
  rootHz: number
  bedGain: number
  /** Fixed cutoff. The bed does not sweep. */
  bedCutoffHz: number
  voiceGain: number
  pulseGain: number
  reverbWet: number
  spreadGain: number
}

export function intervalFrequency(rootHz: number, semitones: number): number {
  return rootHz * 2 ** (semitones / 12)
}

/** True when a semitone interval is a degree of the major pentatonic. */
export function isPentatonic(semitones: number): boolean {
  const degree = ((semitones % 12) + 12) % 12
  return (PENTATONIC_DEGREES as readonly number[]).includes(degree)
}

/** Beats per minute at a given number of seconds into the session. */
export function pulseTempoAt(elapsedSeconds: number): number {
  const progress = Math.min(1, Math.max(0, elapsedSeconds / PULSE_RAMP_SECONDS))
  return PULSE_START_BPM + (PULSE_END_BPM - PULSE_START_BPM) * progress
}
