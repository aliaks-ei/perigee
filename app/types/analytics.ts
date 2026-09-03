import type { SkyObjectId, ViewpointId } from '~/types/perigee'

export interface EngagementEventMap {
  scene_ready: { loadMs: number }
  first_interaction: { kind: 'object' | 'distance' | 'viewpoint' | 'encounter' }
  object_change: { objectId: SkyObjectId }
  distance_change: { objectId: SkyObjectId; presetId: string }
  viewpoint_change: { viewpointId: ViewpointId }
  encounter_start: { encounterId: string }
  encounter_beat: { encounterId: string; beatIndex: number }
  encounter_exit: { encounterId: string; beatIndex: number }
  encounter_complete: { encounterId: string }
  prediction_answer: { encounterId: string; predictionId: string; optionId: string }
  featured_encounter_open: { month: string; hasCurrent: boolean }
  more_open: { hasCurrent: boolean }
  featured_encounter_select: {
    featureId: string
    encounterId: string
    placement: 'current' | 'archive'
  }
  discovery_open: { discoveryId: string }
  capture: { outcome: 'attempt' | 'complete' | 'failed' }
  share: { outcome: 'attempt' | 'complete' | 'cancelled' | 'failed' }
}

export type EngagementEventName = keyof EngagementEventMap

export interface EngagementEvent<Name extends EngagementEventName = EngagementEventName> {
  name: Name
  properties: EngagementEventMap[Name]
  occurredAt: string
  activeTimeMs: number
}

export interface AnalyticsProvider {
  track<Name extends EngagementEventName>(event: EngagementEvent<Name>): void | Promise<void>
}
