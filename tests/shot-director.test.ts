import { describe, expect, it } from 'vitest'
import { ShotDirector } from '../src/perigee/ShotDirector'

/**
 * Every transition unlocks the interface when its promise settles. A promise
 * that never settles leaves the controls disabled for good, so each exit path
 * from a timeline has to be covered.
 */
describe('ShotDirector', () => {
  it('settles the promise when the timeline finishes normally', async () => {
    const director = new ShotDirector()
    const target = { value: 0 }

    const shot = director.replace((timeline) => {
      timeline.to(target, { value: 1, duration: 0.01 })
    })

    await expect(shot).resolves.toBe('completed')
    expect(target.value).toBe(1)
  })

  it('settles a running promise when finish() lands the transition early', async () => {
    const director = new ShotDirector()
    const target = { value: 0 }

    // A long transition that would never complete on its own inside the test.
    const shot = director.replace((timeline) => {
      timeline.to(target, { value: 1, duration: 30 })
    })

    // This is what a backgrounded tab does: rAF stops, so GSAP stops with it.
    director.finish()

    await expect(shot).resolves.toBe('completed')
    expect(target.value).toBe(1)
  })

  it('settles the previous promise when a new transition replaces it', async () => {
    const director = new ShotDirector()
    let previousSettled = false

    const first = director.replace((timeline) => {
      timeline.to({ value: 0 }, { value: 1, duration: 30 })
    })
    first.then(() => { previousSettled = true })

    const second = director.replace((timeline) => {
      timeline.to({ value: 0 }, { value: 1, duration: 0.01 })
    })

    await first
    expect(previousSettled).toBe(true)
    await expect(second).resolves.toBe('completed')
  })

  it('settles the promise when the director is killed on teardown', async () => {
    const director = new ShotDirector()

    const shot = director.replace((timeline) => {
      timeline.to({ value: 0 }, { value: 1, duration: 30 })
    })
    director.kill()

    await expect(shot).resolves.toBe('disposed')
  })
})

describe('shot interruption state', () => {
  it('finishes proxy-owned state before its first tick exactly once', async () => {
    const director = new ShotDirector()
    const proxy = { value: 0 }
    let rendered = 0
    let updates = 0
    const shot = director.replace((timeline) => {
      timeline.to(proxy, { value: 1, duration: 30, onUpdate: () => { rendered = proxy.value; updates += 1 } })
    })
    director.finish()
    director.finish()
    director.kill()
    expect(await shot).toBe('completed')
    expect(rendered).toBe(1)
    expect(updates).toBe(1)
  })

  it('replaces from the rendered midpoint instead of the abandoned endpoint', async () => {
    const director = new ShotDirector()
    const proxy = { value: 0 }
    const first = director.replace((timeline) => {
      timeline.to(proxy, { value: 100, duration: 30, ease: 'none' })
      timeline.progress(0.5)
    })
    const second = director.replace((timeline) => { timeline.to(proxy, { value: 20, duration: 30 }) })
    expect(await first).toBe('interrupted')
    expect(proxy.value).toBe(50)
    director.finish()
    expect(await second).toBe('completed')
    expect(proxy.value).toBe(20)
  })

  it('settles an empty shot', async () => {
    expect(await new ShotDirector().replace(() => undefined)).toBe('completed')
  })
})
