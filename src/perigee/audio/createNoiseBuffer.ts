export type NoiseColour = 'pink' | 'brown'

/** Mulberry32 keeps buffer generation and modulation reproducible by preset. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

export function createNoiseSamples(
  length: number,
  colour: NoiseColour,
  seed: number,
): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.max(0, Math.floor(length)))
  const random = createSeededRandom(seed)
  let brown = 0
  let pinkA = 0
  let pinkB = 0
  let pinkC = 0

  for (let index = 0; index < samples.length; index += 1) {
    const white = random() * 2 - 1
    if (colour === 'brown') {
      brown = (brown + 0.018 * white) / 1.018
      samples[index] = Math.max(-1, Math.min(1, brown * 3.2))
      continue
    }
    // A compact Paul Kellet-style approximation, deliberately darkened again
    // by the engine's low-pass filter.
    pinkA = 0.99765 * pinkA + white * 0.099046
    pinkB = 0.963 * pinkB + white * 0.2965164
    pinkC = 0.57 * pinkC + white * 1.0526913
    samples[index] = Math.max(-1, Math.min(1, (pinkA + pinkB + pinkC + white * 0.1848) * 0.105))
  }
  return samples
}

export function createNoiseBuffer(
  context: BaseAudioContext,
  seconds: number,
  colour: NoiseColour,
  seed: number,
): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(1, length, context.sampleRate)
  buffer.copyToChannel(createNoiseSamples(length, colour, seed), 0)
  return buffer
}
