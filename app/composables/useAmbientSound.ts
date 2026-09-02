import { readonly, ref, watch, type Ref } from 'vue'
import type {
  AmbientSoundController,
  AmbientSoundStatus,
} from '~/types/ambientSound'
import type { ViewpointId } from '~/types/perigee'
import { AmbientSoundEngine } from '../../src/perigee/audio/AmbientSoundEngine'
import { resolveAmbientSoundPreset } from '../../src/perigee/audio/presets'

export const AMBIENT_SOUND_STORAGE_KEY = 'perigee:ambient-sound'
export const DEFAULT_AMBIENT_VOLUME = 0.35

const status = ref<AmbientSoundStatus>('off')
const volume = ref(DEFAULT_AMBIENT_VOLUME)
const preferenceEnabled = ref(false)
let lastNonZeroVolume = DEFAULT_AMBIENT_VOLUME
let engine: AmbientSoundEngine | null = null
let initialized = false
let lifecycleInstalled = false
let sceneWatcherInstalled = false
let activeViewpoint: Readonly<Ref<ViewpointId>> | null = null
let resumeAfterVisibility = false
let operation = 0

export function resolveAmbientSoundPreference(value: string | null): boolean {
  return value === 'on'
}

function readPreference(): boolean {
  try {
    return resolveAmbientSoundPreference(window.localStorage.getItem(AMBIENT_SOUND_STORAGE_KEY))
  } catch {
    return false
  }
}

function writePreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(AMBIENT_SOUND_STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // Storage can be unavailable in private or locked-down contexts. Sound is
    // still usable for the current page lifetime.
  }
}

function initialize(): void {
  if (initialized || !import.meta.client) return
  initialized = true
  preferenceEnabled.value = readPreference()
  if (preferenceEnabled.value) status.value = 'suspended'
}

function createEngine(): AmbientSoundEngine {
  const preset = resolveAmbientSoundPreset(new URLSearchParams(window.location.search).get('ambience'))
  return new AmbientSoundEngine({
    preset,
    initialViewpointId: activeViewpoint?.value ?? 'rooftop',
  })
}

async function enable(): Promise<void> {
  if (status.value === 'starting') return
  const token = ++operation
  status.value = 'starting'
  if (volume.value === 0) volume.value = lastNonZeroVolume
  try {
    engine ??= createEngine()
    engine.setVolume(volume.value)
    await engine.start()
    if (token !== operation) return
    preferenceEnabled.value = true
    writePreference(true)
    status.value = 'playing'
  } catch {
    if (token !== operation) return
    engine?.dispose()
    engine = null
    status.value = 'unavailable'
  }
}

async function disable(preservePreference = false): Promise<void> {
  const token = ++operation
  status.value = preservePreference ? 'suspended' : 'off'
  resumeAfterVisibility = false
  if (!preservePreference) {
    preferenceEnabled.value = false
    writePreference(false)
  }
  try {
    await engine?.stop()
  } catch {
    if (token === operation && !preservePreference) status.value = 'off'
  }
}

async function toggle(): Promise<void> {
  initialize()
  if (status.value === 'playing' || status.value === 'starting') {
    await disable()
    return
  }
  await enable()
}

function setVolume(value: number): void {
  const next = Math.max(0, Math.min(1, value))
  volume.value = next
  if (next > 0) lastNonZeroVolume = next
  engine?.setVolume(next)
}

async function handleVisibility(): Promise<void> {
  if (!engine) return
  if (document.hidden) {
    resumeAfterVisibility = status.value === 'playing'
    if (!resumeAfterVisibility) return
    ++operation
    status.value = 'suspended'
    try {
      await engine.suspend()
    } catch {
      status.value = 'unavailable'
      resumeAfterVisibility = false
    }
    return
  }
  if (!resumeAfterVisibility || !preferenceEnabled.value) return
  resumeAfterVisibility = false
  const token = ++operation
  status.value = 'starting'
  try {
    await engine.resume()
    if (token === operation) status.value = 'playing'
  } catch {
    if (token === operation) status.value = 'suspended'
  }
}

function installLifecycle(): void {
  if (lifecycleInstalled || !import.meta.client) return
  lifecycleInstalled = true
  document.addEventListener('visibilitychange', () => { void handleVisibility() })
  window.addEventListener('pagehide', disposeAmbientSound, { once: true })
}

function installSceneWatcher(viewpoint: Readonly<Ref<ViewpointId>>): void {
  activeViewpoint = viewpoint
  if (sceneWatcherInstalled) return
  sceneWatcherInstalled = true
  watch(viewpoint, (viewpointId) => {
    engine?.setViewpoint(viewpointId)
  })
}

export function disposeAmbientSound(): void {
  ++operation
  engine?.dispose()
  engine = null
  resumeAfterVisibility = false
  status.value = preferenceEnabled.value ? 'suspended' : 'off'
}

export function useAmbientSound(viewpoint: Readonly<Ref<ViewpointId>>): AmbientSoundController {
  initialize()
  installLifecycle()
  installSceneWatcher(viewpoint)
  return {
    status: readonly(status),
    volume: readonly(volume),
    toggle,
    setVolume,
  }
}
