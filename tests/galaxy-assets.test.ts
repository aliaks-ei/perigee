import { describe, expect, it } from 'vitest'
import manifest from '../src/perigee/galaxy/andromeda-manifest.json'
import { assetManifest } from '../src/perigee/AssetManifest'

const publicFiles = new Set(Object.keys(import.meta.glob('../public/assets/objects/andromeda/**/*.webp'))
  .map((path) => path.replace(/^\.\.\/public/, '')))
const provenanceFiles = import.meta.glob<{
  version: string, recipeSha256: string,
  derivatives: { path: string, sha256: string, bytes: number }[],
  sources: { nativeDimensions: number[], license: string }[],
  foreground: { selected: number },
}>('../public/assets/objects/andromeda/*/provenance.json', { eager: true, import: 'default' })

describe('shipped observational assets', () => {
  it('ships every declared level and verifies the complete derivative provenance', () => {
    const provenance = provenanceFiles[`../public${manifest.baseUrl}/provenance.json`]!
    const entries = assetManifest.filter((asset) => asset.requiredFor.includes('andromeda'))
    expect(entries).toHaveLength(681)
    expect(provenance.version).toBe(manifest.version)
    expect(provenance.derivatives).toHaveLength(entries.length)
    expect(provenance.foreground.selected).toBeLessThan(100000)
    expect(provenance.sources.map((source) => source.nativeDimensions)).toEqual([[21299, 13775], [42208, 9870]])
    expect(provenance.sources.every((source) => source.license === 'CC-BY-4.0')).toBe(true)
    expect(provenance.recipeSha256).toMatch(/^[a-f0-9]{64}$/)
    for (const derivative of provenance.derivatives) {
      expect(publicFiles.has(`${manifest.baseUrl}/${derivative.path}`), derivative.path).toBe(true)
      expect(derivative.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(derivative.bytes).toBeGreaterThan(0)
      expect(entries.some((entry) => entry.url === `${manifest.baseUrl}/${derivative.path}`)).toBe(true)
    }
  })
})
