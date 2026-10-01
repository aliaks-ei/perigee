import { describe, expect, it } from 'vitest'
import { skyObjects } from '../app/data/objects'
import { assetManifest } from '../src/perigee/AssetManifest'
import manifest from '../src/perigee/planet/planet-manifest.json'
import { jupiterGlobeMap, saturnGlobeMap, marsGlobeSource, neptuneGlobeMap, betelgeuseGlobeMap } from '../src/perigee/objects/renderingPolicy'

const files = new Set(Object.keys(import.meta.glob('../public/assets/objects/planets/**/*.{webp,png}'))
  .map((path) => path.replace('../public', '')))

describe('observational planet asset delivery', () => {
  it('ships the native Cassini pilot map without modifying the approved portrait source', () => {
    const maps = Object.keys(import.meta.glob('../public/assets/objects/jupiter-cassini-*.jpg'))
    expect(maps).toContain(`../public${jupiterGlobeMap}`)
    expect(assetManifest.find((entry) => entry.url === jupiterGlobeMap)?.attributionId).toBe('jupiter-cassini-map')
    const saturn = Object.keys(import.meta.glob('../public/assets/objects/saturn-*.webp'))
    expect(saturn).toContain(`../public${saturnGlobeMap}`)
    expect(saturn).toContain('../public/assets/objects/saturn-cassini-rings.webp')
    expect(assetManifest.find((entry) => entry.url === saturnGlobeMap)?.attributionId).toBe('saturn-observational-composite')
  })
  it('ships every selected base, terrain and manifest tile with a source attribution', () => {
    const entries = assetManifest.filter((entry) => entry.url.startsWith(manifest.baseUrl))
    // Moon base + 672 colour tiles + Moon/Mars normal/height + Saturn ring depth.
    expect(entries).toHaveLength(678)
    expect(entries.filter((entry) => entry.id.startsWith('mars-')).map((entry) => entry.id))
      .toEqual(['mars-terrain-normal', 'mars-terrain-height'])
    for (const body of ['jupiter', 'saturn', 'neptune']) {
      expect(entries.some((entry) => entry.id === `${body}-base`)).toBe(false)
    }
    const mars = assetManifest.filter((entry) => entry.url.startsWith(marsGlobeSource.baseUrl))
    expect(mars).toHaveLength(673)
    for (const entry of mars) {
      expect(files.has(entry.url), entry.url).toBe(true)
      expect(entry.requiredFor).toContain('mars')
      expect(entry.attributionId).toBe('mars-observational-composite')
    }
    for (const entry of entries) {
      expect(files.has(entry.url), entry.url).toBe(true)
      expect(entry.attributionId).not.toBe('perigee-saturn-art')
    }
    for (const body of skyObjects.filter((body) => body.kind === 'planet' || body.kind === 'moon')) {
      expect(body.texture).toBe(body.id === 'jupiter' ? jupiterGlobeMap : body.id === 'saturn' ? saturnGlobeMap : body.id === 'mars' ? `${marsGlobeSource.baseUrl}/mars/base.webp` : body.id === 'neptune' ? neptuneGlobeMap : `${manifest.baseUrl}/${body.id}/base.webp`)
      // The source maps remain delivered; the sky's approved
      // portraits must be attributed as artwork, not Hubble observations.
      const attribution = body.id === 'jupiter' ? 'jupiter-cassini-map'
        : body.id === 'saturn' ? 'saturn-observational-composite'
          : body.id === 'moon' ? 'moon-lroc-lola-globe'
            : body.id === 'mars' ? 'mars-observational-composite'
              : body.id === 'neptune' ? 'neptune-voyager-reconstruction' : 'planetary-observations'
      expect(body.attributionIds).toContain(attribution)
    }
  })

  it('records every active renderer with the same attribution as its object', () => {
    const portraitFiles = new Set(Object.keys(import.meta.glob('../public/assets/objects/*-portrait-*'))
      .map((path) => path.replace('../public', '')))
    for (const object of skyObjects) {
      const entry = assetManifest.find((asset) => asset.id === (object.id === 'moon' ? 'moon-base' : object.id === 'jupiter' ? 'jupiter-globe-cassini' : object.id === 'saturn' ? 'saturn-globe-observational' : object.id === 'mars' ? 'mars-globe-observational' : object.id === 'neptune' ? 'neptune-globe-reconstruction' : object.id === 'betelgeuse' ? 'betelgeuse-globe-convection' : object.id === 'sirius' ? 'sirius-globe-synthetic' : object.id === 'sun' ? 'sun-globe-synthetic' : object.id === 'rigel' ? 'rigel-globe-synthetic' : `${object.id}-portrait`))
      expect(entry, object.id).toBeDefined()
      if (!['moon', 'jupiter', 'saturn', 'mars', 'neptune', 'betelgeuse', 'sirius', 'sun', 'rigel'].includes(object.id)) expect(portraitFiles.has(entry!.url), entry!.url).toBe(true)
      expect(object.attributionIds).toContain(entry!.attributionId)
    }
  })

  it('ships the approved Betelgeuse art and preserves its portrait rollback', () => {
    expect(Object.keys(import.meta.glob('../public/assets/objects/betelgeuse-convection-v1.webp')))
      .toContain(`../public${betelgeuseGlobeMap}`)
    expect(Object.keys(import.meta.glob('../public/assets/objects/thumbs/betelgeuse-globe-v1.webp')))
      .toContain('../public/assets/objects/thumbs/betelgeuse-globe-v1.webp')
    expect(assetManifest.find((entry) => entry.id === 'betelgeuse-portrait'))
      .toMatchObject({ requiredFor: ['betelgeuse-portrait-review'], attributionId: 'perigee-procedural-art' })
  })

  it('ships the approved Sirius A art and preserves its portrait rollback', () => {
    expect(Object.keys(import.meta.glob('../public/assets/objects/sirius-granulation-review-v1.webp')))
      .toContain('../public/assets/objects/sirius-granulation-review-v1.webp')
    expect(Object.keys(import.meta.glob('../public/assets/objects/thumbs/sirius-globe-v1.webp')))
      .toContain('../public/assets/objects/thumbs/sirius-globe-v1.webp')
    expect(assetManifest.find((entry) => entry.id === 'sirius-portrait'))
      .toMatchObject({ requiredFor: ['sirius-portrait-review'], attributionId: 'sirius-nasa-inspired-portrait' })
  })

  it('ships the approved Sun surface and poles while retaining portrait rollback', () => {
    for (const file of ['sun-granulation-review-v1.webp', 'sun-poles-review-v1.webp']) {
      expect(Object.keys(import.meta.glob('../public/assets/objects/sun-*.webp')))
        .toContain(`../public/assets/objects/${file}`)
    }
    expect(Object.keys(import.meta.glob('../public/assets/objects/thumbs/sun-globe-v1.webp')))
      .toContain('../public/assets/objects/thumbs/sun-globe-v1.webp')
    expect(assetManifest.find((entry) => entry.id === 'sun-globe-poles'))
      .toMatchObject({ requiredFor: ['sun'], attributionId: 'sun-synthetic-globe' })
    expect(assetManifest.find((entry) => entry.id === 'sun-portrait'))
      .toMatchObject({ requiredFor: ['sun-portrait-review'], attributionId: 'perigee-sun-portrait' })
  })

  it('ships the approved portraits without substituting observational maps', () => {
    const portraits = Object.keys(import.meta.glob('../public/assets/objects/*-portrait-v1.png'))
    for (const id of ['moon', 'mars', 'saturn', 'jupiter', 'neptune']) {
      expect(portraits).toContain(`../public/assets/objects/${id}-portrait-v1.png`)
    }
  })
})
