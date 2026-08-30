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
  ['moon-normal', '/assets/objects/moon-normal.webp', 'webp', 'moon'],
  ['mars', '/assets/objects/mars.jpg', 'jpg', 'mars'],
  ['mars-normal', '/assets/objects/mars-normal.webp', 'webp', 'mars'],
  ['jupiter', '/assets/objects/jupiter.jpg', 'jpg', 'jupiter'],
  ['saturn', '/assets/objects/saturn-atmosphere-v2.webp', 'webp', 'saturn'],
  ['saturn-ring', '/assets/objects/saturn-ring-2k.webp', 'webp', 'saturn'],
  ['neptune', '/assets/objects/neptune.jpg', 'jpg', 'neptune'],
].map(([id, url, kind, requiredFor]) => ({
  id: id!,
  url: url!,
  kind: kind as 'jpg' | 'png' | 'webp',
  requiredFor: [requiredFor!],
  attributionId: url!.includes('-normal') ? 'planetary-elevation-data' : 'solar-system-scope-textures',
}))
