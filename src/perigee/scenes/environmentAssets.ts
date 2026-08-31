import type { QualityTier, ViewpointId } from '../../../app/types/perigee'

export interface EnvironmentAsset {
  url: string
  width: number
  height: number
}

const CINEMATIC_PLATE = { width: 3172, height: 1984 }

const fixedAssets: Record<Exclude<ViewpointId, 'cabo-da-roca'>, EnvironmentAsset> = {
  rooftop: {
    url: '/assets/environments/rooftop-cinematic-4k.webp',
    ...CINEMATIC_PLATE,
  },
  hilltop: {
    url: '/assets/environments/hilltop-cinematic-4k.webp',
    ...CINEMATIC_PLATE,
  },
  lakeside: {
    url: '/assets/environments/lakeside-cinematic-4k.webp',
    ...CINEMATIC_PLATE,
  },
}

const caboAssets = {
  landscape: {
    high: {
      url: '/assets/environments/cabo-da-roca-landscape-4k.webp',
      width: 3172,
      height: 1984,
    },
    balanced: {
      url: '/assets/environments/cabo-da-roca-landscape-2k.webp',
      width: 2048,
      height: 1280,
    },
    safe: {
      url: '/assets/environments/cabo-da-roca-landscape-safe.webp',
      width: 1280,
      height: 800,
    },
  },
  portrait: {
    high: {
      url: '/assets/environments/cabo-da-roca-portrait-2k.webp',
      width: 1280,
      height: 2770,
    },
    balanced: {
      url: '/assets/environments/cabo-da-roca-portrait-2k.webp',
      width: 1280,
      height: 2770,
    },
    safe: {
      url: '/assets/environments/cabo-da-roca-portrait-safe.webp',
      width: 832,
      height: 1800,
    },
  },
} satisfies Record<'landscape' | 'portrait', Record<QualityTier, EnvironmentAsset>>

export function environmentAssetFor(
  viewpointId: ViewpointId,
  tier: QualityTier,
  viewportAspect: number,
): EnvironmentAsset {
  if (viewpointId !== 'cabo-da-roca') return fixedAssets[viewpointId]
  const orientation = viewportAspect < 0.8 ? 'portrait' : 'landscape'
  return caboAssets[orientation][tier]
}

export function environmentWarmupAssets(
  tier: QualityTier,
  viewportAspect: number,
): string[] {
  return [
    ...Object.values(fixedAssets).map((asset) => asset.url),
    environmentAssetFor('cabo-da-roca', tier, viewportAspect).url,
  ]
}
