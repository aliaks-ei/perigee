import { describe, expect, it, vi } from 'vitest'
import {
  hasAmbientSoundDecision,
  resolveAmbientSoundPreference,
} from '../app/composables/useAmbientSound'
import { AmbientSoundEngine } from '../src/perigee/audio/AmbientSoundEngine'
import { AudioLoader } from '../src/perigee/audio/AudioLoader'
import { ambientTracks } from '../src/perigee/audio/AudioManifest'

class FakeAudioParam {
  value = 0
  readonly events: Array<{ method: string, value?: number, time: number }> = []
  readonly curves: Array<{ curve: number[], time: number, duration: number }> = []

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
    // An exponential ramp is undefined at zero, so a target at or below it is
    // a bug worth failing on rather than a silent no-op.
    if (value <= 0) throw new Error(`EXPONENTIAL_RAMP_TO_${value}`)
    this.value = value
    this.events.push({ method: 'exp', value, time })
    return this
  }

  setValueCurveAtTime(curve: Float32Array, time: number, duration: number): this {
    // The real parameter throws when a curve overlaps another automation
    // event, which is the failure mode a retired-mid-fade deck would hit.
    const overlapping = this.events.some((event) =>
      event.method !== 'cancel' && event.time > time && event.time < time + duration)
    if (overlapping) throw new Error('CURVE_OVERLAPS_AUTOMATION')
    this.value = curve.at(-1) ?? this.value
    this.curves.push({ curve: Array.from(curve), time, duration })
    this.events.push({ method: 'curve', value: curve.at(-1), time })
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

class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null
  loop = false
  loopStart = 0
  loopEnd = 0
  started: Array<{ when: number, offset?: number }> = []
  stopped: number[] = []

  start(when = 0, offset?: number): void {
    this.started.push({ when, offset })
  }

  stop(when = 0): void {
    this.stopped.push(when)
  }
}

interface FakeContextOptions {
  /** URLs that reject instead of decoding, to exercise the failure paths. */
  missing?: string[]
}

class FakeContext {
  state: AudioContextState = 'suspended'
  currentTime = 0
  readonly destination = new FakeNode()
  readonly gains: FakeGain[] = []
  readonly sources: FakeSource[] = []
  readonly decoded: string[] = []
  readonly listeners: Array<() => void> = []
  readonly close = vi.fn(async () => undefined)

  constructor(private readonly options: FakeContextOptions = {}) {}

  createGain(): FakeGain {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }

  createBufferSource(): FakeSource {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }

  async decodeAudioData(bytes: ArrayBuffer): Promise<AudioBuffer> {
    const url = new TextDecoder().decode(bytes)
    this.decoded.push(url)
    return { duration: 114, length: 1, numberOfChannels: 2, sampleRate: 44_100 } as AudioBuffer
  }

  addEventListener(_type: string, listener: () => void): void {
    this.listeners.push(listener)
  }

  async resume(): Promise<void> {
    this.state = 'running'
  }

  async suspend(): Promise<void> {
    this.state = 'suspended'
  }

  fetchBytes = async (url: string): Promise<ArrayBuffer> => {
    if (this.options.missing?.includes(url)) throw new Error('AMBIENT_ASSET_UNAVAILABLE')
    return new TextEncoder().encode(url).buffer as ArrayBuffer
  }
}

/** The gain a scheduled value curve holds at a given context time. */
function envelopeAt(
  entry: { curve: number[], time: number, duration: number },
  time: number,
): number {
  if (time <= entry.time) return entry.curve[0]!
  if (time >= entry.time + entry.duration) return entry.curve.at(-1)!
  const progress = (time - entry.time) / entry.duration
  return entry.curve[Math.round(progress * (entry.curve.length - 1))]!
}

function createEngine(options: FakeContextOptions = {}) {
  const context = new FakeContext(options)
  const timers: Array<{ callback: () => void, delayMs: number }> = []
  const engine = new AmbientSoundEngine({
    createContext: () => context as unknown as AudioContext,
    fetchBytes: context.fetchBytes,
    setTimer: (callback, delayMs) => {
      timers.push({ callback, delayMs })
      return timers.length as unknown as ReturnType<typeof setTimeout>
    },
    clearTimer: () => undefined,
  })
  /** Runs every timer scheduled so far, the way the wall clock eventually does. */
  const flushTimers = (): void => {
    const pending = timers.splice(0)
    for (const timer of pending) timer.callback()
  }
  return { engine, context, timers, flushTimers }
}

describe('AmbientSoundEngine', () => {
  it('builds one graph and plays the starting viewpoint on a loop', async () => {
    const { engine, context } = createEngine()
    await engine.start()

    expect(engine.hasGraph).toBe(true)
    expect(context.state).toBe('running')
    expect(context.decoded).toEqual([ambientTracks.rooftop.url])
    expect(engine.playingUrl).toBe(ambientTracks.rooftop.url)

    const [source] = context.sources
    expect(source?.loop).toBe(true)
    // Looping strictly inside both ends, because not every MP3 decoder trims
    // the encoder's priming and padding and the silence lands on the seam.
    expect(source?.loopStart).toBeGreaterThan(0)
    expect(source?.loopEnd).toBeLessThan(114)
    expect(source?.started[0]?.offset).toBe(source?.loopStart)
  })

  it('reuses the one context and the one master across repeated starts', async () => {
    const { engine, context } = createEngine()
    await engine.start()
    const gains = context.gains.length
    await engine.start()
    // The second start adds nothing: the track is already the current one.
    expect(context.gains.length).toBe(gains)
    expect(context.sources.length).toBe(1)
  })

  it('never schedules a second curve on a parameter that already carries one', async () => {
    const { engine, context } = createEngine()
    await engine.start()
    // Two changes inside one crossfade: the first deck is retired while it is
    // still arriving. A curve laid over a running curve throws, which is why
    // the rise and the fall are separate nodes.
    engine.setViewpoint('hilltop')
    await vi.waitFor(() => expect(context.sources.length).toBe(2))
    engine.setViewpoint('lakeside')
    await vi.waitFor(() => expect(context.sources.length).toBe(3))

    for (const gain of context.gains) expect(gain.gain.curves.length).toBeLessThanOrEqual(1)
  })

  it('crossfades to the new viewpoint and stops the outgoing track', async () => {
    const { engine, context, flushTimers } = createEngine()
    await engine.start()
    const outgoing = context.sources[0]!

    engine.setViewpoint('lakeside')
    await vi.waitFor(() => expect(context.sources.length).toBe(2))

    expect(engine.playingUrl).toBe(ambientTracks.lakeside.url)
    const incoming = context.sources[1]!
    expect(incoming.buffer).not.toBeNull()
    expect(outgoing.stopped.length).toBe(1)
    expect(outgoing.stopped[0]).toBeGreaterThan(2.5)

    flushTimers()
    expect(outgoing.disconnect).toHaveBeenCalled()
  })

  it('hands one piece over to the next instead of playing both at once', async () => {
    const { engine, context } = createEngine()
    await engine.start()

    engine.setViewpoint('lakeside')
    await vi.waitFor(() => expect(context.sources.length).toBe(2))

    const curves = context.gains.flatMap((gain) => gain.gain.curves)
    const out = curves.filter((entry) => entry.curve.at(0)! > entry.curve.at(-1)!).at(-1)!
    const into = curves.filter((entry) => entry.curve.at(0)! < entry.curve.at(-1)!).at(-1)!
    expect(out.curve.at(0)).toBeCloseTo(1)
    expect(out.curve.at(-1)).toBeCloseTo(0)
    expect(into.curve.at(0)).toBeCloseTo(0)
    expect(into.curve.at(-1)).toBeCloseTo(1)
    // The incoming piece waits out most of the outgoing one.
    expect(into.time).toBeGreaterThan(out.time)
    expect(into.time).toBeLessThan(out.time + out.duration)

    let loudest = 0
    let quiet = 0
    for (let time = 0; time <= 8; time += 0.02) {
      const leaving = envelopeAt(out, time)
      const arriving = envelopeAt(into, time)
      // Neither piece may be prominent while the other still is. Two felt
      // pianos playing different melodies at 1/√2 each is a pile-up, however
      // correct the power sum is.
      loudest = Math.max(loudest, Math.min(leaving, arriving))
      if (Math.hypot(leaving, arriving) < 0.25) quiet += 0.02
    }
    expect(loudest).toBeLessThan(0.25)
    // The handover still has to be a breath, not the hole an exponential
    // crossfade used to leave in the middle of every viewpoint change.
    expect(quiet).toBeLessThan(1)
  })

  it('joins the new track where the old one had got to, past the loop join', async () => {
    const { engine, context } = createEngine()
    await engine.start()
    const loopStart = context.sources[0]!.loopStart

    // Two minutes into the session, and the loop body is shorter than that, so
    // the position has already wrapped once.
    context.currentTime = 130
    engine.setViewpoint('hilltop')
    await vi.waitFor(() => expect(context.sources.length).toBe(2))

    // The incoming piece is scheduled ahead of the clock, and joins the music
    // at the position it will have reached by the time it is actually heard.
    const arrival = context.sources[1]!.started[0]!.when
    expect(arrival).toBeGreaterThan(130)
    const body = context.sources[1]!.loopEnd - loopStart
    expect(context.sources[1]?.started[0]?.offset).toBeCloseTo(loopStart + (arrival % body))
  })

  it('drops the previous track from the cache once its crossfade is over', async () => {
    const { engine, context, flushTimers } = createEngine()
    await engine.start()
    engine.setViewpoint('hilltop')
    await vi.waitFor(() => expect(context.sources.length).toBe(2))

    flushTimers()
    // Decoded audio is ~40 MB a track. Going back re-decodes rather than
    // holding all four viewpoints in memory at once.
    engine.setViewpoint('rooftop')
    await vi.waitFor(() => expect(context.decoded.length).toBe(3))
    expect(context.decoded).toEqual([
      ambientTracks.rooftop.url,
      ambientTracks.hilltop.url,
      ambientTracks.rooftop.url,
    ])
  })

  it('keeps the current track playing when the next one cannot be fetched', async () => {
    const { engine, context } = createEngine({ missing: [ambientTracks.hilltop.url] })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await engine.start()

    engine.setViewpoint('hilltop')
    await vi.waitFor(() => expect(warn).toHaveBeenCalled())

    expect(engine.playingUrl).toBe(ambientTracks.rooftop.url)
    expect(context.sources[0]?.stopped.length).toBe(0)
    warn.mockRestore()
  })

  it('lets a second viewpoint change supersede one that is still loading', async () => {
    const { engine, context } = createEngine()
    await engine.start()

    engine.setViewpoint('hilltop')
    engine.setViewpoint('cabo-da-roca')
    await vi.waitFor(() => expect(engine.playingUrl).toBe(ambientTracks['cabo-da-roca'].url))

    // Both were fetched, but only the last one was ever wired into the graph.
    expect(context.decoded).toHaveLength(3)
    expect(context.sources).toHaveLength(2)
  })

  it('ramps the master for start, volume and stop before suspending', async () => {
    const { engine, context, flushTimers } = createEngine()
    engine.setVolume(0.5)
    await engine.start()
    const master = context.gains[0]!

    engine.setVolume(0.8)
    const stopped = engine.stop()
    flushTimers()
    await stopped

    const ramps = master.gain.events.filter((event) => event.method === 'ramp')
    expect(ramps.at(0)?.value).toBeCloseTo(0.5 * 0.85)
    expect(ramps.at(-2)?.value).toBeCloseTo(0.8 * 0.85)
    expect(ramps.at(-1)?.value).toBe(0)
    expect(context.state).toBe('suspended')
  })

  it('resumes an interrupted context on its own', async () => {
    const { engine, context } = createEngine()
    await engine.start()

    // iOS drops a running context into 'interrupted' for a call or for Siri
    // and never comes back from it unaided.
    context.state = 'interrupted' as AudioContextState
    context.listeners.forEach((listener) => listener())
    await vi.waitFor(() => expect(context.state).toBe('running'))
  })

  it('stops every source and closes the context on dispose', async () => {
    const { engine, context } = createEngine()
    await engine.start()
    engine.dispose()

    expect(engine.isDisposed).toBe(true)
    expect(context.sources.every((source) => source.stopped.length > 0)).toBe(true)
    expect(context.close).toHaveBeenCalled()
    await expect(engine.start()).rejects.toThrow('AMBIENT_SOUND_DISPOSED')
  })
})

describe('AudioLoader', () => {
  function createLoader(missing: string[] = []) {
    const context = new FakeContext({ missing })
    const fetchBytes = vi.fn(context.fetchBytes)
    const loader = new AudioLoader({ context: context as unknown as AudioContext, fetchBytes })
    return { loader, context, fetchBytes }
  }

  it('decodes each track once and hands the same buffer back', async () => {
    const { loader, fetchBytes } = createLoader()
    const [first, second] = await Promise.all([loader.load('/a.mp3'), loader.load('/a.mp3')])
    expect(first).toBe(second)
    expect(fetchBytes).toHaveBeenCalledTimes(1)
    expect(loader.has('/a.mp3')).toBe(true)
  })

  it('evicts a failed load so a retry can succeed', async () => {
    const { loader, fetchBytes } = createLoader(['/a.mp3'])
    await expect(loader.load('/a.mp3')).rejects.toThrow()
    expect(loader.has('/a.mp3')).toBe(false)
    await expect(loader.load('/a.mp3')).rejects.toThrow()
    expect(fetchBytes).toHaveBeenCalledTimes(2)
  })

  it('forgets a released track', async () => {
    const { loader } = createLoader()
    await loader.load('/a.mp3')
    loader.release('/a.mp3')
    expect(loader.has('/a.mp3')).toBe(false)
  })
})

describe('ambient sound preference', () => {
  it('accepts only the explicit on value', () => {
    expect(resolveAmbientSoundPreference('on')).toBe(true)
    expect(resolveAmbientSoundPreference('off')).toBe(false)
    expect(resolveAmbientSoundPreference(null)).toBe(false)
    expect(resolveAmbientSoundPreference('true')).toBe(false)
  })

  it('treats only on and off as an answer, so everyone else is still asked', () => {
    expect(hasAmbientSoundDecision('on')).toBe(true)
    expect(hasAmbientSoundDecision('off')).toBe(true)
    expect(hasAmbientSoundDecision(null)).toBe(false)
    expect(hasAmbientSoundDecision('')).toBe(false)
  })
})
