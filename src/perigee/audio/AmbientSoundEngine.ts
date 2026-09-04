import { ambientTracks, type AmbientTrack } from './AudioManifest'
import { AudioLoader } from './AudioLoader'
import { claimPlaybackOutput, releasePlaybackOutput } from './audioOutput'
import type { ViewpointId } from '../../../app/types/perigee'

/**
 * One looped piece of music per viewpoint, crossfaded when the viewpoint
 * changes. The soundscape used to be synthesized in Web Audio — three noise
 * beds, a sustained major chord and a pulse near a resting heart rate — and
 * listeners read the result as dark rather than calm. Written music does the
 * job the synthesis was trying to do, so the engine's only remaining work is
 * playback: fetch, decode, loop, crossfade, and stay out of the way.
 */

/** Long enough that switching the sound off is itself a calm event. */
const FADE_OUT_SECONDS = 2.5

/**
 * How one track gives way to another: the outgoing one fades for `out`
 * seconds, the incoming one waits `delay` and then fades for `into`.
 */
interface TrackTransition {
  out: number
  delay: number
  into: number
}

/** Turning the sound on. There is nothing to make way for. */
const START_TRANSITION: TrackTransition = { out: 0, delay: 0, into: 4 }

/**
 * A viewpoint change.
 *
 * These are four separate compositions, not four layers of one, so they must
 * not be crossfaded like stems. Overlapping them properly — equal power, both
 * sides at 1/√2 through the middle — means two piano melodies playing over
 * each other at nearly full level for several seconds, which is heard as a
 * pile-up rather than as a transition.
 *
 * So the transition is mostly sequential: one piece leaves, the next arrives,
 * and they touch only near their quiet ends. The overlap is there to keep the
 * level from reaching zero, not to blend the two — at the crossing each track
 * is already well down, so the ear follows a handover instead of a chord.
 */
const SCENE_TRANSITION: TrackTransition = { out: 2.5, delay: 1.7, into: 3.5 }
/**
 * Not every MP3 decoder trims the encoder's priming and padding, and the
 * silence that survives lands exactly on the loop point. Looping inside both
 * ends discards it. `scripts/audio.sh` bakes a four-second crossfade into each
 * file, so losing fifty milliseconds of that join cannot be heard.
 */
const LOOP_EDGE_SECONDS = 0.05
/** Headroom for the moment the two tracks overlap during a viewpoint change. */
const MASTER_CEILING = 0.85

interface AmbientSoundEngineOptions {
  initialViewpointId?: ViewpointId
  createContext?: () => AudioContext
  /** Injectable so tests never touch the network. */
  fetchBytes?: (url: string) => Promise<ArrayBuffer>
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

/** One playing track. Two exist only for the length of a crossfade. */
interface Deck {
  url: string
  source: AudioBufferSourceNode
  /** Rises once, when the deck arrives. */
  fadeIn: GainNode
  /**
   * Falls once, when it leaves. It is a second node rather than a second
   * curve on the first, because a value curve scheduled over one that is still
   * running throws — and retiring a deck that has not finished arriving is an
   * ordinary event here: it is what two quick viewpoint changes look like.
   */
  fadeOut: GainNode
}

function nativeAudioContext(): AudioContext {
  const Context = window.AudioContext ?? (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!Context) throw new Error('WEB_AUDIO_UNAVAILABLE')
  return new Context()
}

/** For the master, which legitimately reaches zero. */
function ramp(param: AudioParam, value: number, time: number): void {
  param.linearRampToValueAtTime(value, time)
}

/**
 * The shape of every fade a listener hears on a deck.
 *
 * Two uncorrelated signals add in power, not in amplitude, so a crossfade
 * holds its level only if both sides sit at 1/√2 halfway through rather than
 * at 1/2. `cos` out against `sin` in is that curve: cos² + sin² = 1 at every
 * point, so the pair sums to a flat level from end to end.
 *
 * The obvious alternative is worse than a linear fade, not better. An
 * exponential ramp is the right shape for a single fade to silence, but run
 * from a floor low enough to stand in for zero it spends almost all of its
 * length inaudible: halfway through an eight-second ramp from 1e-5, a track is
 * 50 dB down. Crossing two of those put four seconds of near-silence in the
 * middle of every viewpoint change, which is what a scene change used to sound
 * like.
 */
const FADE_CURVE_STEPS = 64

function crossfadeCurve(from: number, to: number): Float32Array {
  const curve = new Float32Array(FADE_CURVE_STEPS)
  for (let step = 0; step < FADE_CURVE_STEPS; step += 1) {
    const phase = (step / (FADE_CURVE_STEPS - 1)) * (Math.PI / 2)
    curve[step] = from * Math.cos(phase) + to * Math.sin(phase)
  }
  return curve
}

function fade(param: AudioParam, from: number, to: number, start: number, seconds: number): void {
  param.setValueCurveAtTime(crossfadeCurve(from, to), start, seconds)
}

export class AmbientSoundEngine {
  private readonly createContext: () => AudioContext
  private readonly fetchBytes: AmbientSoundEngineOptions['fetchBytes']
  private readonly setTimer: NonNullable<AmbientSoundEngineOptions['setTimer']>
  private readonly clearTimer: NonNullable<AmbientSoundEngineOptions['clearTimer']>
  private viewpointId: ViewpointId
  private context: AudioContext | null = null
  private loader: AudioLoader | null = null
  private master: GainNode | null = null
  private decks: Deck[] = []
  private stopTimer: ReturnType<typeof setTimeout> | null = null
  private stopResolver: (() => void) | null = null
  private releaseTimer: ReturnType<typeof setTimeout> | null = null
  private volume = 0.35
  private audible = false
  private disposed = false
  private operation = 0
  /** Guards a crossfade against a viewpoint change that supersedes it. */
  private trackOperation = 0
  /** Context time the music began, so every later track joins it in progress. */
  private musicOrigin: number | null = null

  constructor(options: AmbientSoundEngineOptions = {}) {
    this.viewpointId = options.initialViewpointId ?? 'rooftop'
    this.createContext = options.createContext ?? nativeAudioContext
    this.fetchBytes = options.fetchBytes
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer))
  }

  get hasGraph(): boolean {
    return this.context !== null
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  /** The track currently faded up, for tests and for the release bookkeeping. */
  get playingUrl(): string | null {
    return this.decks.at(-1)?.url ?? null
  }

  async start(): Promise<void> {
    this.assertUsable()
    const operation = ++this.operation
    this.cancelPendingStop()
    // Everything up to and including the resume runs in the same task as the
    // gesture that called it. iOS grants the context nothing otherwise.
    this.ensureGraph()
    claimPlaybackOutput()
    const context = this.context!
    if (context.state !== 'running') await context.resume()
    if (operation !== this.operation || this.disposed) return

    this.audible = true
    const now = context.currentTime
    this.master!.gain.cancelScheduledValues(now)
    this.master!.gain.setValueAtTime(this.master!.gain.value, now)
    // The master only arms the output; the fade the listener hears belongs to
    // the deck, so a start and a viewpoint change sound like the same event.
    ramp(this.master!.gain, this.volume * MASTER_CEILING, now + 0.08)

    // Stopping does not tear the deck down, so a viewpoint that changed while
    // the sound was off still has a piece to make way for.
    await this.playTrack(
      ambientTracks[this.viewpointId],
      this.decks.length ? SCENE_TRANSITION : START_TRANSITION,
    )
  }

  setViewpoint(viewpointId: ViewpointId): void {
    if (viewpointId === this.viewpointId || this.disposed) return
    this.viewpointId = viewpointId
    if (!this.context || !this.audible) return
    // A failed swap keeps the previous viewpoint's music playing. The wrong
    // place is a better answer than silence, and the scene is still correct.
    void this.playTrack(ambientTracks[viewpointId], SCENE_TRANSITION)
      .catch(() => console.warn('[perigee] ambient track unavailable for', viewpointId))
  }

  async stop(): Promise<void> {
    if (!this.context || !this.master || this.disposed) return
    const operation = ++this.operation
    this.audible = false
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
    await this.context.suspend()
  }

  async resume(): Promise<void> {
    this.assertUsable()
    if (!this.context) return
    ++this.operation
    this.cancelPendingStop()
    claimPlaybackOutput()
    await this.context.resume()
    this.audible = true
    // The viewpoint can have moved on while the tab was hidden, because the
    // scene keeps its own state and only the sound was paused.
    if (this.playingUrl !== ambientTracks[this.viewpointId].url) {
      await this.playTrack(ambientTracks[this.viewpointId], SCENE_TRANSITION)
    }
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value))
    if (!this.context || !this.master || !this.audible || this.disposed) return
    const now = this.context.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    ramp(this.master.gain, this.volume * MASTER_CEILING, now + 0.08)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    ++this.operation
    ++this.trackOperation
    this.cancelPendingStop()
    this.cancelPendingRelease()
    for (const deck of this.decks) {
      try { deck.source.stop() } catch { /* A source may already have stopped. */ }
      deck.source.disconnect()
      deck.fadeIn.disconnect()
      deck.fadeOut.disconnect()
    }
    this.decks = []
    this.master?.disconnect()
    this.loader?.clear()
    releasePlaybackOutput()
    void this.context?.close().catch(() => undefined)
    this.context = null
    this.master = null
    this.loader = null
    this.musicOrigin = null
  }

  private assertUsable(): void {
    if (this.disposed) throw new Error('AMBIENT_SOUND_DISPOSED')
  }

  private ensureGraph(): void {
    if (this.context) return
    const context = this.createContext()
    this.context = context
    this.loader = new AudioLoader({ context, fetchBytes: this.fetchBytes })

    const master = context.createGain()
    master.gain.setValueAtTime(0, context.currentTime)
    master.connect(context.destination)
    this.master = master

    // iOS drops a running context into 'interrupted' for a phone call, a
    // Siri request or another app taking the output, and never returns from it
    // on its own. Without this the sound is simply gone for the rest of the
    // visit, with the control still reporting it as on.
    context.addEventListener('statechange', () => {
      if (this.disposed || !this.audible) return
      if (context.state === 'running') return
      void context.resume().catch(() => undefined)
    })
  }

  /**
   * Fades the given track up and everything else down. Resolves once the new
   * deck is playing, so the interface can wait for the first track before it
   * calls the sound on.
   */
  private async playTrack(track: AmbientTrack, transition: TrackTransition): Promise<void> {
    if (this.playingUrl === track.url) return
    const context = this.context
    const loader = this.loader
    if (!context || !loader) return

    const operation = ++this.trackOperation
    const previous = this.decks.map((deck) => deck.url)
    const buffer = await loader.load(track.url)
    // A second viewpoint change while this one was downloading wins outright:
    // the buffer stays cached, but nothing is built from it here.
    if (operation !== this.trackOperation || this.disposed || !this.context) return

    const now = context.currentTime
    // The incoming track is scheduled, not started: it waits out most of the
    // outgoing one's fade before its own begins.
    const arrival = now + transition.delay
    // Both gains assigned rather than scheduled: an event at a curve's own
    // start time sits inside its interval, and that combination throws.
    const fadeIn = context.createGain()
    fadeIn.gain.value = 0
    const fadeOut = context.createGain()
    fadeOut.gain.value = 1
    fadeIn.connect(fadeOut).connect(this.master!)

    const loopStart = LOOP_EDGE_SECONDS
    const loopEnd = Math.max(LOOP_EDGE_SECONDS * 2, buffer.duration - LOOP_EDGE_SECONDS)
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.loopStart = loopStart
    source.loopEnd = loopEnd
    source.connect(fadeIn)
    source.start(arrival, this.loopPositionAt(arrival, loopStart, loopEnd))
    fade(fadeIn.gain, 0, 1, arrival, transition.into)

    for (const deck of this.decks) this.retireDeck(deck, transition.out)
    this.decks = [{ url: track.url, source, fadeIn, fadeOut }]

    // The outgoing track is 40 MB of decoded samples. Holding all four would
    // be 160 MB on a phone that is already running the scene.
    this.cancelPendingRelease()
    this.releaseTimer = this.setTimer(() => {
      this.releaseTimer = null
      for (const url of previous) {
        if (url !== this.playingUrl) this.loader?.release(url)
      }
    }, (transition.delay + transition.into + 0.5) * 1_000)
  }

  /**
   * Where in its loop an incoming track starts.
   *
   * The four pieces share a tempo and a key, so the swap sounds like one
   * continuous piece only if the new one joins where the old one had got to.
   * Starting every track at its own beginning restarts the music at each
   * viewpoint change, and does it at the loop join baked into the head of the
   * file — the one passage that is two parts of the piece layered over each
   * other, and the worst place to enter.
   *
   * The clock is the context's, so it is deterministic: two engines started
   * together stay together, and no random offset is involved.
   */
  private loopPositionAt(now: number, loopStart: number, loopEnd: number): number {
    if (this.musicOrigin === null) {
      this.musicOrigin = now
      return loopStart
    }
    const body = loopEnd - loopStart
    return loopStart + ((now - this.musicOrigin) % body)
  }

  /** Fades a deck out and stops it once the fade has finished. */
  private retireDeck(deck: Deck, seconds: number): void {
    const context = this.context!
    const now = context.currentTime
    if (seconds <= 0) {
      try { deck.source.stop() } catch { /* Already stopped. */ }
      deck.source.disconnect()
      deck.fadeIn.disconnect()
      deck.fadeOut.disconnect()
      return
    }
    fade(deck.fadeOut.gain, 1, 0, now, seconds)
    try { deck.source.stop(now + seconds + 0.1) } catch { /* Already stopped. */ }
    this.setTimer(() => {
      deck.source.disconnect()
      deck.fadeIn.disconnect()
      deck.fadeOut.disconnect()
    }, (seconds + 0.2) * 1_000)
  }

  private cancelPendingStop(): void {
    if (this.stopTimer !== null) {
      this.clearTimer(this.stopTimer)
      this.stopTimer = null
    }
    this.stopResolver?.()
    this.stopResolver = null
  }

  private cancelPendingRelease(): void {
    if (this.releaseTimer === null) return
    this.clearTimer(this.releaseTimer)
    this.releaseTimer = null
  }
}
