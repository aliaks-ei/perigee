import type { Ref } from 'vue'

export type AmbientSoundStatus =
  | 'off'
  | 'starting'
  | 'playing'
  | 'suspended'
  | 'unavailable'

export interface AmbientSoundController {
  status: Readonly<Ref<AmbientSoundStatus>>
  volume: Readonly<Ref<number>>
  /**
   * True while the listener has never answered either way, so the one-time
   * offer to play the music is still worth making.
   */
  undecided: Readonly<Ref<boolean>>
  toggle(): Promise<void>
  setVolume(value: number): void
  /** Answers the offer without turning the sound on. */
  decline(): void
}
