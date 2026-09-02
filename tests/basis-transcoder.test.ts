import { describe, expect, it } from 'vitest'
import shippedScript from '../node_modules/three/examples/jsm/libs/basis/basis_transcoder.js?raw'
import shippedBinary from '../node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm?raw'
import servedScript from '../public/assets/basis/basis_transcoder.js?raw'
import servedBinary from '../public/assets/basis/basis_transcoder.wasm?raw'

/**
 * The KTX2 loader is fed a transcoder served from `public/assets/basis/`,
 * copied from three. The two must match: a loader from one three release and
 * a transcoder from another fail at runtime, silently, by falling back to the
 * JPEG for every texture.
 */
describe('basis transcoder copy', () => {
  it('serves the script shipped with three', () => {
    expect(servedScript).toBe(shippedScript)
  })

  it('serves the binary shipped with three', () => {
    expect(servedBinary.length).toBe(shippedBinary.length)
    expect(servedBinary).toBe(shippedBinary)
  })
})
