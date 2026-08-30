import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QualityManager } from '../src/perigee/QualityManager'

function feed(manager: QualityManager, deltaMs: number, frames: number): string | null {
  let result: string | null = null
  for (let index = 0; index < frames; index += 1) {
    result = manager.sample(deltaMs) ?? result
  }
  return result
}

/**
 * A transient stall used to demote the renderer for the rest of the session.
 * The tier has to be able to come back, without flapping between tiers on a
 * device that sits on the boundary.
 */
describe('QualityManager', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { deviceMemory: 8, hardwareConcurrency: 8 })
  })

  it('starts on the tier the device reports', () => {
    expect(new QualityManager().current).toBe('high')
  })

  it('downgrades only after sustained slow frames', () => {
    const manager = new QualityManager()
    expect(feed(manager, 40, 100)).toBeNull()
    expect(manager.current).toBe('high')
    expect(feed(manager, 40, 240)).toBe('balanced')
  })

  it('recovers the tier after a long run of fast frames', () => {
    const manager = new QualityManager()
    feed(manager, 40, 340)
    expect(manager.current).toBe('balanced')
    expect(feed(manager, 8, 900)).toBe('high')
  })

  it('does not oscillate once the recovery has been spent', () => {
    const manager = new QualityManager()
    feed(manager, 40, 340)
    feed(manager, 8, 900)
    feed(manager, 40, 340)
    expect(manager.current).toBe('balanced')
    expect(feed(manager, 8, 2_000)).toBeNull()
    expect(manager.current).toBe('balanced')
  })
})
