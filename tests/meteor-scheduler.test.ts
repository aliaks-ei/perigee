import { describe, expect, it } from 'vitest'
import {
  MAX_METEOR_GAP_SECONDS,
  MAX_METEOR_DURATION_SECONDS,
  MeteorScheduler,
  MIN_METEOR_GAP_SECONDS,
  MIN_METEOR_DURATION_SECONDS,
  meteorGapSeconds,
  FIREBALL_TRAIN_SECONDS,
} from '../src/perigee/MeteorScheduler'

describe('meteor timing', () => {
  it('keeps every quiet interval between thirty and sixty seconds', () => {
    expect(meteorGapSeconds(() => 0)).toBe(MIN_METEOR_GAP_SECONDS)
    expect(meteorGapSeconds(() => 0.999)).toBeLessThan(MAX_METEOR_GAP_SECONDS)
  })

  it('never starts a second meteor while one is active', () => {
    const scheduler = new MeteorScheduler(() => 0, true)
    expect(scheduler.update(29.9).active).toBe(false)
    expect(scheduler.update(30)).toMatchObject({ active: true, started: true, progress: 0, fireball: false })
    expect(scheduler.update(30.3).started).toBe(false)
    expect(scheduler.update(30.44).active).toBe(true)
    expect(scheduler.update(30.46).active).toBe(false)
    expect(scheduler.update(59.9).active).toBe(false)
    expect(scheduler.update(60).active).toBe(false)
    expect(scheduler.update(60.45)).toMatchObject({ active: true, started: true, progress: 0 })
  })

  it('keeps everyday meteors quick and bounded', () => {
    expect(MIN_METEOR_DURATION_SECONDS).toBe(.45)
    expect(MAX_METEOR_DURATION_SECONDS).toBe(.85)
  })

  it('ages a rare fireball train separately, with a full quiet gap after it', () => {
    const values = [0, .99, .5, 0]
    const scheduler = new MeteorScheduler(() => values.shift() ?? 0, true)
    const start = { ...scheduler.update(30) }
    expect(start.fireball).toBe(true)
    expect(start.duration).toBe(.95)
    expect(scheduler.update(31)).toMatchObject({ active: true, started: false, progress: 1, age: 1 })
    expect(scheduler.update(30 + start.duration + FIREBALL_TRAIN_SECONDS + .001).active).toBe(false)
    expect(scheduler.update(63).active).toBe(false)
    expect(scheduler.update(63.16).started).toBe(true)
  })

  it('makes fireballs a small minority of a varied deterministic event stream', () => {
    let seed = 193
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
    const scheduler = new MeteorScheduler(random, true)
    let total = 0, fireballs = 0
    for (let time=0; time<100_000; time++) {
      const state = scheduler.update(time)
      if (state.started) { total++; if (state.fireball) fireballs++ }
    }
    expect(total).toBeGreaterThan(1000)
    expect(fireballs / total).toBeGreaterThan(.02)
    expect(fireballs / total).toBeLessThan(.05)
  })

  it('stays completely still when reduced motion disables the layer', () => {
    const scheduler = new MeteorScheduler(() => 0, false)
    expect(scheduler.update(1_000)).toMatchObject({ active: false, started: false, progress: 0, age: 0 })
  })
})
