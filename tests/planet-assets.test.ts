import { describe, expect, it } from 'vitest'
import { skyObjects } from '../app/data/objects'
import { assetManifest } from '../src/perigee/AssetManifest'
import manifest from '../src/perigee/planet/planet-manifest.json'

const files = new Set(Object.keys(import.meta.glob('../public/assets/objects/planets/**/*.{webp,png}'))
  .map((path) => path.replace('../public', '')))

describe('observational planet asset delivery', () => {
  it('ships every selected base, terrain and manifest tile with a source attribution', () => {
    const entries = assetManifest.filter((entry) => entry.url.startsWith(manifest.baseUrl))
    expect(entries).toHaveLength(1354)
    for (const entry of entries) {
      expect(files.has(entry.url), entry.url).toBe(true)
      expect(entry.attributionId).not.toBe('perigee-saturn-art')
    }
    for (const body of skyObjects.filter((body) => body.kind === 'planet' || body.kind === 'moon')) {
      expect(body.texture).toBe(`${manifest.baseUrl}/${body.id}/base.webp`)
      expect(body.attributionIds).toContain('planetary-observations')
    }
  })
})
