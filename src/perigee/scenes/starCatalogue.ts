/**
 * The Yale Bright Star Catalog (BSC5), packed by `scripts/star-catalogue.py`
 * into a small binary: a header, then one record per star of right ascension
 * and declination in hundredths of a degree, visual magnitude and B−V colour
 * in hundredths. About 9,100 stars in 73 kB.
 *
 * A generated star field has a flat brightness distribution, which is what
 * makes it read as generated. The catalogue has the real few-bright,
 * many-faint law and real colour variety, and that distribution is what the
 * eye trusts. Positions also register the points with the integrated sky map.
 */
export interface CatalogueStar {
  /** Degrees, 0 to 360. */
  rightAscension: number
  /** Degrees, −90 to 90. */
  declination: number
  magnitude: number
  /** B−V colour index; negative is blue-white, above 1 is orange. */
  colorIndex: number
}

import skyManifest from './skyManifest.json'
import { exposedFlux } from '../math/skyPhotometry'

export const STAR_CATALOGUE_URL = `${skyManifest.baseUrl}/bsc5.bin`

const HEADER_BYTES = 8
const RECORD_BYTES = 8

export function parseStarCatalogue(buffer: ArrayBuffer): CatalogueStar[] {
  const view = new DataView(buffer)
  if (buffer.byteLength < HEADER_BYTES) throw new Error('STAR_CATALOGUE_TRUNCATED')
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (magic !== 'BSC5') throw new Error('STAR_CATALOGUE_FORMAT')
  const count = view.getUint16(6, true)
  if (buffer.byteLength < HEADER_BYTES + count * RECORD_BYTES) throw new Error('STAR_CATALOGUE_TRUNCATED')

  const stars: CatalogueStar[] = []
  for (let index = 0; index < count; index += 1) {
    const offset = HEADER_BYTES + index * RECORD_BYTES
    stars.push({
      rightAscension: view.getUint16(offset, true) / 100,
      declination: view.getInt16(offset + 2, true) / 100,
      magnitude: view.getInt16(offset + 4, true) / 100,
      colorIndex: view.getInt16(offset + 6, true) / 100,
    })
  }
  return stars
}

export async function loadStarCatalogue(url = STAR_CATALOGUE_URL, signal?: AbortSignal): Promise<CatalogueStar[]> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`STAR_CATALOGUE_HTTP_${response.status}`)
  return parseStarCatalogue(await response.arrayBuffer())
}

export function parseGaiaCatalogue(buffer: ArrayBuffer): CatalogueStar[] {
  if (buffer.byteLength < 12) throw new Error('GAIA_TRUNCATED')
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== 0x33524447 || view.getUint32(4, true) !== 1) throw new Error('GAIA_FORMAT')
  const count = view.getUint32(8, true)
  if (count > 200000 || buffer.byteLength !== 12 + count * 12) throw new Error('GAIA_TRUNCATED')
  return Array.from({ length: count }, (_, index) => {
    const offset = 12 + index * 12
    const star = { rightAscension: view.getFloat32(offset, true), declination: view.getFloat32(offset + 4, true),
      magnitude: view.getInt16(offset + 8, true) / 100, colorIndex: view.getInt16(offset + 10, true) / 100 }
    if (!Number.isFinite(star.rightAscension) || !Number.isFinite(star.declination)
      || star.rightAscension < 0 || star.rightAscension >= 360 || Math.abs(star.declination) > 90) throw new Error('GAIA_COORDINATES')
    return star
  })
}

/**
 * Approximate display colour for a B−V index, from blue-white through white
 * to orange. Linear RGB, unit peak.
 */
export function colorForIndex(colorIndex: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, (colorIndex + 0.4) / 2.2))
  const blue: [number, number, number] = [0.64, 0.76, 1]
  const white: [number, number, number] = [1, 0.97, 0.92]
  const orange: [number, number, number] = [1, 0.7, 0.42]
  const mix = (a: number, b: number, k: number): number => a + (b - a) * k
  if (t < 0.4) {
    const k = t / 0.4
    return [mix(blue[0], white[0], k), mix(blue[1], white[1], k), mix(blue[2], white[2], k)]
  }
  const k = (t - 0.4) / 0.6
  return [mix(white[0], orange[0], k), mix(white[1], orange[1], k), mix(white[2], orange[2], k)]
}

/**
 * Relative flux for a visual magnitude, on a scale where magnitude 2 is one.
 * Sirius at −1.46 comes out near 24, a naked-eye-limit star near 0.016.
 */
export function fluxForMagnitude(magnitude: number): number {
  return 10 ** (-0.4 * (magnitude - 2))
}

export function exposedCatalogueFlux(magnitude: number): number { return exposedFlux(fluxForMagnitude(magnitude)) }
