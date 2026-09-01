#!/usr/bin/env python3
"""Draw the object-browser thumbnail for Andromeda.

The runtime galaxy is a procedural shader, so there is no source map to crop a
thumbnail out of the way `thumbs/mars.webp` is cropped from `mars.jpg`. This
script runs the same maths on the CPU and writes a 160x160 PPM to stdout, so
the browser icon and the rendered object stay in step.

    python3 scripts/andromeda-thumb.py | magick ppm:- -quality 90 \
        public/assets/objects/thumbs/andromeda.webp

This is a hand port of `src/perigee/materials/GalaxyMaterial.ts`, and it will
not follow the shader on its own: every constant below has a counterpart there,
and changing one without the other is what leaves the icon showing an object
the scene no longer renders. The disc parameters come from `app/data/objects.ts`.
"""

import math
import sys

SIZE = 160
INCLINATION = math.radians(71.5)
POSITION_ANGLE = math.radians(37.7)
ARM_PITCH = math.radians(8.0)
WINDING = 1.0 / math.tan(ARM_PITCH)
COS_INCLINATION = math.cos(INCLINATION)

# The palette, linearised the way three converts an sRGB hex to a Color.
CORE = (0.8070, 0.5776, 0.3372)
DISC = (0.4851, 0.4179, 0.3231)
ARM = (0.2423, 0.3185, 0.4179)
HII = (0.4735, 0.2705, 0.2502)


def fract(value):
    return value - math.floor(value)


def hash2(x, y):
    x = fract(x * 233.34)
    y = fract(y * 851.73)
    d = x * x + y * y + x * 23.45 + y * 23.45
    x = fract(x + d)
    y = fract(y + d)
    return fract(x * y)


def noise(x, y):
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    fx = fx * fx * (3.0 - 2.0 * fx)
    fy = fy * fy * (3.0 - 2.0 * fy)
    a = hash2(ix, iy)
    b = hash2(ix + 1, iy)
    c = hash2(ix, iy + 1)
    d = hash2(ix + 1, iy + 1)
    lower = a + (b - a) * fx
    upper = c + (d - c) * fx
    return lower + (upper - lower) * fy


def smoothstep(edge0, edge1, x):
    t = (x - edge0) / (edge1 - edge0)
    t = min(max(t, 0.0), 1.0)
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def band(radius, at, width):
    offset = (radius - at) / width
    return math.exp(-offset * offset)


def companion(sx, sy, at_x, at_y, effective_radius, axis_ratio):
    dx = sx - at_x
    dy = (sy - at_y) / axis_ratio
    radius = max(math.hypot(dx, dy), effective_radius * 0.12) / effective_radius
    return math.exp(-3.67 * (radius ** 0.5 - 1.0))


def sample(sx, sy):
    """Sky coordinates in semi-major axes, with +x along the major axis."""
    sky_radius = math.hypot(sx, sy)
    if sky_radius > 1.24:
        return (0.0, 0.0, 0.0)

    px = sx
    py = sy / COS_INCLINATION
    warp_x = noise(px * 2.15 + 4.2, py * 2.15 + 9.1) - 0.5
    warp_y = noise(px * 2.35 + 17.7, py * 2.35 + 3.4) - 0.5
    structured_x = px + warp_x * 0.038
    structured_y = py + warp_y * 0.038
    radius = math.hypot(structured_x, structured_y)
    angle = math.atan2(structured_y, structured_x)

    spun_x = structured_x * 0.8 - structured_y * 0.6
    spun_y = structured_x * 0.6 + structured_y * 0.8
    coarse = noise(structured_x * 5.2, structured_y * 5.2)
    knots = noise(spun_x * 15.0 + 31.7, spun_y * 15.0 + 12.4)
    grain = noise(structured_x * 31.0 + 7.3, structured_y * 31.0 + 41.2)
    mottle = max(coarse * 0.5 + knots * 0.34 + grain * 0.16, 0.0) ** 1.5

    spiral = 2.0 * angle - WINDING * math.log(max(radius, 0.03))
    ridge = max(0.5 + 0.5 * math.cos(spiral), 0.0) ** 2.4
    arm_breaks = smoothstep(0.22, 0.72, coarse * 0.62 + knots * 0.38)
    arms = ridge * (0.2 + 0.8 * arm_breaks) * smoothstep(0.16, 0.34, radius)

    sheet = math.exp(-radius / 0.34) * smoothstep(1.08, 0.90, radius)
    ring_radius = math.hypot(structured_x - 0.055, structured_y - 0.03)
    rings = (
        band(ring_radius, 0.47, 0.075)
        + band(ring_radius, 0.71, 0.09) * 0.32
        + band(ring_radius, 0.25, 0.06) * 0.18
    )
    rings *= (0.08 + 0.92 * arms) * (0.22 + 1.15 * mottle)
    hii_mask = (
        smoothstep(0.82, 0.985, grain)
        * smoothstep(0.52, 0.82, coarse)
        * smoothstep(0.48, 0.76, knots)
    )
    hii_knots = hii_mask * rings

    dust_radius = radius + (coarse - 0.5) * 0.075 + math.sin(angle * 3.0 + radius * 8.0) * 0.012
    lanes = (
        band(dust_radius, 0.38, 0.052)
        + band(dust_radius, 0.59, 0.064) * 0.76
        + band(dust_radius, 0.27, 0.045) * 0.56
        + band(dust_radius, 0.49, 0.044) * 0.42
    )
    lane_ridge = max(0.5 + 0.5 * math.cos(spiral + 1.15), 0.0) ** 2.0
    dust = min(
        max(
            lanes
            * (0.18 + 0.82 * lane_ridge)
            * (0.48 + 0.52 * mottle)
            * smoothstep(0.10, 0.24, radius),
            0.0,
        ),
        1.0,
    )
    near_side = smoothstep(0.08, -0.12, sy)
    dust *= 0.48 + 0.52 * near_side

    bulge_radius = max(math.hypot(sx, sy / 0.58), 0.018)
    bulge = min(math.exp(-4.07 * ((bulge_radius / 0.095) ** 0.4545 - 1.0)) * 0.34, 2.35)
    halo_radius = max(math.hypot(sx, sy / 0.78), 0.01)
    halo = math.exp(-halo_radius / 0.34) * 0.026

    color = DISC
    outer_population = smoothstep(0.22, 0.82, radius) * (0.2 + 0.8 * arms)
    color = mix(color, ARM, outer_population * 0.42)
    color = mix(color, HII, hii_mask * smoothstep(0.25, 0.45, radius) * 0.18)

    field = (
        sheet * (0.27 + arms * 0.23) * (0.72 + mottle * 0.28)
        + (rings + hii_knots * 0.6) * 0.72 * math.exp(-radius / 0.72)
        + halo
    ) * (0.82 + 0.18 * smoothstep(-0.7, 0.7, structured_x))
    field *= 1.0 - dust * 0.88
    light = [channel * field for channel in color]

    core_light = bulge * (1.0 - dust * near_side * 0.48)
    m32 = companion(sx, sy, -0.204, 0.153, 0.032, 0.75) * 0.2
    m110 = companion(sx, sy, 0.036, -0.384, 0.075, 0.5) * 0.11
    for i in range(3):
        light[i] += CORE[i] * (core_light + m32) + DISC[i] * m110
        light[i] *= smoothstep(1.24, 1.02, sky_radius) * 0.34
    return light


def aces(x):
    return min(max((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0), 1.0)


def main():
    # The disc is nearly edge-on, so the thumbnail is framed to let the major
    # axis run corner to corner rather than crop it to a sliver.
    scale = 0.95
    cos_pa, sin_pa = math.cos(-POSITION_ANGLE), math.sin(-POSITION_ANGLE)
    rows = bytearray()
    for y in range(SIZE):
        for x in range(SIZE):
            vx = ((x + 0.5) / SIZE * 2.0 - 1.0) / scale
            vy = (1.0 - (y + 0.5) / SIZE * 2.0) / scale
            # The billboard's roll is the position angle, so unrolling the
            # sample point is what tilts the disc inside the icon.
            r, g, b = sample(vx * cos_pa + vy * sin_pa, vy * cos_pa - vx * sin_pa)
            # The scene tone-maps with ACES; matching it here keeps the icon
            # the same colour as the object it stands for. The lift stands in
            # for the light nucleus bloom the icon does not get.
            rows.extend(
                min(255, int(255.0 * aces(channel * 1.45) ** (1.0 / 2.2) + 0.5))
                for channel in (r, g, b)
            )
    out = sys.stdout.buffer
    out.write(f"P6\n{SIZE} {SIZE}\n255\n".encode())
    out.write(bytes(rows))


if __name__ == "__main__":
    main()
