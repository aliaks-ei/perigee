import { DISCLOSURE_STAGES, type DisclosureStage } from './disclosureStages'

/**
 * What the browser remembers about a returning visitor: the answer to the
 * music offer, the volume they set, and how far the interface had opened.
 *
 * One versioned record under one key, read once per page. A settings file that
 * grows a key per preference ends up with half of it stale and no way to tell
 * which half; a version and a timestamp make both answerable.
 *
 * Nothing here identifies anyone. It never leaves the browser.
 */
export const SETTINGS_STORAGE_KEY = 'perigee:settings'

/** The single key `useAmbientSound` wrote before this store existed. */
export const LEGACY_SOUND_STORAGE_KEY = 'perigee:ambient-sound'

export const SETTINGS_VERSION = 1

/**
 * How long a stored record is honoured. Past it the visitor is treated as new,
 * so the staged reveal and the music offer come back for someone who has been
 * away long enough to have forgotten the place.
 */
export const SETTINGS_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1_000

export type SoundDecision = 'on' | 'off'

export interface PerigeeSettings {
  version: number
  /** Epoch milliseconds, restamped on every write. Drives the expiry above. */
  updatedAt: number
  /** `null` means the offer has never been made or answered. */
  sound: SoundDecision | null
  volume: number | null
  /** The highest disclosure stage reached. See `disclosureStages.ts`. */
  stage: DisclosureStage | null
}

export type SettingsPatch = Partial<Omit<PerigeeSettings, 'version' | 'updatedAt'>>

/**
 * `undefined` means storage has not been read yet, `null` that it was read and
 * held nothing usable. Both answer "no settings"; only the first triggers a read.
 */
let cache: PerigeeSettings | null | undefined

function blankSettings(now: number): PerigeeSettings {
  return { version: SETTINGS_VERSION, updatedAt: now, sound: null, volume: null, stage: null }
}

function isSoundDecision(value: unknown): value is SoundDecision {
  return value === 'on' || value === 'off'
}

function isStage(value: unknown): value is DisclosureStage {
  return typeof value === 'string' && (DISCLOSURE_STAGES as readonly string[]).includes(value)
}

function isVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

/**
 * Every field is checked, and a record that fails anywhere is dropped whole.
 * This is the one input the interface takes from outside itself, and a visitor
 * who lands on a first visit has lost nothing; one who lands on a stage that
 * does not exist has an interface that never opens.
 */
export function parseSettings(raw: string | null, now: number): PerigeeSettings | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  if (record.version !== SETTINGS_VERSION) return null
  const updatedAt = record.updatedAt
  if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return null
  // A clock that has gone backwards since the write reads as a record from the
  // future; it is not stale, so it is kept.
  if (now - updatedAt > SETTINGS_MAX_AGE_MS) return null

  return {
    version: SETTINGS_VERSION,
    updatedAt,
    sound: isSoundDecision(record.sound) ? record.sound : null,
    volume: isVolume(record.volume) ? record.volume : null,
    stage: isStage(record.stage) ? record.stage : null,
  }
}

/** Storage can be missing on the server and can throw in locked-down contexts. */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * A visitor who answered the music offer before this store existed keeps that
 * answer. Only ever tried when the new key is absent, so a record that failed
 * validation is not quietly rebuilt from a key that should already be gone.
 */
function migrateLegacy(store: Storage, now: number): PerigeeSettings | null {
  let legacy: string | null
  try {
    legacy = store.getItem(LEGACY_SOUND_STORAGE_KEY)
  } catch {
    return null
  }
  if (!isSoundDecision(legacy)) return null
  const settings: PerigeeSettings = { ...blankSettings(now), sound: legacy }
  try {
    store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    store.removeItem(LEGACY_SOUND_STORAGE_KEY)
  } catch {
    // The answer still applies for this page lifetime.
  }
  return settings
}

function loadSettings(): PerigeeSettings | null {
  const store = storage()
  if (!store) return null
  const now = Date.now()
  let raw: string | null
  try {
    raw = store.getItem(SETTINGS_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return migrateLegacy(store, now)
  return parseSettings(raw, now)
}

export function readSettings(): PerigeeSettings | null {
  if (cache === undefined) cache = loadSettings()
  return cache
}

/** Merges over what is already stored and restamps the expiry. */
export function saveSettings(patch: SettingsPatch): void {
  const now = Date.now()
  const next: PerigeeSettings = {
    ...(readSettings() ?? blankSettings(now)),
    ...patch,
    version: SETTINGS_VERSION,
    updatedAt: now,
  }
  // Kept in memory whether or not the write lands, so the session stays
  // consistent where storage is unavailable.
  cache = next
  const store = storage()
  if (!store) return
  try {
    store.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private or full storage. The settings hold for this page lifetime.
  }
}

/**
 * Restamps the expiry without changing anything. A returning visitor whose
 * interface is already fully open changes no setting all session, and would
 * otherwise expire ninety days after the last thing they happened to alter.
 */
export function touchSettings(): void {
  saveSettings({})
}

export function clearSettings(): void {
  cache = undefined
  const store = storage()
  if (!store) return
  try {
    store.removeItem(SETTINGS_STORAGE_KEY)
    store.removeItem(LEGACY_SOUND_STORAGE_KEY)
  } catch {
    // Nothing to undo.
  }
}
