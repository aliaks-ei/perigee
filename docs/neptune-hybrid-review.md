# Neptune H4 — approved atmospheric globe

## Approved Neptune promotion — 17 September 2026

The user answered **“I approve”** to the review-v9 comparison and promotion
question. This is explicit acceptance of the desktop and mobile-layout visual
review, including the 95% target; it is not a computed quality score.

Neptune now defaults to the accepted oblate globe and rotates automatically at
120×: 57,996 seconds per bulk turn, displayed in 483.3 seconds (about 8.1 minutes).
There are no rotation settings. The deterministic clock, fixed pole/Sun, reduced
motion, suspension and frozen capture remain shared with the approved planets.

The map JSON retains its preparation-time review status; this approval record
and the active renderer policy supersede it.

The accepted v4 map, surface/atmosphere shaders, pole, light, exposure, physical
size and framing are unchanged. The original portrait and review-v9 evidence
remain the fixed comparison and rollback reference. A new 320×320 WebP thumbnail
is rendered from an actual 4K export of the accepted globe. The old Neptune-only
1.42× menu zoom is removed so the new thumbnail keeps the whole body. Object metadata,
editorial sources, `/method` and source credits now identify dated 1989 Voyager
clouds, approximate registration and explicitly modelled bands/haze. The palette
remains an authored natural-colour approximation, not calibrated colour or
current weather. Mars, Jupiter and Saturn retain their approved rendering.

Promotion verification passed with Node 24: typecheck, **289 tests / 53 files**,
production build and **35-route static generation**, including the final thumbnail
CSS. An old portrait-default test was corrected to explicitly exercise rollback;
no assertions were removed. `git diff --check` is clean.

Headed Chromium passed automatic 120× motion, fixed pole/Sun, reduced-motion
freeze, no rotation settings, thumbnail loading/uncropped menu display and the
actual Capture → Save flow on both layouts, with zero browser errors. Saved PNGs
are 7680×4800 desktop and 3549×7680 mobile layout; native detail and full previews
were inspected. The production reference is pixel-identical to approved v9 on
both layouts (maximum difference 0). Mars, Jupiter and Saturn also remain
pixel-identical to their pre-promotion references. Accepted material/map hashes
are unchanged. Evidence: `tmp/hybrid-h4-neptune/promoted/`; logs:
`promotion-verify-final.log` and `promotion-generate.log`.

Physical-phone testing remains pending; 390×844 is desktop Chromium. The prior
native visibility-delivery limitation remains documented; explicit suspension,
reduced motion and frozen export are covered. No commit, asset upload or
publication was made. Moon remains the other H4 candidate, with its Earth-facing
policy preserved.

---

## Pre-approval review record

17 September 2026. **Current candidate: `review-v9`, map reconstruction v4.**
Review only. The original Neptune portrait stays active; physical size, framing,
presets, public copy and thumbnail are unchanged. No commit, upload or publication.

[Open the matched comparison](http://127.0.0.1:4318/scripts/hybrid-review/neptune.html).
It includes independent desktop 1440×900 and mobile-layout 390×844 views, fixed
portrait crops, all quarter turns, poles, presets, tiers and actual 4K/8K exports.
The prior review-v2 candidate was not the completion of the requested refinement.
The work below supersedes that candidate. **The 95% gate still requires explicit
user visual acceptance; no numerical score or test-based acceptance is asserted.**

## What changed after review-v2

- Reoriented the source-facing shot: phase −π/2 + 0.02, pole pitch +0.14 and roll
  −0.08 radians. Sun direction is proportional to (−0.9,0.2,1.2). These are authored
  shot coordinates, not ephemerides. No diameter, camera or position adjustment.
- Added a separate, fixed-pole molecular-haze shell with 24 integration samples,
  a 19.7 km scale height (midpoint of NASA's 19.1–20.3 km range), outer integration
  limit 1.006 radii, optical depth 0.008 and scattering gain 1.8. It shares the
  globe's weak-perspective projection, light and exposure; it follows opacity,
  disposal and frozen captures but does not inherit spin. The body stays at its
  calculated radius; the thin atmosphere is separate. Optical coefficients are
  illustrative, not a retrieved vertical aerosol profile.
- Replaced broad dull limb shading with thinner haze and wavelength-dependent
  view/Sun-path attenuation. Surface exposure 1.65, cloud-light exponent 1.7,
  optical-depth parameter 0.012; sRGB map palette (0.50,0.69,0.81). Red is attenuated
  more strongly along longer paths. This is an authored RGB approximation, **not
  Irwin's calibrated colour product or spectral radiative transfer**. The
  terrestrial colour tint is omitted for this display-referred globe.
- Reduced camera/JPEG grain through bilateral filtering and soft thresholding;
  preserved the observed Great Dark Spot and companion morphology. The final map reduces the grain discontinuity seen in v8 quarter-turn exports. No generated
  texture detail is described as additional Voyager resolution.
- The previously blank unobserved hemisphere now has **explicitly modelled fine
  zonal bands** over the Voyager/OPAL zonal average. A seeded, longitude-periodic
  anisotropic Fourier field supplies restrained brightness and neutral condensate
  filaments; it fades to uniform poles and is reduced in the observed region.
  These patterns are invented reconstruction, not observations or weather
  prediction. There are no new discrete storms or copied portrait pixels.
- Added a bounded NASA/JPL [PIA00058 close-up](https://science.nasa.gov/resource/neptune-clouds-showing-vertical-relief/)
  from two hours before the August 1989 encounter. NASA identifies 29°N and
  11 km/pixel. Only positive cloud residuals are used; baked directional shadows
  are excluded. **Relative longitude (−20°), footprint and affine projection are
  authored approximations**, not SPICE registration. This supplies dated cloud
  morphology without claiming a new accurately geolocated global mosaic.

## Source boundaries and reproducibility

The original PIA01492 conservative support remains 24.668% of spherical area
(any nonzero weight), with 12.555% fully weighted. These are geometric weighting
statistics, not a claim that all corresponding final pixels are pure observations.
Modelled bands have reduced, nonzero influence inside that mask. The separate
PIA00058 mask identifies its approximate placement; it must not be added to the
first percentage and advertised as accurately registered coverage.

Current assets are `neptune-voyager-reconstruction-v4.webp`, adjacent JSON,
`neptune-voyager-coverage-v4.png` and `neptune-voyager-closeup-coverage-v4.png`.
The recipe is `scripts/hybrid-review/prepare-neptune-map.py`; NASA/JPL source
hashes, the OPAL hash, field seed, filtering, registration and reconstruction
weights are in the JSON. Both the authored source and selected assets are
archived under `tmp/hybrid-h4-neptune/review-v9/implementation/` for this review.
The map is 2048×1024 and 366,538 bytes, SHA-256 `9f51c801c55a4948c9ad2a2d5a6cb59b75619f93a14e033d2f02a3ae62e839bc`.
That grid size is not native observational resolution.

The [Björn Jónsson high-resolution mosaic](https://www.planetary.org/space-images/neptune-global-mosaic-2)
was researched but excluded: its displayed licence is CC BY-NC-ND 3.0. The JPL
simulator's fictional Don Davis map remains excluded. PIA00063's TIFF was also
inspected; its partial disc and processed brightness do not supply an adequately
registered global replacement. No third-party restricted mosaic pixels are used.
Credits in `public/assets/ATTRIBUTIONS.md` explicitly distinguish NASA data from
project-authored reconstruction. All previous source assets remain available.

## Independent weighted visual review — current candidate

| Dimension | Weight | Desktop 1440×900 | Mobile layout 390×844 |
| --- | --- | --- | --- |
| Detail and recognizable features | 30% | The dated dark oval, companion clouds and thin bands survive the reference pose and native exports. Far-side structure now remains coherent through rotation. Fine reconstructed filaments are identified as modelled; the cloud pattern differs from the illustration. | The oval and bright companions read at the unchanged live scale; reconstructed bands remain restrained rather than turning into prominent stripes. Native exports reveal substantially more detail than the small live disc. |
| Lighting and tonal depth | 25% | A brighter narrow limb, smooth highlight rolloff and cooler shadowed deck replace the dull v2 response. Surface and shell share one fixed Sun through all longitudes. | Day/night depth remains readable at the smaller layout, including safe quality and partial opacity; exports retain the same light direction and colour hierarchy. |
| Colour fidelity | 20% | Pale blue/cyan at the illuminated face, deeper blue on longer atmospheric paths. This differs from the portrait's stronger blue and is an authored approximation informed by natural-colour research, not a calibrated result. | Consistent blue identity through tiers and export. The palette difference is explicit and remains for user judgement, not hidden by changing the reference. |
| Silhouette, limb and atmosphere | 15% | The oblate body retains its physical scale. Separate thin haze creates a lit edge without a large halo. Wrap is periodic, and poles converge smoothly. | Complete limb at the original framing, with a subtle atmosphere rather than an expanded body. Mobile here means a desktop Chromium viewport, not a measured phone. |
| Composition and overall impression | 10% | Original scene, object position and size retained. Reference and quarter turns are assessed against the same fixed portrait. | Original mobile framing retained, with no scale increase or crop substitution. |

This is a visual review record, not a computed score. The user's acceptance is
the deciding 95% gate independently on both layouts. The different natural-colour
approximation, dated clouds and reconstructed far side remain explicitly visible
in the comparison; neither tests nor these notes grant promotion.

## Current verification

The reference/quarter-turn matrix passes on both layouts with no browser or
shader errors: high/balanced/safe, all distance presets, transitions, opacity,
cancellation, 120× motion, stable pole/Sun, reduced motion, explicit pause/resume,
quality/distance phase continuity and frozen capture. Real 4K and 8K PNGs were
exported and inspected, including native detail crops. Dimensions remain
3840×2400 / 7680×4800 desktop and 1774×3840 / 3549×7680 mobile layout.
Live versus resized 4K mean absolute RGB error is 1.224/255 desktop and 1.258/255
mobile layout; largest channel bias 0.904/255. These measure capture parity only.

Mars, Jupiter, Saturn and public Neptune are pixel-identical to review-v2's
preserved production captures on both layouts (maximum difference 0). The older
v2 record establishes parity with the approved promotion references. Polar rows
are uniform; pixel-centred first/last columns differ by at most one 8-bit level,
consistent with a continuous periodic map rather than duplicated endpoints.

Native tab hiding was attempted in headed Chromium, but `document.hidden`
remained false when switching the automation-created pages. That test is
**unverified**, not a passed suspension claim. Explicit scene suspension and the
shared visibility event wiring are verified separately. Physical-phone GPU,
thermals, touch/pinch and other browsers are still untested.

Node 24.20.0 verification passed: typecheck, **289 tests in 53 files**, production
build, **35-route static generation**, and `git diff --check`. New atmosphere
coverage verifies that the shell belongs to the fixed pole and participates in
opacity changes. Logs are `review-v9/verify.log` and `review-v9/generate.log`.

The identical v8 shader/geometry was benchmarked before the final texture-only
grain refinement: headed Chromium 151, Apple M4, DPR 1, 30 warm-up plus 300 frames
per case, approximately 60 fps at the sampled cadence. GPU p95 high/balanced/safe:
3.164/3.463/2.403 ms desktop; 2.067/1.898/1.848 ms mobile layout on the same Mac.
CPU p95 was at most 0.601 ms. This is a short desktop measurement, not a phone
benchmark or thermal soak; evidence remains `review-v8/hardware.json`.

Reproduce the selected browser matrix using `PERIGEE_REVIEW_PASS=review-v9` with
`neptune.mjs`, `neptune-details.mjs`, `neptune-final-checks.mjs`, then the bundled
Python `neptune-compare.py` and `neptune-audit.py`. The local review server is
`scripts/hybrid-review/serve.mjs` on port 4318. Set `PERIGEE_PLAYWRIGHT_MODULE`
to the available Playwright module path. `neptune-audit.py` checks hashes, wrap,
polar rows, unchanged approved references and archives the exact implementation.
The regenerated app's actual Capture → Save actions passed on both layouts,
downloading 7680×4800 and 3549×7680 PNGs. Saved previews were inspected; the public
object remains the unchanged portrait, with no rotation controls. Evidence:
`review-v9/product/`, zero browser errors.

Intermediate v2/v3 maps from this continued refinement are archived outside the
public asset tree in `tmp/hybrid-h4-neptune/intermediate-assets/`; the pre-existing
v1 review source and every original working-tree file are preserved.

## Approval boundary and next steps

Keep Neptune's portrait active until explicit approval of the revised comparison.
After approval: promote the selected renderer, enable its automatic 120× rotation,
regenerate its thumbnail from the accepted globe and update public descriptions
and active source credits to disclose dated observations and modelled regions.
Do not commit, upload assets or publish without a separate request.

The historical first handoff below is retained as evidence. Its v1 map, settings,
no-procedural-detail decision, measurements and unmet visual review describe v2,
not the current v8 candidate.

---

# Historical first handoff — review-v2

17 September 2026. **Review only; no promotion or visual acceptance.** Neptune's
original portrait, thumbnail, public descriptions, physical diameter, distance
presets and framing remain active and unchanged. Mars display-v6, Jupiter and
Saturn observational-v1 remain approved globes. No commit, asset upload or
publication is authorized or performed.

The concrete comparison is
[Neptune review](http://127.0.0.1:4318/scripts/hybrid-review/neptune.html), with
matched actual 4K crops, full scenes, quarter turns, quality tiers, poles and
links to actual 4K/8K PNGs. Candidate: `review-v2`. The fixed baseline is the
approved `neptune-portrait-v1.png`; neither tests nor pixel similarity establish
the requested 95% visual target. **The candidate still has material differences
from the portrait; the visual gate remains unmet and requires further work or
explicit user acceptance.**

## Preservation and implementation

Starting hashes for every tracked/untracked source file and the original diff
are saved in `tmp/hybrid-h4-neptune/baseline/`. Existing changes were preserved.
The portrait's measured limb centre (622,622), radius 565 in the 1254-square
artwork, and existing post-AgX path are untouched. Diameter remains **49,244 km**,
flattening **0.01708**, and the nearest preset remains **384,400 km**. The legacy
catalogue diameter is volumetric-mean diameter; applying flattening to that
radius retains an existing scale convention, not a new equatorial-radius claim.

`NeptuneGlobeMaterial.ts` extends the existing cloud material. The review factory
uses placement → fixed pole → spin → oblate globe, existing quality geometry,
texture leases, cancellation/disposal, observer-light transforms, clock and
frozen capture. It reuses the accepted weak-perspective projection to preserve
portrait angular framing, with no scale multiplier. The display layer is the
existing Mars-capable linear layer after AgX; no shared compositor was changed.

Selected authored settings: initial phase −π/2 + 0.15 radians, pole pitch −0.28,
roll −0.08, Sun proportional to (−0.75,0.35,1.5), exposure 1.25, cloud-light
exponent 1.4, atmospheric optical-depth parameter 0.035, scattering gain 0.7.
The terrestrial colour-extinction contribution is 20%, following Saturn's
existing display compromise. These are approximate photographic presentation
settings, not measured optical properties or an ephemeris. The integrated limb
term stays tied to the Sun; there is no procedural weather, terrain displacement
or broad outer halo. Thin real atmospheric scale heights are subpixel in these
reference layouts; the authored haze is not a measured atmospheric retrieval.

The initial inspection exposed the opposite reference longitude and excessive
terrestrial colour attenuation. One correction batch fixed those and narrowed
source support to exclude unreliable photographed edges. The confirming pass
retains the remaining visual differences rather than disguising them with scale,
extra noise or a substituted baseline. Existing Mars/Jupiter/Saturn materials,
source maps, shot settings and motion records were not edited.

## Imagery and provenance audit

- **Approved portrait:** commissioned OpenAI artwork, MIT project artwork. It is
  a Voyager-informed illustration with invented fine cloud detail and baked
  lighting, not a calibrated observation. It is the fixed visual-quality
  reference, never projected onto the globe or sampled by the map recipe.
- **Existing Hubble OPAL:** June 28, 2025 rotation A, 08:32–23:10 UT, F657N/F547M/
  F467M enhanced display TIFF, 721×361 including endpoints, reduced to 720×360.
  The [MAST README](https://archive.stsci.edu/hlsps/opal/cycle31/neptune/hlsp_opal_hst_wfc3-uvis_neptune-2025a_all_v1_readme.txt)
  explicitly says 2 pixels/degree oversamples the observations. It uses
  planetographic latitude; longitude decreases westward from 360°W at the left,
  equivalently increasing eastward. Map joins were interpolated upstream.
  Minnaert k is 0.88/0.80/0.50 for blue/green/red, reducing source limb darkening;
  this does not make the colour TIFF calibrated albedo. Its FITS scale factors
  are distinct from arbitrarily scaled TIFF intensities.
- The existing OPAL recipe converts planetographic to planetocentric latitude,
  removes duplicate endpoints and rolls longitude by half a turn. It masks
  black/fringed pixels, interpolates gaps and flattens polar coverage to complete
  row means. The provenance records rows **108–340** and **25.091% invalid raster
  samples**; that is a raster-mask statistic, not spherical area or fully observed
  coverage. Extra flattened/blended rows extend beyond that statistic. The
  northern cap is particularly unconstrained. Original TIFF SHA-256:
  `9bb81f45acd805d225c98a72a3d93bd212bbd9a959d964627b2f1521b43839de`.
- **Selected detail:** NASA/JPL [Voyager PIA01492](https://www.jpl.nasa.gov/images/pia01492-neptune-full-disk-view/),
  taken in August 1989, about 4 days 20 hours before closest approach. The
  green/orange composite contains the Great Dark Spot and companion clouds.
  The 2188×2185 public JPEG is enlarged from Voyager's 800-line detector imagery;
  it is not a 2K native observation. Only its green-channel structure is used.
  Source SHA-256: `97b57802f44be2218578a98c8c26f8426ff7a95890d266d34486734f14c1edb6`.
- A conservative approximate disc registration uses a 1094×1093 working image,
  centre (548,558), radii (481,481), sub-observer latitude −28° and pole roll
  −0.20 radians. These are approximate reconstruction coordinates, not recovered
  SPICE camera geometry. The output is north-first, planetocentric and east-
  positive, with relative source-facing longitude. Its 2048×1024 grid is for
  sampling continuity, **not a claim of additional observational resolution**.
- Broad lighting is reduced by a robust quadratic fit to log green-channel
  brightness inside 0.78 disc radius. Residual shading, source grain, image
  processing and imperfect registration remain. Cloud structure is constrained
  to the conservative source mask: **24.668% of spherical area has any source
  support**, **12.555% has essentially full weight**. Those are geometric mask
  areas, not claims of photometric accuracy. The other regions use smooth
  longitude-independent zonal brightness derived from OPAL, including inferred
  polar caps. No 2025 local storm is mixed with the 1989 storm map.
- The coverage PNG and adjacent JSON explicitly identify taper and reconstruction.
  Longitude wrap columns are identical; both polar rows are constant; the mask
  is zero at poles and the wrap seam. Hardware longitude RepeatWrapping avoids
  a discontinuous fragment `fract` derivative. No higher texture LOD is offered.
- **Rejected alternatives:** [PIA00046](https://www.jpl.nasa.gov/images/pia00046-neptune-full-disk/)
  explicitly sacrifices colour fidelity to enhance small features and has a
  smaller useful disc. [PIA00063](https://www.jpl.nasa.gov/images/pia00063-neptune-true-color-of-clouds/)
  is a close-up with processed cloud brightness, not a global map; its historical
  “true color” title does not establish modern spectral calibration.
  The [JPL simulator Neptune map](https://space.jpl.nasa.gov/tmaps/neptune.html)
  is explicitly marked **fictional, Don Davis**, so it was not used as data.

Runtime output is `neptune-voyager-reconstruction-v1.webp` (297,382 bytes), with
SHA-256 `e1b2593c8e55b7e94ee3f6f2eae1ed12e11b1899b1658f5de92b69ced9cc61e1`.
The mask and JSON are adjacent; the recipe is
`scripts/hybrid-review/prepare-neptune-map.py` (numpy and Pillow). The recipe
records both source and output hashes. NASA/JPL and NASA/ESA/STScI/Amy Simon/OPAL
credits and [JPL reuse terms](https://www.jpl.nasa.gov/jpl-image-use-policy/) are
recorded in `public/assets/ATTRIBUTIONS.md`. Source photographs are not relicensed
MIT. No generated detail or separately licensed simulator artwork was introduced.

## Natural colour and atmospheric motion

[Irwin et al. 2024](https://doi.org/10.1093/mnras/stad3761), explained by
[Oxford](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0),
uses HST/STIS and VLT/MUSE spectra to constrain apparent colour and rebalance
Voyager/WFC3 imagery. Neptune is a pale greenish blue, somewhat bluer than Uranus;
familiar deep-azure Voyager releases often have enhanced colour and contrast.
The renderer's sRGB palette (0.57,0.74,0.81) is an authored approximation informed
by this research, **not the paper's calibrated result**. No paper figure pixels
are used. Haze, methane absorption and bright clouds inform appearance; this is
not spectral radiative transfer or a contemporary weather simulation.

[NASA's fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html)
lists **16.11 hours = 57,996 seconds**, explicitly in magnetic coordinates from
Voyager measurements. Its 28.32° obliquity is relative to the orbit; it is neither
the image's pole roll nor the magnetosphere's 46.9° dipole tilt. The astronomical
north-pole formula is RA 299.36° + 0.70 sin N, declination 43.46° − 0.51 cos N,
N = 357.85° + 52.316 T (Julian centuries from J2000). This renderer does not use
that dated celestial frame: its north is local +Y, oriented by an authored shot.
Positive quaternion phase is right-handed/prograde, counterclockwise from north;
it is separate from the source's west/east longitude labels. An initial half-turn
mistake was caught in the visual comparison and corrected, not hidden by a texture
mirror. There is no negative-period/absolute-value shortcut.

At the existing automatic **120×**, a bulk turn lasts **483.3 seconds (8.055 min)**.
This clock is available only through the explicit review globe until approval.
The public portrait has no spin frame. There are no product rotation settings.
Reduced motion and scene suspension discard inactive intervals; all export tiles
use one frozen clock instant.

A rigid map cannot reproduce differential winds: NASA's PIA00046 caption reports
18.3 hours for the 22°S dark oval and 16.1 hours for the 54°S feature, with nearby
clouds changing within four hours. [Hubble's 2020 rotation description](https://science.nasa.gov/asset/hubble/rotation-of-neptune/)
also distinguishes opposite zonal wind directions. Advecting all 1989 features
at 16.11 hours is therefore a presentation approximation, not exact tracking,
interior-rotation certainty or weather prediction. Features never evolve here.

## Independent weighted visual review

The fixed portrait is the baseline. No numerical quality score is invented.

| Dimension | Weight | Desktop 1440×900 | Mobile layout 390×844 |
| --- | --- | --- | --- |
| Detail and recognizable features | 30% | Dated dark spot and companion clouds read at the reference pose. Native exports expose limited source detail, grain and the taper toward reconstruction; finer illustrative streaks are absent. Far side is much quieter. | Dark spot/clouds remain legible at the unchanged scale, but broad reconstructed areas lack the portrait's fine banding. This is the largest remaining quality gap. |
| Lighting and tonal depth | 25% | Fixed-Sun shading is coherent in reference and quarter turns. The corrected attenuation restores depth, but the portrait has stronger upper-left highlights and deeper local separation. | Readable day/night shading and cloud relief; less luminous and less contrasty than the portrait. |
| Colour fidelity | 20% | Pale blue/cyan better follows natural-colour research. It differs visibly from the approved artwork's stronger blue; scientific justification does not erase the visual mismatch. | Pale cyan identity is consistent through tiers and exports, but the reference's rich blue is not matched. |
| Silhouette, limb and atmosphere | 15% | Stable oblate shape, continuous source wrap and convergent poles. No broad neon rim. Portrait's brighter, thinner limb is not reproduced exactly. | Complete body at the same calculated scale; weaker luminous edge. Small silhouette difference from physical flattening remains. |
| Composition and overall impression | 10% | Same camera, world position, background and physical radius. Source-facing reference corrected. Overall detail and tonal presence remain below the portrait. | Same framing without rescaling or cropping the globe to hide differences; source/detail gap remains visible. |

The target is **not established on either layout**. This is a concrete review
candidate, not a promotion claim. The next visual improvement should address
source registration, residual source shading and finer supported cloud structure,
then obtain user judgement against this unchanged portrait. Do not add invented
far-side storms merely to hide limited coverage. Any intentionally illustrative
weather would need a clearly agreed and disclosed treatment.

## Verification and reproducibility

Evidence lives under ignored `tmp/hybrid-h4-neptune/`: `pass1/` retains the first
inspection and `review-v2/` retains the confirming candidate. These files are
local and are not automatically available in a clean checkout. Use Node 24 and
the existing Playwright install with the review server on port 4318:

```sh
node scripts/hybrid-review/serve.mjs
PERIGEE_REVIEW_PASS=review-v2 PERIGEE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/hybrid-review/neptune.mjs
PERIGEE_REVIEW_PASS=review-v2 PERIGEE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/hybrid-review/neptune-details.mjs
PERIGEE_REVIEW_PASS=review-v2 python scripts/hybrid-review/neptune-compare.py
```

The browser matrix passes at both layouts with zero browser/shader errors:
reference/90°/180°/270°, high/balanced/safe, near/real presets, partial opacity,
rapid cancelled object changes, 120× motion, stable pole/Sun, internal pause/1×,
reduced motion and explicit suspend/resume. Frozen 4K export and cancellation
pass; moving 8K export reapplies one instant and restores the clock. No texture
LOD is claimed: this source has one bounded 2K reconstruction grid.

Actual exported sizes: **3840×2400 and 7680×4800 desktop**, **1774×3840 and
3549×7680 mobile layout**. Full images and native detail crops were inspected.
Live versus downsampled 4K mean absolute RGB differences are **1.106/255 desktop**
and **1.229/255 mobile layout**, largest mean channel bias **0.754/255**. These
are capture-parity diagnostics, not quality scores.

Current approved Mars, Jupiter and Saturn reference views are **pixel-identical**
to the saved promoted references on both layouts (maximum RGB difference 0).
Neptune's production portrait is also pixel-identical to the first-pass baseline.
`preservation.json` records those checks. Map hashes, constant polar rows and
identical wrap columns pass the source audit. Four new focused tests cover the
review-only policy, physical flattening, period/direction, fixed lighting/pole,
quality/capture pose, opacity, disposal and cancelled acquisition.

Final local gates passed with Node 24.20.0: typecheck, **289 tests / 53 files**,
production build and **35-route static generation**. An earlier sky-asset hash
check hit its unchanged 5-second timeout while export work was concurrent; the
complete serial rerun passed without test changes. Logs: `verify.log`,
`verify-serial.log`, `generate.log`.

`neptune-final-checks.mjs` also saved actual 4K exports at 90°/180°/270° on both
layouts, exercised all five presets, and verified every comparison-page image
with no horizontal overflow. Quarter-turn and pole export crops were inspected;
the smooth northern cap and quiet far side are reconstruction, not missing loads.
The southern source-to-cap taper and source grain remain visible limitations.

`neptune-production.mjs` exercised the generated app's actual **Capture → Save
image** buttons on both layouts. It downloaded **7680×4800 desktop** and
**3549×7680 mobile-layout** PNGs; full saved previews and native detail were
inspected. The public Neptune remains the portrait and rotation settings are
absent. Evidence: `tmp/hybrid-h4-neptune/production/`, zero browser errors.
The review globe's own high-resolution exports are the actual `exportStill()`
outputs linked from the comparison, not synthetic screenshot enlargements.

Physical-phone GPU, thermals, touch/pinch and additional browsers remain untested.
390×844 is resized desktop Chromium on Apple M4, not a physical-device result.
Explicit scene pause/resume is verified; native hidden-tab event delivery remains
unverified in this automation setup. No phone frame-rate or 95% acceptance is
inferred from tests.

After explicit visual approval: promote the selected Neptune policy, enable its
automatic rotation in production, render a matching thumbnail, update public
object/method descriptions and active source IDs, and repeat promotion-specific
checks. Do not commit, upload assets or publish without a separate request.

Short serial performance run: headed Chromium 151 / ANGLE Metal Apple M4, DPR 1,
30 warm-up plus 300 sampled frames per case. Approximately 60 fps at the sampled
presentation cadence. Desktop GPU p95: portrait 2.975 ms, globe high/balanced/safe
2.557/2.700/2.246 ms. Mobile-layout GPU p95 on the same Mac: portrait 1.169 ms,
globe 1.440/1.478/1.348 ms. CPU p95 at most 0.6 ms. This is not a phone benchmark,
a thermal soak, measured GPU residency or a visual-quality score. Reproduction:
`neptune-benchmark.mjs`; zero browser errors in `review-v2/hardware.json`.
