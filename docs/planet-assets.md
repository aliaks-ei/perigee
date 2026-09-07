# Planetary observations and rendering — Chunk 2

Implemented 2026-09-07. Browser acceptance belongs to the user. The app contains
**five** Solar System bodies (Moon plus four planets); the plan's previous “six”
was a counting error, not a request to add Earth.

## Source selection

| Body/data | Source and native input | Treatment and limits |
| --- | --- | --- |
| Moon colour | [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), December 2025 colour, 16384×8192 TIFF derivative | LROC visible-band mosaic, with source-authored white balance and polar infill. TIFF sRGB becomes 8-bit runtime colour. 16K is source-backed, not an upscale. |
| Moon elevation | Same kit, LOLA 64 pixels/degree, 23040×11520 uint16 TIFF | Half-metres relative to radius 1727400 m; subtract 10000 m to reference 1737400 m. Resampled to 4096×2048 terrain grid. |
| Mars colour | [USGS/NASA Ames Viking MDIM 2.1 colourized mosaic](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m), native 1 km derivative, 21339×10670 JPEG | Downsampled to 16K. East-positive, planetocentric, centred on the prime meridian. Colour is assigned/adjusted by the source; residual photographed relief remains. Not perfectly lighting-neutral albedo. |
| Mars elevation | [MOLA MEGDR 16 pixels/degree](https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/), 5760×2880 signed big-endian int16 | Metres; longitude rolled half a turn to align the colour mosaic, then resampled to 4096×2048. |
| Jupiter | [Hubble OPAL Cycle 31](https://archive.stsci.edu/hlsp/opal/opal-jupiter-cycle-31), rotation A, 19–20 November 2024, 3600×1800 | F658N/F467M/F395N display composite. Source Minnaert correction removes limb darkening. Global bright-cloud white balance is an authored display approximation; missing poles are interpolated. No 16K enlargement. |
| Saturn | [Hubble OPAL Cycle 31](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-31), rotation A, 22 August 2024, 1800×900 | F631N/F502N/F395N composite, source Minnaert correction. Missing poles and the equatorial ring-obscured strip are reconstructed from adjacent complete latitude rows. No generated storms or claimed new polar detail. |
| Neptune | [Hubble OPAL Cycle 31](https://archive.stsci.edu/hlsp/opal/opal-neptune-cycle-31), 28 June 2025, 721×361 including endpoint row/column | Duplicate endpoints removed: 720×360. The archive explicitly says its grid oversamples observations. Pale blue-green display balance is guided by [Irwin et al. 2024](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0); RGB target is an approximation, not a spectrophotometric calibration. No invented fine structure. |
| Ring optical depth | [Voyager 2 UVS delta Sco egress profile](https://pds-rings.seti.org/voyager/uvs/profiles.html), 26 August 1981, 5 km radial sampling | 12846 samples, 73665–137890 km; median normal optical depth, uncertainty and missing flags. Valid samples interpolated into an 8192-bin radial profile. Negative noisy tau clamps to zero, saturated 99 values cap at tau=8. Outside coverage is transparent. UV data does not uniquely determine visible scattering. |

NASA's SVS, LROC/LOLA, USGS/NASA Ames, MOLA, Hubble OPAL and Voyager UVS/PDS
credits are retained in [ATTRIBUTIONS.md](../public/assets/ATTRIBUTIONS.md) and
`/method#planetary-imagery`. Hubble observations are credited to NASA, ESA,
Amy Simon and the OPAL team. The source-based maps replace the generated Saturn
atmosphere. The earlier Solar System Scope ring **colour** strip remains CC BY 4.0;
its display alpha no longer supplies optical depth.

Cassini's [2004 natural-colour portrait](https://science.nasa.gov/photojournal/the-greatest-saturn-portrait-yet/)
and [2012/2016 polar colour comparison](https://science.nasa.gov/resource/changing-colors-in-saturns-north/)
were considered as references. The portrait is a partially illuminated perspective
view; the polar observations have different epochs and coverage. The selected OPAL
map supplies an already mapped, photometrically corrected rotation. This avoids
baking Cassini's directional shadows or mixing seasons into a global albedo map.
The consequence is lower finite Saturn detail and reconstructed polar caps, not a
claim that Hubble resolves all Cassini-scale clouds.

## Reproduction

Masters are outside the repository in `/tmp/perigee-planet-sources`. The preparation
script does not fetch data. Download these public products under the given names:

| Cache filename | URL |
| --- | --- |
| `moon-color.tif` | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_16bit_srgb_16k.tif |
| `moon-height.tif` | https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_64_uint.tif |
| `mars-color.jpg` | https://astrogeology.usgs.gov/ckan/dataset/7131d503-cdc9-45a5-8f83-5126c0fd397e/resource/5ea881c6-01b3-41fa-a7af-42d2131b54f1/download/mars_viking_mdim21_clrmosaic_1km.jpg |
| `mars-height.img` | https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img |
| `jupiter.tif` | https://archive.stsci.edu/missions/hlsp/opal/cycle31/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2024c_f395n-f467m-f658n_v1_globalmap.tif |
| `jupiter-readme.txt` | https://archive.stsci.edu/missions/hlsp/opal/cycle31/jupiter/hlsp_opal_hst_wfc3-uvis_jupiter-2024-2_all_v1_readme.txt |
| `saturn.tif` | https://archive.stsci.edu/hlsps/opal/cycle31/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2024a_f395n-f502n-f631n_v1_globalmap.tif |
| `neptune.tif` | https://archive.stsci.edu/missions/hlsp/opal/cycle31/neptune/hlsp_opal_hst_wfc3-uvis_neptune-2025a_f467m-f547m-f657n_v1_globalmap.tif |
| `neptune-readme.txt` | https://archive.stsci.edu/missions/hlsp/opal/cycle31/neptune/hlsp_opal_hst_wfc3-uvis_neptune-2025a_all_v1_readme.txt |
| `rings.tab` | https://pds-rings.seti.org/holdings/volumes/VG_28xx/VG_2802/EASYDATA/KM005/US1P01.TAB |

The [Saturn README](https://archive.stsci.edu/hlsps/opal/cycle31/saturn/hlsp_opal_hst_wfc3-uvis_saturn-2024_all_v1_readme.txt)
and [ring label](https://pds-rings.seti.org/holdings/volumes/VG_28xx/VG_2802/EASYDATA/KM005/US1P01.LBL)
provide calibration and flag definitions. The manifest's source checksums identify
the actual inputs; do not silently substitute another release.

With Python 3.13, Pillow 12.3, numpy 2.5 and scipy 1.18 in the external virtualenv:

```sh
rtk proxy /tmp/perigee-galaxy-venv/bin/python scripts/planet-assets.py /tmp/perigee-planet-sources
rtk proxy /tmp/perigee-galaxy-venv/bin/python scripts/planet-thumbs.py
rtk proxy /tmp/perigee-galaxy-venv/bin/python scripts/verify-planet-assets.py
```

The recipe and source hashes derive immutable versioned URLs; `planet-manifest.json`
is the active selector. The provenance records every derivative's size/hash,
source dimensions, OPAL missing-pixel fraction, complete latitude range and display
reference RGB. Runtime derivatives are the only scientific imagery kept in the repository.

The processing changes OPAL planetographic latitude to planetocentric latitude,
rolls its 0–360°E layout into the renderer's centred layout, masks incomplete
coverage and blends complete rows into longitude-independent polar caps. The
Neptune northern cap is especially unconstrained. Colour TIFFs are display
composites, not spectrally complete calibrated albedo. Their small colour/contrast
adjustments remain separate from shader lighting.

## Runtime and resource bounds

Moon/Mars have complete 2048×1024 bases and bordered 4096/8192/16384 colour tile
levels. Each tile has 512 inner pixels and an 8-pixel border on every side.
WebP quality 94 is used for colour detail; terrain normals are lossless WebP.
Height and ring depth are lossless PNG packed into RG16 with linear decoding:
`(R * 65280 + G * 255) / 65535`. No sRGB conversion or lossy compression applies
to these data maps. New planetary assets deliberately bypass optional KTX2, so
old compressed siblings cannot replace new data. Ring colour retains its existing
optional compressed path. KTX2 and default builds are checked separately.

Planet base and tile decodes share the Chunk 1 two-job admission queue. Detail
uses transient leases with cancellation, late-result retirement, retry backoff
and a slot limit of 64/32/8 for high/balanced/safe. Half the slots select new
visible detail; the rest permit old tiles to fade out over 350 ms. Safe requests
no colour detail. Physical pixel footprint sets LOD with hysteresis. Conservative
frustum/hemisphere culling and a priority for central, less foreshortened tiles
allocate the budget. **16K is a source/selected-tile ceiling, not a promise that
the whole visible hemisphere is resident at 16K.** The complete base covers all
unselected or failed tiles. Mipmaps and anisotropy handle oblique sampling.

Approximate allocations, not measured GPU residency:

- One 4096×2048 RGBA8 data map with mipmaps: 42.67 MiB. Moon/Mars hold two.
- A 2048×1024 base with mipmaps: 10.67 MiB. Full rocky fallback total: 96 MiB.
- One bordered colour tile with mipmaps: 1.42 MiB. High/balanced slot ceilings:
  90.75/45.38 MiB. Safe allocates none after retirement.
- A 512×256 sphere has approximately 132000 vertices. Base and tile geometry are
  owned per hero and disposed; the shared historical sphere is not disposed on swaps.
- An object fade may hold two heroes. At most two image decodes can remain active
  across the new planet/galaxy queues, including cancelled work still settling.
  Backdrops, render targets and unpinned general-cache entries are additional.
  The general cache budget is an eviction target, not a cap on pinned heroes.

This is a bounded policy, not proof of smoothness on a device. Safe still retains
the rocky data maps to permit a later tier upgrade without a missing terrain
source. Chunk 4 can refine measured budgets; no FPS/residency claims are made here.

## Surface, terrain and lighting

Regolith uses an approximate Lommel-Seeliger/Lambert mix with a restrained,
body-specific opposition term. Atmospheric bodies use a Minnaert-like response
and a thin, Sun-lit scattering approximation. Albedo-derived slopes, global warm
contrast grading and unconditional night lift are removed. The Moon has no
atmosphere. Earthshine uses Earth albedo 0.3, Earth radius 6371 km, a Lambert phase
function opposite the lunar phase, and the live reconstructed distance. This is
an explicit hypothetical Earth-at-observer model, not a full Earth ephemeris.

Terrain normals have **1× physical slopes**. Measured heights set displacement;
the same field samples toward the local Sun for 16-step approximate self-shadowing.
The shadow ray includes spherical curvature and a finite solar disc. It spans
roughly 0.096 body radii (167 km Moon, 326 km Mars). A small numerical clearance
bias suppresses self-intersection; sub-grid cliffs and remote occluders are not
fully resolved. Terrain fades in from 600 to 1500 physical diameter pixels.
Safe uses normal lighting only; below the threshold there is no geometry relief.

Geometry uses 128/256/512 longitude segments according to projected size/quality.
All patches share a global grid and height sampler, so adjacent vertices match.
Pole heights/normals converge to unique values. The base uses displacement too;
tile detail adds only the signed difference in lit albedo in the existing HDR
buffer. It does not add a second atmosphere or a second terrain normal.

Ring opacity is `1 - exp(-tau / abs(view cosine))`. Lit and unlit radiance comes
from a single-scattering slab, including the equal-cosine limit. Ring-to-planet
shadows average finite-Sun transmission samples; planet-to-ring shadows use the
oblate-body intersection and penumbra. Ring colour is independent of tau. Finite
radial filtering and UV-to-visible differences remain approximations, as do
multiple scattering and azimuth-dependent particle wakes.

## Manual review handoff

Check all five bodies at real, intermediate and closest distances; then inspect
slow distance movement, rotation, illuminated limbs, terminators, poles, seams,
Saturn's shadows and both ring faces where the current geometry exposes them.
Check rapid switching, failed detail requests, reduced motion, quality changes
and context restoration. Look especially for tile boundaries, Mars's residual
photographed shading, inferred OPAL caps and the Saturn equatorial reconstruction.
The menu thumbnails are source crops, not browser screenshots. Social/encounter
cards remain unchanged until accepted user-supplied browser captures exist.


## Repository verification

Node 24.20.0: typecheck, 199 tests/39 files and production build passed, as did
an optional KTX2 production build. Offline asset verification covered 1354 files,
139975140 bytes and 2576 tile boundary pairs; the worst mean RGB boundary error
was 2.002/255. Four representative 16K Moon/Mars tile crops compared to the
uncompressed resize yielded PSNR 42.79–44.13 dB, with mean absolute error below
1.41/255. These are sample compression comparisons, not an exhaustive perceptual
assessment. No browser or GPU performance testing was performed.
