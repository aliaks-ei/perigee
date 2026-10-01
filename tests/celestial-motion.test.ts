import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { CelestialClock } from '../src/perigee/motion/CelestialClock'
import { rotationPhase, rotationQuaternion } from '../src/perigee/math/rotation'
import { objectMotion, rotationSpeeds } from '../app/data/objectMotion'
import { rendererFor, renderingPolicy } from '../src/perigee/objects/renderingPolicy'

const model = { periodSeconds: 100, direction: 'prograde' as const, initialPhaseRadians: .2 }

describe('deterministic celestial time', () => {
  it('pauses cinematic spin independently and resumes at real rate without resetting phase', () => {
    const clock = new CelestialClock()
    clock.setRates(rotationSpeeds.cinematic, 1, 0)
    expect(clock.advance(2000)).toEqual({ simulatedSeconds: 240, evolutionSeconds: 2 })
    clock.setRates(0, 1, 2000)
    expect(clock.advance(7000)).toEqual({ simulatedSeconds: 240, evolutionSeconds: 7 })
    clock.setRates(rotationSpeeds.real, 1, 7000)
    expect(clock.advance(8000)).toEqual({ simulatedSeconds: 241, evolutionSeconds: 8 })
    expect(objectMotion.jupiter.periodSeconds! / rotationSpeeds.cinematic).toBe(297)
  })
  it('arrives at the same pose at 30 and 144 Hz, including long frames', () => {
    const simulate = (hz: number) => {
      const clock = new CelestialClock()
      clock.advance(0)
      for (let i = 1; i <= hz * 10; i++) clock.advance(i * 1000 / hz)
      return clock.advance(20_000)
    }
    const slow = simulate(30)
    const fast = simulate(144)
    expect(slow.simulatedSeconds).toBeCloseTo(20, 10)
    expect(rotationPhase(model, slow.simulatedSeconds)).toBeCloseTo(rotationPhase(model, fast.simulatedSeconds), 10)
  })

  it('integrates rate changes without jumping and separates evolution', () => {
    const clock = new CelestialClock()
    clock.advance(0)
    clock.setRates(60, .5, 1000)
    expect(clock.snapshot()).toEqual({ simulatedSeconds: 1, evolutionSeconds: 1 })
    expect(clock.advance(2000)).toEqual({ simulatedSeconds: 61, evolutionSeconds: 1.5 })
    clock.setRates(1, 1, 2000)
    expect(clock.advance(3000).simulatedSeconds).toBe(62)
  })

  it('honors independent pause/hidden/reduced-motion blocks without catch-up', () => {
    const clock = new CelestialClock()
    clock.advance(0)
    clock.setBlocked('hidden', true, 1000)
    clock.setBlocked('reduced-motion', true, 2000)
    clock.setBlocked('hidden', false, 60_000)
    expect(clock.advance(61_000).simulatedSeconds).toBe(1)
    clock.setBlocked('reduced-motion', false, 62_000)
    expect(clock.advance(63_000).simulatedSeconds).toBe(2)
    clock.setBlocked('paused', true, 63_000)
    clock.setBlocked('paused', false, 99_000)
    expect(clock.advance(100_000).simulatedSeconds).toBe(3)
  })

  it('freezes the rendered pose across nested export retries and releases idempotently', () => {
    const clock = new CelestialClock()
    clock.advance(0)
    clock.advance(1000)
    const capture = clock.freeze()
    const retry = clock.freeze()
    expect(Object.isFrozen(capture.snapshot)).toBe(true)
    expect(clock.advance(10_000)).toEqual(capture.snapshot)
    capture.release(20_000)
    capture.release(30_000)
    expect(clock.advance(40_000)).toEqual(capture.snapshot)
    retry.release(50_000)
    expect(clock.advance(51_000).simulatedSeconds).toBe(2)
  })

  it('keeps explicit retrograde direction and rejects invalid periods', () => {
    const prograde = new Vector3(1, 0, 0).applyQuaternion(rotationQuaternion({ ...model, initialPhaseRadians: 0 }, 25))
    const retrograde = new Vector3(1, 0, 0).applyQuaternion(rotationQuaternion({ ...model, initialPhaseRadians: 0, direction: 'retrograde' }, 25))
    expect(prograde.z).toBeCloseTo(-1)
    expect(retrograde.z).toBeCloseTo(1)
    expect(rotationPhase({ ...model, periodSeconds: null }, 1e9)).toBeCloseTo(.2)
    expect(() => rotationPhase({ ...model, periodSeconds: -10 }, 1)).toThrow('INVALID_ROTATION_PERIOD')
  })

  it('promotes nine approved globes while retaining portrait rollback', () => {
    for (const id of Object.keys(renderingPolicy) as (keyof typeof renderingPolicy)[]) expect(rendererFor(id, {})).toBe(id === 'andromeda' ? 'portrait' : 'globe')
    expect(rendererFor('jupiter', { jupiter: 'globe-pilot' })).toBe('globe')
    expect(rendererFor('jupiter', { jupiter: 'portrait' })).toBe('portrait')
    expect(rendererFor('saturn', { saturn: 'portrait' })).toBe('portrait')
    expect(rendererFor('betelgeuse', { betelgeuse: 'portrait' })).toBe('portrait')
    expect(rendererFor('sirius', { sirius: 'portrait' })).toBe('portrait')
    expect(rendererFor('sun', { sun: 'portrait' })).toBe('portrait')
    expect(rendererFor('rigel', { rigel: 'portrait' })).toBe('portrait')
    for (const id of ['sun', 'betelgeuse', 'sirius', 'rigel'] as const) expect(objectMotion[id].periodSeconds).toBeNull()
    expect(objectMotion.jupiter.periodSeconds).toBe(35_640)
  })
})
