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

export interface PerigeeController {
  initialize(canvas: HTMLCanvasElement): Promise<void>
  setObject(objectId: SkyObjectId, presetId: string, immediate?: boolean): Promise<void>
  setDistance(presetId: string): Promise<void>
  setViewpoint(viewpointId: ViewpointId): Promise<void>
  setQuality(tier: QualityTier): void
  resize(width: number, height: number, dpr: number): void
  pause(): void
  resume(): void
  dispose(): void
}
