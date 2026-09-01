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

export interface EncounterPredictionOption {
  id: string
  label: string
  /** Neutral and curiosity-supporting. No option is presented as wrong. */
  response: string
}

/** Optional invitation to guess before the scene answers. Never scored. */
export interface EncounterPrediction {
  id: string
  question: string
  options: EncounterPredictionOption[]
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
  /** Answering advances to the next beat, so the scene itself is the reveal. */
  prediction?: EncounterPrediction
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

/** One manually curated monthly doorway into an existing approved encounter. */
export interface FeaturedEncounterDefinition {
  id: string
  /** UTC calendar month in YYYY-MM form. Missing months intentionally stay empty. */
  month: string
  encounterId: string
  /** Short label for the persistent entry point at narrow viewports. */
  shortTitle: string
  /** One sentence shown only after the visitor opens the feature. */
  summary: string
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
