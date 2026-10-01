import planets from './planet/planet-manifest.json'
import { environmentAssetFor } from './scenes/environmentAssets'
import { jupiterGlobeMap, saturnGlobeMap, marsGlobeSource, neptuneGlobeMap, betelgeuseGlobeMap, siriusGlobeMap, sunGlobeMap, sunPolarMap, rigelGlobeMap, rigelPolarMap } from './objects/renderingPolicy'
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
export const assetManifest: AssetEntry[] = [{ id: 'saturn-ring-color',
  url: '/assets/objects/saturn-cassini-rings.webp', kind: 'webp', requiredFor: ['saturn'],
  attributionId: 'saturn-cassini-ring-color' }]
// Active textures and explicit portrait rollback assets; source archives stay outside this manifest.
assetManifest.push(
  { id: 'saturn-globe-observational', url: saturnGlobeMap, kind: 'webp',
    requiredFor: ['saturn'], attributionId: 'saturn-observational-composite' },
  { id: 'jupiter-globe-cassini', url: jupiterGlobeMap, kind: 'jpg',
    requiredFor: ['jupiter'], attributionId: 'jupiter-cassini-map' },
  { id: 'sun-portrait', url: '/assets/objects/sun-portrait-v1.webp', kind: 'webp',
    requiredFor: ['sun-portrait-review'], attributionId: 'perigee-sun-portrait' },
  { id: 'sun-globe-synthetic', url: sunGlobeMap, kind: 'webp',
    requiredFor: ['sun'], attributionId: 'sun-synthetic-globe' },
  { id: 'sun-globe-poles', url: sunPolarMap, kind: 'webp',
    requiredFor: ['sun'], attributionId: 'sun-synthetic-globe' },
  { id: 'betelgeuse-globe-convection', url: betelgeuseGlobeMap, kind: 'webp',
    requiredFor: ['betelgeuse'], attributionId: 'betelgeuse-convection-art' },
  { id: 'betelgeuse-portrait', url: '/assets/objects/betelgeuse-portrait-v1.webp', kind: 'webp',
    requiredFor: ['betelgeuse-portrait-review'], attributionId: 'perigee-procedural-art' },
  { id: 'jupiter-portrait', url: '/assets/objects/jupiter-portrait-v1.png', kind: 'png',
    requiredFor: ['jupiter-portrait-review'], attributionId: 'jupiter-supplied-portrait' },
  { id: 'saturn-portrait', url: '/assets/objects/saturn-portrait-v1.png', kind: 'png',
    requiredFor: ['saturn-portrait-review'], attributionId: 'saturn-cassini-inspired-portrait' },
)
assetManifest.push({ id: 'moon-portrait', url: '/assets/objects/moon-portrait-v1.png',
  kind: 'png', requiredFor: ['moon-portrait-review'], attributionId: 'moon-lro-inspired-portrait' })
assetManifest.push({ id: 'mars-portrait', url: '/assets/objects/mars-portrait-v1.png',
  kind: 'png', requiredFor: ['mars-portrait-review'], attributionId: 'mars-nasa-inspired-portrait' })
assetManifest.push({ id: 'mars-globe-observational', url: `${marsGlobeSource.baseUrl}/mars/base.webp`, kind: 'webp',
  requiredFor: ['mars'], attributionId: 'mars-observational-composite' })
for (const width of [4096, 8192, 16384]) {
  for (let y = 0; y < width / 1024; y++) for (let x = 0; x < width / 512; x++) {
    assetManifest.push({ id: `mars-globe-${width}-${x}-${y}`, url: `${marsGlobeSource.baseUrl}/mars/${width}/${x}-${y}.webp`,
      kind: 'webp', requiredFor: ['mars'], attributionId: 'mars-observational-composite' })
  }
}
assetManifest.push({ id: 'neptune-portrait', url: '/assets/objects/neptune-portrait-v1.png',
  kind: 'png', requiredFor: ['neptune-portrait-review'], attributionId: 'neptune-voyager-inspired-portrait' })
assetManifest.push({ id: 'sirius-portrait', url: '/assets/objects/sirius-portrait-v1.png',
  kind: 'png', requiredFor: ['sirius-portrait-review'], attributionId: 'sirius-nasa-inspired-portrait' })
assetManifest.push({ id: 'sirius-globe-synthetic', url: siriusGlobeMap,
  kind: 'webp', requiredFor: ['sirius'], attributionId: 'sirius-synthetic-globe' })
assetManifest.push({ id: 'rigel-portrait', url: '/assets/objects/rigel-portrait-v1.png',
  kind: 'png', requiredFor: ['rigel-portrait-review'], attributionId: 'rigel-nasa-inspired-portrait' })
assetManifest.push({ id: 'rigel-globe-synthetic', url: rigelGlobeMap,
  kind: 'webp', requiredFor: ['rigel'], attributionId: 'rigel-synthetic-globe' })
assetManifest.push({ id: 'rigel-globe-poles', url: rigelPolarMap,
  kind: 'webp', requiredFor: ['rigel'], attributionId: 'rigel-synthetic-globe' })
for (const [body, config] of Object.entries(planets.bodies)) {
  const base = `${planets.baseUrl}/${body}`
  // Only the Moon consumes this tree for colour; Mars keeps its terrain here.
  // Other dated bases/tiles remain in the restored source pack, not runtime inventory.
  if (body === 'moon') assetManifest.push({ id: `${body}-base`, url: `${base}/base.webp`, kind: 'webp',
    requiredFor: [body], attributionId: body === 'moon' ? 'moon-lroc-lola-globe' : 'planetary-observations' })
  if ('terrain' in config) {
    for (const [name, kind] of [['terrain-normal', 'webp'], ['terrain-height', 'png']] as const) {
      assetManifest.push({ id: `${body}-${name}`, url: `${base}/${name}.${kind}`, kind,
        requiredFor: [body], attributionId: 'planetary-elevation-data' })
    }
  }
  if (body !== 'moon') continue
  for (const width of config.levels) {
    for (let y = 0; y < width / 1024; y += 1) for (let x = 0; x < width / 512; x += 1) {
      assetManifest.push({ id: `${body}-${width}-${x}-${y}`, url: `${base}/${width}/${x}-${y}.webp`,
        kind: 'webp', requiredFor: [body], attributionId: body === 'moon' ? 'moon-lroc-lola-globe' : 'planetary-observations' })
    }
  }
}
assetManifest.push({ id: 'saturn-ring-depth', url: `${planets.baseUrl}/saturn/rings-depth.png`,
  kind: 'png', requiredFor: ['saturn'], attributionId: 'ring-occultation-data' })

assetManifest.push({ id: 'andromeda-portrait', url: '/assets/objects/andromeda-portrait-v2.png',
  kind: 'png', requiredFor: ['andromeda'], attributionId: 'andromeda-nasa-inspired-portrait' })

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

// User-approved atmospheric reconstruction; portrait remains available for rollback.
assetManifest.push({ id: 'neptune-globe-reconstruction', url: neptuneGlobeMap, kind: 'webp',
  requiredFor: ['neptune'], attributionId: 'neptune-voyager-reconstruction' })
