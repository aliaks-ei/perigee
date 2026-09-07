# Runtime asset inventory

Historical snapshot. Detail/delivery decisions below describe the earlier implementation.
Current rendering and delivery behavior is documented in
[Rendering quality and still export](./rendering-quality.md) and the source records below.

Recorded 2026-09-06 from the working tree, against baseline `a9fc1946d6fb21edf750feed52835ad96e26d06f`.

Dimensions and transfer bytes below are file measurements. Decoded CPU and GPU figures
are conservative **estimates**: RGBA8 and RGBA8 with a full mip chain respectively.
They exclude driver padding, source blobs and render targets. KTX2 file size is transfer
size, not the device's transcoded GPU allocation. Assets are not all resident at once.

Source authors, licenses, image modifications and orientation are recorded in
[ATTRIBUTIONS.md](../public/assets/ATTRIBUTIONS.md). Albedo is sRGB; elevation-derived
normals are data textures. All variants preserve the one shader-side V flip. Planet
maps use equirectangular projection; landscape plates are authored screen-space crops.
Cabo remains an AI-assisted interpretation of its licensed geographic reference.

| Asset | Delivered pixels | Transfer bytes | CPU MiB estimate | GPU MiB estimate | KTX2 transfer bytes | Native source detail |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `environments/cabo-da-roca-landscape-2k.webp` | 2048×1280 | 61,142 | 10.00 | 13.33 | — | Not independently established |
| `environments/cabo-da-roca-landscape-4k.webp` | 3172×1984 | 119,328 | 24.01 | 32.01 | — | Not independently established |
| `environments/cabo-da-roca-landscape-safe.webp` | 1280×800 | 30,842 | 3.91 | 5.21 | — | Not independently established |
| `environments/cabo-da-roca-portrait-2k.webp` | 1280×2770 | 89,796 | 13.53 | 18.03 | — | Not independently established |
| `environments/cabo-da-roca-portrait-safe.webp` | 832×1800 | 50,086 | 5.71 | 7.62 | — | Not independently established |
| `environments/hilltop-cinematic-2k.webp` | 2048×1281 | 96,838 | 10.01 | 13.34 | — | 1586×992 (AI-assisted artwork) |
| `environments/hilltop-cinematic-4k.webp` | 3172×1984 | 199,294 | 24.01 | 32.01 | — | 1586×992 (AI-assisted artwork) |
| `environments/hilltop-cinematic-safe.webp` | 1280×801 | 39,128 | 3.91 | 5.21 | — | 1586×992 (AI-assisted artwork) |
| `environments/lakeside-cinematic-2k.webp` | 2048×1281 | 74,886 | 10.01 | 13.34 | — | 1586×992 (AI-assisted artwork) |
| `environments/lakeside-cinematic-4k.webp` | 3172×1984 | 165,678 | 24.01 | 32.01 | — | 1586×992 (AI-assisted artwork) |
| `environments/lakeside-cinematic-safe.webp` | 1280×801 | 28,966 | 3.91 | 5.21 | — | 1586×992 (AI-assisted artwork) |
| `environments/rooftop-cinematic-2k.webp` | 2048×1281 | 110,184 | 10.01 | 13.34 | — | 1586×992 (AI-assisted artwork) |
| `environments/rooftop-cinematic-4k.webp` | 3172×1984 | 222,638 | 24.01 | 32.01 | — | 1586×992 (AI-assisted artwork) |
| `environments/rooftop-cinematic-safe.webp` | 1280×801 | 47,124 | 3.91 | 5.21 | — | 1586×992 (AI-assisted artwork) |
| `objects/jupiter-2k.jpg` | 2048×1024 | 265,318 | 8.00 | 10.67 | 1456223 | 4096×2048 source map |
| `objects/jupiter.jpg` | 4096×2048 | 1,309,419 | 32.00 | 42.67 | 5526222 | 4096×2048 source map |
| `objects/mars-2k.jpg` | 2048×1024 | 376,769 | 8.00 | 10.67 | 446732 | Not independently established |
| `objects/mars-normal.webp` | 2048×1024 | 505,694 | 8.00 | 10.67 | 1334110 | 5760×2880 elevation grid |
| `objects/mars.jpg` | 4096×2048 | 1,967,090 | 32.00 | 42.67 | 1611029 | Not independently established |
| `objects/moon-2k.jpg` | 2048×1024 | 714,703 | 8.00 | 10.67 | 487969 | Not independently established |
| `objects/moon-normal.webp` | 2048×1024 | 706,220 | 8.00 | 10.67 | 1768544 | 5760×2880 elevation grid |
| `objects/moon.jpg` | 4096×2048 | 3,882,940 | 32.00 | 42.67 | 1862568 | Not independently established |
| `objects/neptune.jpg` | 2048×1024 | 241,580 | 8.00 | 10.67 | 727993 | Not independently established |
| `objects/saturn-atmosphere-v2-2k.webp` | 2048×1024 | 88,492 | 8.00 | 10.67 | 1244990 | 1774×887 (AI-assisted artwork) |
| `objects/saturn-atmosphere-v2.webp` | 4096×2048 | 376,558 | 32.00 | 42.67 | 3996526 | 1774×887 (AI-assisted artwork) |
| `objects/saturn-ring-2k.webp` | 2048×64 | 21,990 | 0.50 | 0.67 | 53108 | 8192×500 source strip |

## Detail and delivery decisions

High and balanced retain the detailed surface map; safe uses an available 2K sibling.
Normals keep their existing aligned grid. Surface LOD changes during distance travel
are deferred to avoid new downloads or texture popping during the arrival approach.
A 4K equirectangular map's central projected disc can resolve roughly 4096/π (~1304)
pixels across before central texels become larger than a pixel. Limb sampling is
nonuniform; delivered dimensions alone do not establish visible sharpness.

Saturn's 4K file contains only 1774×887 native detail. Its central-disc detail limit is
roughly 565 pixels, even if the drawing buffer is sharper. A traceable higher-detail
replacement remains asset work, not something upscaling can fix. No replacement was
acquired. Thumbnail and social-image regeneration waits for material acceptance.

The new 2048×1281 and 1280×801 landscape variants come from
`scripts/environment-variants.sh`; they keep the master framing to within integer-pixel
rounding. Quality budgets are in `QualityManager.ts`: 256/160/96 MiB of estimated texture
residency for high/balanced/safe, allowing pinned incoming/outgoing assets to exceed the
soft budget during a transition. Unpinned least-recently-used assets are evicted.

R7 comparison: retain procedural Andromeda with derivative- and projected-size-limited
noise. A baked RGBA8 4096-square alternative would add approximately 85.3 MiB with
mipmaps; observational imagery also needs foreground-star removal, a documented crop,
and license/color review. No comparative GPU measurement exists, so neither alternative
is presented as faster or adopted on that assumption.


## Chunk 1 observational Andromeda — 2026-09-07

This section supersedes the historical R7 procedural-galaxy decision above.
Source version: `55825fd3438b`. Detailed provenance, processing and resource
boundaries are in [andromeda-assets.md](./andromeda-assets.md).

| Derivative | Tiles | Transfer bytes |
| --- | ---: | ---: |
| 1024×512 complete lossless fallback | 1 | 578,150 |
| 2048×1024 | 8 | 1,378,966 |
| 4096×2048 | 32 | 5,286,984 |
| 8192×4096 | 128 | 19,209,108 |
| 16384×8192 | 512 | 56,007,754 |
| Total committed observational derivatives | 681 | 82,460,962 |

Each detail tile is 512×512 plus an 8-pixel border on every side. The full pyramid
is not fetched on entry: only the base is required; selected visible detail is
streamed within its slot budget. A tile costs an estimated 1.42 MiB GPU memory
with mips; CPU bitmaps and render targets are additional. WebP delivery is explicit
for the galaxy, including builds with optional planetary KTX2 enabled.

DSS2's source is 21299×13775; Hubble's source is 42208×9870. The sources have different
footprints, filters and photographic stretches. The 16K target is not a claim of
uniform Hubble detail across the whole field. Gaia selection contains 41,013 entries;
15,206 masks fall inside the shipped field. Fainter/unclassified foreground sources
may remain. Visual acceptance and replacement thumbnails/cards await manual review.

## Chunk 2 observational planets — 2026-09-07

The active planetary manifest supersedes the earlier surface tables. Version
`1b448275b234` contains **1354 derivatives, 139975140 bytes**, demand-loaded.

| Runtime asset | Resolution | Source/detail limit |
| --- | --- | --- |
| Moon/Mars bases | 2048×1024 each | Complete fallback |
| Moon/Mars colour pyramids | 4096/8192/16384, 672 bordered tiles per body | Native observational detail; device-budgeted selection |
| Moon/Mars height and normals | 4096×2048 | Physical elevation, RG16 height/lossless normal |
| Jupiter | 3600×1800 | November 2024 OPAL map |
| Saturn | 1800×900 | August 2024 OPAL map with reconstructed gaps |
| Neptune | 720×360 | June 2025 OPAL grid already oversamples observations |
| Saturn optical depth | 8192×1 | 5 km Voyager UVS radial profile; linear RG16 |

Menu thumbnails have new versioned URLs, including the observational Andromeda
preview. Social/encounter cards remain historical. Full source URLs, source and
derivative hashes, colour treatment, masks, resource estimates and limitations
are in [planet-assets.md](./planet-assets.md) and runtime provenance.


## Chunk 3 reference sky and stellar previews — 2026-09-07

Active sky: `stars/1abba926ac03/`, 3,333,556 bytes: versioned Yale catalogue,
96,968 additional Gaia points and a 1024x512 linear G-band integrated-light map.
Sources, flux subtraction, ODbL license, epoch, projection, limitations and
analytical memory estimates are recorded in [stellar-sky.md](./stellar-sky.md).
Exact hashes and provenance: `src/perigee/scenes/skyManifest.json`.
The synthetic Milky Way population is replaced. No KTX2 conversion applies.
Stellar thumbnails now use content-hashed CPU photosphere illustrations from
`scripts/star-thumbs.py`; they are neither observations nor browser captures.
