export interface TileAddress { width: number, x: number, y: number }

/** Hysteresis avoids repeated fetches when the footprint straddles a boundary. */
export function tileLevelFor(pixels: number, previous: number, levels: readonly number[]): number {
  if (!Number.isFinite(pixels) || pixels <= 0) return 1024
  const all = [1024, ...levels]
  if (all.includes(previous) && pixels > previous * .45 && pixels <= previous * 1.08) return previous
  return all.find((level) => level >= pixels) ?? all.at(-1)!
}

export function tileBounds(tile: TileAddress, size = 512) {
  return { u: tile.x * size / tile.width, v: tile.y * size / (tile.width / 2),
    width: size / tile.width, height: size / (tile.width / 2) }
}

export function tileUv(local: number, size = 512, border = 8): number {
  return (border + local * size) / (size + border * 2)
}
