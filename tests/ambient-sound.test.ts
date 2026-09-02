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
    return new FakeFilter() as unknown as BiquadFilterNode
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
    // Three noise layers, four drone voices, four swell voices.
    expect(context.sources).toHaveLength(11)
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
      event.method === 'ramp' && event.time === 9.5,
    ))).toBe(true)
  })

  it('tunes the cosmic layer from the scene root and never realigns its swells', async () => {
    const { context, engine } = createHarness()
    await engine.start()

    const [, , , droneRoot, droneFifth] = context.sources
    expect(droneRoot!.frequency.value).toBeCloseTo(73.42, 2)
    expect(droneFifth!.frequency.value).toBeCloseTo(73.42 * 2 ** (7 / 12), 2)

    const swellGains = context.gains.filter((gain) => gain.gain.events.some(
      (event) => event.method === 'set' && event.value === 0.0001,
    ))
    expect(swellGains).toHaveLength(4)

    const entries: number[] = []
    for (const gain of swellGains) {
      // Cancelling would truncate an envelope that is already in flight.
      expect(gain.gain.events.some((event) => event.method === 'cancel')).toBe(false)
      const ramps = gain.gain.events.filter((event) => event.method === 'ramp').map((event) => event.time)
      expect(ramps.length).toBeGreaterThan(0)
      expect([...ramps].sort((a, b) => a - b)).toEqual(ramps)
      entries.push(ramps[0]!)
    }
    expect(new Set(entries).size).toBe(4)
  })

  it('ramps gain for start, volume, and stop before suspension', async () => {
    const { context, engine, timers } = createHarness()
    engine.setVolume(2)
    await engine.start()
    const master = context.gains[0]!
    expect(master.gain.events).toContainEqual({ method: 'ramp', value: 0.82, time: 5.5 })

    engine.setVolume(-1)
    expect(master.gain.events).toContainEqual({ method: 'ramp', value: 0, time: 4.08 })

    const stopped = engine.stop()
    expect(master.gain.events).toContainEqual({ method: 'ramp', value: 0, time: 4.3 })
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
