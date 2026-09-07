import { Box3, Frustum, Matrix4, Mesh, Sphere, Vector3 } from 'three'
import type { PerspectiveCamera, ShaderMaterial, Texture } from 'three'
import type { QualityTier } from '../../../app/types/perigee'
import type { GalaxyMaterialSet } from '../materials/GalaxyMaterial'
import { galaxyLayerMaterial } from '../materials/GalaxyMaterial'
import { acquireTexture, acquireTextureTile } from '../TextureCache'
import { galaxyLayerPosition, galaxyMajorCorrection } from '../math/galaxyProjection'
import { TileStream } from '../streaming/TileStream'
import { tileBounds, tileLevelFor, type TileAddress } from '../streaming/tileLod'
import { galaxyGeometry } from './galaxyGeometry'
import manifest from './andromeda-manifest.json'

interface Patch { meshes: Mesh[] }
export interface ObservedGalaxy extends GalaxyMaterialSet {
  surface: Mesh
  update: (camera: PerspectiveCamera, pixels: number, ratio: number, now: number, reduced: boolean, opacity: number) => void
  dispose: () => void
  ready: () => boolean
  diagnostics: () => object
}

/**
 * The base always remains complete. Detail is a signed correction, so loading
 * or dropping a tile cannot erase the galaxy or change background coverage.
 * A strict tile slot limit includes pending decodes; old levels release first.
 */
export async function createObservedGalaxy(invalidate: () => void, signal?: AbortSignal): Promise<ObservedGalaxy> {
  const base = await acquireTexture(`${manifest.baseUrl}/base.webp`, signal)
  const surface = new Mesh(galaxyGeometry(0), galaxyLayerMaterial(base.texture, 0))
  const layers: Mesh<ReturnType<typeof galaxyGeometry>, ShaderMaterial>[] = [surface]
  for (const layer of [-1, 1]) {
    const mesh = new Mesh(galaxyGeometry(layer), galaxyLayerMaterial(base.texture, layer))
    mesh.material.uniforms.uObserverExtinction = surface.material.uniforms.uObserverExtinction!
    surface.add(mesh)
    layers.push(mesh)
  }
  layers.forEach((mesh) => { mesh.renderOrder = -30; mesh.frustumCulled = false })
  // Attenuate the background once, before all three additive populations. A
  // complete low-resolution mask also remains stable during tile crossfades.
  const occlusion = new Mesh(galaxyGeometry(0), galaxyLayerMaterial(base.texture, 0, null, true))
  occlusion.material.uniforms.uObserverExtinction = surface.material.uniforms.uObserverExtinction!
  occlusion.renderOrder = -31
  occlusion.frustumCulled = false
  surface.add(occlusion)
  layers.push(occlusion)
  let quality: QualityTier = 'balanced'
  let previous = 1024
  let plannedAt = -Infinity
  let selectedTiles: TileAddress[] = []
  let disposed = false
  const patches = new Map<string, Patch>()
  let activeKeys = new Set<string>()
  let targetKeys = new Set<string>()
  let transitionStart: number | null = null
  const stream = new TileStream<Texture>(async (url, abort) => {
    const lease = await acquireTextureTile(url, abort)
    return { value: lease.texture, release: lease.release }
  }, invalidate)
  const frustum = new Frustum()
  const matrix = new Matrix4()
  const centre = new Vector3()
  const sphere = new Sphere()
  const box = new Box3()

  const dropPatch = (patch: Patch): void => {
    for (const mesh of patch.meshes) {
      surface.remove(mesh)
      mesh.geometry.dispose()
      const material = mesh.material as ShaderMaterial
      material.dispose()
    }
  }
  const addressKey = (tile: TileAddress): string => `${manifest.baseUrl}/${tile.width}/${tile.x}-${tile.y}.webp`

  return {
    surface,
    material: surface.material,
    setQuality(tier) {
      quality = tier
      plannedAt = -Infinity
    },
    setProjectedSize() {},
    update(camera, pixels, ratio, now, reduced, opacity) {
      if (disposed) return
      const correction = galaxyMajorCorrection(ratio)
      for (const mesh of layers) {
        mesh.material.uniforms.uCorrection!.value = correction
        mesh.material.uniforms.uViewRatio!.value = ratio
        mesh.material.uniforms.uOpacity!.value = opacity
      }
      // Selected slots include pending textures: about 91/46/23 MiB on
      // high/balanced/safe, plus the base. At most two cancelled decode stages
      // can still be settling across all heroes; see the resource accounting doc.
      const capacity = quality === 'high' ? 64 : quality === 'balanced' ? 32 : 16
      if (now - plannedAt >= 120) {
        const levels = manifest.levels.map((level) => level.width)
        let level = tileLevelFor(pixels * 1.25, previous, levels)
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        frustum.setFromProjectionMatrix(matrix)
        const visibleTiles = (width: number): TileAddress[] => {
          if (width <= 1024) return []
          const result: TileAddress[] = []
          const columns = width / manifest.tileSize
          const rows = columns / 2
          // Conservative bounds include inferred depth and all three populations.
          for (let y = 0; y < rows; y += 1) {
            for (let x = 0; x < columns; x += 1) {
              box.makeEmpty()
              for (const dx of [0, .5, 1]) for (const dy of [0, .5, 1]) {
                const px = ((x + dx) / columns - .5) * 2.5
                const py = (.5 - (y + dy) / rows) * 1.25
                for (const layer of [-1, 1]) {
                  centre.set(...galaxyLayerPosition(px, py, layer, ratio))
                  box.expandByPoint(centre)
                }
              }
              box.expandByScalar(.06).getBoundingSphere(sphere)
              sphere.applyMatrix4(surface.matrixWorld)
              if (frustum.intersectsSphere(sphere)) result.push({ width, x, y })
            }
          }
          return result
        }
        let wanted = visibleTiles(level)
        // Coarsen the whole requested level when its visible set exceeds memory.
        // Never return arbitrary holes just to meet a nominal resolution target.
        while (wanted.length > capacity / 2 && level > 1024) {
          level /= 2
          wanted = visibleTiles(level)
        }
        previous = level
        wanted.sort((a, b) => {
          const columns = a.width / manifest.tileSize
          return Math.hypot(a.x + .5 - columns / 2, a.y + .5 - columns / 4)
            - Math.hypot(b.x + .5 - columns / 2, b.y + .5 - columns / 4)
        })
        selectedTiles = wanted
        plannedAt = now
      }
      const wanted = selectedTiles
      const keys = new Set(wanted.map(addressKey))
      const sameTarget = keys.size === targetKeys.size && [...keys].every((key) => targetKeys.has(key))
      if (!sameTarget) {
        // Finish an interrupted fade at its currently more visible level.
        if (transitionStart !== null && now - transitionStart >= 175) activeKeys = targetKeys
        transitionStart = null
        targetKeys = keys
      }
      // A tier downgrade may require immediate retirement to respect its cap.
      if (new Set([...activeKeys, ...keys]).size > capacity) activeKeys.clear()
      const retained = new Set([...activeKeys, ...keys])
      for (const [key, patch] of patches) {
        if (!retained.has(key)) { dropPatch(patch); patches.delete(key) }
      }
      stream.setWanted([...retained], capacity)
      for (const tile of wanted) {
        const key = addressKey(tile)
        const texture = stream.get(key)
        if (!texture) continue
        let patch = patches.get(key)
        if (!patch) {
          const bounds = tileBounds(tile)
          const meshes = [-1, 0, 1].map((layer) => {
            const material = galaxyLayerMaterial(base.texture, layer, texture)
            material.uniforms.uObserverExtinction = surface.material.uniforms.uObserverExtinction!
            material.uniforms.uBounds!.value.set(bounds.u, bounds.v, bounds.width, bounds.height)
            const mesh = new Mesh(galaxyGeometry(layer, bounds), material)
            mesh.renderOrder = -29
            mesh.frustumCulled = false
            surface.add(mesh)
            return mesh
          })
          patch = { meshes }
          patches.set(key, patch)
        }
      }
      const allReady = [...keys].every((key) => stream.get(key))
      if (allReady && transitionStart === null) transitionStart = now
      const mix = transitionStart === null ? 0 : reduced ? 1 : Math.min(1, (now - transitionStart) / 350)
      for (const [key, patch] of patches) {
        const weight = (activeKeys.has(key) ? 1 - mix : 0) + (keys.has(key) ? mix : 0)
        for (const mesh of patch.meshes) {
          const material = mesh.material as ShaderMaterial
          material.uniforms.uViewRatio!.value = ratio
          material.uniforms.uCorrection!.value = correction
          material.uniforms.uOpacity!.value = opacity
          material.uniforms.uMix!.value = weight
        }
      }
      if (mix >= 1) activeKeys = keys
      if (transitionStart !== null && mix < 1) invalidate()
    },
    ready() { return stream.ready() },
    diagnostics() {
      const status = stream.diagnostics()
      return { ...status, level: previous, sourceVersion: manifest.version,
        estimatedTileBytes: (status.resident + status.requested) * 528 * 528 * 4 * 4 / 3 }
    },
    dispose() {
      if (disposed) return
      disposed = true
      patches.forEach(dropPatch)
      patches.clear()
      stream.dispose()
      layers.forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose() })
      base.release()
    },
  }
}
