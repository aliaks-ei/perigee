import { afterEach, describe, expect, it, vi } from 'vitest'
import { Mesh, PerspectiveCamera, Quaternion, Scene, ShaderMaterial, Texture, Vector3 } from 'three'
import { skyObjectsById } from '../app/data/objects'
import { PerigeeScene } from '../src/perigee/PerigeeScene'
import type { CelestialObject } from '../src/perigee/objects/CelestialObject'
import { earthshineRatio } from '../src/perigee/math/planetAppearance'

vi.mock('../src/perigee/compileScene', () => ({ compileScene: vi.fn(async () => {}) }))
vi.mock('../src/perigee/TextureCache', () => ({
  acquireTexture: vi.fn(async () => ({ texture: new Texture(), release: vi.fn() })),
}))

afterEach(() => { vi.unstubAllGlobals() })

describe('shared scene illumination', () => {
  it('keeps one world-space Sun through object swaps, camera changes, spin and capture', async () => {
    vi.stubGlobal('window', { innerHeight: 800 })
    const engine = new PerigeeScene()
    const scene = new Scene()
    Reflect.set(engine, 'renderer', { setClearColor: vi.fn(), domElement: { clientHeight: 800 } })
    Reflect.set(engine, 'sky', { scene, setTarget: vi.fn(), setPalette: vi.fn(), setGlow: vi.fn() })
    const camera = Reflect.get(engine, 'camera') as PerspectiveCamera
    const sun = new Vector3(-.65, .2, 1).normalize()
    const orientation = new Quaternion()

    for (const id of ['moon', 'jupiter', 'saturn', 'mars', 'neptune'] as const) {
      await engine.setObject(id, skyObjectsById[id].presets[0]!.id, true)
      const object = Reflect.get(engine, 'celestial') as CelestialObject
      expect((Reflect.get(engine, 'sunWorld') as Vector3).distanceTo(sun)).toBeLessThan(1e-12)
      camera.rotation.set(.1, -.2, 0)
      camera.updateMatrixWorld()
      const snapshot = { simulatedSeconds: 10000, evolutionSeconds: 20 }
      object.prepareExport(snapshot)
      Reflect.get(engine, 'updateHeroLighting').call(engine)
      const uniforms = object.planet!.surface.uniforms
      const viewSun = sun.clone().transformDirection(camera.matrixWorldInverse)
      expect(uniforms.uSunDirection!.value.distanceTo(viewSun)).toBeLessThan(1e-12)
      object.surface.getWorldQuaternion(orientation)
      const localSun = sun.clone().applyQuaternion(orientation.invert())
      expect(uniforms.uSunLocal!.value.distanceTo(localSun)).toBeLessThan(1e-12)

      if (id === 'moon') {
        const observer = camera.position.clone().sub(object.group.position).normalize()
        const distance = skyObjectsById.moon.presets[0]!.distanceKm
        expect(uniforms.uEarthshine!.value).toBeCloseTo(earthshineRatio(sun.dot(observer), distance), 12)
      }
      if (id === 'saturn') {
        const rings = object.root.getObjectByName('equatorial-rings') as Mesh<never, ShaderMaterial>
        rings.getWorldQuaternion(orientation)
        const ringSun = sun.clone().applyQuaternion(orientation.invert())
        expect(rings.material.uniforms.uSunDirection!.value.distanceTo(ringSun)).toBeLessThan(1e-12)
        expect(rings.material.uniforms.uSunView!.value.distanceTo(viewSun)).toBeLessThan(1e-12)
      }
    }
  })
})
