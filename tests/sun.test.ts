import { describe, expect, it, vi } from 'vitest'
import { Texture } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { groupObjects } from '../app/utils/objectGroups'
import { angularDiameterRadians } from '../src/perigee/math/angularSize'
import { createSunMaterial } from '../src/perigee/materials/SunMaterial'

describe('Sun', () => {
  it('has the observed apparent diameter at one astronomical unit', () => {
    const sun = skyObjectsById.sun
    const real = sun.presets.at(-1)!
    expect(angularDiameterRadians(sun.diameterKm, real.distanceKm) * 180 / Math.PI)
      .toBeCloseTo(.533, 3)
    expect(sun.presets.every((preset) => preset.distanceKm > sun.diameterKm / 2)).toBe(true)
  })

  it('belongs to the Solar System while retaining stellar rendering', () => {
    const sun = skyObjectsById.sun
    expect(sun.kind).toBe('star')
    expect(groupObjects([sun]).map((group) => group.id)).toEqual(['solar-system'])
  })

  it('preserves the approved exposure and leaves texture lifetime with its lease', () => {
    const texture = new Texture()
    const dispose = vi.spyOn(texture, 'dispose')
    const set = createSunMaterial(texture)
    set.setAppearance(0, 100, [.3, .2, .1])
    expect(set.material.uniforms.uVisibility!.value).toBe(0)
    set.setAppearance(1, 1000, [1, 1, 1])
    expect(set.material.uniforms.uVisibility!.value).toBe(1)
    expect(set.material.uniforms.uPortrait!.value).toBe(texture)
    expect(set.material.toneMapped).toBe(false)
    set.material.dispose()
    expect(dispose).not.toHaveBeenCalled()
    texture.dispose()
  })
})
