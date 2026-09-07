import planets from './planet/planet-manifest.json'
import { environmentAssetFor } from './scenes/environmentAssets'
import type { QualityTier } from '../../app/types/perigee'
import andromeda from './galaxy/andromeda-manifest.json'

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
export const assetManifest: AssetEntry[] = [{ id: 'saturn-ring-color',
  url: '/assets/objects/saturn-ring-2k.webp', kind: 'webp', requiredFor: ['saturn'],
  attributionId: 'solar-system-scope-textures' }]
for (const [body, config] of Object.entries(planets.bodies)) {
  const base = `${planets.baseUrl}/${body}`
  assetManifest.push({ id: `${body}-base`, url: `${base}/base.webp`, kind: 'webp',
    requiredFor: [body], attributionId: 'planetary-observations' })
  if ('terrain' in config) {
    for (const [name, kind] of [['terrain-normal', 'webp'], ['terrain-height', 'png']] as const) {
      assetManifest.push({ id: `${body}-${name}`, url: `${base}/${name}.${kind}`, kind,
        requiredFor: [body], attributionId: 'planetary-elevation-data' })
    }
  }
  for (const width of config.levels) {
    for (let y = 0; y < width / 1024; y += 1) for (let x = 0; x < width / 512; x += 1) {
      assetManifest.push({ id: `${body}-${width}-${x}-${y}`, url: `${base}/${width}/${x}-${y}.webp`,
        kind: 'webp', requiredFor: [body], attributionId: 'planetary-observations' })
    }
  }
}
assetManifest.push({ id: 'saturn-ring-depth', url: `${planets.baseUrl}/saturn/rings-depth.png`,
  kind: 'png', requiredFor: ['saturn'], attributionId: 'ring-occultation-data' })

// Discoverable for static validation and attribution; the runtime streams only
// visible, budgeted tiles. These entries are never speculative prefetch lists.
assetManifest.push({ id: 'andromeda-base', url: `${andromeda.baseUrl}/base.webp`, kind: 'webp',
  requiredFor: ['andromeda'], attributionId: 'andromeda-observations' })
for (const level of andromeda.levels) {
  for (let y = 0; y < level.rows; y += 1) {
    for (let x = 0; x < level.columns; x += 1) {
      assetManifest.push({ id: `andromeda-${level.width}-${x}-${y}`,
        url: `${andromeda.baseUrl}/${level.width}/${x}-${y}.webp`, kind: 'webp',
        requiredFor: ['andromeda'], attributionId: 'andromeda-observations' })
    }
  }
}

/** Full observational bases stay complete; PlanetTiles selects demand detail. */
export function surfaceMapFor(url: string, _tier: QualityTier): string { return url }

/** Environment derivatives share the same runtime selector as demand loading. */
export const environmentAssetManifest: AssetEntry[] = [...new Map(
  (['rooftop', 'hilltop', 'lakeside', 'cabo-da-roca'] as const).flatMap((viewpoint) =>
    (['safe', 'balanced', 'high'] as const).flatMap((tier) => [0.5, 1.6].map((aspect) => {
      const asset = environmentAssetFor(viewpoint, tier, aspect)
      const entry: AssetEntry = { id: asset.url.split('/').at(-1)!.replace('.webp', ''),
        url: asset.url, kind: 'webp', requiredFor: [viewpoint],
        attributionId: viewpoint === 'cabo-da-roca' ? 'cabo-da-roca-reference' : 'perigee-environment-art' }
      return [asset.url, entry] as const
    })),
  ),
).values()]
