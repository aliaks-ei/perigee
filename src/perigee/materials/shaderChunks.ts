/**
 * Every texture the cache hands out is stored top row first (`flipY` is off,
 * so ImageBitmap and KTX2 uploads behave the same), while three's sphere and
 * plane UVs put v = 1 at the top. Sampling flips once, here.
 */
export const FLIP_V = `
  vec2 mapUv(vec2 uv) {
    return vec2(uv.x, 1.0 - uv.y);
  }
`

export interface HazeUniforms {
  uHorizon: { value: number }
  uHazeColor: { value: import('three').Color }
  uHaze: { value: number }
}
