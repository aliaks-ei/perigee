import { effectScope, readonly, ref, watch, type Ref } from 'vue'
import type {
  AmbientSoundController,
  AmbientSoundStatus,
} from '~/types/ambientSound'
import type { ViewpointId } from '~/types/perigee'
import { readSettings, saveSettings } from '~/utils/settingsStore'
import { AmbientSoundEngine } from '../../src/perigee/audio/AmbientSoundEngine'

export const DEFAULT_AMBIENT_VOLUME = 0.35
/** A slider fires on every input event; storage does not need every frame of a drag. */
const VOLUME_WRITE_DELAY_MS = 500

const status = ref<AmbientSoundStatus>('off')
const volume = ref(DEFAULT_AMBIENT_VOLUME)
const preferenceEnabled = ref(false)
/** No stored answer yet, so the music has never been offered or refused. */
const undecided = ref(false)
let lastNonZeroVolume = DEFAULT_AMBIENT_VOLUME
let engine: AmbientSoundEngine | null = null
let initialized = false
let lifecycleInstalled = false
let sceneWatcherInstalled = false
let activeViewpoint: Readonly<Ref<ViewpointId>> | null = null
let resumeAfterVisibility = false
let operation = 0
let pendingAutoStart: (() => void) | null = null
let volumeTimer: ReturnType<typeof setTimeout> | null = null
let pendingVolume: number | null = null

export function resolveAmbientSoundPreference(value: string | null): boolean {
  return value === 'on'
}

/** Only an explicit answer counts. Anything else is a listener who has not been asked. */
export function hasAmbientSoundDecision(value: string | null): boolean {
  return value === 'on' || value === 'off'
}

function writePreference(enabled: boolean): void {
  undecided.value = false
  saveSettings({ sound: enabled ? 'on' : 'off' })
}

function initialize(): void {
  if (initialized || !import.meta.client) return
  initialized = true
  const settings = readSettings()
  const stored = settings?.sound ?? null
  preferenceEnabled.value = resolveAmbientSoundPreference(stored)
  undecided.value = !hasAmbientSoundDecision(stored)
  if (settings?.volume != null) {
    volume.value = settings.volume
    if (settings.volume > 0) lastNonZeroVolume = settings.volume
  }
  if (preferenceEnabled.value) {
    status.value = 'suspended'
    armAutoStart()
  }
}

/**
 * A listener who has already turned the sound on gets it back without being
 * asked again. No browser will start audio unprompted, so the music waits on
 * the first thing the viewer does — a drag on the sky, a key, a tap anywhere —
 * and starts under that gesture. Where the browser reports the page has
 * already been interacted with, there is nothing to wait for.
 */
function armAutoStart(): void {
  if (pendingAutoStart) return
  const activation = (navigator as Navigator & {
    userActivation?: { hasBeenActive: boolean }
  }).userActivation
  if (activation?.hasBeenActive) {
    void enable()
    return
  }
  const startFromGesture = (): void => {
    disarmAutoStart()
    if (preferenceEnabled.value && status.value !== 'playing') void enable()
  }
  pendingAutoStart = () => {
    window.removeEventListener('pointerdown', startFromGesture)
    window.removeEventListener('keydown', startFromGesture)
    window.removeEventListener('touchend', startFromGesture)
  }
  window.addEventListener('pointerdown', startFromGesture, { once: true })
  window.addEventListener('keydown', startFromGesture, { once: true })
  window.addEventListener('touchend', startFromGesture, { once: true })
}

function disarmAutoStart(): void {
  pendingAutoStart?.()
  pendingAutoStart = null
}

function createEngine(): AmbientSoundEngine {
  return new AmbientSoundEngine({
    initialViewpointId: activeViewpoint?.value ?? 'rooftop',
  })
}

async function enable(): Promise<void> {
  if (status.value === 'starting') return
  disarmAutoStart()
  const token = ++operation
  status.value = 'starting'
  if (volume.value === 0) volume.value = lastNonZeroVolume
  // Recorded at the moment of asking, not on the outcome. The likeliest way
  // this fails is a track that did not download, and a listener who asked for
  // music should be asked no further questions — the next visit simply tries
  // again. `preferenceEnabled` still waits for the music to actually start.
  writePreference(true)
  try {
    engine ??= createEngine()
    engine.setVolume(volume.value)
    await engine.start()
    if (token !== operation) return
    preferenceEnabled.value = true
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

/** The offer was made and turned down. Recorded so it is never made twice. */
function decline(): void {
  initialize()
  disarmAutoStart()
  writePreference(false)
}

function setVolume(value: number): void {
  const next = Math.max(0, Math.min(1, value))
  volume.value = next
  if (next > 0) lastNonZeroVolume = next
  engine?.setVolume(next)
  pendingVolume = next
  if (volumeTimer) clearTimeout(volumeTimer)
  volumeTimer = setTimeout(flushVolume, VOLUME_WRITE_DELAY_MS)
}

/** Also called on teardown, so a slider released as the page goes away is kept. */
function flushVolume(): void {
  if (volumeTimer) clearTimeout(volumeTimer)
  volumeTimer = null
  if (pendingVolume === null) return
  saveSettings({ volume: pendingVolume })
  pendingVolume = null
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
  // Detached from whatever component happens to call first. The control lives
  // inside the "more" sheet, so a component-owned watcher would be stopped the
  // first time the sheet closes, and the latch above would never rebuild it.
  effectScope(true).run(() => {
    watch(viewpoint, (viewpointId) => {
      engine?.setViewpoint(viewpointId)
    })
  })
}

export function disposeAmbientSound(): void {
  ++operation
  disarmAutoStart()
  flushVolume()
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
    undecided: readonly(undecided),
    toggle,
    setVolume,
    decline,
  }
}
