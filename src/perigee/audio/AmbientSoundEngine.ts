import {
  COSMOS_DRY_GAIN,
  DRONE_INTERVALS,
  DRONE_WEIGHTS,
  intervalFrequency,
  REVERB_PREDELAY_SECONDS,
  REVERB_SECONDS,
  SPREAD_PAN,
  SPREAD_SECONDS,
  SWELL_CUTOFF_HZ,
  SWELL_CYCLE_SECONDS,
  SWELL_FLOOR_GAIN,
  SWELL_INTERVALS,
  SWELL_WEIGHTS,
} from './cosmos'
import { createNoiseBuffer, createSeededRandom } from './createNoiseBuffer'
import { createReverbImpulse } from './createReverbImpulse'
import type { ViewpointId } from '../../../app/types/perigee'
import {
  ambientSoundPresets,
  type AmbientSoundPreset,
} from './presets'
import { resolveSceneSoundscape } from './soundscapes'

const FADE_IN_SECONDS = 1.5
const FADE_OUT_SECONDS = 0.3
const NOISE_BUFFER_SECONDS = 4
const SCHEDULE_HORIZON_SECONDS = 58
const SCENE_TRANSITION_SECONDS = 5.5

interface AmbientSoundEngineOptions {
  initialViewpointId?: ViewpointId
  /** Keeps the three Cabo review directions available through ?ambience=. */
  preset?: AmbientSoundPreset
  createContext?: () => AudioContext
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

function nativeAudioContext(): AudioContext {
  const Context = window.AudioContext ?? (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!Context) throw new Error('WEB_AUDIO_UNAVAILABLE')
  return new Context()
}

function valueInRange(random: () => number, range: readonly [number, number]): number {
  return range[0] + random() * (range[1] - range[0])
}

function ramp(param: AudioParam, value: number, time: number): void {
  param.linearRampToValueAtTime(value, time)
}

export class AmbientSoundEngine {
  private readonly caboPreset: AmbientSoundPreset
  private readonly createContext: () => AudioContext
  private readonly setTimer: NonNullable<AmbientSoundEngineOptions['setTimer']>
  private readonly clearTimer: NonNullable<AmbientSoundEngineOptions['clearTimer']>
  private random: () => number
  private viewpointId: ViewpointId
  private preset: AmbientSoundPreset
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private windBodyFilter: BiquadFilterNode | null = null
  private windBodyGain: GainNode | null = null
  private windAirFilter: BiquadFilterNode | null = null
  private windAirGain: GainNode | null = null
  private surfFilter: BiquadFilterNode | null = null
  private surfGain: GainNode | null = null
  private droneBus: GainNode | null = null
  private droneFilter: BiquadFilterNode | null = null
  private droneOscillators: OscillatorNode[] = []
  private swellBus: GainNode | null = null
  private swellOscillators: OscillatorNode[] = []
  private swellGains: GainNode[] = []
  /** Context time of each swell voice's next entry, so cycles never restart. */
  private swellNextTime: number[] = []
  private reverbWetGain: GainNode | null = null
  private spreadGains: GainNode[] = []
  private sources: AudioScheduledSourceNode[] = []
  private nodes: AudioNode[] = []
  private modulationTimer: ReturnType<typeof setTimeout> | null = null
  private stopTimer: ReturnType<typeof setTimeout> | null = null
  private stopResolver: (() => void) | null = null
  private volume = 0.35
  private graphStarted = false
  private audible = false
  private disposed = false
  private operation = 0

  constructor(options: AmbientSoundEngineOptions = {}) {
    this.caboPreset = options.preset ?? ambientSoundPresets['cinematic-natural']
    this.viewpointId = options.initialViewpointId ?? 'rooftop'
    this.preset = resolveSceneSoundscape(this.viewpointId, this.caboPreset)
    this.createContext = options.createContext ?? nativeAudioContext
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer))
    this.random = createSeededRandom(this.preset.seed ^ 0xa53c9e)
  }

  get hasGraph(): boolean {
    return this.context !== null
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  async start(): Promise<void> {
    this.assertUsable()
    const operation = ++this.operation
    this.cancelPendingStop()
    this.ensureGraph()
    const context = this.context!
    if (context.state !== 'running') await context.resume()
    if (operation !== this.operation || this.disposed) return
    this.audible = true
    this.scheduleModulation()
    const now = context.currentTime
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setValueAtTime(this.master!.gain.value, now)
    ramp(this.master!.gain, this.volume * this.preset.masterGain, now + FADE_IN_SECONDS)
  }

  setViewpoint(viewpointId: ViewpointId): void {
    if (viewpointId === this.viewpointId || this.disposed) return
    this.viewpointId = viewpointId
    this.preset = resolveSceneSoundscape(viewpointId, this.caboPreset)
    this.random = createSeededRandom(this.preset.seed ^ 0xa53c9e)
    if (!this.context || !this.graphStarted) return

    this.clearModulation()
    this.transitionEnvironment(this.preset, SCENE_TRANSITION_SECONDS)
    if (this.audible) {
      this.modulationTimer = this.setTimer(
        () => this.scheduleModulation(),
        SCENE_TRANSITION_SECONDS * 1_000,
      )
    }
  }

  async stop(): Promise<void> {
    if (!this.context || !this.master || this.disposed) return
    const operation = ++this.operation
    this.audible = false
    this.clearModulation()
    this.cancelPendingStop()
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    ramp(this.master.gain, 0, now + FADE_OUT_SECONDS)

    await new Promise<void>((resolve) => {
      this.stopResolver = resolve
      this.stopTimer = this.setTimer(() => {
        this.stopTimer = null
        this.stopResolver = null
        if (operation !== this.operation || this.disposed) {
          resolve()
          return
        }
        void this.context?.suspend().catch(() => undefined).finally(resolve)
      }, FADE_OUT_SECONDS * 1_000)
    })
  }

  async suspend(): Promise<void> {
    if (!this.context || this.disposed) return
    ++this.operation
    this.clearModulation()
    await this.context.suspend()
  }

  async resume(): Promise<void> {
    this.assertUsable()
    if (!this.context || !this.graphStarted) return
    ++this.operation
    this.cancelPendingStop()
    await this.context.resume()
    this.audible = true
    this.scheduleModulation()
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value))
    if (!this.context || !this.master || !this.audible || this.disposed) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    ramp(this.master.gain, this.volume * this.preset.masterGain, now + 0.08)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    ++this.operation
    this.clearModulation()
    this.cancelPendingStop()
    for (const source of this.sources) {
      try { source.stop() } catch { /* A source may already have stopped. */ }
    }
    for (const node of this.nodes) {
      try { node.disconnect() } catch { /* Disconnection is best-effort on unload. */ }
    }
    void this.context?.close().catch(() => undefined)
    this.sources = []
    this.nodes = []
    this.droneOscillators = []
    this.swellOscillators = []
    this.swellGains = []
    this.swellNextTime = []
    this.spreadGains = []
    this.context = null
    this.master = null
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error('AMBIENT_SOUND_DISPOSED')
  }

  private ensureGraph(): void {
    if (this.context) return
    const context = this.createContext()
    this.context = context

    const master = context.createGain()
    master.gain.setValueAtTime(0, context.currentTime)
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-24, context.currentTime)
    compressor.knee.setValueAtTime(18, context.currentTime)
    compressor.ratio.setValueAtTime(4, context.currentTime)
    compressor.attack.setValueAtTime(0.08, context.currentTime)
    compressor.release.setValueAtTime(0.42, context.currentTime)
    master.connect(compressor).connect(context.destination)
    this.master = master
    this.nodes.push(master, compressor)

    const windBuffer = createNoiseBuffer(context, NOISE_BUFFER_SECONDS, 'pink', this.preset.seed)
    const surfBuffer = createNoiseBuffer(context, NOISE_BUFFER_SECONDS, 'brown', this.preset.seed ^ 0x912f4b)
    const body = this.createNoiseLayer(windBuffer, 'lowpass', this.preset.windBody.cutoffHz, 0.7)
    body.gain.gain.setValueAtTime(this.preset.windBody.gain, context.currentTime)
    body.gain.connect(master)
    this.windBodyFilter = body.filter
    this.windBodyGain = body.gain

    const air = this.createNoiseLayer(windBuffer, 'bandpass', this.preset.windAir.centerHz, this.preset.windAir.q)
    air.gain.gain.setValueAtTime(0.001, context.currentTime)
    air.gain.connect(master)
    this.windAirGain = air.gain
    this.windAirFilter = air.filter

    const surf = this.createNoiseLayer(surfBuffer, 'lowpass', this.preset.surf.cutoffHz, 0.65)
    surf.gain.gain.setValueAtTime(0.001, context.currentTime)
    surf.gain.connect(master)
    this.surfGain = surf.gain
    this.surfFilter = surf.filter

    this.createCosmicLayer()

    for (const source of [body.source, air.source, surf.source]) source.start()
    this.graphStarted = true
  }

  /**
   * One static tonal centre: a sustained bed of open intervals, four swell
   * voices on coprime cycles, and a generated reverb that supplies the space.
   */
  private createCosmicLayer(): void {
    const context = this.context!
    const master = this.master!
    const layer = this.preset.cosmos
    const now = context.currentTime

    const cosmos = context.createGain()
    cosmos.gain.setValueAtTime(1, now)
    this.nodes.push(cosmos)

    const dry = context.createGain()
    dry.gain.setValueAtTime(COSMOS_DRY_GAIN, now)
    cosmos.connect(dry).connect(master)
    this.nodes.push(dry)

    const predelay = context.createDelay(1)
    predelay.delayTime.setValueAtTime(REVERB_PREDELAY_SECONDS, now)
    const convolver = context.createConvolver()
    convolver.normalize = true
    convolver.buffer = createReverbImpulse(context, REVERB_SECONDS, this.preset.seed ^ 0x3ec5f1)
    const wet = context.createGain()
    wet.gain.setValueAtTime(layer.reverbWet, now)
    cosmos.connect(predelay).connect(convolver).connect(wet).connect(master)
    this.reverbWetGain = wet
    this.nodes.push(predelay, convolver, wet)

    // Fixed taps only. Width without any automatic left-right movement.
    SPREAD_SECONDS.forEach((seconds, index) => {
      const delay = context.createDelay(1)
      delay.delayTime.setValueAtTime(seconds, now)
      const panner = context.createStereoPanner()
      panner.pan.setValueAtTime(SPREAD_PAN[index] ?? 0, now)
      const gain = context.createGain()
      gain.gain.setValueAtTime(layer.spreadGain, now)
      cosmos.connect(delay).connect(panner).connect(gain).connect(master)
      this.spreadGains.push(gain)
      this.nodes.push(delay, panner, gain)
    })

    const droneBus = context.createGain()
    droneBus.gain.setValueAtTime(layer.droneGain, now)
    const droneFilter = context.createBiquadFilter()
    droneFilter.type = 'lowpass'
    droneFilter.frequency.setValueAtTime(layer.droneCutoffHz[1], now)
    droneFilter.Q.setValueAtTime(0.5, now)
    droneBus.connect(droneFilter).connect(cosmos)
    this.droneBus = droneBus
    this.droneFilter = droneFilter
    this.nodes.push(droneBus, droneFilter)

    DRONE_INTERVALS.forEach((semitones, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(intervalFrequency(layer.rootHz, semitones), now)
      gain.gain.setValueAtTime(DRONE_WEIGHTS[index] ?? 0.2, now)
      oscillator.connect(gain).connect(droneBus)
      oscillator.start()
      this.droneOscillators.push(oscillator)
      this.sources.push(oscillator)
      this.nodes.push(oscillator, gain)
    })

    const swellBus = context.createGain()
    swellBus.gain.setValueAtTime(layer.swellGain, now)
    const swellFilter = context.createBiquadFilter()
    swellFilter.type = 'lowpass'
    swellFilter.frequency.setValueAtTime(SWELL_CUTOFF_HZ, now)
    swellFilter.Q.setValueAtTime(0.5, now)
    swellBus.connect(swellFilter).connect(cosmos)
    this.swellBus = swellBus
    this.nodes.push(swellBus, swellFilter)

    SWELL_INTERVALS.forEach((semitones, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.setValueAtTime(intervalFrequency(layer.rootHz, semitones), now)
      gain.gain.setValueAtTime(SWELL_FLOOR_GAIN, now)
      oscillator.connect(gain).connect(swellBus)
      oscillator.start()
      this.swellOscillators.push(oscillator)
      this.swellGains.push(gain)
      this.sources.push(oscillator)
      this.nodes.push(oscillator, gain)
      // A seeded entry offset keeps the four voices from ever starting together.
      this.swellNextTime.push(now + this.random() * (SWELL_CYCLE_SECONDS[index] ?? 29))
    })
  }

  private transitionEnvironment(preset: AmbientSoundPreset, seconds: number): void {
    const context = this.context!
    const now = context.currentTime
    const end = now + seconds
    const changes: Array<[AudioParam | undefined, number]> = [
      [this.windBodyFilter?.frequency, preset.windBody.cutoffHz],
      [this.windBodyGain?.gain, preset.windBody.gain],
      [this.windAirFilter?.frequency, preset.windAir.centerHz],
      [this.windAirFilter?.Q, preset.windAir.q],
      [this.windAirGain?.gain, preset.windAir.gain * 0.45],
      [this.surfFilter?.frequency, preset.surf.cutoffHz],
      [this.surfGain?.gain, preset.surf.gain * 0.38],
      [this.droneBus?.gain, preset.cosmos.droneGain],
      [this.droneFilter?.frequency, preset.cosmos.droneCutoffHz[1]],
      [this.swellBus?.gain, preset.cosmos.swellGain],
      [this.reverbWetGain?.gain, preset.cosmos.reverbWet],
    ]
    for (const gain of this.spreadGains) changes.push([gain.gain, preset.cosmos.spreadGain])
    // The tonal centre glides rather than cuts, so a viewpoint change reads as
    // one continuous piece.
    this.droneOscillators.forEach((oscillator, index) => {
      changes.push([
        oscillator.frequency,
        intervalFrequency(preset.cosmos.rootHz, DRONE_INTERVALS[index] ?? 0),
      ])
    })
    this.swellOscillators.forEach((oscillator, index) => {
      changes.push([
        oscillator.frequency,
        intervalFrequency(preset.cosmos.rootHz, SWELL_INTERVALS[index] ?? 12),
      ])
    })
    for (const [param, value] of changes) {
      if (!param) continue
      param.cancelScheduledValues(now)
      param.setValueAtTime(param.value, now)
      ramp(param, value, end)
    }
  }

  private createNoiseLayer(
    buffer: AudioBuffer,
    type: BiquadFilterType,
    frequency: number,
    q: number,
  ): { source: AudioBufferSourceNode, filter: BiquadFilterNode, gain: GainNode } {
    const context = this.context!
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = buffer
    source.loop = true
    filter.type = type
    filter.frequency.setValueAtTime(frequency, context.currentTime)
    filter.Q.setValueAtTime(q, context.currentTime)
    source.connect(filter).connect(gain)
    this.sources.push(source)
    this.nodes.push(source, filter, gain)
    return { source, filter, gain }
  }

  private scheduleModulation(): void {
    if (!this.context || !this.audible) return
    this.clearModulation()
    const start = this.context.currentTime + 0.05
    const end = start + SCHEDULE_HORIZON_SECONDS

    if (this.windBodyFilter && this.windBodyGain) {
      this.windBodyFilter.frequency.cancelScheduledValues(start)
      this.windBodyGain.gain.cancelScheduledValues(start)
      for (let time = start; time < end; time += valueInRange(this.random, [8, 13])) {
        ramp(this.windBodyFilter.frequency, valueInRange(this.random, this.preset.windBody.modulationHz), time)
        ramp(this.windBodyGain.gain, valueInRange(this.random, this.preset.windBody.modulationGain), time)
      }
    }

    if (this.windAirGain) {
      this.windAirGain.gain.cancelScheduledValues(start)
      for (let time = start; time < end; time += valueInRange(this.random, [12, 20])) {
        const trough = valueInRange(this.random, [14, 24])
        ramp(this.windAirGain.gain, this.preset.windAir.modulationGain[1], time + 3.5)
        ramp(this.windAirGain.gain, this.preset.windAir.modulationGain[0], time + trough)
      }
    }

    if (this.surfGain) {
      this.surfGain.gain.cancelScheduledValues(start)
      for (let time = start; time < end;) {
        const rise = valueInRange(this.random, this.preset.surf.riseSeconds)
        const decay = valueInRange(this.random, this.preset.surf.decaySeconds)
        const strength = this.preset.surf.gain * valueInRange(this.random, [0.72, 1])
        ramp(this.surfGain.gain, strength, time + rise)
        ramp(this.surfGain.gain, 0.001, time + rise + decay)
        time += valueInRange(this.random, this.preset.surf.intervalSeconds)
      }
    }

    this.scheduleCosmos(start, end)

    this.modulationTimer = this.setTimer(
      () => this.scheduleModulation(),
      (SCHEDULE_HORIZON_SECONDS - 8) * 1_000,
    )
  }

  private scheduleCosmos(start: number, end: number): void {
    const layer = this.preset.cosmos

    if (this.droneFilter) {
      this.droneFilter.frequency.cancelScheduledValues(start)
      for (let time = start; time < end; time += valueInRange(this.random, [26, 44])) {
        ramp(this.droneFilter.frequency, valueInRange(this.random, layer.droneCutoffHz), time)
      }
    }

    for (const oscillator of this.droneOscillators) {
      const cents = layer.droneDetuneCents
      oscillator.detune.cancelScheduledValues(start)
      ramp(oscillator.detune, valueInRange(this.random, [-cents, cents]), start + 27)
      ramp(oscillator.detune, valueInRange(this.random, [-cents, cents]), start + 55)
    }

    // Swell envelopes are never cancelled. Each voice continues from its own
    // stored entry time, so cycles keep drifting apart instead of realigning.
    this.swellGains.forEach((gain, index) => {
      const cycle = SWELL_CYCLE_SECONDS[index] ?? 29
      let time = this.swellNextTime[index] ?? start
      while (time < start) time += cycle
      while (time < end) {
        const attack = valueInRange(this.random, layer.swellAttackSeconds)
        const release = valueInRange(this.random, layer.swellReleaseSeconds)
        const peak = (SWELL_WEIGHTS[index] ?? 0.4) * valueInRange(this.random, [0.7, 1])
        ramp(gain.gain, peak, time + attack)
        ramp(gain.gain, SWELL_FLOOR_GAIN, time + attack + release)
        time += cycle
      }
      this.swellNextTime[index] = time
    })
  }

  private clearModulation(): void {
    if (this.modulationTimer === null) return
    this.clearTimer(this.modulationTimer)
    this.modulationTimer = null
  }

  private cancelPendingStop(): void {
    if (this.stopTimer !== null) {
      this.clearTimer(this.stopTimer)
      this.stopTimer = null
    }
    this.stopResolver?.()
    this.stopResolver = null
  }
}
