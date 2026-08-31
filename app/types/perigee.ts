export type SkyObjectId =
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'neptune'
  | 'betelgeuse'
  | 'sirius'
  | 'rigel'

export type ViewpointId = 'rooftop' | 'hilltop' | 'lakeside'
export type QualityTier = 'high' | 'balanced' | 'safe'

export interface DistancePreset {
  id: string
  label: string
  metadataLabel?: string
  distanceKm: number
  hazardCopy?: string
}

export interface ShotDefinition {
  timeOfDay: number
  exposure: number
  sunDirection: [number, number, number]
  skyPalette: [string, string, string]
  objectYaw: number
  objectPitch: number
  ringTilt?: number
  environmentTint?: string
  accent: string
}

export interface SkyObjectDefinition {
  id: SkyObjectId
  label: string
  kind: 'moon' | 'planet' | 'star'
  diameterKm: number
  flattening?: number
  rotationPeriodHours?: number
  texture?: string
  /**
   * Tangent-space normal map derived from real elevation data. Only the rocky
   * bodies have one; see `scripts/normal-maps.py`. Must end in `-normal` so the
   * texture cache loads it as data rather than colour.
   */
  normalMap?: string
  material: 'rocky' | 'gas-giant' | 'ice-giant' | 'stellar'
  presets: DistancePreset[]
  shot: ShotDefinition
  thumbnail: string
  attributionIds: string[]
}

export interface ViewpointDefinition {
  id: ViewpointId
  label: string
  description: string
}

export interface PerigeeSelection {
  objectId: SkyObjectId
  presetId: string
  viewpointId: ViewpointId
}

export interface PerigeeInitOptions {
  /** Restores a shared link's selection before the first frame is drawn. */
  selection?: Partial<PerigeeSelection>
  /** Reports 0..1 while the first shot's assets load. */
  onProgress?: (ratio: number) => void
}

export interface PerigeeController {
  initialize(canvas: HTMLCanvasElement, options?: PerigeeInitOptions): Promise<void>
  setObject(objectId: SkyObjectId, presetId: string, immediate?: boolean): Promise<void>
  setDistance(presetId: string): Promise<void>
  setViewpoint(viewpointId: ViewpointId): Promise<void>
  getObjectScreenPosition(): { x: number, y: number, onScreen: boolean } | null
  resetView(): void
  setQuality(tier: QualityTier): void
  resize(width: number, height: number, dpr: number): void
  pause(): void
  resume(): void
  dispose(): void
}
