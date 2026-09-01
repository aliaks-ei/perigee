import type {
  AnalyticsProvider,
  EngagementEvent,
  EngagementEventMap,
  EngagementEventName,
} from '../types/analytics'

const IDLE_AFTER_MS = 60_000

export class ActiveTimeClock {
  private accumulatedMs = 0
  private activeSince: number | null = null
  private lastActivityAt: number

  constructor(private readonly now: () => number = () => Date.now()) {
    this.lastActivityAt = now()
  }

  start(): void {
    const current = this.now()
    this.lastActivityAt = current
    this.activeSince = current
  }

  activity(): void {
    const current = this.now()
    this.lastActivityAt = current
    if (this.activeSince === null) this.activeSince = current
  }

  suspend(): void {
    this.flush()
    this.activeSince = null
  }

  value(): number {
    this.flush()
    return Math.round(this.accumulatedMs)
  }

  private flush(): void {
    if (this.activeSince === null) return
    const current = this.now()
    const activeUntil = Math.min(current, this.lastActivityAt + IDLE_AFTER_MS)
    this.accumulatedMs += Math.max(0, activeUntil - this.activeSince)
    this.activeSince = current < this.lastActivityAt + IDLE_AFTER_MS ? current : null
  }
}

export function createAnalytics(options: {
  provider?: AnalyticsProvider
  clock?: ActiveTimeClock
} = {}) {
  const clock = options.clock ?? new ActiveTimeClock()
  const events: EngagementEvent[] = []
  let firstInteractionRecorded = false
  // Mutable: the real provider only exists once its third-party script has
  // loaded, which is long after this module is evaluated.
  let provider = options.provider

  function track<Name extends EngagementEventName>(
    name: Name,
    properties: EngagementEventMap[Name],
  ): void {
    const event: EngagementEvent<Name> = {
      name,
      properties,
      occurredAt: new Date().toISOString(),
      activeTimeMs: clock.value(),
    }
    events.push(event as EngagementEvent)
    if (!provider) return
    // A third-party tracker may throw synchronously as well as reject, and
    // neither may reach the scene.
    try {
      Promise.resolve(provider.track(event)).catch(() => undefined)
    } catch {
      // Ignored on purpose: measurement never blocks the experience.
    }
  }

  function interaction(kind: EngagementEventMap['first_interaction']['kind']): void {
    clock.activity()
    if (firstInteractionRecorded) return
    firstInteractionRecorded = true
    track('first_interaction', { kind })
  }

  return {
    clock,
    track,
    interaction,
    setProvider: (next: AnalyticsProvider): void => {
      provider = next
    },
    inspect: (): readonly EngagementEvent[] => events,
  }
}

export const analytics = createAnalytics()
