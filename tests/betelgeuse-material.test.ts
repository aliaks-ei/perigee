import { describe, expect, it } from 'vitest'
import { Texture, Vector3 } from 'three'
import { createBetelgeuseMaterial } from '../src/perigee/materials/BetelgeuseMaterial'

describe('Betelgeuse portrait lifecycle', () => {
  it('accepts the existing resolved visibility and atmospheric transmission contract', () => {
    const texture = new Texture()
    const set = createBetelgeuseMaterial(texture)
    set.setAppearance(0, 0, [.8, .6, .4])
    expect(set.material.uniforms.uVisibility!.value).toBe(0)
    expect(set.material.uniforms.uTransmission!.value).toEqual(new Vector3(.8, .6, .4))
    set.setAppearance(1, 1.8, [1, 1, 1])
    expect(set.material.uniforms.uVisibility!.value).toBe(1)
    expect(set.material.uniforms.uPortrait!.value).toBe(texture)
    set.material.dispose()
    texture.dispose()
  })
})
