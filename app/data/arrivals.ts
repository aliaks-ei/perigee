import type { PerigeeSelection } from '~/types/perigee'

/**
 * Where a fresh visit lands. A visitor who arrives without a link chose
 * nothing, so the sky chooses for them: one of these frames, approached from
 * the object's real distance so the first thing they see is the size change
 * the whole product is about. Shared links and curated routes keep their
 * exact view and never come through here.
 *
 * Nothing here carries hazard copy. A first impression should not open with
 * a warning.
 */
export const arrivalFrames: readonly PerigeeSelection[] = [
  { objectId: 'saturn', presetId: 'moon-swap', viewpointId: 'rooftop' },
  { objectId: 'jupiter', presetId: 'moon-swap', viewpointId: 'lakeside' },
  { objectId: 'moon', presetId: 'half', viewpointId: 'hilltop' },
  { objectId: 'mars', presetId: 'moon-swap', viewpointId: 'cabo-da-roca' },
  { objectId: 'neptune', presetId: 'moon-swap', viewpointId: 'hilltop' },
  { objectId: 'andromeda', presetId: 'quarter-million', viewpointId: 'lakeside' },
]

/** Seconds the approach takes. Long enough to be watched, short enough to be waited out. */
export const ARRIVAL_APPROACH_SECONDS = 4

export function pickArrival(random: () => number = Math.random): PerigeeSelection {
  const index = Math.min(arrivalFrames.length - 1, Math.max(0, Math.floor(random() * arrivalFrames.length)))
  return arrivalFrames[index]!
}
