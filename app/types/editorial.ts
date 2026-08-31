import type { SkyObjectId, ViewpointId } from '~/types/perigee'

export type EditorialReviewState = 'draft' | 'scientifically-checked' | 'approved'

/** Describes what a visitor is seeing without overstating the scene engine. */
export type SimulationBoundary = 'rendered' | 'calculated' | 'described-not-simulated'

export interface ScienceSource {
  id: string
  title: string
  publisher: string
  url: string
  reviewedOn: string
}

export interface EncounterSelection {
  objectId: SkyObjectId
  presetId: string
  viewpointId: ViewpointId
}

export interface EncounterBeat {
  id: string
  selection: EncounterSelection
  /** Short enough to appear only after the scene transition has landed. */
  observation: string
  /** The explicit action that advances from this beat. */
  actionLabel: string
  /** Shown while this beat's scene selection is arriving. */
  transitionLabel?: string
  /** Adds a camera-tracked marker when the real-distance object is easy to miss. */
  locatorLabel?: string
  discoveryId?: string
}

export interface EncounterDefinition {
  id: string
  slug: string
  title: string
  invitation: string
  estimatedMinutes: number
  beats: EncounterBeat[]
  reviewState: EditorialReviewState
}

export type DiscoveryCalculation =
  | {
      kind: 'moon-widths'
      objectId: SkyObjectId
      presetId: string
      decimals: number
    }
  | {
      kind: 'light-travel-time'
      objectId: SkyObjectId
      presetId: string
      decimals: number
    }

export interface DiscoveryScope {
  objectId: SkyObjectId
  presetId?: string
  viewpointId?: ViewpointId
  encounterId?: string
  beatId?: string
}

export interface DiscoveryDefinition {
  id: string
  scope: DiscoveryScope
  /** One calm sentence. Use {{value}} only when `calculation` is present. */
  glance: string
  detail: string
  boundary: SimulationBoundary
  calculation?: DiscoveryCalculation
  sourceIds: string[]
  reviewState: EditorialReviewState
}

export interface ResolvedDiscovery extends Omit<DiscoveryDefinition, 'calculation'> {
  glance: string
  calculatedValue?: number
}
