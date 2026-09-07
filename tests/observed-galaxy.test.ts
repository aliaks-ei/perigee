import { Group, NormalBlending, PerspectiveCamera, ShaderMaterial, Texture } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createObservedGalaxy } from '../src/perigee/galaxy/ObservedGalaxy'

const leases = vi.hoisted(() => ({ releases: [] as ReturnType<typeof vi.fn>[], fail: false }))
vi.mock('../src/perigee/TextureCache', () => ({
  acquireTexture: async () => {
    const release = vi.fn()
    leases.releases.push(release)
    return { texture: new Texture(), release }
  },
  acquireTextureTile: async () => {
    if (leases.fail) throw new Error('missing tile')
    const release = vi.fn()
    leases.releases.push(release)
    return { texture: new Texture(), release }
  },
}))

afterEach(() => { leases.releases = []; leases.fail = false })
const settle = async () => { for (let i = 0; i < 100; i += 1) await Promise.resolve() }

describe('observational hero integration without a renderer', () => {
  it('keeps a complete base during loading, crossfades tiles, and releases geometry and leases', async () => {
    const galaxy = await createObservedGalaxy(vi.fn())
    const group = new Group()
    group.position.z = -500
    group.scale.setScalar(100)
    group.add(galaxy.surface)
    group.updateMatrixWorld(true)
    const camera = new PerspectiveCamera(52, 2, .1, 2000)
    camera.updateMatrixWorld()
    galaxy.update(camera, 1600, .2, 0, false, 1)
    expect(galaxy.surface.children).toHaveLength(3)
    const mask = galaxy.surface.children.find((mesh) => mesh.renderOrder === -31)!
    const maskMaterial = (mask as { material?: ShaderMaterial }).material!
    expect(maskMaterial.blending).toBe(NormalBlending)
    expect(maskMaterial.uniforms.uOcclusionOnly!.value).toBe(1)
    expect(mask.renderOrder).toBeLessThan(galaxy.surface.renderOrder)
    await settle()
    galaxy.update(camera, 1600, .2, 120, false, 1)
    const tiles = galaxy.surface.children.filter((mesh) => mesh.renderOrder === -29)
    expect(tiles).toHaveLength(24)
    const mixes = () => tiles.map((mesh) => (mesh as { material?: ShaderMaterial }).material!.uniforms.uMix!.value)
    expect(mixes().every((mix) => mix === 0)).toBe(true)
    galaxy.update(camera, 1600, .2, 470, false, .5)
    expect(mixes().every((mix) => mix === 1)).toBe(true)
    expect(maskMaterial.uniforms.uOpacity!.value).toBe(.5)
    expect(galaxy.surface.children.filter((mesh) => mesh.renderOrder === -31)).toHaveLength(1)
    const disposed = vi.fn()
    galaxy.surface.geometry.addEventListener('dispose', disposed)
    galaxy.dispose()
    galaxy.dispose()
    expect(disposed).toHaveBeenCalledOnce()
    expect(leases.releases.every((release) => release.mock.calls.length === 1)).toBe(true)
  })

  it('leaves the observational fallback present when every detail request fails', async () => {
    leases.fail = true
    const galaxy = await createObservedGalaxy(vi.fn())
    const group = new Group()
    group.position.z = -500
    group.scale.setScalar(100)
    group.add(galaxy.surface)
    group.updateMatrixWorld(true)
    const camera = new PerspectiveCamera(52, 2, .1, 2000)
    camera.updateMatrixWorld()
    galaxy.update(camera, 1600, .2, 0, true, 1)
    await settle()
    galaxy.update(camera, 1600, .2, 1000, true, 1)
    expect(galaxy.surface.children).toHaveLength(3)
    expect(galaxy.material.uniforms.uBase!.value).toBeInstanceOf(Texture)
    expect(galaxy.material.uniforms.uOpacity!.value).toBe(1)
    galaxy.dispose()
  })
})
