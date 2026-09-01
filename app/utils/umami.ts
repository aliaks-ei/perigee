import type { AnalyticsProvider, EngagementEvent } from '../types/analytics'

/** The one method the provider needs from Umami's global. */
export interface UmamiTracker {
  track: (name: string, data?: Record<string, string | number | boolean>) => void
}

/**
 * Umami bills every stored property as an event and groups its property
 * browser by exact value, so raw millisecond counts would burn through the
 * quota and fill the dashboard with thousands of single-visit rows. Coarse
 * buckets stay readable and still answer the ten-minute engaged-time
 * hypothesis in the plan.
 */
export function activeTimeBucket(activeTimeMs: number): string {
  const seconds = Math.max(0, activeTimeMs) / 1000
  if (seconds < 30) return '0-30s'
  if (seconds < 60) return '30-60s'
  if (seconds < 120) return '1-2m'
  if (seconds < 300) return '2-5m'
  if (seconds < 600) return '5-10m'
  return '10m+'
}

export function umamiPayload(
  event: EngagementEvent,
): Record<string, string | number | boolean> {
  return { ...event.properties, activeTime: activeTimeBucket(event.activeTimeMs) }
}

/**
 * `resolve` is read per call rather than captured once: the tracker only
 * exists after Umami's script has run, and a content blocker can remove it
 * again at any point.
 */
export function createUmamiProvider(
  resolve: () => UmamiTracker | undefined,
): AnalyticsProvider {
  return {
    track(event) {
      resolve()?.track(event.name, umamiPayload(event))
    },
  }
}
