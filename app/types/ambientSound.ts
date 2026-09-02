import type { Ref } from 'vue'

export type AmbientSoundStatus =
  | 'off'
  | 'starting'
  | 'playing'
  | 'suspended'
  | 'unavailable'

export type AmbientSoundPresetId = 'documentary' | 'cinematic-natural' | 'abstract'

export interface AmbientSoundController {
  status: Readonly<Ref<AmbientSoundStatus>>
  volume: Readonly<Ref<number>>
  toggle(): Promise<void>
  setVolume(value: number): void
}
