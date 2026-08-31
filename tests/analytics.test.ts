import { describe, expect, it } from 'vitest'
import { ActiveTimeClock, createAnalytics } from '../app/utils/analytics'

describe('analytics adapter', () => {
  it('counts active time while excluding hidden and idle time', () => {
    let now = 0
    const clock = new ActiveTimeClock(() => now)
    clock.start()
    now = 10_000
    expect(clock.value()).toBe(10_000)
    now = 80_000
    expect(clock.value()).toBe(60_000)
    clock.activity()
    now = 85_000
    clock.suspend()
    expect(clock.value()).toBe(65_000)
  })

  it('records one first interaction and never lets provider failure escape', async () => {
    const analytics = createAnalytics({
      provider: { track: () => Promise.reject(new Error('offline')) },
    })
    analytics.interaction('encounter')
    analytics.interaction('distance')
    analytics.track('encounter_start', { encounterId: 'saturn-moon-distance' })
    await Promise.resolve()
    expect(analytics.inspect().map((event) => event.name)).toEqual([
      'first_interaction',
      'encounter_start',
    ])
  })
})
