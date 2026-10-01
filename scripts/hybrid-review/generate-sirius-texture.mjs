// Deterministic, purely synthetic review art. 3D sampling makes longitude and
// both poles continuous; no telescope or portrait pixels enter this map.
import { mkdir, writeFile } from 'node:fs/promises'

const width = 2048
const height = 1024
const pixels = Buffer.alloc(width * height * 3)
const fract = value => value - Math.floor(value)
const hash = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453)
const smooth = value => value * value * (3 - 2 * value)
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz)
  const lerp = (a, b, t) => a + (b - a) * t
  return lerp(
    lerp(lerp(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx),
      lerp(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
    lerp(lerp(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx),
      lerp(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz)
}

for (let y = 0; y < height; y++) {
  const lat = Math.PI * (.5 - y / (height - 1))
  const ring = Math.cos(lat), vertical = Math.sin(lat)
  for (let x = 0; x < width; x++) {
    const lon = 2 * Math.PI * x / width
    const sx = ring * Math.cos(lon), sy = vertical, sz = ring * Math.sin(lon)
    const warp = (noise(sx * 6 + 13, sy * 6, sz * 6) - .5) * .08
    const px = sx + warp, py = sy - warp * .43, pz = sz + warp * .61
    const broad = noise(px * 20 + 3, py * 20 + 9, pz * 20)
    const middle = noise(px * 53, py * 53 + 7, pz * 53 + 11)
    const fine = noise(px * 140 + 6, py * 140, pz * 140 + 2)
    const feather = Math.max(0, Math.min(1, .57 + (broad - .5) * .5
      + (middle - .5) * .76 + (fine - .5) * .36))
    const t = Math.pow(feather, .84)
    const offset = (y * width + x) * 3
    pixels[offset] = Math.round(182 + 73 * t)
    pixels[offset + 1] = Math.round(199 + 55 * t)
    pixels[offset + 2] = Math.round(237 + 17 * t)
  }
}

await mkdir('tmp/hybrid-h6-sirius', { recursive: true })
await writeFile('tmp/hybrid-h6-sirius/sirius-surface.ppm', Buffer.concat([
  Buffer.from(`P6\n${width} ${height}\n255\n`), pixels,
]))
