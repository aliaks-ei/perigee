import { Group, Mesh, PerspectiveCamera, ShaderMaterial, SphereGeometry, Texture } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlanetTiles } from '../src/perigee/planet/PlanetTiles'
import { createPlanetMaterial } from '../src/perigee/materials/PlanetMaterial'
import { skyObjectsById } from '../app/data/objects'

const state = vi.hoisted(() => ({ releases: [] as ReturnType<typeof vi.fn>[], fail: false }))
vi.mock('../src/perigee/TextureCache', () => ({
  acquireTextureTile: async () => {
    if (state.fail) throw new Error('unavailable')
    const release = vi.fn()
    state.releases.push(release)
    return { texture: new Texture(), release }
  },
}))
afterEach(() => { state.releases = []; state.fail = false })
const settle = async () => { for (let i = 0; i < 300; i += 1) await Promise.resolve() }
function fixture() {
  const material = createPlanetMaterial(skyObjectsById.moon, new Texture())
  const surface = new Mesh(new SphereGeometry(1, 8, 4), material.surface)
  const old = surface.geometry
  const tiles = new PlanetTiles('moon', surface, vi.fn())
  old.dispose()
  const group = new Group()
  group.position.z = -500
  group.scale.setScalar(100)
  group.add(surface)
  group.updateMatrixWorld(true)
  const camera = new PerspectiveCamera(52, 2, .1, 2000)
  camera.updateMatrixWorld()
  return { tiles, surface, camera, material }
}

describe('streamed planetary terrain integration', () => {
  it('retains the base, bounds detail, shares illumination, and retires each tile once', async () => {
    const { tiles, surface, camera, material } = fixture()
    tiles.setQuality('high')
    tiles.update(camera, 2000, 0, false, 1)
    expect(surface.children).toHaveLength(0)
    await settle()
    tiles.update(camera, 2000, 200, false, .5)
    expect(surface.children.length).toBeGreaterThan(0)
    expect(surface.children.length).toBeLessThanOrEqual(32)
    const patch = (surface.children[0] as Mesh<SphereGeometry, ShaderMaterial>).material
    expect(patch.uniforms.uSunDirection).toBe(material.surface.uniforms.uSunDirection)
    expect(patch.uniforms.uDisplacement).toBe(material.surface.uniforms.uDisplacement)
    expect(patch.uniforms.uOpacity!.value).toBe(.5)
    expect(patch.uniforms.uDetailMix!.value).toBe(0)
    for (let frame = 1; frame <= 5; frame += 1) tiles.update(camera, 2000, 200+frame*100, false, 1)
    expect(patch.uniforms.uDetailMix!.value).toBe(1)
    const disposed = vi.fn()
    surface.geometry.addEventListener('dispose', disposed)
    tiles.dispose(); tiles.dispose()
    expect(disposed).toHaveBeenCalledOnce()
    expect(state.releases.every((release) => release.mock.calls.length === 1)).toBe(true)
  })
  it('applies ready detail without animation under reduced motion and retires on safe tier', async () => {
    const { tiles, surface, camera } = fixture()
    tiles.update(camera, 2000, 0, true, 1)
    await settle()
    tiles.update(camera, 2000, 200, true, 1)
    expect(surface.children.length).toBeGreaterThan(0)
    expect((surface.children[0] as Mesh<SphereGeometry, ShaderMaterial>).material.uniforms.uDetailMix!.value).toBe(1)
    tiles.setQuality('safe')
    tiles.update(camera, 2000, 500, true, 1)
    expect(surface.children).toHaveLength(0)
    expect(surface.material.uniforms.uDisplacement!.value).toBe(0)
    expect(surface.material.uniforms.uTerrainShadow!.value).toBe(0)
    tiles.dispose()
  })
  it('keeps a complete source-backed fallback when all requests fail', async () => {
    state.fail = true
    const { tiles, surface, camera } = fixture()
    const base = surface.material.uniforms.uMap!.value
    tiles.update(camera, 2000, 0, true, 1)
    await settle()
    tiles.update(camera, 2000, 200, true, 1)
    expect(surface.children).toHaveLength(0)
    expect(surface.material.uniforms.uMap!.value).toBe(base)
    tiles.dispose()
  })
})
