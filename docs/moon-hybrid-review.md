# Moon H4 — Earth-facing globe review

## Approved Moon promotion — 17 September 2026

The user answered **“I approve it”** after the review-v5 desktop/mobile comparison
and visual assessment. This explicitly accepts the replacement against the
requested 95% target on both layouts. Acceptance is the user's visual judgement,
not a computed similarity score or automated-test result.

The production Moon now uses the approved v5 globe. Its material, source maps,
fixed Sun/pole, near-side orientation, phase, physical size and framing are
unchanged from that candidate. The Moon retains its Earth-observer-facing policy
and never receives the planets' automatic 120× free spin. It still rotates
synchronously in physical terms; no orbit, phase or libration controls are added.

A new 320×320 WebP thumbnail is rendered from an actual 8K capture of the approved
globe. The inherited 1.2× menu-image zoom is removed for the Moon only, so the
complete limb remains visible. Object metadata, the Moon page, `/method`, source links and credits now
identify LROC reflectance and LOLA terrain, display processing and source limits.
`moon-portrait-v1.png`, its material and thumbnail remain the fixed reference and
explicit `moon: 'portrait'` rollback path. Other approved globes are preserved.

Promotion verification is recorded at the end of this document. No commit, asset upload
or publication is authorized or performed. The remaining physical-phone and
native hidden-tab checks are not implied by approval of the visual comparison.

## Historical review record (superseded by approval above)


17 September 2026. **Review only; no approval or promotion.** The fixed reference
is `public/assets/objects/moon-portrait-v1.png`. Its production material, thumbnail,
public descriptions, physical diameter (3474.8 km), presets and framing remain
unchanged. Jupiter, Saturn, Mars and Neptune retain their approved globes.
No commit, upload or publication is authorized or performed.

The source snapshot in `tmp/hybrid-h4-moon/baseline/` preserves all 380 starting
tracked/untracked source files, their SHA-256 values and the original diff.
Earlier approval handoffs and their evidence remain intact.

## Source selection and registration

The existing immutable `1b448275b234/moon` assets were audited before selection.
All **675 derivatives / 58,475,511 bytes** match recorded hashes. No new lunar
imagery, painted craters, repeated terrain or generated surface detail is added.
The original color TIFF is no longer in the recorded temporary cache; its hash
below is preserved provenance. During review-v5 refinement the original LOLA
TIFF was freshly downloaded from NASA and its SHA-256 matched the recorded
master exactly. This does not make the 2019 source a current-epoch product.

- [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), December 2025 color:
  the actual input was 16384×8192 sRGB TIFF, reduced to 8-bit RGB, a 2048×1024 base
  and bordered 4K/8K/16K WebP levels. This is an aesthetic, exposure/white-balance
  adjusted map, not calibrated RGB reflectance. Visible RGB uses 643/566/415 nm.
  Above 70°N and below 70°S, lower-resolution LOLA laser reflectance supplies
  monochrome coverage; small high-latitude dropouts were inpainted upstream.
  These caps occupy about 6% of spherical area, not fully observed visible-color
  pixels. The map is centered on 0° longitude.
- [LROC Hapke-normalized source](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_HAPKE):
  400 m equatorial grid, equirectangular, 70°S–70°N, east-positive; approximately
  124,300 images from January 2010–May 2013. Median normalized radiance factors
  use incidence/phase 60°, emission 0°, and terrain-aware photometric correction.
  Residual albedo/photometric artifacts remain possible; the SVS display product
  is neither raw I/F nor the separately archived UV false-color composite.
- LOLA: the SVS 64-pixel/degree TIFF is 23040×11520, unsigned half-metres with
  a +10,000 m offset. The existing recipe correctly decodes **DN × 0.5 − 10000**
  metres relative to **1,737,400 m**, then resamples to 4096×2048. This datum agrees
  with the application's mean radius exactly. The packed lossless RG16 field
  spans −9017.17 to +10620.46 m. Its encoding interval is ±12000 m, which is a
  storage bound, not an exaggerated physical amplitude. The dataset was taken
  from the spring-2019 gridded product, not the latest 2026 laser-shot release.
  See [LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm).
- Terrain grid spacing is about 2.67 km at the equator; its 4K dimensions do not
  claim 100 m craters. Source LOLA bins, interpolation between measurements,
  runtime resampling, endpoint-row averaging and mipmaps are distinct from
  measurements. No shot-count map was imported, so no measured-coverage fraction
  is asserted. The two polar height rows have exactly zero longitudinal range;
  endpoint normals are radial.

Both imported maps are north-first, planetocentric cylindrical grids spanning
−180…180° east longitude. `v = (90° − latitude)/180°`, `u = (longitude+180°)/360°`.
No additional longitude roll, mirror or latitude reprojection is applied. Named
control crops for Tycho, Copernicus, Plato and far-side Tsiolkovskiy show matching
albedo/crater relief (`asset-audit/registration.png`). This checks relative
registration and handedness, not subpixel absolute geodesy. Reconstructed normals
from decoded heights agree with the stored normals: 99.9th-percentile component
error 0.003995, consistent with byte/height quantization.

Longitude uses hardware repeat; detail tiles have eight-pixel periodic borders.
Adjacent wrap samples need not be equal on rough terrain: the 4K color edge has
mean absolute difference 3.44/255 and maximum 39/255. Visual seam inspection is
separate from this statistic. No broad seam blur or duplicated crater strip was
applied. Color polar coverage retains NASA's reconstruction; it is not relabeled
as new observations.

Original input SHA-256:

- Color: `b98fdc430a210018dbeb0da708af186b8e55bfe70d0275f1e901d92837999746`.
- Elevation: `0f40bce8b42864deddb6943a38474879e691d5b20647aa5e54c2612b23106499`.

The [USGS 100 m morphology mosaic](https://astrogeology.usgs.gov/search/map/moon_lro_lroc_wac_global_morphology_mosaic_100m)
was researched and rejected for albedo: it deliberately retains low-Sun relief,
with incidence commonly 55–75°, and documented polar brightness joins. Adding
that map to dynamic terrain light would double photographed shadows. GLD100
color hillshade is not reflectance either. Higher-resolution regional NAC DEMs
and SLDEM2015 could support another terrain budget, but no regional patch is
repeated to counterfeit global resolution. The existing matched global pair
provides adequate source resolution for these calculated angular sizes.

Credits: NASA/GSFC Scientific Visualization Studio, Ernie Wright, Noah Petro,
LROC/ASU and LOLA teams. Reuse follows [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
and the existing asset credits; scientific data is not relicensed as project MIT
artwork. The commissioned portrait remains separate MIT project artwork.

## Rotation, pole and observer limits

The Moon **does rotate**: the [NASA fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html)
lists a 655.720-hour sidereal spin (27.3217 days), synchronous with its orbit.
The approximately 29.53-day synodic cycle measures recurring phase relative to
Sun/Earth; it is not the spin period. [NASA's tidal-locking explanation](https://science.nasa.gov/moon/tidal-locking/)
describes why substantially the same hemisphere faces Earth.

`objectMotion.moon.periodSeconds = null` is explicitly an **Earth-observer-relative
rendering policy**, not a claim of zero inertial rotation. It never consumes the
planets' 120× free-spin clock. Review longitude is a deterministic offset; it is
available only through the code-only Moon review selector. Positive rotation is
right-handed about local +Y, counterclockwise viewed from lunar north. Source
longitude increases eastward. The sphere's local +X points toward 0°E before the
reference rotation, so a roughly −π/2 Y rotation presents the near side toward +Z.

Lunar astronomical frames use a north +Z axis; this renderer re-expresses north as
+Y and uses a fixed authored shot. [JPL's frame documentation](https://ssd.jpl.nasa.gov/horizons/manual.html)
distinguishes the Mean Earth/polar-axis frame from the Principal Axis frame;
no exact DE/SPICE epoch-frame transformation is claimed here. The [NASA lunar
reference-frame brief](https://www.nasa.gov/wp-content/uploads/2024/12/acr24-lunar-reference-frames.pdf)
also distinguishes roughly 1.53° relative to the ecliptic from 6.68° to the orbit.
Neither is substituted for the camera's pole pitch/roll.

Perigee keeps an authored Earth-facing view, fixed Sun and hypothetical distances.
It does not solve an observer ephemeris, orbital motion, topocentric parallax,
physical/optical libration, changing phase or a dated selenographic sub-Earth
point. Camera dragging changes framing, not an orbit around the Moon. The existing
bounded Earthshine approximation places Earth at the observer and uses the
opposite phase; it is not a measured Earth illumination map. No public rotation,
phase, orbit or libration controls are introduced.

## Rendering and lifecycle

`MoonGlobeMaterial` uses the shared rocky material with measured LOLA normals,
Lommel–Seeliger/Lambert regolith response and a restrained opposition term. The
photometric coefficients and display grade are authored approximations, not a
fitted full Hapke model. No specular highlight or lunar atmosphere is added.
Normal slopes are never amplified. Geometry displacement and terrain shadows
reuse the existing 600–1500 physical-pixel ramp, physical heights and bounded
16-sample horizon test; safe quality disables displacement/shadows. The small
reference live disc does not justify visible kilometer-high spikes.

Color is decoded from sRGB; normals/heights remain linear non-color data. The
fixed portrait bypasses AgX. The globe reuses the same shared display-layer
path already accepted for Mars/Neptune, with linear lighting and one sRGB output
encoding. Its base and signed detail pass have identical grading. The additional
terrestrial chromatic extinction is omitted to match the portrait's display
convention. The surrounding sky retains production AgX/film processing. This is
a photographic presentation, not calibrated telescope radiometry.

Hierarchy: placement → fixed pole → spin → surface and terrain tiles. World Sun
is transformed into the surface frame, so review turns keep illumination fixed.
The factory settles all three lease acquisitions and releases successful siblings
on failure/cancellation. Shared tile budgets, retirement, quality geometry,
reduced motion, visibility suspension and frozen-capture infrastructure remain
unchanged. No shared planet material or approved-body material is modified.

## Selected candidate and refinement

[Open the desktop/mobile comparison](http://127.0.0.1:4318/scripts/hybrid-review/moon.html).
Candidate **review-v5** (supersedes the prematurely submitted review-v4). Matched crops use exactly the same pixel rectangles from
actual saved 4K images; full scenes and original 4K/8K downloads are linked.
The production portrait is unchanged. This comparison is outside public routes.

Selected shot: initial longitude phase −π/2 + 0.04 rad, pole pitch 0.23 rad,
roll −0.02 rad, fixed scene Sun proportional to (0.42, −0.15, 1). These preserve
the near-side orientation and almost-full illuminated-disc impression, not a
claimed dated lunar pose. Weak perspective reuses the approved projection helper
and original physical scale; no radius multiplier or framing change is made.
Material exposure 0.65, luminance contrast 2.0, color saturation 0.22, Lambert
fraction 0.35 and light exponent 1.2 are authored. Local reflectance contrast uses
a 0.45 exponent and a bounded 0.8–1.2 multiplier against a common low-frequency
base-map mip; the mip broadens under minification. This changes display contrast,
not the location, shape or height of a feature. A smooth highlight shoulder
preserves pale terrain and subdued rays without clipping highlands.

The first inspection found brown terrestrial attenuation and an overly dark
phase. Removing that extra color treatment exposed an overbright source grade.
Subsequent saved comparisons adjusted the near-side pole, reduced exposure,
compared four fixed light configurations, separated maria/highlands and compressed
highlight rolloff. Earlier candidates remain in `pass1`, `pass2`, `pass3` and
`review-v1` through `review-v3`; the failed pass2 shader compile is retained as
historical evidence, not counted as a clean verification run. The final material
adds no surface features or portrait-derived pixels.

A separate **magnified engineering view**, with 4.5° camera FOV and unchanged
physical radius, exercises full displacement and 8K texture detail at all quarter
turns. It is explicitly excluded from approval comparisons. It found a thin
dark wrap meridian caused by implicit DEM mip derivatives in divergent horizon
rays. The Moon shader now explicitly samples the bounded 4K DEM at LOD 0 with
hardware longitude repeat. Native saved crops confirm the line is gone. All four
engineering exports reached 8K tile selection, at most 32 resident tiles, with
zero failures and 1× physical displacement. Original and corrected diagnostics
are retained in `terrain-diagnostic/` and `terrain-corrected/`.

The Moon also retains its own fixed illumination during an outgoing object fade.
The optional lifecycle light override is Moon-only; the four approved globes keep
their previous scene-light policy. Matched production regression images are
pixel-identical for all four approved globes on both layouts (maximum RGB error
0), and the Moon portrait is pixel-identical to the starting reference.

## Review-v5 refinement after the target challenge

The user correctly challenged the earlier stop: review-v4 had not established the
95% target. That handoff is superseded, and no user approval has been inferred.

Two controlled four-variant studies kept source pixels, orientation, fixed Sun,
phase, physical size and camera unchanged. The first isolated local reflectance
contrast; the second compared diffuse fractions/exposure. The selected moderate
response restores small ray/crater contrast without the brighter variants'
chalky highlands or the high-Lambert variants' overly dark left hemisphere.
The correction is bounded, multiplicative and drawn solely from the measured
reflectance map. It creates no procedural texture or portrait-derived detail.
Both base and signed tile correction use the same function and global low-pass
field, so the new contrast cannot introduce a tile-specific grade.

A source-resolution investigation freshly retrieved NASA's original 23040×11520
LOLA unsigned TIFF (530,934,146 bytes, SHA-256 unchanged). Unit-strength normals
were rebuilt on an 8192 grid and as a filtered 4096 alternative, retaining the
same radius, north/east conventions, periodic longitude and radial pole normals.
Matched actual 4K exports showed little improvement at the approved framing.
The 8K normal alone costs about 179 MB as RGBA with mipmaps versus about 45 MB
for 4K, so neither experimental derivative was adopted. Both are confined to
`tmp/hybrid-h4-moon/terrain-source/`; runtime assets remain unchanged. This is a
source-budget finding, not a reason to exaggerate slopes or fabricate craters.

Study evidence: `refinement-study/study.png`, `photometry-study/study.png`,
`normal-study/study.png` and `terrain-source/provenance.json` under the Moon
working evidence directory. The earlier v4 comparison is retained intact.
Final reference, export, quarter-turn, pole, tier and transition evidence is
versioned separately under `review-v5/`.

## Independent weighted visual review

The fixed portrait remains the unchanged baseline. After the v5 refinements,
my qualitative visual assessment is that the requested 95% quality target is met
on **desktop and mobile layout independently**. This is an explicitly subjective
assessment against the weighted criteria below, not a measured similarity score,
a set of invented numerical subscores, or user approval. Automated checks are
reported separately. The user has not accepted or authorized promotion of v5.

Desktop: I inspected the original-size full scene, equal 4K crops and native 8K
detail. The maria retain their shape and separation; fine observed ray/crater
contrast is now clearer without making the highlands chalky. The fixed phase and
bounded limb terrain read coherently, with no atmospheric halo or highlight.
At the original live scale, the globe retains the reference's legibility and
visual weight. The source's different crater/ray morphology remains visible.

Mobile layout: I evaluated its independent 390×844 framing, larger saved crop
and native 8K detail rather than relying on the desktop verdict. The southern
highlands retain fine texture, the rays do not merge into broad clipped white
patches, and the dark maria remain distinct. Saved detail holds together without
scale changes or added terrain. The portrait has more stylized local ray/crater
contrast; the source-based globe is a different rendering of those features.

Neither conclusion claims pixel-for-pixel likeness. Far-side/polar source
limitations, physical-device behavior and explicit user approval remain separate
from this near-side visual-quality assessment.

| Dimension | Weight | Desktop 1440×900 | Mobile layout 390×844 |
| --- | --- | --- | --- |
| Detail and recognizable features | 30% | Imbrium, Serenitatis, Tranquillitatis, Crisium, Oceanus Procellarum, Copernicus and Tycho remain identifiable. Native 8K crops resolve observed rays and crater relief; the illustration has differently shaped landmarks and stronger local ray patterns. | Near-side maria remain legible at unchanged live scale. Saved detail resolves additional geography without enlarging the reference scene. The small live disc cannot display every crater visible in the artwork file. |
| Lighting and tonal depth | 25% | Fixed Sun, restrained regolith response and smooth highlight shoulder preserve readable bright/dark terrain. Crater-scale shading differs from the portrait's baked illumination; quarter turns relight coherently. | Near-full phase and neutral highlands remain readable. Bright rays are restrained and some dark patches differ from the illustration. Exports retain light direction and contrast. |
| Color fidelity | 20% | Neutral gray with restrained source chroma; brown first-pass attenuation and clipped highlights removed. Display grade remains an artistic approximation. | Stable lunar gray through high/balanced/safe and saved output. The portrait's precise local gray balance is not copied into the map. |
| Silhouette, limb and terminator | 15% | Physical scale and clean mean-radius silhouette; no atmospheric shell, halo or plastic highlights. Measured terrain is bounded, with finite normal/shadow detail; polar source reconstruction is disclosed. | Complete disc at original framing, readable terminator and no broad glow. Neither physical size nor camera scale is changed for approval. |
| Composition and overall impression | 10% | Same scene, position, camera and calculated apparent size. The globe gives a photographic observational alternative while retaining the portrait's identity. | Same independent mobile framing and scale. This is a desktop Chromium layout, not a physical-phone acceptance test. |

Source limits remain: approximate display photometry, different illustrated
landmark/ray morphology, 2.67 km equatorial terrain grid, lower-resolution
monochrome polar reflectance, interpolation, finite shadow sampling and no
libration/phase ephemeris. The absence of a numerical score must not be read as
automatic acceptance. The portrait remains active until the user approves.

## Verification and next steps

Node 24.15.0 `NUXT_IGNORE_LOCK=1 npm run verify` passed typecheck, **293 tests in
54 files**, and the production build. Separate static generation also passed all **35 routes**. Logs: `tmp/hybrid-h4-moon/verify-v5.log` and `generate-v5.log`.
The normal Vite large-chunk warning remains; it is not a failed build.

Browser matrix: zero errors on both layouts; reference and quarter turns,
high/balanced/safe, close/quarter/real distances, reduced motion, explicit scene
suspension, hidden-time catch-up prevention, frozen exports/cancellation,
partial fades and rapid object replacement. The shared clock advances at 120×
while the Moon's quaternion remains unchanged. Tests also cover deterministic
review offsets, correct local Sun, no atmosphere, disposal and failed/cancelled
texture acquisition. A separate transition check confirms unchanged Moon pole,
spin and light while outgoing.

Actual saved outputs: **3840×2400 and 7680×4800 desktop**, **1774×3840 and
3549×7680 mobile layout**. Full-image previews and native-resolution detail were
inspected, including poles and quarter turns. Captures with the active ambient
clock use one frozen instant across **162 desktop / 130 mobile** applications
and restore the exact clock. Production grain 0.018 was separately inspected
with the same frozen film time for portrait and globe; deterministic reduced-motion
references use the product's normal grain-off behavior, not a stripped compositor.
The still pipeline retains its existing dither finish rather than animated grain.

Live versus resized 4K hero RGB mean absolute differences are **2.245/255 desktop**
and **2.079/255 mobile**, with maximum channel bias **0.663/255**. These are capture
parity diagnostics, not visual quality scores. Normal-size views stay at the base
or modest export detail demand; the 16K source ceiling does not imply that every
saved view resolves 16K texture. The separate magnified test verifies terrain and
tile behavior and does not count toward the quality gate.
Promotion, thumbnail generation and active public-copy changes require the user's
explicit approval of the concrete comparison. The 95% target is not a computed
pixel-similarity statistic or an inference from passing tests.


A short serial benchmark used headed Chromium 151 on ANGLE Metal / Apple M4,
DPR 1, 30 warm-up plus 300 measured frames per case. Sampled cadence was about
60 fps. Globe GPU p95 high/balanced/safe: **2.655/2.736/1.719 ms desktop** and
**1.810/2.325/1.161 ms mobile layout on the same Mac**; CPU p95 ≤0.5 ms.
These are local short-run measurements, not physical-phone or thermal acceptance.
See `review-v4/hardware.json` for the earlier candidate; these timings do not
claim to benchmark the changed v5 shader.

Native tab hiding was attempted once with two headed Chromium tabs. Switching
foreground tabs left `document.hidden = false`; native visibility delivery is
therefore **unverified**, not a passed hidden-tab test. Explicit scene suspension,
clock blocking and reduced motion are verified separately, and the existing
product visibility handler remains connected. Physical-phone GPU, thermal,
touch/pinch and other-browser behavior remain untested.

Reproduce with the local Vite review server (`node scripts/hybrid-review/serve.mjs`,
port 4318), Node 24, `PERIGEE_PLAYWRIGHT_MODULE` pointing to the installed module,
and the bundled Python with Pillow/numpy. Run `moon.mjs`, `moon-details.mjs`,
`moon-final-checks.mjs`, `moon-terrain.mjs`, `moon-compare.py`, `moon-assets.py`,
`moon-audit.py` and `moon-page.mjs`. `moon-benchmark.mjs` should run serially after
builds. `moon-production.mjs` uses a static server for `.output/public` on port
3011; the pre-existing port 3010 server was left untouched. Review evidence is
local and ignored; another checkout must reproduce it.

**Approval status: awaiting explicit user visual approval.** After approval,
promote only the selected Moon renderer while retaining Earth-facing behavior,
regenerate its thumbnail from the accepted frozen globe, update active public
method/editorial/source records and run promotion-specific checks. Preserve the
portrait/material/thumbnail as the reference and rollback path. H4 is not declared
fully promoted before that approval. No commit, upload or publication was made.


Final generated-product verification passed on both layouts: the public Moon
loads the original portrait, has no rotation settings, and its actual Capture →
Save action downloaded **7680×4800 desktop / 3549×7680 mobile-layout** PNGs.
Complete saved images and native crops were inspected. Product browser errors:
zero. The comparison page passed all 20 layout/view combinations with loaded
images and no horizontal overflow at 390 pixels. Evidence: `production/`,
`review-v4/page-results.json`; log `product-final.log`. The initial attempt on
the pre-existing 3010 server failed; the successful run explicitly served the
fresh generated output on 3011. That earlier failure is not treated as a pass.


### Additional source-marking isolation

Quarter-turn inspection flagged faint straight-looking markings in the upper
far-side reflectance. A controlled export at 90° with normals disabled, then with
the original and both fresh LOLA normal derivatives, leaves these markings in
place (`seam-study/study.png`). They are present in the original v4 source view
and the albedo-only view, rather than a new DEM or runtime tile seam. The study
establishes the source channel, not whether every marking is a natural ray or a
photometric mosaic residual. No speculative painting or duplicated terrain was
used to erase them; this remains an explicit source limitation.


### Final review-v5 verification

Fresh runs passed typecheck, 293 tests / 54 files, production build and static
35-route generation (`verify-v5.log`, `generate-v5.log`). The full v5 browser
matrix, independent quarter/pole saved export checks, frozen active-clock 8K
captures, transition illumination check and 20-case comparison-page check all
returned zero browser errors. Saved images were inspected as complete scenes
and native details; production film comparisons use the same frozen film time.
Source preservation again reports unchanged starting files outside the intended
Moon integration/docs set. All four approved globes and the portrait have maximum
matched-reference RGB difference zero. The original production portrait gate
remains unchanged. No runtime source assets were replaced; no commits, uploads
or publication were made. Physical-phone and native visibility limits above
remain unresolved, rather than inferred from these passes.


The fresh v5 serial benchmark (`review-v5/hardware.json`) ran on the same
Apple M4 desktop renderer with a roughly 120 Hz sampled cadence this time;
it is not directly comparable to the earlier 60 Hz run. Globe GPU p95
high/balanced/safe: 4.227/3.687/3.108 ms desktop and 2.422/1.646/2.632 ms
narrow desktop viewport; CPU p95 at most 0.7 ms. Desktop-high sampled about
113.9 fps, other globe cases about 118.8–120 fps. These short-run observations
are not physical-phone, thermal or cross-browser acceptance.


## Promotion verification — complete

Node 24 checks passed: typecheck, **293 tests / 54 files**, production build and
**35-route static generation**. The final generation includes the corrected
Moon-only thumbnail CSS. Logs: `promotion-verify.log` and
`promotion-generate-final.log` under `tmp/hybrid-h4-moon/`.

Production browser checks passed on desktop and mobile layout with zero errors:
production globe selected, shared clock advancing while lunar spin stays fixed,
stable pole/Sun, reduced motion, no public rotation settings, new thumbnail
loading and uncropped menu presentation, plus actual product Capture/Save.
Saved files are 7680×4800 desktop and 3549×7680 mobile layout; complete images
and native details were inspected. These are desktop Chromium layout checks,
not physical-phone testing. The first menu check caught the inherited zoom;
its corrected rerun passed without weakening the assertion.

The production Moon matches approved review-v5 pixel-for-pixel on both reference
layouts. Mars, Jupiter, Saturn and Neptune also remain pixel-identical. Accepted
Moon material, construction, motion and lighting code hashes are unchanged;
all unrelated starting files retain their recorded hashes. Evidence and machine
records: `tmp/hybrid-h4-moon/promoted/`, including `preservation.json` and
`production-results.json`. H4 is complete. Future stages and remaining physical
hardware checks remain separate; no commits, uploads or publication were made.
