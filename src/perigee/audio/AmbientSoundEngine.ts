import {
  BED_DRIFT_DEPTH,
  BED_DRIFT_HZ,
  BED_FILTER_Q,
  BED_INTERVALS,
  BED_TYPES,
  BED_WEIGHTS,
  COSMOS_DRY_GAIN,
  intervalFrequency,
  PULSE_ATTACK_SECONDS,
  PULSE_CUTOFF_HZ,
  PULSE_FLOOR_GAIN,
  PULSE_INTERVAL,
  PULSE_RELEASE_SECONDS,
  pulseTempoAt,
  REVERB_DECAY_POWER,
  REVERB_PREDELAY_SECONDS,
  REVERB_SECONDS,
  SPREAD_LOWPASS_HZ,
  SPREAD_PAN,
  SPREAD_SECONDS,
  TONE_HIGHPASS_HZ,
  TONE_HIGHPASS_Q,
  TONE_HIGH_SHELF_DB,
  TONE_HIGH_SHELF_HZ,
  TONE_LOW_SHELF_DB,
  TONE_LOW_SHELF_HZ,
  VOICE_ATTACK_BEATS,
  VOICE_CUTOFF_HZ,
  VOICE_CYCLE_BEATS,
  VOICE_FLOOR_GAIN,
  VOICE_INTERVALS,
  VOICE_OFFSET_BEATS,
  VOICE_RELEASE_BEATS,
  VOICE_WEIGHTS,
} from './cosmos'
import { createNoiseBuffer } from './createNoiseBuffer'
import { createReverbImpulse } from './createReverbImpulse'
import type { ViewpointId } from '../../../app/types/perigee'
import {
  ambientSoundPresets,
  type AmbientSoundPreset,
} from './presets'
import { resolveSceneSoundscape } from './soundscapes'

const FADE_IN_SECONDS = 4
/** Long enough that switching the sound off is itself a calm event. */
const FADE_OUT_SECONDS = 2.5
const NOISE_BUFFER_SECONDS = 4
/** Comfortably longer than one full voice cycle at the slowest tempo. */
const SCHEDULE_HORIZON_SECONDS = 90
const SCHEDULE_OVERLAP_SECONDS = 15
const SCENE_TRANSITION_SECONDS = 8

/**
 * An exponential ramp is undefined at zero, and everything audible sits well
 * above this, so clamping here costs nothing and keeps every envelope legal.
 */
const RAMP_FLOOR = 1e-5

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

/** For parameters that legitimately cross or reach zero: pan and the master. */
function ramp(param: AudioParam, value: number, time: number): void {
  param.linearRampToValueAtTime(value, time)
}

/**
 * For gains and cutoffs. Both are heard logarithmically, so a linear ramp
 * arrives late and then lurches: a long linear fade to silence reads as a cut
 * at the end, not as a decay.
 */
function glide(param: AudioParam, value: number, time: number): void {
  param.exponentialRampToValueAtTime(Math.max(RAMP_FLOOR, value), time)
}

export class AmbientSoundEngine {
  private readonly caboPreset: AmbientSoundPreset
  private readonly createContext: () => AudioContext
  private readonly setTimer: NonNullable<AmbientSoundEngineOptions['setTimer']>
  private readonly clearTimer: NonNullable<AmbientSoundEngineOptions['clearTimer']>
  private viewpointId: ViewpointId
  private preset: AmbientSoundPreset
  private context: AudioContext | null = null
  private master: GainNode | null = null
  /** Head of the shared tone chain. Every layer arrives here, never at master. */
  private toneInput: BiquadFilterNode | null = null
  private windBodyFilter: BiquadFilterNode | null = null
  private windBodyGain: GainNode | null = null
  private windAirFilter: BiquadFilterNode | null = null
  private windAirGain: GainNode | null = null
  private surfFilter: BiquadFilterNode | null = null
  private surfGain: GainNode | null = null
  private bedBus: GainNode | null = null
  private bedFilter: BiquadFilterNode | null = null
  private bedOscillators: OscillatorNode[] = []
  private voiceBus: GainNode | null = null
  private voiceOscillators: OscillatorNode[] = []
  private voiceGains: GainNode[] = []
  private pulseBus: GainNode | null = null
  private pulseOscillator: OscillatorNode | null = null
  private pulseEnvelope: GainNode | null = null
  private reverbWetGain: GainNode | null = null
  private spreadGains: GainNode[] = []
  private sources: AudioScheduledSourceNode[] = []
  private nodes: AudioNode[] = []
  /** Context time of the next beat that has not been scheduled yet. */
  private beatTime = 0
  private beatIndex = 0
  /** Context time the tempo ramp started from, so 60 bpm always comes first. */
  private beatOrigin = 0
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
    this.scheduleAhead()
    const now = context.currentTime
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setValueAtTime(this.master!.gain.value, now)
    ramp(this.master!.gain, this.volume * this.preset.masterGain, now + FADE_IN_SECONDS)
  }

  setViewpoint(viewpointId: ViewpointId): void {
    if (viewpointId === this.viewpointId || this.disposed) return
    this.viewpointId = viewpointId
    this.preset = resolveSceneSoundscape(viewpointId, this.caboPreset)
    if (!this.context || !this.graphStarted) return
    // The beat grid is deliberately untouched. A scene change retunes the
    // music; it never restarts the pulse the listener has settled into.
    this.transitionEnvironment(this.preset, SCENE_TRANSITION_SECONDS)
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
    this.scheduleAhead()
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
    this.bedOscillators = []
    this.voiceOscillators = []
    this.voiceGains = []
    this.spreadGains = []
    this.pulseOscillator = null
    this.pulseEnvelope = null
    this.context = null
    this.master = null
    this.toneInput = null
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error('AMBIENT_SOUND_DISPOSED')
  }

  private ensureGraph(): void {
    if (this.context) return
    const context = this.createContext()
    this.context = context
    const now = context.currentTime
    this.beatTime = now
    this.beatOrigin = now
    this.beatIndex = 0

    const master = context.createGain()
    master.gain.setValueAtTime(0, now)
    // Gentle and slow. A fast, low-threshold compressor over a sustained bed
    // ducks the whole mix on every entry and lets it back in audibly.
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-18, now)
    compressor.knee.setValueAtTime(12, now)
    compressor.ratio.setValueAtTime(2, now)
    compressor.attack.setValueAtTime(0.15, now)
    compressor.release.setValueAtTime(1.6, now)
    master.connect(compressor).connect(context.destination)
    this.master = master
    this.nodes.push(master, compressor)

    const toneInput = this.createToneChain(master)
    this.toneInput = toneInput

    const windBuffer = createNoiseBuffer(context, NOISE_BUFFER_SECONDS, 'pink', this.preset.seed)
    const surfBuffer = createNoiseBuffer(context, NOISE_BUFFER_SECONDS, 'brown', this.preset.seed ^ 0x912f4b)
    const body = this.createNoiseLayer(windBuffer, 'lowpass', this.preset.windBody.cutoffHz, 0.7)
    body.gain.gain.setValueAtTime(this.preset.windBody.gain, now)
    body.gain.connect(toneInput)
    this.windBodyFilter = body.filter
    this.windBodyGain = body.gain

    const air = this.createNoiseLayer(windBuffer, 'bandpass', this.preset.windAir.centerHz, this.preset.windAir.q)
    air.gain.gain.setValueAtTime(this.preset.windAir.gain, now)
    air.gain.connect(toneInput)
    this.windAirGain = air.gain
    this.windAirFilter = air.filter

    const surf = this.createNoiseLayer(surfBuffer, 'lowpass', this.preset.surf.cutoffHz, 0.65)
    surf.gain.gain.setValueAtTime(this.preset.surf.gain, now)
    surf.gain.connect(toneInput)
    this.surfGain = surf.gain
    this.surfFilter = surf.filter

    this.createCosmicLayer()

    for (const source of [body.source, air.source, surf.source]) source.start()

    // Drift last, so the musical sources keep the low indices. Each of these
    // replaces a randomised modulation schedule with one slow, periodic LFO:
    // predictable movement is calming, unpredictable movement is not.
    this.createDrift(body.gain.gain, this.preset.windBody.driftHz, this.preset.windBody.driftDepth)
    this.createDrift(air.gain.gain, this.preset.windAir.driftHz, this.preset.windAir.driftDepth)
    this.createDrift(surf.gain.gain, this.preset.surf.driftHz, this.preset.surf.driftDepth)
    this.createDrift(this.bedBus!.gain, BED_DRIFT_HZ, this.preset.cosmos.bedGain * BED_DRIFT_DEPTH)

    this.graphStarted = true
  }

  /**
   * One shared tone stage for every layer. The high-pass drops rumble that no
   * speaker reproduces and that is itself a source of unease; the shelves tilt
   * weight out of the low-mids and put a little air back on top.
   */
  private createToneChain(master: GainNode): BiquadFilterNode {
    const context = this.context!
    const now = context.currentTime

    const highpass = context.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.setValueAtTime(TONE_HIGHPASS_HZ, now)
    highpass.Q.setValueAtTime(TONE_HIGHPASS_Q, now)

    const lowShelf = context.createBiquadFilter()
    lowShelf.type = 'lowshelf'
    lowShelf.frequency.setValueAtTime(TONE_LOW_SHELF_HZ, now)
    lowShelf.gain.setValueAtTime(TONE_LOW_SHELF_DB, now)

    const highShelf = context.createBiquadFilter()
    highShelf.type = 'highshelf'
    highShelf.frequency.setValueAtTime(TONE_HIGH_SHELF_HZ, now)
    highShelf.gain.setValueAtTime(TONE_HIGH_SHELF_DB, now)

    highpass.connect(lowShelf).connect(highShelf).connect(master)
    this.nodes.push(highpass, lowShelf, highShelf)
    return highpass
  }

  /**
   * One tonal centre in three roles: a sustained major bed, six pentatonic
   * voices that enter and leave on a fixed beat grid, and a soft pulse near a
   * resting heart rate. A generated reverb supplies the space.
   */
  private createCosmicLayer(): void {
    const context = this.context!
    const toneInput = this.toneInput!
    const layer = this.preset.cosmos
    const now = context.currentTime

    const cosmos = context.createGain()
    cosmos.gain.setValueAtTime(1, now)
    this.nodes.push(cosmos)

    const dry = context.createGain()
    dry.gain.setValueAtTime(COSMOS_DRY_GAIN, now)
    cosmos.connect(dry).connect(toneInput)
    this.nodes.push(dry)

    const predelay = context.createDelay(1)
    predelay.delayTime.setValueAtTime(REVERB_PREDELAY_SECONDS, now)
    const convolver = context.createConvolver()
    convolver.normalize = true
    convolver.buffer = createReverbImpulse(
      context,
      REVERB_SECONDS,
      this.preset.seed ^ 0x3ec5f1,
      REVERB_DECAY_POWER,
    )
    const wet = context.createGain()
    wet.gain.setValueAtTime(layer.reverbWet, now)
    cosmos.connect(predelay).connect(convolver).connect(wet).connect(toneInput)
    this.reverbWetGain = wet
    this.nodes.push(predelay, convolver, wet)

    // Fixed taps only. Width without any automatic left-right movement, and
    // darkened first so they sit behind the direct sound rather than beside it.
    const spreadFilter = context.createBiquadFilter()
    spreadFilter.type = 'lowpass'
    spreadFilter.frequency.setValueAtTime(SPREAD_LOWPASS_HZ, now)
    spreadFilter.Q.setValueAtTime(0.6, now)
    cosmos.connect(spreadFilter)
    this.nodes.push(spreadFilter)

    SPREAD_SECONDS.forEach((seconds, index) => {
      const delay = context.createDelay(1)
      delay.delayTime.setValueAtTime(seconds, now)
      const panner = context.createStereoPanner()
      panner.pan.setValueAtTime(SPREAD_PAN[index] ?? 0, now)
      const gain = context.createGain()
      gain.gain.setValueAtTime(layer.spreadGain, now)
      spreadFilter.connect(delay).connect(panner).connect(gain).connect(toneInput)
      this.spreadGains.push(gain)
      this.nodes.push(delay, panner, gain)
    })

    const bedBus = context.createGain()
    bedBus.gain.setValueAtTime(layer.bedGain, now)
    const bedFilter = context.createBiquadFilter()
    bedFilter.type = 'lowpass'
    bedFilter.frequency.setValueAtTime(layer.bedCutoffHz, now)
    bedFilter.Q.setValueAtTime(BED_FILTER_Q, now)
    bedBus.connect(bedFilter).connect(cosmos)
    this.bedBus = bedBus
    this.bedFilter = bedFilter
    this.nodes.push(bedBus, bedFilter)

    BED_INTERVALS.forEach((semitones, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = BED_TYPES[index] ?? 'sine'
      oscillator.frequency.setValueAtTime(intervalFrequency(layer.rootHz, semitones), now)
      gain.gain.setValueAtTime(BED_WEIGHTS[index] ?? 0.2, now)
      oscillator.connect(gain).connect(bedBus)
      oscillator.start()
      this.bedOscillators.push(oscillator)
      this.sources.push(oscillator)
      this.nodes.push(oscillator, gain)
    })

    const voiceBus = context.createGain()
    voiceBus.gain.setValueAtTime(layer.voiceGain, now)
    const voiceFilter = context.createBiquadFilter()
    voiceFilter.type = 'lowpass'
    voiceFilter.frequency.setValueAtTime(VOICE_CUTOFF_HZ, now)
    voiceFilter.Q.setValueAtTime(0.5, now)
    voiceBus.connect(voiceFilter).connect(cosmos)
    this.voiceBus = voiceBus
    this.nodes.push(voiceBus, voiceFilter)

    VOICE_INTERVALS.forEach((semitones, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      // Sine only. Every voice may sound against every other, so the timbre
      // has to stay clean enough that overlapping them never turns harsh.
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(intervalFrequency(layer.rootHz, semitones), now)
      gain.gain.setValueAtTime(VOICE_FLOOR_GAIN, now)
      oscillator.connect(gain).connect(voiceBus)
      oscillator.start()
      this.voiceOscillators.push(oscillator)
      this.voiceGains.push(gain)
      this.sources.push(oscillator)
      this.nodes.push(oscillator, gain)
    })

    const pulseBus = context.createGain()
    pulseBus.gain.setValueAtTime(layer.pulseGain, now)
    const pulseFilter = context.createBiquadFilter()
    pulseFilter.type = 'lowpass'
    pulseFilter.frequency.setValueAtTime(PULSE_CUTOFF_HZ, now)
    pulseFilter.Q.setValueAtTime(0.5, now)
    const envelope = context.createGain()
    envelope.gain.setValueAtTime(PULSE_FLOOR_GAIN, now)
    const pulse = context.createOscillator()
    pulse.type = 'sine'
    pulse.frequency.setValueAtTime(intervalFrequency(layer.rootHz, PULSE_INTERVAL), now)
    pulse.connect(envelope).connect(pulseFilter).connect(pulseBus).connect(cosmos)
    pulse.start()
    this.pulseBus = pulseBus
    this.pulseOscillator = pulse
    this.pulseEnvelope = envelope
    this.sources.push(pulse)
    this.nodes.push(pulseBus, pulseFilter, envelope, pulse)
  }

  /**
   * A slow sine summed into a parameter. Connecting an oscillator to an
   * AudioParam adds to its intrinsic value, so the parameter keeps breathing
   * on its own without a single scheduled event.
   */
  private createDrift(target: AudioParam, rateHz: number, depth: number): void {
    if (depth <= 0) return
    const context = this.context!
    const now = context.currentTime
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(rateHz, now)
    const amount = context.createGain()
    amount.gain.setValueAtTime(depth, now)
    oscillator.connect(amount).connect(target)
    oscillator.start()
    this.sources.push(oscillator)
    this.nodes.push(oscillator, amount)
  }

  private transitionEnvironment(preset: AmbientSoundPreset, seconds: number): void {
    const context = this.context!
    const now = context.currentTime
    const end = now + seconds
    const changes: Array<[AudioParam | undefined, number]> = [
      [this.windBodyFilter?.frequency, preset.windBody.cutoffHz],
      [this.windBodyGain?.gain, preset.windBody.gain],
      [this.windAirFilter?.frequency, preset.windAir.centerHz],
      [this.windAirGain?.gain, preset.windAir.gain],
      [this.surfFilter?.frequency, preset.surf.cutoffHz],
      [this.surfGain?.gain, preset.surf.gain],
      [this.bedBus?.gain, preset.cosmos.bedGain],
      [this.bedFilter?.frequency, preset.cosmos.bedCutoffHz],
      [this.voiceBus?.gain, preset.cosmos.voiceGain],
      [this.pulseBus?.gain, preset.cosmos.pulseGain],
      [this.reverbWetGain?.gain, preset.cosmos.reverbWet],
    ]
    for (const gain of this.spreadGains) changes.push([gain.gain, preset.cosmos.spreadGain])
    // The tonal centre glides rather than cuts, so a viewpoint change reads as
    // one continuous piece.
    this.bedOscillators.forEach((oscillator, index) => {
      changes.push([
        oscillator.frequency,
        intervalFrequency(preset.cosmos.rootHz, BED_INTERVALS[index] ?? 0),
      ])
    })
    this.voiceOscillators.forEach((oscillator, index) => {
      changes.push([
        oscillator.frequency,
        intervalFrequency(preset.cosmos.rootHz, VOICE_INTERVALS[index] ?? 12),
      ])
    })
    if (this.pulseOscillator) {
      changes.push([
        this.pulseOscillator.frequency,
        intervalFrequency(preset.cosmos.rootHz, PULSE_INTERVAL),
      ])
    }
    for (const [param, value] of changes) {
      if (!param) continue
      param.cancelScheduledValues(now)
      param.setValueAtTime(param.value, now)
      glide(param, value, end)
    }
    // Q crosses no zero and is not heard logarithmically, so it stays linear.
    if (this.windAirFilter) {
      this.windAirFilter.Q.cancelScheduledValues(now)
      this.windAirFilter.Q.setValueAtTime(this.windAirFilter.Q.value, now)
      ramp(this.windAirFilter.Q, preset.windAir.q, end)
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

  /**
   * Walks the beat grid forward over the scheduling horizon. Nothing here is
   * random: given a beat index the same things always happen, which is the
   * whole point. A listener who can anticipate the next event relaxes into it.
   */
  private scheduleAhead(): void {
    if (!this.context || !this.audible) return
    this.clearModulation()
    const now = this.context.currentTime
    // A suspended tab or a restart can leave the cursor behind the clock.
    if (this.beatTime < now) this.beatTime = now
    const end = now + SCHEDULE_HORIZON_SECONDS

    while (this.beatTime < end) {
      const beatSeconds = 60 / pulseTempoAt(this.beatTime - this.beatOrigin)
      this.schedulePulse(this.beatTime)
      this.scheduleVoiceEntries(this.beatIndex, this.beatTime, beatSeconds)
      this.beatTime += beatSeconds
      this.beatIndex += 1
    }

    this.modulationTimer = this.setTimer(
      () => this.scheduleAhead(),
      (SCHEDULE_HORIZON_SECONDS - SCHEDULE_OVERLAP_SECONDS) * 1_000,
    )
  }

  private schedulePulse(time: number): void {
    const envelope = this.pulseEnvelope
    if (!envelope) return
    // Attack plus release stays under one beat at both tempos, so the events
    // on this parameter are always scheduled in increasing time order.
    glide(envelope.gain, 1, time + PULSE_ATTACK_SECONDS)
    glide(envelope.gain, PULSE_FLOOR_GAIN, time + PULSE_ATTACK_SECONDS + PULSE_RELEASE_SECONDS)
  }

  private scheduleVoiceEntries(beatIndex: number, time: number, beatSeconds: number): void {
    const position = beatIndex % VOICE_CYCLE_BEATS
    this.voiceGains.forEach((gain, index) => {
      if (position !== VOICE_OFFSET_BEATS[index]) return
      const attack = VOICE_ATTACK_BEATS * beatSeconds
      const release = VOICE_RELEASE_BEATS * beatSeconds
      glide(gain.gain, VOICE_WEIGHTS[index] ?? 0.4, time + attack)
      glide(gain.gain, VOICE_FLOOR_GAIN, time + attack + release)
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
