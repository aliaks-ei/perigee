import { createSeededRandom } from './createNoiseBuffer'

/**
 * The sense of space in the cosmic layer comes almost entirely from a long
 * tail. Generating the impulse in memory keeps that tail free of any network
 * request, asset licence, or transfer budget.
 */
export function createImpulseSamples(
  length: number,
  decayPower: number,
  seed: number,
): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.max(0, Math.floor(length)))
  const random = createSeededRandom(seed)
  let low = 0

  for (let index = 0; index < samples.length; index += 1) {
    const progress = index / samples.length
    // A large space absorbs high frequencies as the tail decays, so the
    // one-pole filter closes while the envelope falls.
    const coefficient = 0.34 - 0.29 * progress
    low += coefficient * (random() * 2 - 1 - low)
    samples[index] = low * (1 - progress) ** decayPower
  }
  return samples
}

/**
 * Mono on purpose. Width comes from the fixed left and right taps in the
 * engine, which keeps the decoded buffer inside the audio memory budget and
 * avoids any automatic stereo movement.
 */
export function createReverbImpulse(
  context: BaseAudioContext,
  seconds: number,
  seed: number,
  decayPower = 2.6,
): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  buffer.copyToChannel(createImpulseSamples(length, decayPower, seed), 0)
  return buffer
}
