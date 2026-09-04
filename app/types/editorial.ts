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

/**
 * Prose for one object's own page under `/o/`.
 *
 * It deliberately carries no numbers. Every figure an object page shows is
 * derived at render time from `app/data/objects.ts`, so the page and the live
 * scene can never disagree about how much sky something fills.
 */
export interface ObjectEditorialDefinition {
  objectId: SkyObjectId
  /** The page's `h1`. Names the object, because that is what is searched for. */
  headline: string
  /** The object's name as it reads inside a sentence: "the Moon", "Mars". */
  subject: string
  /** Two or three sentences answering "what is this object" without numbers. */
  summary: string
  boundary: SimulationBoundary
  /**
   * The `h2` for each rung, written as the question a person would type. These
   * are authored rather than derived from preset labels: the heading is the
   * query, and a heading that matches the query is what gets quoted back by a
   * search result or an AI answer. One per preset id, keys matching exactly.
   */
  questions: Record<string, string>
  /** One line per preset id in the object's ladder. Keys must match exactly. */
  whatYouSee: Record<string, string>
  sourceIds: string[]
  reviewState: EditorialReviewState
}

export interface ResolvedDiscovery extends Omit<DiscoveryDefinition, 'calculation'> {
  glance: string
  calculatedValue?: number
}
