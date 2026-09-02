import type { QualityTier } from '../../app/types/perigee'

export interface AssetEntry {
  id: string
  url: string
  kind: 'jpg' | 'png' | 'webp'
  requiredFor: string[]
  attributionId: string
}

/**
 * Runtime textures, as they are actually requested. `scripts/textures.sh` may
 * place a `.ktx2` next to any of these; the loader prefers it when
 * `VITE_KTX2_TEXTURES=1` and falls back to the file named here.
 */
export const assetManifest: AssetEntry[] = [
  ['moon', '/assets/objects/moon.jpg', 'jpg', 'moon'],
  ['moon-2k', '/assets/objects/moon-2k.jpg', 'jpg', 'moon'],
  ['moon-normal', '/assets/objects/moon-normal.webp', 'webp', 'moon'],
  ['mars', '/assets/objects/mars.jpg', 'jpg', 'mars'],
  ['mars-2k', '/assets/objects/mars-2k.jpg', 'jpg', 'mars'],
  ['mars-normal', '/assets/objects/mars-normal.webp', 'webp', 'mars'],
  ['jupiter', '/assets/objects/jupiter.jpg', 'jpg', 'jupiter'],
  ['jupiter-2k', '/assets/objects/jupiter-2k.jpg', 'jpg', 'jupiter'],
  ['saturn', '/assets/objects/saturn-atmosphere-v2.webp', 'webp', 'saturn'],
  ['saturn-2k', '/assets/objects/saturn-atmosphere-v2-2k.webp', 'webp', 'saturn'],
  ['saturn-ring', '/assets/objects/saturn-ring-2k.webp', 'webp', 'saturn'],
  ['neptune', '/assets/objects/neptune.jpg', 'jpg', 'neptune'],
].map(([id, url, kind, requiredFor]) => ({
  id: id!,
  url: url!,
  kind: kind as 'jpg' | 'png' | 'webp',
  requiredFor: [requiredFor!],
  attributionId: url!.includes('-normal') ? 'planetary-elevation-data' : 'solar-system-scope-textures',
}))

/**
 * The 4096×2048 maps have a 2048×1024 sibling. At the Moon-swap distance the
 * disc spans about a thousand CSS pixels and the visible hemisphere covers
 * half the map, so the smaller file is a pixel-for-pixel match there; only
 * the close presets on the high tier resolve more than it holds. The lower
 * safe tier takes the sibling and keeps a quarter of the GPU memory. Balanced
 * and high retain the full map so a Retina display does not undersample a
 * large planet.
 */
const SURFACE_MAP_VARIANTS: Record<string, string> = {
  '/assets/objects/moon.jpg': '/assets/objects/moon-2k.jpg',
  '/assets/objects/mars.jpg': '/assets/objects/mars-2k.jpg',
  '/assets/objects/jupiter.jpg': '/assets/objects/jupiter-2k.jpg',
  '/assets/objects/saturn-atmosphere-v2.webp': '/assets/objects/saturn-atmosphere-v2-2k.webp',
}

export function surfaceMapFor(url: string, tier: QualityTier): string {
  if (tier !== 'safe') return url
  return SURFACE_MAP_VARIANTS[url] ?? url
}
