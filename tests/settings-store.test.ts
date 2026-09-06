import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  LEGACY_SOUND_STORAGE_KEY,
  SETTINGS_MAX_AGE_MS,
  SETTINGS_STORAGE_KEY,
  SETTINGS_VERSION,
  clearSettings,
  parseSettings,
  readSettings,
  saveSettings,
  touchSettings,
} from '../app/utils/settingsStore'

const NOW = 1_700_000_000_000

function record(fields: Record<string, unknown>): string {
  return JSON.stringify({ version: SETTINGS_VERSION, updatedAt: NOW, ...fields })
}

class FakeStorage {
  private readonly entries = new Map<string, string>()
  throwOnWrite = false

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.throwOnWrite) throw new Error('QuotaExceededError')
    this.entries.set(key, value)
  }

  removeItem(key: string): void {
    this.entries.delete(key)
  }

  get size(): number {
    return this.entries.size
  }
}

describe('parseSettings', () => {
  it('reads a complete record', () => {
    const settings = parseSettings(
      record({ sound: 'on', volume: 0.6, stage: 'explore' }),
      NOW,
    )
    expect(settings).toEqual({
      version: SETTINGS_VERSION,
      updatedAt: NOW,
      sound: 'on',
      volume: 0.6,
      stage: 'explore',
    })
  })

  it('drops a record from another version', () => {
    expect(parseSettings(JSON.stringify({ version: 99, updatedAt: NOW, sound: 'on' }), NOW)).toBeNull()
  })

  it('drops what it cannot parse', () => {
    expect(parseSettings(null, NOW)).toBeNull()
    expect(parseSettings('', NOW)).toBeNull()
    expect(parseSettings('not json', NOW)).toBeNull()
    expect(parseSettings('"a string"', NOW)).toBeNull()
    expect(parseSettings('null', NOW)).toBeNull()
  })

  it('drops a record with no usable timestamp', () => {
    expect(parseSettings(JSON.stringify({ version: SETTINGS_VERSION, sound: 'on' }), NOW)).toBeNull()
    expect(parseSettings(`{"version":${SETTINGS_VERSION},"updatedAt":"recently"}`, NOW)).toBeNull()
  })

  it('honours a record inside the expiry window and drops one past it', () => {
    const written = NOW - SETTINGS_MAX_AGE_MS
    const raw = JSON.stringify({ version: SETTINGS_VERSION, updatedAt: written, stage: 'deepen' })
    expect(parseSettings(raw, NOW)?.stage).toBe('deepen')
    expect(parseSettings(raw, NOW + 1)).toBeNull()
  })

  it('keeps a record whose timestamp is ahead of the clock', () => {
    expect(parseSettings(record({ stage: 'orient' }), NOW - 60_000)?.stage).toBe('orient')
  })

  it('clears fields it does not recognise without dropping the record', () => {
    const settings = parseSettings(
      record({ sound: 'maybe', volume: 4, stage: 'transcend' }),
      NOW,
    )
    expect(settings).toMatchObject({ sound: null, volume: null, stage: null })
  })

  it('rejects a volume outside 0 to 1', () => {
    expect(parseSettings(record({ volume: -0.1 }), NOW)?.volume).toBeNull()
    expect(parseSettings(record({ volume: Number.POSITIVE_INFINITY }), NOW)?.volume).toBeNull()
    expect(parseSettings(record({ volume: 0 }), NOW)?.volume).toBe(0)
    expect(parseSettings(record({ volume: 1 }), NOW)?.volume).toBe(1)
  })
})

describe('the stored record', () => {
  let store: FakeStorage

  beforeEach(() => {
    store = new FakeStorage()
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: store },
      configurable: true,
      writable: true,
    })
    clearSettings()
  })

  afterEach(() => {
    clearSettings()
    Reflect.deleteProperty(globalThis, 'window')
  })

  it('reads nothing on a first visit', () => {
    expect(readSettings()).toBeNull()
  })

  it('merges a patch over what is already stored', () => {
    saveSettings({ sound: 'on' })
    saveSettings({ stage: 'explore' })
    expect(readSettings()).toMatchObject({ sound: 'on', stage: 'explore', volume: null })
  })

  it('restamps the expiry on every write', () => {
    saveSettings({ sound: 'off' })
    const first = readSettings()?.updatedAt ?? 0
    touchSettings()
    expect(readSettings()?.updatedAt).toBeGreaterThanOrEqual(first)
    expect(readSettings()?.sound).toBe('off')
  })

  it('carries the answer written before the settings store existed', () => {
    store.setItem(LEGACY_SOUND_STORAGE_KEY, 'on')

    expect(readSettings()).toMatchObject({ sound: 'on', stage: null, volume: null })
    expect(store.getItem(LEGACY_SOUND_STORAGE_KEY)).toBeNull()
    expect(store.getItem(SETTINGS_STORAGE_KEY)).not.toBeNull()
  })

  it('ignores a legacy key holding something else', () => {
    store.setItem(LEGACY_SOUND_STORAGE_KEY, 'yes please')
    expect(readSettings()).toBeNull()
  })

  it('does not rebuild an unusable record from the legacy key', () => {
    store.setItem(SETTINGS_STORAGE_KEY, 'not json')
    store.setItem(LEGACY_SOUND_STORAGE_KEY, 'on')
    expect(readSettings()).toBeNull()
  })

  it('keeps settings for the page lifetime when the write is refused', () => {
    store.throwOnWrite = true
    saveSettings({ sound: 'on', stage: 'deepen' })
    expect(readSettings()).toMatchObject({ sound: 'on', stage: 'deepen' })
    expect(store.size).toBe(0)
  })

  it('survives having no storage at all', () => {
    Reflect.deleteProperty(globalThis, 'window')
    clearSettings()
    expect(readSettings()).toBeNull()
    expect(() => saveSettings({ stage: 'orient' })).not.toThrow()
  })
})
