import { describe, expect, it } from 'vitest'
import { skyObjects } from '../app/data/objects'
import { viewpoints } from '../app/data/viewpoints'

/** Resolved by Vite at collection time, so the test needs no Node types. */
const publicFiles = new Set(
  Object.keys(import.meta.glob('../public/assets/**/thumbs/*.webp'))
    .map((path) => path.replace(/^\.\.\/public/, '')),
)

describe('interface thumbnails', () => {
  it('gives every object its own thumbnail in the thumbs folder', () => {
    for (const object of skyObjects) {
      expect(object.thumbnail, object.id).toMatch(/^\/assets\/objects\/thumbs\/[a-z-]+\.webp$/)
      expect(publicFiles.has(object.thumbnail), `missing ${object.thumbnail}`).toBe(true)
    }
    // The three stars used to share one orange texture, which showed Betelgeuse
    // in the control pill whichever star was selected.
    expect(new Set(skyObjects.map((object) => object.thumbnail)).size).toBe(skyObjects.length)
  })

  it('gives every viewpoint a landscape thumbnail', () => {
    for (const viewpoint of viewpoints) {
      expect(viewpoint.thumbnail, viewpoint.id).toMatch(/^\/assets\/environments\/thumbs\/[a-z-]+\.webp$/)
      expect(publicFiles.has(viewpoint.thumbnail), `missing ${viewpoint.thumbnail}`).toBe(true)
    }
  })
})
