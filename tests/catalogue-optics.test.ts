import { expect, it } from 'vitest'
import { catalogueOptics, pixelCatalogueProfile } from '../src/perigee/math/catalogueOptics'

it('preserves source flux through sharper cores, bright-star wings and subpixel movement at every DPR', () => {
  for (const magnitude of [-1.46, 0, 2, 4, 7]) {
    for (const dpr of [.5, .75, 1, 1.5, 2, 3]) {
      const bound = Math.ceil(catalogueOptics(magnitude).radius * dpr) + 2
      for (const shift of [0, .25, .5, .75]) {
        let flux = 0
        for (let y=-bound; y<=bound; y++) for (let x=-bound; x<=bound; x++) {
          flux += pixelCatalogueProfile((x+shift)/dpr,(y+shift)/dpr,dpr,magnitude)/dpr**2
        }
        expect(flux).toBeCloseTo(1, 5)
      }
    }
  }
})

it('keeps faint sources concentrated while reserving optical wings for brighter stars', () => {
  expect(catalogueOptics(7).wingWeight).toBe(0)
  expect(catalogueOptics(2).wingWeight).toBeGreaterThan(0)
  expect(catalogueOptics(2).wingWeight).toBeLessThan(catalogueOptics(-1.46).wingWeight)
  expect(pixelCatalogueProfile(2,0,2,-1.46)).toBeGreaterThan(pixelCatalogueProfile(2,0,2,7))
  expect(pixelCatalogueProfile(0,0,2,7)).toBeGreaterThan(pixelCatalogueProfile(0,0,2,-1.46))
})
