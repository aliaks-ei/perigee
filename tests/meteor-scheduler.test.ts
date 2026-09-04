import { describe, expect, it } from 'vitest'
import {
  MAX_METEOR_GAP_SECONDS,
  MAX_METEOR_DURATION_SECONDS,
  MeteorScheduler,
  MIN_METEOR_GAP_SECONDS,
  MIN_METEOR_DURATION_SECONDS,
  meteorGapSeconds,
} from '../src/perigee/MeteorScheduler'

describe('meteor timing', () => {
  it('keeps every quiet interval between thirty and sixty seconds', () => {
    expect(meteorGapSeconds(() => 0)).toBe(MIN_METEOR_GAP_SECONDS)
    expect(meteorGapSeconds(() => 0.999)).toBeLessThan(MAX_METEOR_GAP_SECONDS)
  })

  it('never starts a second meteor while one is active', () => {
    const scheduler = new MeteorScheduler(() => 0, true)
    expect(scheduler.update(29.9).active).toBe(false)
    expect(scheduler.update(30)).toEqual({ active: true, started: true, progress: 0 })
    expect(scheduler.update(30.3).started).toBe(false)
    expect(scheduler.update(31).active).toBe(true)
    expect(scheduler.update(31.16).active).toBe(false)
    expect(scheduler.update(59.9).active).toBe(false)
    expect(scheduler.update(60)).toEqual({ active: true, started: true, progress: 0 })
  })

  it('uses a slower, bounded glide', () => {
    expect(MIN_METEOR_DURATION_SECONDS).toBeGreaterThan(1)
    expect(MAX_METEOR_DURATION_SECONDS).toBeLessThan(2)
  })

  it('stays completely still when reduced motion disables the layer', () => {
    const scheduler = new MeteorScheduler(() => 0, false)
    expect(scheduler.update(1_000)).toEqual({ active: false, started: false, progress: 0 })
  })
})
