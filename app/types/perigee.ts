export type SkyObjectId =
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'neptune'
  | 'betelgeuse'
  | 'sirius'
  | 'rigel'
  | 'andromeda'

export type ViewpointId = 'rooftop' | 'hilltop' | 'lakeside' | 'cabo-da-roca'
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
  kind: 'moon' | 'planet' | 'star' | 'galaxy'
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
  material: 'rocky' | 'gas-giant' | 'ice-giant' | 'stellar' | 'galactic'
  /**
   * Orientation of a disc object as it is actually seen from Earth. The
   * inclination foreshortens the minor axis, so the rendered ellipse comes out
   * of measured geometry rather than art direction; the major axis still
   * carries the full calculated angular size.
   */
  disc?: {
    /** Degrees from face-on. 0 shows the full circle, 90 is edge-on. */
    inclinationDegrees: number
    /** Degrees the major axis is rolled within the frame. */
    positionAngleDegrees: number
    /** Winding of the spiral arms, in degrees. */
    armPitchDegrees: number
    /** Bulge, inter-arm disc, young arm light, and star-forming knots. */
    palette: [string, string, string, string]
  }
  presets: DistancePreset[]
  shot: ShotDefinition
  thumbnail: string
  attributionIds: string[]
}

export interface ViewpointDefinition {
  id: ViewpointId
  label: string
  description: string
  /** A 320x180 crop of the plate, for the landscape chooser and the pill. */
  thumbnail: string
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
  /**
   * Renders one fresh frame and copies it out. The drawing buffer is not
   * preserved, so the copy has to happen in the same task as the render.
   */
  captureFrame(): HTMLCanvasElement | null
  resetView(): void
  /**
   * Runs `listener` once per rendered frame, after the camera has moved and
   * before the frame is drawn. Returns the unsubscribe. Overlays that follow
   * the hero read its position here instead of running their own frame loop.
   */
  subscribeFrame(listener: () => void): () => void
  setQuality(tier: QualityTier): void
  resize(width: number, height: number, dpr: number): void
  pause(): void
  resume(): void
  dispose(): void
}
