import { expect, it } from 'vitest'
import { createMeteorLayer } from '../src/perigee/scenes/createMeteorLayer'
import { PerspectiveCamera } from 'three'

it('keeps shooting stars behind opaque depth and every transparent hero layer', () => {
  const meteor = createMeteorLayer(false)
  expect(meteor.mesh.material.depthTest).toBe(true)
  expect(meteor.mesh.material.depthWrite).toBe(false)
  expect(meteor.mesh.renderOrder).toBeGreaterThan(-100)
  expect(meteor.mesh.renderOrder).toBeLessThan(-31)
  meteor.dispose()
})

it('anchors the meteor to sky geometry while the camera pans and export projection changes', () => {
  const meteor = createMeteorLayer(false, () => 0)
  const camera = new PerspectiveCamera(48, 16 / 9, .1, 2000)
  meteor.setObserver(camera, 720)
  meteor.update(30)
  expect(meteor.mesh.visible).toBe(true)
  const positions = Array.from(meteor.mesh.geometry.getAttribute('position').array)
  const width = meteor.mesh.material.uniforms.uCoreWidth!.value
  camera.rotation.y = .12
  camera.setViewOffset(7680, 4320, 2000, 0, 2048, 2048)
  meteor.setObserver(camera, 720)
  meteor.update(30.1)
  expect(Array.from(meteor.mesh.geometry.getAttribute('position').array)).toEqual(positions)
  expect(meteor.mesh.material.uniforms.uCoreWidth!.value).toBe(width)
  meteor.dispose()
})

it('freezes the event during pause and suppresses both meteor and train for reduced motion', () => {
  const meteor = createMeteorLayer(false, () => 0)
  meteor.update(30)
  meteor.update(30.2)
  const age = meteor.mesh.material.uniforms.uAge!.value
  meteor.setPaused(true)
  meteor.update(100)
  expect(meteor.mesh.material.uniforms.uAge!.value).toBe(age)
  meteor.setPaused(false)
  meteor.update(100.1)
  expect(meteor.mesh.material.uniforms.uAge!.value).toBeCloseTo(age+.1)
  meteor.setReducedMotion(true)
  meteor.update(1000)
  expect(meteor.mesh.visible).toBe(false)
  meteor.dispose()
})

it('does not restart instantly after reduced motion is switched off at a late scene time', () => {
  const meteor = createMeteorLayer(true, () => 0)
  meteor.update(1000)
  meteor.setReducedMotion(false)
  meteor.update(1001)
  expect(meteor.mesh.visible).toBe(false)
  meteor.update(1030)
  expect(meteor.mesh.visible).toBe(true)
  meteor.dispose()
})
