import { BufferAttribute, BufferGeometry } from 'three'
import { galaxyDepth } from '../math/galaxyProjection'

/** Every tile samples the same continuous volume, including shared edges. */
export function galaxyGeometry(layer: number, bounds = { u: 0, v: 0, width: 1, height: 1 }, segments = 128): BufferGeometry {
  const columns = Math.max(2, Math.ceil(segments * bounds.width))
  const rows = Math.max(2, Math.ceil(segments / 2 * bounds.height))
  const positions: number[] = []
  const uvs: number[] = []
  const referenceDepths: number[] = []
  const indices: number[] = []
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const u = bounds.u + column / columns * bounds.width
      const v = bounds.v + row / rows * bounds.height
      const x = (u - .5) * 2.5
      const y = (.5 - v) * 1.25
      positions.push(x, y, galaxyDepth(x, y, layer))
      referenceDepths.push(galaxyDepth(x, y, 0))
      uvs.push(u, v)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column
        const b = a + columns + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('aReferenceDepth', new BufferAttribute(new Float32Array(referenceDepths), 1))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}
