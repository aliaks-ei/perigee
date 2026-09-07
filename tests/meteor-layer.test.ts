import { expect, it } from 'vitest'
import { createMeteorLayer } from '../src/perigee/scenes/createMeteorLayer'

it('keeps shooting stars behind opaque depth and every transparent hero layer', () => {
  const meteor = createMeteorLayer(false)
  expect(meteor.mesh.material.depthTest).toBe(true)
  expect(meteor.mesh.material.depthWrite).toBe(false)
  expect(meteor.mesh.renderOrder).toBeGreaterThan(-100)
  expect(meteor.mesh.renderOrder).toBeLessThan(-31)
  meteor.dispose()
})
