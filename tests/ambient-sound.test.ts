import { describe, expect, it, vi } from 'vitest'
import { resolveAmbientSoundPreference } from '../app/composables/useAmbientSound'
import { AmbientSoundEngine } from '../src/perigee/audio/AmbientSoundEngine'

class FakeAudioParam {
  value = 0
  readonly events: Array<{ method: string, value?: number, time: number }> = []

  setValueAtTime(value: number, time: number): this {
    this.value = value
    this.events.push({ method: 'set', value, time })
    return this
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.value = value
    this.events.push({ method: 'ramp', value, time })
    return this
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    // The engine clamps every exponential target away from zero, so a value
    // that arrives here at or below zero is a bug worth failing on.
    if (value <= 0) throw new Error(`EXPONENTIAL_RAMP_TO_${value}`)
    this.value = value
    this.events.push({ method: 'exp', value, time })
    return this
  }

  cancelScheduledValues(time: number): this {
    this.events.push({ method: 'cancel', time })
    return this
  }
}

class FakeNode {
  readonly disconnect = vi.fn()

  connect<T>(destination: T): T {
    return destination
  }
}

class FakeGain extends FakeNode {
  readonly gain = new FakeAudioParam()
}

class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass'
  readonly frequency = new FakeAudioParam()
  readonly Q = new FakeAudioParam()
  readonly gain = new FakeAudioParam()
}

class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null
  loop = false
  type: OscillatorType = 'sine'
  readonly frequency = new FakeAudioParam()
  readonly detune = new FakeAudioParam()
  readonly start = vi.fn()
  readonly stop = vi.fn()
}

class FakeContext {
  state: AudioContextState = 'suspended'
  currentTime = 4
  sampleRate = 48_000
  readonly destination = new FakeNode()
  readonly gains: FakeGain[] = []
  readonly sources: FakeSource[] = []
  readonly filters: FakeFilter[] = []
  readonly resume = vi.fn(async () => { this.state = 'running' })
  readonly suspend = vi.fn(async () => { this.state = 'suspended' })
  readonly close = vi.fn(async () => { this.state = 'closed' })

  createGain(): GainNode {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain as unknown as GainNode
  }

  createDynamicsCompressor(): DynamicsCompressorNode {
    return Object.assign(new FakeNode(), {
      threshold: new FakeAudioParam(),
      knee: new FakeAudioParam(),
      ratio: new FakeAudioParam(),
      attack: new FakeAudioParam(),
      release: new FakeAudioParam(),
    }) as unknown as DynamicsCompressorNode
  }

  createBuffer(_channels: number, length: number, _sampleRate: number): AudioBuffer {
    return {
      length,
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer
  }

  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeSource()
    this.sources.push(source)
    return source as unknown as AudioBufferSourceNode
  }

  createBiquadFilter(): BiquadFilterNode {
    const filter = new FakeFilter()
    this.filters.push(filter)
    return filter as unknown as BiquadFilterNode
  }

  createOscillator(): OscillatorNode {
    const oscillator = new FakeSource()
    this.sources.push(oscillator)
    return oscillator as unknown as OscillatorNode
  }

  createConvolver(): ConvolverNode {
    return Object.assign(new FakeNode(), {
      normalize: true,
      buffer: null as AudioBuffer | null,
    }) as unknown as ConvolverNode
  }

  createDelay(_maxSeconds: number): DelayNode {
    return Object.assign(new FakeNode(), {
      delayTime: new FakeAudioParam(),
    }) as unknown as DelayNode
  }

  createStereoPanner(): StereoPannerNode {
    return Object.assign(new FakeNode(), {
      pan: new FakeAudioParam(),
    }) as unknown as StereoPannerNode
  }
}

function createHarness() {
  const context = new FakeContext()
  const timers = new Map<number, () => void>()
  let timerId = 0
  const engine = new AmbientSoundEngine({
    createContext: () => context as unknown as AudioContext,
    setTimer: (callback) => {
      timerId += 1
      timers.set(timerId, callback)
      return timerId as unknown as ReturnType<typeof setTimeout>
    },
    clearTimer: (timer) => { timers.delete(timer as unknown as number) },
  })
  return { context, engine, timers }
}

describe('AmbientSoundEngine', () => {
  it('constructs and starts one graph across repeated starts', async () => {
    const { context, engine } = createHarness()
    expect(engine.hasGraph).toBe(false)
    await engine.start()
    await engine.start()
    expect(engine.hasGraph).toBe(true)
    // Three noise beds, four bed voices, six pentatonic voices, the pulse,
    // and four drift oscillators.
    expect(context.sources).toHaveLength(18)
    expect(context.sources.every((source) => source.start.mock.calls.length === 1)).toBe(true)
    expect(context.resume).toHaveBeenCalledTimes(1)
  })

  it('keeps one graph while smoothly retuning the environment for each scene', async () => {
    const { context, engine } = createHarness()
    await engine.start()
    const sourceCount = context.sources.length
    engine.setViewpoint('lakeside')
    engine.setViewpoint('cabo-da-roca')
    expect(context.sources).toHaveLength(sourceCount)
    expect(context.gains.some((gain) => gain.gain.events.some((event) =>
      event.method === 'exp' && event.time === 12,
    ))).toBe(true)
  })

  it('voices the scene root as a warm major bed with soft timbres', async () => {
    const { context, engine } = createHarness()
    await engine.start()

    const [, , , bedRoot, bedFifth, bedOctave, bedTenth] = context.sources
    expect(bedRoot!.frequency.value).toBeCloseTo(98, 2)
    expect(bedFifth!.frequency.value).toBeCloseTo(98 * 2 ** (7 / 12), 2)
    expect(bedOctave!.frequency.value).toBeCloseTo(196, 2)
    // The major tenth is what keeps the chord from reading as a bare fifth.
    expect(bedTenth!.frequency.value).toBeCloseTo(98 * 2 ** (16 / 12), 2)
    for (const oscillator of [bedRoot, bedFifth, bedOctave, bedTenth]) {
      expect(['sine', 'triangle']).toContain(oscillator!.type)
    }
  })

  it('enters the six voices on a fixed grid, never a random one', async () => {
    const first = createHarness()
    const second = createHarness()
    await first.engine.start()
    await second.engine.start()

    const voiceGains = (context: FakeContext) => context.gains.filter((gain) =>
      gain.gain.events.some((event) => event.method === 'set' && event.value === 0.0001))
    const firstVoices = voiceGains(first.context)
    expect(firstVoices).toHaveLength(6)

    const entries: number[] = []
    for (const gain of firstVoices) {
      // Cancelling would truncate an envelope that is already in flight.
      expect(gain.gain.events.some((event) => event.method === 'cancel')).toBe(false)
      const ramps = gain.gain.events.filter((event) => event.method === 'exp').map((event) => event.time)
      expect(ramps.length).toBeGreaterThan(0)
      expect([...ramps].sort((a, b) => a - b)).toEqual(ramps)
      entries.push(ramps[0]!)
    }
    expect(new Set(entries).size).toBe(6)

    // Two engines started at the same clock produce the same performance.
    // Predictability is the point: randomised entries read as watchful.
    expect(voiceGains(second.context).map((gain) => gain.gain.events)).toEqual(
      firstVoices.map((gain) => gain.gain.events),
    )
  })

  it('pulses on a beat that eases from 60 bpm without overlapping itself', async () => {
    const { context, engine } = createHarness()
    await engine.start()

    const [envelope] = context.gains.filter((gain) =>
      gain.gain.events.some((event) => event.method === 'set' && event.value === 0.00005))
    expect(envelope).toBeDefined()
    const times = envelope!.gain.events
      .filter((event) => event.method === 'exp')
      .map((event) => event.time)
    // Out-of-order events would silently flatten the release of every pulse.
    expect([...times].sort((a, b) => a - b)).toEqual(times)

    // Attacks land one beat apart, starting at 60 bpm and stretching after.
    const attacks = times.filter((_, index) => index % 2 === 0)
    expect(attacks.length).toBeGreaterThan(30)
    const firstGap = attacks[1]! - attacks[0]!
    const lastGap = attacks[attacks.length - 1]! - attacks[attacks.length - 2]!
    expect(firstGap).toBeCloseTo(1, 2)
    expect(lastGap).toBeGreaterThan(firstGap)
    expect(lastGap).toBeLessThanOrEqual(60 / 50)
  })

  it('shapes every layer through one tone stage and a slow compressor', async () => {
    const { context, engine } = createHarness()
    await engine.start()
    const types = context.filters.map((filter) => filter.type)
    expect(types.slice(0, 3)).toEqual(['highpass', 'lowshelf', 'highshelf'])
    // Weight out of the low-mids, a little air back on top.
    expect(context.filters[1]!.gain.value).toBeLessThan(0)
    expect(context.filters[2]!.gain.value).toBeGreaterThan(0)
    expect(types.filter((type) => type === 'lowpass').length).toBeGreaterThanOrEqual(2)
  })

  it('ramps gain for start, volume, and stop before suspension', async () => {
    const { context, engine, timers } = createHarness()
    engine.setVolume(2)
    await engine.start()
    const master = context.gains[0]!
    expect(master.gain.events).toContainEqual({ method: 'ramp', value: 0.82, time: 8 })

    engine.setVolume(-1)
    expect(master.gain.events).toContainEqual({ method: 'ramp', value: 0, time: 4.08 })

    const stopped = engine.stop()
    expect(master.gain.events).toContainEqual({ method: 'ramp', value: 0, time: 6.5 })
    expect(context.suspend).not.toHaveBeenCalled()
    for (const callback of timers.values()) callback()
    await stopped
    expect(context.suspend).toHaveBeenCalledTimes(1)
  })

  it('suspends, resumes, and disposes without leaking live sources', async () => {
    const { context, engine } = createHarness()
    await engine.start()
    await engine.suspend()
    await engine.resume()
    engine.dispose()
    engine.dispose()
    expect(context.suspend).toHaveBeenCalledTimes(1)
    expect(context.resume).toHaveBeenCalledTimes(2)
    expect(context.sources.every((source) => source.stop.mock.calls.length === 1)).toBe(true)
    expect(context.close).toHaveBeenCalledTimes(1)
    expect(engine.isDisposed).toBe(true)
    await expect(engine.start()).rejects.toThrow('AMBIENT_SOUND_DISPOSED')
  })
})

describe('ambient sound preference', () => {
  it('accepts only the explicit on value', () => {
    expect(resolveAmbientSoundPreference('on')).toBe(true)
    expect(resolveAmbientSoundPreference('off')).toBe(false)
    expect(resolveAmbientSoundPreference(null)).toBe(false)
    expect(resolveAmbientSoundPreference('yes')).toBe(false)
  })
})
