export interface AssetEntry {
  id: string
  url: string
  kind: 'jpg' | 'png'
  requiredFor: string[]
  attributionId: string
}

export const assetManifest: AssetEntry[] = [
  ['moon', '/assets/objects/moon.jpg', 'jpg'],
  ['mars', '/assets/objects/mars.jpg', 'jpg'],
  ['jupiter', '/assets/objects/jupiter.jpg', 'jpg'],
  ['saturn', '/assets/objects/saturn.jpg', 'jpg'],
  ['saturn-ring', '/assets/objects/saturn-ring.png', 'png'],
  ['neptune', '/assets/objects/neptune.jpg', 'jpg'],
  ['star-surface', '/assets/objects/star-surface.jpg', 'jpg'],
].map(([id, url, kind]) => ({
  id: id!,
  url: url!,
  kind: kind as 'jpg' | 'png',
  requiredFor: [id!],
  attributionId: 'solar-system-scope-textures',
}))
