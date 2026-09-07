import { skyAssetBuffer as buffer } from './sky-fixture'
import { describe, expect, it } from 'vitest'
import { DataUtils } from 'three'
import manifest from '../src/perigee/scenes/skyManifest.json'
import { parseGaiaCatalogue, parseStarCatalogue } from '../src/perigee/scenes/starCatalogue'

describe('observational sky delivery', () => {
  it('delivers exactly the recorded derivatives without truncation or mutation', async () => {
    for (const output of manifest.outputs) {
      const data = buffer(output.file)
      expect(data.byteLength).toBe(output.bytes)
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
      expect(Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('')).toBe(output.sha256)
    }
    expect(parseGaiaCatalogue(buffer('gaia.bin'))).toHaveLength(manifest.gaiaPointCount)
    expect(parseStarCatalogue(buffer('bsc5.bin'))).toHaveLength(manifest.yalePointCount)
  })
  it('keeps integrated survey light finite and within half-float storage precision', () => {
    const data = new DataView(buffer('integrated-light.bin'))
    expect(data.byteLength).toBe(manifest.width * manifest.height * 4)
    let error = 0, sum = 0
    for (let offset = 0; offset < data.byteLength; offset += 4) {
      const value = data.getFloat32(offset, true)
      // Check every sample without constructing half a million assertion objects.
      if (!Number.isFinite(value) || value < 0 || value / 4096 > 65504) {
        throw new Error(`Invalid survey light at byte ${offset}: ${value}`)
      }
      sum += value
      error += Math.abs(DataUtils.fromHalfFloat(DataUtils.toHalfFloat(value / 4096)) * 4096 - value)
    }
    expect(sum).toBeGreaterThan(0)
    expect(error / sum).toBeLessThan(.001)
    expect(manifest.oversubtractedFluxFraction).toBeLessThan(.01)
  })
  it('rejects malformed Gaia payloads before allocating catalogue geometry', () => {
    expect(() => parseGaiaCatalogue(new ArrayBuffer(4))).toThrow('GAIA_TRUNCATED')
    const wrong = buffer('gaia.bin')
    new DataView(wrong).setUint32(4, 99, true)
    expect(() => parseGaiaCatalogue(wrong)).toThrow('GAIA_FORMAT')
    const coords = buffer('gaia.bin')
    new DataView(coords).setFloat32(12, NaN, true)
    expect(() => parseGaiaCatalogue(coords)).toThrow('GAIA_COORDINATES')
  })
})
