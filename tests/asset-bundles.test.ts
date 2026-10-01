import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import bundles from '../scripts/asset-bundles.json'
import { assetManifest } from '../src/perigee/AssetManifest'
import { marsGlobeSource } from '../src/perigee/objects/renderingPolicy'

describe('clean-checkout asset restoration', () => {
  it('covers every runtime asset stored in an ignored observational tree', () => {
    for (const asset of assetManifest.filter(({ url }) =>
      url.startsWith('/assets/objects/planets/') || url.startsWith('/assets/objects/andromeda/'))) {
      expect(bundles.bundles.some(({ directory }) =>
        `public${asset.url}`.startsWith(`${directory}/`)), asset.url).toBe(true)
    }
    for (const bundle of bundles.bundles) {
      expect(bundle.sha256).toMatch(/^[a-f0-9]{64}$/)
      expect(bundle.bytes).toBeGreaterThan(0)
      expect(existsSync(resolve(bundle.directory, 'provenance.json')), bundle.directory).toBe(true)
    }
  })

  it('restores all approved Mars colour files with their recorded checksums', () => {
    const directory = `public${marsGlobeSource.baseUrl}/mars`
    const provenance = JSON.parse(readFileSync(resolve(directory, 'provenance.json'), 'utf8')) as {
      version: string
      base: { file: string, sha256: string, bytes: number }
      files: { file: string, sha256: string, bytes: number }[]
    }
    expect(provenance.version).toBe('mars-observational-v3')
    expect(provenance.files).toHaveLength(672)
    expect(bundles.bundles.some((bundle) => bundle.directory === directory)).toBe(true)
    for (const entry of [provenance.base, ...provenance.files]) {
      const file = readFileSync(resolve(directory, entry.file))
      expect(file.byteLength, entry.file).toBe(entry.bytes)
      expect(createHash('sha256').update(file).digest('hex'), entry.file).toBe(entry.sha256)
    }
  })
})
