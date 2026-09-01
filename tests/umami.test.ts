import { describe, expect, it } from 'vitest'
import { createAnalytics } from '../app/utils/analytics'
import {
  activeTimeBucket,
  createUmamiProvider,
  umamiPayload,
  type UmamiTracker,
} from '../app/utils/umami'

function recorder(): UmamiTracker & { calls: Array<[string, unknown]> } {
  const calls: Array<[string, unknown]> = []
  return { calls, track: (name, data) => void calls.push([name, data]) }
}

describe('umami provider', () => {
  it('buckets active time instead of sending raw milliseconds', () => {
    expect(activeTimeBucket(0)).toBe('0-30s')
    expect(activeTimeBucket(29_999)).toBe('0-30s')
    expect(activeTimeBucket(30_000)).toBe('30-60s')
    expect(activeTimeBucket(120_000)).toBe('2-5m')
    expect(activeTimeBucket(600_000)).toBe('10m+')
    // A clock that somehow ran backwards must not produce a negative bucket.
    expect(activeTimeBucket(-5_000)).toBe('0-30s')
  })

  it('sends the event properties alongside the bucketed active time', () => {
    expect(umamiPayload({
      name: 'encounter_beat',
      properties: { encounterId: 'saturn-moon-distance', beatIndex: 2 },
      occurredAt: '2026-09-01T00:00:00.000Z',
      activeTimeMs: 65_000,
    })).toEqual({
      encounterId: 'saturn-moon-distance',
      beatIndex: 2,
      activeTime: '1-2m',
    })
  })

  it('drops events silently while the tracker is missing', () => {
    const provider = createUmamiProvider(() => undefined)
    expect(() => provider.track({
      name: 'capture',
      properties: { outcome: 'complete' },
      occurredAt: '2026-09-01T00:00:00.000Z',
      activeTimeMs: 1_000,
    })).not.toThrow()
  })

  it('replays buffered events when the script attaches late, then goes live', () => {
    const analytics = createAnalytics()
    analytics.track('scene_ready', { loadMs: 900 })
    analytics.track('object_change', { objectId: 'saturn' })

    const tracker = recorder()
    const provider = createUmamiProvider(() => tracker)
    for (const event of analytics.inspect()) provider.track(event)
    analytics.setProvider(provider)

    analytics.track('encounter_start', { encounterId: 'saturn-moon-distance' })

    expect(tracker.calls.map(([name]) => name)).toEqual([
      'scene_ready',
      'object_change',
      'encounter_start',
    ])
  })

  it('never lets a tracker that throws synchronously reach the scene', () => {
    const analytics = createAnalytics()
    analytics.setProvider({
      track: () => {
        throw new Error('blocked by an extension')
      },
    })
    expect(() => analytics.track('share', { outcome: 'attempt' })).not.toThrow()
    expect(analytics.inspect()).toHaveLength(1)
  })
})
