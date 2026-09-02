#!/usr/bin/env python3
"""Draw the object-browser thumbnails for the three stars.

The stars are procedural in the scene, so there is no surface map to crop a
thumbnail from. This script runs a reduced version of the stellar shader on the
CPU and writes a 160x160 PPM to stdout, one star per run, so the icon in the
browser and the control pill shows the star the scene renders rather than one
shared orange texture.

    for star in betelgeuse sirius rigel; do
      python3 scripts/star-thumbs.py "$star" | magick ppm:- -quality 90 \
          "public/assets/objects/thumbs/$star.webp"
    done

The palettes and the cellular/marbled split mirror
`src/perigee/materials/StellarMaterial.ts`; the halo mirrors
`materials/GlareMaterial.ts`. Change a palette there and rerun this script.
"""

import math
import sys

SIZE = 160
BACKGROUND = (0x0A / 255, 0x10 / 255, 0x17 / 255)

LOOKS = {
    'betelgeuse': {
        'palette': ('#6d0d02', '#ff571f', '#ffd38a'),
        'style': 'cellular',
        'cell_scale': 2.3,
        'contrast': 1.15,
        'limb': 0.74,
        'glow': '#ff5d2f',
    },
    'sirius': {
        'palette': ('#294d8f', '#a9d3ff', '#ffffff'),
        'style': 'marbled',
        'cell_scale': 16,
        'contrast': 1.0,
        'limb': 0.5,
        'glow': '#b7d5ff',
    },
    'rigel': {
        'palette': ('#214489', '#8dbdff', '#f6fbff'),
        'style': 'marbled',
        'cell_scale': 12,
        'contrast': 1.0,
        'limb': 0.55,
        'glow': '#a8c8ff',
    },
}


def hex_to_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))


def fract(value):
    return value - math.floor(value)


def hash3(x, y, z):
    px = fract(x * 0.3183099 + 0.1) * 17.0
    py = fract(y * 0.3183099 + 0.2) * 17.0
    pz = fract(z * 0.3183099 + 0.3) * 17.0
    return fract(px * py * pz * (px + py + pz))


def smoothstep(edge0, edge1, x):
    t = min(max((x - edge0) / (edge1 - edge0), 0.0), 1.0)
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return a + (b - a) * t


def mix3(a, b, t):
    return tuple(mix(a[i], b[i], t) for i in range(3))


def noise(x, y, z):
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = x - ix, y - iy, z - iz
    fx = fx * fx * (3.0 - 2.0 * fx)
    fy = fy * fy * (3.0 - 2.0 * fy)
    fz = fz * fz * (3.0 - 2.0 * fz)

    def corner(dx, dy, dz):
        return hash3(ix + dx, iy + dy, iz + dz)

    return mix(
        mix(mix(corner(0, 0, 0), corner(1, 0, 0), fx), mix(corner(0, 1, 0), corner(1, 1, 0), fx), fy),
        mix(mix(corner(0, 0, 1), corner(1, 0, 1), fx), mix(corner(0, 1, 1), corner(1, 1, 1), fx), fy),
        fz,
    )


def cells(x, y, z):
    ix, iy, iz = math.floor(x - 0.5), math.floor(y - 0.5), math.floor(z - 0.5)
    best = 4.0
    for dx in range(2):
        for dy in range(2):
            for dz in range(2):
                cx, cy, cz = ix + dx, iy + dy, iz + dz
                fx = cx + 0.25 + 0.5 * hash3(cx, cy, cz)
                fy = cy + 0.25 + 0.5 * hash3(cx + 7.31, cy + 3.17, cz + 9.43)
                fz = cz + 0.25 + 0.5 * hash3(cx + 19.7, cy + 11.3, cz + 5.9)
                d = (fx - x) ** 2 + (fy - y) ** 2 + (fz - z) ** 2
                best = min(best, d)
    return math.sqrt(best)


def surface(look, px, py, pz, mu):
    low, middle, high = (hex_to_rgb(c) for c in look['palette'])
    if look['style'] == 'marbled':
        large = noise(px * 3.8, py * 3.8, pz * 3.8)
        mottle = noise(px * 10.5, py * 10.5, pz * 10.5)
        granules = noise(px * 34.0, py * 34.0, pz * 34.0)
        convection = large * 0.48 + mottle * 0.3 + granules * 0.22
        warmth = smoothstep(0.2, 0.82, convection)
        color = mix3(low, middle, warmth)
        hot = smoothstep(0.68, 0.94, mottle * 0.7 + granules * 0.42)
        color = mix3(color, high, hot * 0.72)
        scale = mix(0.35, 1.3, mu ** 0.34)
        return tuple(c * scale * 1.5 for c in color)

    scale = look['cell_scale']
    warp = (
        noise(px * 2.1, py * 2.1, pz * 2.1) - 0.5,
        noise(px * 2.1 + 5.2, py * 2.1 + 1.7, pz * 2.1 + 8.3) - 0.5,
        noise(px * 2.1 + 9.7, py * 2.1 + 4.1, pz * 2.1 + 2.6) - 0.5,
    )
    qx, qy, qz = px + warp[0] * 0.38, py + warp[1] * 0.38, pz + warp[2] * 0.38
    coarse = 1.0 - smoothstep(0.0, 0.95, cells(qx * scale, qy * scale, qz * scale))
    medium = 1.0 - smoothstep(0.0, 1.15, cells(qx * scale * 2.4 + 4.0, qy * scale * 2.4 + 4.0, qz * scale * 2.4 + 4.0))
    heat = coarse * (0.72 + 0.28 * medium)
    heat = min(max(heat, 0.0), 1.0) ** look['contrast']
    color = mix3(low, middle, smoothstep(0.06, 0.66, heat))
    color = mix3(color, high, smoothstep(0.52, 0.94, heat) * 0.82)
    limb = 1.0 - look['limb'] * (1.0 - mu)
    color = mix3(color, low, (1.0 - mu) * 0.45)
    return tuple(c * limb * 1.35 for c in color)


def tone(value):
    # A gentle shoulder so the hot cores saturate to white instead of clipping
    # to the palette's top colour.
    return value / (1.0 + value * 0.28)


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'betelgeuse'
    look = LOOKS[name]
    glow = hex_to_rgb(look['glow'])
    radius = 0.44
    half = SIZE / 2

    out = sys.stdout.buffer
    out.write(f'P6\n{SIZE} {SIZE}\n255\n'.encode())
    for row in range(SIZE):
        for col in range(SIZE):
            sx = (col + 0.5 - half) / half
            sy = (half - row - 0.5) / half
            r = math.hypot(sx, sy)
            color = list(BACKGROUND)

            # The halo: a tight ring past the limb, then a broad falloff,
            # matching the glare billboard in proportion.
            u = r / radius / 3.0
            ring = 1.0 / (1.0 + 60.0 * (u - 0.36) ** 2) * (1.0 if u >= 0.33 else 0.0)
            halo = 1.0 / (1.0 + 7.0 * u * u)
            strength = (ring * 0.35 + halo * 0.5) * (1.0 - smoothstep(0.5, 1.0, u))
            strength *= smoothstep(0.3, 0.34, u)
            for i in range(3):
                color[i] += glow[i] * strength * 1.15

            if r < radius:
                nx, ny = sx / radius, sy / radius
                nz = math.sqrt(max(1.0 - nx * nx - ny * ny, 0.0))
                mu = nz
                lit = surface(look, nx, ny, nz, mu)
                edge = smoothstep(radius, radius - 0.02, r)
                for i in range(3):
                    color[i] = mix(color[i], lit[i], edge)

            out.write(bytes(int(min(max(tone(c), 0.0), 1.0) * 255 + 0.5) for c in color))


if __name__ == '__main__':
    main()
