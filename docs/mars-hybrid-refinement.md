> Historical observational-v3 handoff. The subsequent selected display-v6 renderer
> and updated verification are documented in [display refinement](mars-hybrid-display-refinement.md).

# Mars H4 observational refinement — 17 September 2026

**Review-only candidate; no promotion or invented 95% score.** The fixed portrait
remains the public renderer. This supersedes the implementation/source details
of the [first Mars review](mars-hybrid-review.md), whose evidence is retained.
The new comparison is [available locally](http://127.0.0.1:4318/scripts/hybrid-review/mars.html).

## Changes and source selection

The Jupiter handoff established the importance of a suitable native map and
body-specific photometric calibration. Saturn combined complementary observed
sources while retaining the approved silhouette and shared lifecycle. Mars now
uses that source-combination approach, with physical MOLA terrain and a separate
thin atmospheric shell. The approved Jupiter/Saturn materials were not edited.

The first candidate's high-pass Viking MDIM 2.1 texture suppressed regional
brightness. HRSC improved color, but its remaining brightness bias still produced
a uniform-looking globe. TES restored regional brightness. The older Viking
merged-color mosaic recovered stronger photographic terrain/albedo structure.
A bounded comparison of source combinations, poses and light responses selected
the current composite; no portrait pixels enter its source maps.

| Input | Actual downloaded data | Role and limitations |
| --- | --- | --- |
| [ESA/DLR/FU Berlin HRSC High-Altitude Mosaic V1.0](https://archives.esac.esa.int/psa/ftp/pub/mirror/Guest-Storage-Facility/Mars_HRSC_High-Altitude-Mosaic_V1.0/) | Three float32 GeoTIFF bands, each 10,669×5,334, 2 km/pixel; red, green, blue | Regional color, without the enhanced press illustration's per-channel stretch. Observations from the high-altitude campaign through April 2022. Small upstream coverage gaps are interpolated, featureless regions; the dataset does not supply their mask. North-cap color is unreliable. |
| [NASA MGS/TES, ASU / Philip Christensen](https://tes.mars.asu.edu/products/) | `global_albedo_8ppd.img` and PDS label, 2,880×1,440 little-endian float32, 8 pixels/degree, product dated 2002-10-25 | Broadband 0.3–2.9 µm Lambert albedo supplies a broad brightness reference. Five-source-pixel Gaussian smoothing attenuates orbit-track artifacts. This is neither RGB nor simultaneous with HRSC. |
| [NASA Viking / ASU merged-color mosaic](https://mars.asu.edu/data/mdim_color/) | Eight 5,760-square PNG quadrants forming 23,040×11,520, 64 pixels/degree, about 0.925 km/pixel | Photographic luminance and fine structure. The archive identifies sharpening with MDIM 1.0; inherited sharpening is attenuated. Its older geometric control is less accurate than MDIM 2.1. Photographed shadows remain embedded. |
| Existing NASA Ames / USGS MDIM 2.1 | Unchanged `1b448275b234` derivatives | Polar ice color and a restrained fine-detail correction. Native source derivative is 21,339×10,670, not the 232 m master. |
| Existing NASA/JPL MOLA | Unchanged 4,096×2,048 height/normal derivatives of the 16-pixel/degree grid | Physical heights, existing terrain/shadow ramps and pole convergence. Normal response is attenuated to 0.2 because source imagery already contains relief shading. No height exaggeration. |

The [HRSC product guide](https://archives.esac.esa.int/psa/ftp/pub/mirror/Guest-Storage-Facility/Mars_HRSC_High-Altitude-Mosaic_V1.0/PUG_Mars_HRSC_High-Altitude-Mosaic.pdf)
and [Michael et al.](https://doi.org/10.48550/arXiv.2307.14238) describe the color
model and gap-related limitations. [ESA expressly permits PSA data reuse](https://open.esa.int/esa-planetary-science-archive/)
with investigator/archive acknowledgment. NASA/USGS/ASU data retain their public
scientific-data credits. No license from a separately published ESA press image
is substituted for the data's usage terms. Credits are in
`public/assets/ATTRIBUTIONS.md`; exact source URLs and SHA-256 values are recorded
in `public/assets/objects/mars-hrsc-color-v1.json`.

All sources use north-up, east-positive, planetocentric cylindrical coordinates
centered on 0°E. The Viking quadrants are ordered 225°, 315°, 45°, 135°E across
−180…180°E. HRSC's GeoTIFF labels specify 2,000 m pixels and radius 3,396 km.
Exactly 2,045 nodata samples in each HRSC band's final longitude column are
wrap-interpolated; this edge correction is distinct from the upstream coverage
gaps. No observed-area percentage is asserted from the absence of nodata.

## Reproducible composite and bounded rendering

1. `scripts/hybrid-review/prepare-mars-map.py` converts HRSC linear bands to a
   display composite with TES regional brightness. Below the polar transition,
   80% of luminance comes from the older Viking product and 20% from HRSC/TES;
   HRSC supplies chroma. The Viking luminance uses a 0.55-output-pixel smoothing
   and a 0.85 exponent, reducing upstream enhancement. The intermediate 4K file
   retains its earlier `mars-hrsc-color-v1` filename; it is now explicitly a
   multi-source preparation intermediate, not a runtime texture.
2. `prepare-mars-tiles.py` bakes the same bounded MDIM fine-detail ratio and blends
   to MDIM polar color from 68° to 78° absolute latitude. Endpoint rows converge
   to one color. It creates a 2K base and bordered 4K/8K/16K tiles. At higher levels,
   actual native Viking luminance contributes additional detail through a bounded
   ratio (0.55…1.65, exponent 0.65), without an unsharp mask. Extra detail fades
   at quadrant boundaries and toward the caps; this is filtering, not observation.
3. The review-only `marsGlobeSource` points `PlanetTiles` to the new pyramid.
   Its optional source URL leaves all existing callers unchanged. Mars again
   acquires only three leases: color base plus the existing normal/height maps.
   The two full auxiliary color maps used during research are no longer resident.
   Tile budgets, cancellation, shared lighting, fades and disposal remain shared.

Runtime color assets are under
`public/assets/objects/planets/mars-observational-v2/mars/`: **673 images**, including
672 bordered tiles. Their provenance includes per-file hashes. The original
planet tree is untouched. The new review tree is local and ignored like other
planet trees; it has not been uploaded to R2. Source downloads are retained in
ignored `tmp/hybrid-h4-mars/hrsc/` and `viking/`; rerun both recipes in order to
reproduce the derivative tree. No source or runtime asset was published.

The shader applies an authored luminance contrast of 1.8, restrained dark-terrain
desaturation, linear gains (1.2, 0.95, 0.65), exposure 2.7, a 0.4 Lambert fraction
and illumination exponent 2.2. These are presentation choices, not a newly
calibrated reflectance solution. Base and signed detail passes share the same
transform. Existing baked shading cannot be completely relit; it rotates with
the texture while MOLA shading follows the Sun.

The atmosphere uses 16 samples through an exponential shell, an 11 km scale
height, authored optical depth 0.016, approximate incoming-light attenuation,
planetary shadow and neutral dust-scattering color. Its outer bound is 1.018
radii; it does not change the solid body's scale. It shares the surface's Sun,
exposure and observer-extinction uniforms. Its pole-frame placement stays fixed
as longitude turns. Premultiplied transparency follows the shared fade lifecycle.
This is a single-scattering approximation, not a complete dust/ice climate model.

An illustrative water-ice cloud experiment, informed by
[NASA MOC observations of Tharsis clouds](https://www.jpl.nasa.gov/images/pia01673-early-moc-global-color-mosaics/),
was rejected after comparison: it introduced less convincing pale streaks.
**No reconstructed cloud field is enabled in this candidate.** Its experimental
source and failed visual passes remain only in ignored evidence. The selected
map still contains residual atmospheric features inherited from observations.

## Rotation and fixed reference

The sidereal period remains 88,642.44 seconds, prograde about local +Y. At 120×,
a revolution takes 738.687 seconds. The deterministic clock, automatic motion,
reduced-motion handling, hidden-tab suspension and frozen-capture transaction
are reused. There are no public rotation settings.

The review pole pitch is 0.4 rad, roll 0.05 rad, reference longitude phase −0.5 rad,
and Sun direction is proportional to (−1.15, −0.05, 1). These are authored shot
coordinates, not an ephemeris. The pole never inherits spin. Body-space sunlight
changes with surface rotation; world-space light and the atmospheric frame stay
fixed. Diameter 6,779 km, flattening 0.00589, all distance presets, camera,
background, placement and framing anchors remain unchanged. The fixed portrait
has not been recolored, rescaled or replaced.

## Visual review and remaining gap

The fixed portrait remains baseline 100. No numerical quality score is assigned.
The rubric is applied separately to desktop and mobile-layout images; a passing
unit test, stable frame rate or low capture difference cannot certify 95%.

| Dimension | Weight | Desktop | Mobile layout |
| --- | --- | --- | --- |
| Detail / features | 30% | More photographic structure and regional albedo; full-resolution observations survive export. The portrait still gives its calderas and canyon stronger, differently arranged relief. | Geographic features and quarter-turn albedo survive at the same size; the reference's exaggerated-looking calderas remain more conspicuous. |
| Lighting / depth | 25% | Improved source separation and coherent Sun-lit shell; the portrait still has stronger local highlight/shadow drama. | Better separation than the first candidate, but the globe remains more even in tone than the portrait. |
| Color | 20% | HRSC-based natural ochre, less uniform terrain; dark areas retain subdued color. The reference is richer and more golden. | Mars identity remains clear; some dusty regions look paler than the fixed reference. |
| Limb / atmosphere | 15% | Thin continuous atmosphere, stable shadow boundary, no inflated solid radius. Polar ice is observational and static. | Smooth limb and readable cap; no attempt to enlarge the disc to increase presence. |
| Composition / impression | 10% | Same camera/size/background; more convincing than the first attempt, but a different photographic impression persists. | Same framing; this is resized desktop Chromium evidence, not a physical phone. |

**The remaining visual differences are not hidden, and 95% acceptance is not
claimed.** The stronger observational candidate is ready for direct comparison;
promotion, thumbnail regeneration and public Mars description changes still
require the user's visual approval. Matching the illustration's individual
invented/rearranged landmarks is not evidence of scientific accuracy, and no
geographic warp or exaggerated height was introduced to imitate them.

## Verification and next steps

Evidence folders preserve `final/` (first handoff), the source
and lighting experiments, `observational-v2/` (before the native-detail pyramid)
and `observational-v3/` (selected pyramid and atmosphere, without artificial clouds).

- Node 24.20.0, `NUXT_IGNORE_LOCK=1 npm run verify`: type checking, all **282 tests
  in 52 files**, production build passed. `npm run generate` produced **35 routes**.
  `git diff --check` passed. Logs are beside the evidence folders.
- `mars.mjs`: matched desktop 1440×900 and mobile-layout 390×844, quarter turns,
  quality tiers, near/real distance, automatic rotation and stable pole/light,
  reduced motion, pause/resume, transitions, cancellation, faded surfaces and
  4K/8K exports. No browser or shader errors.
- `mars-details.mjs`: both polar views inspected; longitude tile streaming and
  moving 8K exports passed. One frozen instant across **162 desktop / 130 mobile**
  pose applications; identical clock before/after the capture transaction.
  The new source version and width 23,040 are confirmed in diagnostics. Maximum
  export residency was **25 desktop / 32 mobile** tiles, with zero failures.
  These captures selected 4K/8K detail respectively, not the 16K asset ceiling.
- Actual review exports are **3840×2400 / 7680×4800 desktop**, **1774×3840 /
  3549×7680 mobile layout**. Native crops, seams, caps and quarter-turn views were
  inspected. Live/downsampled-4K RGB mean absolute differences are **1.169/255
  desktop and 1.308/255 mobile**, maximum channel mean bias **1.120/255**. These
  check compositing consistency and are not visual-quality scores.
- A final physical-normal comparison at 0.2 and 1.0 did not close the visual gap;
  the attenuated 0.2 response remains selected. No physical height was increased.
  `tmp/hybrid-h4-mars/normal-comparison.jpg` preserves the comparison.
- `mars-regressions.mjs` and pixel comparison: the current public Jupiter,
  Saturn and Mars are **pixel-identical** to the archived pre-Mars renderer on
  both layouts. The review page's layout and quarter-turn controls load correctly.
- `mars-production.mjs`: the generated app still uses the portrait, exposes no
  rotation settings, and actual **Capture → Save image** downloads were opened:
  **7680×4800 desktop / 3549×7680 mobile**. Zero browser errors. Evidence is in
  `observational-v3-production/`.
- Headed Chromium 151 / Apple M4 / ANGLE Metal, 30 warm-up and 300 measured frames
  per configuration: approximately **120 fps** in this run. Globe GPU p95 was
  **3.13 / 3.67 / 3.09 ms desktop** and **2.83 / 3.07 / 2.83 ms mobile layout**
  for high/balanced/safe; CPU p95 ≤0.60 ms. These short desktop measurements do
  not rank tiers or establish phone performance.

Physical-phone GPU/thermal/touch behavior and other browsers remain untested.
Real `document.hidden` event delivery remains unverified on the automated macOS
browser (the earlier harness could not force it); explicit pause/resume and
reduced-motion checks passed. No claim of physical-device testing is made.

The 95% visual gate remains unresolved, despite the substantially improved source
and rendering pipeline. The direct comparison still shows weaker local depth,
paler dust regions and less prominent volcanic features. Further work should
address that photographic impression through observed lighting/color information;
it must not silently replace the fixed reference, warp geography, enlarge Mars,
or exaggerate heights. No numerical score, visual acceptance or promotion has
been inferred from these technical checks. Promotion, thumbnail regeneration and
public description updates remain conditional on explicit user approval.
