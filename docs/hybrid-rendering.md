> **Rigel H6 was explicitly approved and locally promoted on 1 October 2026.**
> Rigel is the ninth production globe. The fixed portrait rollback and disabled
> motion are preserved; its thumbnail, public copy and credits use the accepted
> synthetic globe. The eight earlier approved globes retain their appearance
> and behavior. Source, approval and verification are in the
> [Rigel H6 handoff](rigel-hybrid-review.md). Andromeda is outside this migration.
> No commit, upload or publication.
>
> **Sun H6 was explicitly approved and locally promoted on 1 October 2026.**
> The accepted synthetic globe is now the production default, with a thumbnail
> from its frozen 8K export and updated source-limited public copy/credits.
> `sun-portrait-v1.webp` and its original thumbnail remain fixed rollback assets.
> Bulk solar motion stays disabled; the bounded differential demo is review-only.
> Source, colour, motion and verification are in the [Sun H6 handoff](sun-hybrid-review.md).
> All seven approved globes, including Sirius A, remain unchanged.
> Rigel and Andromeda were not migrated. No commit, upload or publication.
>
> **Sirius A H6 was explicitly approved and locally promoted on 30 September
> 2026.** Its synthetic blue-white globe, portrait rollback, source limits and
> disabled bulk spin are recorded in the [Sirius H6 handoff](sirius-hybrid-review.md).
> The legacy 120-hour public rotation value was removed.
>
> **Betelgeuse H6 was explicitly approved and locally promoted on 29 September
> 2026.** Its synthetic spherical convection, desktop/mobile comparison,
> portrait rollback and source limits are recorded in the
> [Betelgeuse H6 handoff](betelgeuse-hybrid-review.md). It has no claimed bulk
> rotation period or public spin control.
>
> **Moon review-v5 was explicitly approved and locally promoted on 17 September 2026.**
> The globe preserves its Earth-facing behavior without automatic free spin.
> H4 is complete: Mars, Neptune and Moon are promoted alongside Jupiter and Saturn.
> See [Moon approval and handoff](moon-hybrid-review.md).

> Neptune review-v9 was explicitly approved and promoted on 17 September 2026.
> It now rotates automatically at 120×. See [Neptune handoff](neptune-hybrid-review.md).

> Mars display-v6 was explicitly approved on 17 September 2026 as meeting the
> 95% visual target on both layouts. Mars is now locally promoted with automatic
> 120× rotation. See the [promotion handoff](mars-hybrid-display-refinement.md#promotion-after-user-approval)
> and [source audit](mars-hybrid-refinement.md). Earlier handoffs are historical.

# Hybrid rendering: nine approved globes and retained Andromeda

Current state, 1 October 2026: Moon, Mars, Jupiter, Saturn, Neptune, Betelgeuse,
Sirius A, Sun and Rigel are explicitly approved production globes. Andromeda
retains its approved cleaned portrait. Renderer approval does not approve a
stellar rotation model. The dated approval notes above and appendices below are
historical records; the current table and [H7/H8 audit](andromeda-h7-h8-review.md)
supersede stale pending/next-task wording. No commit, upload or publication.

| Stage | Current renderer work | Remaining acceptance |
| --- | --- | --- |
| H0 | Source archives, desktop/mobile-layout references and desktop baseline recorded | Physical-phone and sustained device performance |
| H1 | Lifecycle, leasing, clock, motion and frozen exports implemented | Preserve these contracts |
| H2–H3 | Cassini Jupiter approved; automatic 120× spin | Public pause/rate controls were removed by user request |
| H4 | Mars display-v6, Neptune review-v9 and Moon review-v5 approved | Physical-device/cross-browser acceptance |
| H5 | Saturn observational-v1 and separate rings approved | Physical-device/cross-browser acceptance |
| H6 | Betelgeuse, Sirius A, Sun and Rigel approved | No automatic stellar motion approval; solar differential demo stays review-only |
| H7 | Portrait retention explicitly approved on 1 October 2026; no candidate promoted | Reopen only for a demonstrated interaction benefit |
| H8 | Usage/inventory/documentation consolidation | Device acceptance and authorized release preparation remain separate |

## Current rotation policy — user update, 16 September 2026

Rotating renderers spin automatically at the existing disclosed 120× rate. There
are no rotation toggles or speed settings in More or elsewhere in the product.
The removed RotationControl component, its CSS and its app state are gone.
Reduced motion, hidden tabs and frozen capture still suspend motion without
catch-up. `PerigeeScene.setRotation` is retained only for deterministic developer
review, not exposed through the product controller or composable.

Apply automatic spin as each physically rotating body receives an approved renderer
and sourced motion model. Mars, Jupiter, Saturn and Neptune are now approved. Portrait billboards
remain fixed, unknown stellar periods are not invented, and the Earth-facing Moon
does not become a decorative turntable. H4 renderer work is complete.
The prior H3 control evidence below is historical and superseded by this policy.
Type checking, 13 focused motion/lifecycle tests and 35-route static generation
pass after removal. Browser evidence is recorded in
`tmp/hybrid-review/automatic-rotation-results.json`.

## H3: visible Jupiter rotation (original implementation)

- Production uses the sourced approximate 9.9-hour bulk period, prograde around
  local +Y. The fixed pole and scene-space Sun do not turn with the cloud map.
- Default presentation is labelled **120× time-lapse**, a 297-second turn. The
  More menu offers a rotation toggle and Real time (1×). Controls appear only
  for Jupiter. Pause/rate preferences survive object changes within the session.
- Spin rate changes integrate continuously. Pausing spin leaves ambient evolution
  at 1×. Hidden tabs, reduced motion and exports suspend the appropriate clock
  without catch-up. Reduced motion also disables the rotation toggle with an
  explanatory label; changing speed does not override it.
- Main and outgoing globes share the same clock during transitions. Distance and
  quality changes do not reset longitude. Every still tile receives one pose.
- Public imagery/method copy and attribution now describe Cassini and the bulk
  rotation approximation. The new menu thumbnail is rendered from the approved
  reference pose. No other object is migrated and nothing is published.
- `renderer=production` in the developer harness exercises normal rotation;
  `renderer=globe` keeps the original paused quarter-turn review, and
  `renderer=portrait` retains the rollback reference.

The earlier H0–H2 evidence below remains the baseline for this approval.

## Baseline and ownership

The pre-existing working tree was preserved, not reset or committed. Its 293 tracked
and untracked files were archived before edits in `tmp/hybrid-h0/source-baseline.tar.gz`.
`hashes.json`, `status.txt` and `working-tree.patch` record the exact starting state.
The archive includes the approved portraits and thumbnails, including cleaned
Andromeda v2 and its v3 thumbnail. Versioned, ignored observational trees remain
identified by the existing manifests and provenance records. One unchanged
NASA/JPL/SSI Cassini JPEG was added for the pilot; no dependency was introduced.

`tmp/hybrid-review/results.json` records each object's complete definition,
reference preset, shot/light settings, thumbnail, source attribution IDs, quality,
viewport and resource estimates. References use rooftop, the closest existing
preset, high quality, DPR 1, reduced motion (no grain), 1440×900 and 390×844.
The `baseline` PNGs execute the archived renderer; `adapted` PNGs execute the new
contract. Both save the actual `captureFrame()` output. Separate Jupiter PNGs
exercise `exportStill()` at 3840 pixels on the long edge.

A desktop browser resized to 390×844 is a mobile **layout** test. It is not a named
physical phone or a mobile GPU benchmark. Apple M4/Metal desktop measurements are
recorded below. The physical-phone 30 fps gate remains pending; mobile layout
measurements on the Mac are not phone measurements. Internal memory estimates are
not measured residency.

## Asset and implementation audit

| Object | Public renderer / reference | Geometry data and limitation | Motion policy |
| --- | --- | --- | --- |
| Moon | Approved review-v5 globe; v1 portrait rollback | LROC colour, LOLA terrain; inferred polar coverage disclosed | Fixed Earth-facing near side |
| Mars | Approved display-v6 globe; v1 portrait rollback | HRSC/TES/Viking colour and MOLA terrain; bounded 16K detail | Automatic 120×, 24.6229 h approximate sidereal |
| Jupiter | Approved Cassini globe; v1 portrait rollback | Native PIA07782, 3601×1801, December 2000; dated clouds/hazy poles | Automatic 120×, 9.9 h bulk approximation |
| Saturn | Approved observational-v1 oblate globe and separate rings; v1 portrait rollback | Cassini/Hubble multi-epoch colour, Cassini ring colour and Voyager optical depth | Automatic 120×, 10h 33m 38s; fixed rings |
| Neptune | Approved review-v9 globe; v1 portrait rollback | Dated Voyager reconstruction v4; inferred coverage and authored grade | Automatic 120×, 16.11 h magnetic-coordinate approximation |
| Sun | Approved synthetic globe/pole atlas; v1 WebP portrait rollback | Original granulation, invented activity and optics; no measured visible map | Null bulk period; differential advection only in review |
| Betelgeuse | Approved synthetic convection globe; v1 WebP portrait rollback | Authored cells/colour, not observed geography | Disabled bulk motion |
| Sirius A | Approved synthetic hot-star globe; v1 PNG portrait rollback | Authored granulation/optics; no measured global map or companion orbit | Disabled bulk motion |
| Rigel | Approved synthetic mottling globe/pole atlas; v1 PNG portrait rollback | Original artwork; integrated and line-region evidence supplies no surface map | Disabled bulk motion |
| Andromeda | Approved cleaned v2 PNG portrait; thumbnail v3 | NASA-informed artwork with baked inclination/dust/light; inactive observational stack retained | Disabled; no internal parallax |

All current image licensing/source notes remain in `public/assets/ATTRIBUTIONS.md`;
planet source checksums, reconstruction and processing are in
`docs/planet-assets.md` and `planet-manifest.json`. The Jupiter pilot uses the unchanged [Cassini PIA07782 map](https://www.jpl.nasa.gov/images/pia07782-cassinis-best-maps-of-jupiter-cylindrical-map/) (`jupiter-cassini-map`), recorded with its checksum in the attribution file. The December 2000 near-infrared/blue composite approximates natural color; it is neither neutral calibrated albedo nor current weather. Its complete planetocentric latitude grid needs no reprojection. Source-center sampling handles the duplicated geographic endpoints. The previous OPAL asset remains available for other experiments. Public Jupiter method copy, thumbnail and credits now match the accepted globe.

The retained `RingMaterial` has optical-depth and oblate-shadow support, but merely
reaching the former generic globe branch did not construct Saturn's rings. That
incomplete path is no longer accidentally selectable. The old procedural stellar
and galaxy materials remain available for later experiments; they do not qualify
as approved replacements through code reuse alone.

## Runtime contracts

- `objects/createCelestialObject.ts` owns family construction; `CelestialObject`
  owns motion application, lighting, opacity, quality, capture preparation and
  idempotent disposal. Existing portrait child order, shaders, leases and layers
  remain intact. Portraits have no physical spin frame.
- Jupiter has placement → fixed pole → local spin → oblate surface/detail children.
  Saturn review rings are siblings of the spin frame under the pole. Physical radius
  and existing distance/framing math are unchanged.
- `jupiterReference` documents the authored light and initial longitude. Shot pitch
  and roll orient the local +Y pole; they are not astronomical coordinates. The
  reference phase puts the observed Great Red Spot in view. Review quarter turns
  are offsets from that authored phase, not measured ephemeris longitudes.
- Lighting is transformed from scene space into view/body space. Turning the
  surface does not rotate the Sun. Jupiter uses the linear HDR path and a single
  final AgX transform. Portraits still composite after AgX in live and saved views.
- `CelestialClock` integrates active time with independent spin/evolution rates.
  Pause, reduced motion and nested export freezes discard inactive intervals.
  The existing app visibility handler calls scene pause/resume; no hidden-time
  catch-up is introduced. Switching objects, quality or distance never resets it.
- `rotation.ts` computes signed phase and quaternions directly. Unknown periods
  are explicit nulls. Legacy stellar `rotationPeriodHours` are not consumed.
- `objectMotion.ts` records Jupiter's approximate 9.9-hour bulk period from
  [NASA Jupiter facts](https://science.nasa.gov/jupiter/jupiter-facts/).
  Direction is right handed around local +Y; reverse spin is explicit retrograde.
  The explicitly labelled 120× presentation multiplier is separate from the sourced period.
- The H2 review selector overrides the period with null for reproducible comparisons;
  production uses the sourced period at automatic 120× with no public motion controls.
- Export freezes the last rendered instant once, including procedural evolution.
  Every tile's four HDR samples reapply that same immutable snapshot. Completion,
  cancellation and failure release the clock without catching up. Existing LOD
  readiness, cache limits and transactional object replacement remain in use.

Jupiter uses a restrained atmosphere and bounded linear-light detail recovery from
the Cassini map. Its authored contrast/exposure settings are isolated in
`JupiterGlobeMaterial`. They add no generated storms or reconstructed observations.
Longitude wraps explicitly. Jupiter has no tiled levels in the current manifest;
therefore this pilot cannot establish rotation-driven tile-stream acceptance for
Moon/Mars. Their approved migrations retain separate tile-stream and visual evidence.

## Review harness

The harness is outside Nuxt's pages and public assets, so it does not add a route or
renderer switch to the product. Start it from the repository with Node 24:

```sh
node scripts/hybrid-review/serve.mjs
```

Open `http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=globe&longitude=0`.
Use longitude 90, 180 or 270 for the paused turntable; omit `renderer=globe` for the
approved portrait. `quality=safe`, `distance=real`, and `object=moon` are review-only
parameters. `baseline=true` uses the extracted local archive under
`tmp/hybrid-h0/source`; it requires that local baseline to be present.

To reproduce the matrix, point `PERIGEE_PLAYWRIGHT_MODULE` at an existing Playwright
installation, run `node scripts/hybrid-review/capture.mjs`, and inspect the files in
`tmp/hybrid-review`. The browser checks success and cancellation of real 4K exports.
The harness saves no files outside that ignored review directory.

## Acceptance status

After approving Jupiter and requesting spin, the user raised the visual-quality
target to **95%**. The Downloads plan now includes the completed Jupiter path and
a handoff for H4–H8. Apply 95/100 to remaining migrations and further Jupiter
refinement; existing Jupiter approval is not a measured 95/100 certification.
The per-dimension floor remains 85/100, and the user remains the final visual judge.

H1 automated contracts are implemented. H0 has an immutable source baseline, asset inventory, reproducible reference captures and an Apple M4 desktop performance baseline; physical-phone performance remains pending. H2 received explicit user visual acceptance on 16 September 2026. No numerical
score generated by the implementation was used to grant that acceptance. See the saved
comparison and review findings alongside this document. H3 is implemented as recorded above.

Do not promote any renderer until each desktop/mobile result independently scores
at least 95 overall, with no dimension below 85 and no critical defects. Weight
surface detail 30%, lighting 25%, color 20%, silhouette/limb 15%, composition 10%.
Keep the archived references fixed. The user subsequently explicitly approved
Saturn observational-v1; its promotion handoff is recorded at the end. This is
subjective acceptance, not a numerical 95 score. H4 and H6 renderer migrations are complete; the H7/H8 audit records the next work.
Publication was not requested and has not been performed.

## Historical implementation and review findings, 16 September 2026

All pending, next-migration, control and numerical-rubric statements in this dated
record describe that stage only. Later explicit approvals and the current status
tables above supersede them. These are evidence records, not current instructions.

All ten archived/current portrait comparisons remain pixel-identical at both
viewports (20 comparisons, mean/max channel difference 0/0). The preserved
reference scenes are paused and grain-free. This is not universal device proof.

The initial OPAL pilot did not preserve the approved cloud structure. The revised
pilot uses Cassini PIA07782: its vortices, white ovals, belt edges and Great Red Spot
are present in the actual observations. Bounded source-space unsharp filtering,
contrast/white-balance calibration and an authored cloud-scattering exponent match
the portrait's look more closely. The source JPEG itself is unchanged. Neither
sharpening nor the illumination model is represented as a calibrated measurement.
No generated weather or invented far-side features were added.

The revised reference, both viewport sizes, and all four longitudes are in
`tmp/hybrid-review/index.html`. The oblate silhouette is deliberately physical,
slightly shorter than the approved artwork's near-circular silhouette. The map's
polar haze and finite 120 km source detail remain limitations. The revised surface
is materially closer to the portrait, but the fine structure and Great Red Spot
are not pixel-identical to the artwork. The old provisional 77.4/75.1 OPAL scores
are superseded; no new agent score is used to grant user acceptance.

**User visual review passed.** The user approved the revised globe and requested
that it become the main renderer and spin. The approval is for Jupiter only. The
archived portrait remains unchanged and selectable in the review harness.

### Capture correctness

The previous export mismatch had a concrete cause: Three.js suppresses automatic
renderer tone mapping for ordinary offscreen render targets. The still finisher's
`tonemapping_fragment` therefore did not apply AgX. The finisher now calls the same
Three.js `AgXToneMapping` function explicitly, with the current exposure, before
output encoding. Its material disables automatic tone mapping, avoiding double
application. HDR accumulation and the post-AgX portrait pass remain separate.

The actual four-sample tiled 4K exports now match the live appearance. Mean absolute
RGB differences over the recorded hero regions are 1.51/255 desktop and 1.72/255
mobile layout, down from 7.04 and 7.33. Per-channel mean signed differences are less
than 0.38/255; finer sampling and antialiasing explain residual local differences.
`scripts/hybrid-review/compare.py` checks these images against explicit regression
thresholds (mean absolute <3 and per-channel bias <1.5), and saves side-by-side
crops plus `capture-metrics.json`. These are compositing diagnostics, not quality
scores. All browser/shader error logs were empty. Cancellation returned AbortError,
cleared the exporting flag and preserved the frozen clock.

This fix also corrects HDR backgrounds in portrait exports; the approved portrait
pixels remain on their existing post-tone-map path. Bloom is disabled for Jupiter,
so stellar bloom parity still requires H6 verification.

### Desktop hardware baseline

`benchmark.mjs` uses visible Chromium 151, Apple M4 via ANGLE Metal, DPR 1, 1440×900,
and actual GPU timer queries. Each case warms for 30 frames then continuously
renders 300 frames through the complete composer with the pose paused. It records
CPU submission time, GPU execution time, frame pacing and estimated resources.
These are local steady rendering measurements, not a long thermal soak.

The Jupiter portrait baseline and the globe both sustain approximately 120 fps
on this display. GPU p95 is 4.68 ms for the archived portrait, 4.57 ms for the
adapted portrait, 4.76 ms for the high-quality globe, 4.78 ms balanced and 3.43 ms
safe. Globe CPU p95 is 0.70 ms high/balanced and 0.60 ms safe. The desktop 60 fps
target is met in this measured scenario. All ten object baselines and exact
browser/hardware strings are saved in `hardware.json`.

The 390×844 globe layout also sustains about 120 fps / 2.75 ms GPU p95 **on the same
Apple M4**. This is not a phone result. An actual target phone and its 30 fps
acceptance remain pending. Headless Chromium uses SwiftShader here; those runs
are used only for repeatable image regressions, not hardware performance claims.

Run the review server, then `benchmark.mjs` with `PERIGEE_PLAYWRIGHT_MODULE` pointing
to an existing Playwright installation. Run `compare.py` after `capture.mjs` using
the Python/Pillow/numpy environment already used for asset preparation.

The H0 manifest audit also filled four existing portrait entries (Sun, Betelgeuse,
Jupiter, Saturn) previously loaded by URL but omitted from `AssetManifest`. Tests
verify that all ten portraits and the Cassini pilot have shipped assets and the
appropriate attribution IDs.

### Final implementation checks

Node 24 `NUXT_IGNORE_LOCK=1 npm run verify` passes type checking, all 273 tests
across 50 files, and the production build. Static generation passes for 35 routes;
`git diff --check` is clean. No commit or publication was made.

`interactions.mjs` passes on both desktop and mobile layouts: three rounds of rapid
Moon/Mars/Jupiter replacement end with one live Cassini lease and no outgoing
objects; near/real distance changes preserve phase; all four landscapes load and
render; pointer dragging moves and settles the camera. `interactions.json` and
the landscape PNGs retain the evidence. Physical touch/pinch acceptance belongs
with the pending phone run. Every browser error log is empty.

### H3 confirmation

The moving-globe browser check (`scripts/hybrid-review/rotation.mjs`) passes on
Apple M4/Metal. In 1.2 seconds the clock advanced 144 simulated seconds. The pole
and world-space Sun stayed fixed; pausing spin preserved ambient evolution; 1×
advanced at real rate; scene suspension and reduced motion introduced no catch-up.
An actual 4K export applied exactly one simulated instant in all 50 pose calls
(including preparation), restored the same clock values and cleared the export
flag. Both desktop and mobile-layout More menus passed pause, rate selection and
reduced-motion disabled-state checks. Screenshots and detailed results are in
`tmp/hybrid-review/h3-*`. No browser or shader errors occurred.

## H5 Saturn initial review — 16 September 2026 (historical)

**H5 was taken before the remaining H4 planets at the user's request. Its renderer
and deterministic motion are implemented for review, but visual acceptance is NOT
complete. Saturn remains a portrait in production; public rotation settings have been removed; approved rotating renderers spin automatically. No commit or publication was requested or performed.**

### Preservation and implementation

The start-of-H5 modified/untracked source was archived separately in
`tmp/hybrid-h5/starting-source.tar.gz` with `starting-hashes.json`. Neither H0's
archive nor the approved Saturn image was replaced. Reference screenshots before
and after this work have maximum RGB difference 0 on both viewports.

`RenderingReview.saturn` selects `globe-pilot` (paused quarter turns), `globe-motion`
(shared live clock), or `portrait`. An empty review configuration still selects
the approved portrait. The standalone review is
<http://127.0.0.1:4318/scripts/hybrid-review/saturn.html>; start the existing
`scripts/hybrid-review/serve.mjs` with Node 24. It is not a public product route.

The factory reuses placement → fixed pole → spin → surface. The polar scale is
0.90204. A separate 512-segment equatorial annulus is a sibling of the spin frame,
with radii 1.24–2.32 in existing globe units. The physical globe size, distance
presets and full-ring camera widening are unchanged. The existing 116460 km
catalogue diameter remains the display-size anchor; it is the mean-diameter
convention, not a newly corrected equatorial diameter. Ring depth was normalized
with the asset recipe's equatorial-radius convention. This pre-existing scale
approximation is retained to avoid silently changing Saturn's apparent size.
The resulting perspective ring span/orientation differs from the flat portrait;
that remains a visual-gate shortfall, not a reason to shrink the globe.

`SaturnGlobeMaterial` isolates OPAL sharpening, cream color calibration, atmospheric
limb scattering and cloud illumination from Jupiter. Hardware RepeatWrapping is
used without fragment `fract`, avoiding a discontinuous mip derivative and the
bright meridian seam found in the first inspection. The source image is unchanged.
Color adjustments are authored display choices, not calibrated spectrophotometry.

The ring shader samples the radial optical-depth interval from the same constants
as the surface shadow shader. Viewing opacity and illuminated/unilluminated faces
use the existing single-scattering slab. The surface samples finite-Sun ring
transmission; the ring uses the oblate planet's projected shadow with penumbra.
Both receive scene-space light transformed into their respective frames. The pole
and ring plane remain fixed while the surface and its local Sun coordinates turn.
The current authored Sun elevation makes the exterior planet shadow less prominent
than the approved artwork. Shadow topology is connected, but matching that lighting
is outstanding visual work. Multiple scattering, particle wakes and individual
particle orbital motion remain outside this renderer.

The body writes depth at render order 10 even during fades; the transparent rings
follow at 12 with depth testing and no depth writes. Rings render once as a
DoubleSide sheet. Quality tiers reuse PlanetTiles' bounded sphere geometry; Saturn
has no higher-resolution tiles. Three texture acquisitions settle together and
release all successful siblings on failure/cancellation. The ring geometry has
explicit object-owned disposal, while shared geometries remain untouched.

### Motion and asset audit

- The motion record uses **38018 seconds (10h 33m 38s)**, the 2019 Cassini
  ring-seismology interior-period estimate described by
  [NASA](https://science.nasa.gov/solar-system/scientists-finally-know-what-time-it-is-on-saturn/).
  NASA's general facts page still gives a rounded 10.7 hours; the legacy catalogue
  value is not the reviewed clock input. Prograde rotation is right-handed about
  local +Y. This is a bulk cloud-advection approximation, not exact System III
  ephemerides, latitude-dependent weather or a precisely measured pole.
- Reused presentation rates are 1× and 120×; the latter gives a 316.817-second turn.
  Pause preserves ambient evolution; reduced motion and scene suspension introduce
  no catch-up. Initial phase 0.38 rad, pole pitch 0.49 rad, roll -0.10 rad and light
  `[-0.85, 0.32, 1]` are authored shot settings. They are not astronomical coordinates.
- Atmosphere: [OPAL Cycle 31](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-31),
  22 August 2024 rotation A, F631N/F502N/F395N composite, native 1800×900.
  Existing processing corrects planetographic latitude, wraps longitude, applies
  source Minnaert correction/display balance and reconstructs poles plus the
  ring-obscured latitude strip. **17.4748% of source coverage is reconstructed.**
  The global map is not a high-resolution Cassini mosaic, neutral albedo, or
  current weather. No generated polar vortex or unseen cloud storms were added.
- Rings: [Voyager 2 UVS delta Sco egress](https://pds-rings.seti.org/voyager/uvs/profiles.html),
  26 August 1981, 5 km radial samples resampled to 8192 RG16 bins. Data retains
  Cassini/Encke gaps and finite-width ringlets, with saturated tau capped at 8 and
  missing coverage transparent. UV optical depth is an approximation for visible
  scattering; high optical depth saturates visible contrast in the B ring.
- Ring color remains the separately licensed Solar System Scope CC BY 4.0 strip;
  its alpha does not supply depth. The review applies an authored neutral ivory
  balance and radiance factor. It is not Cassini-derived visible ring albedo.
- Existing immutable assets and attribution IDs are reused; no new image asset or
  dependency was added. Exact source/runtime hashes, sizes and derivative matches
  are in `tmp/hybrid-h5/asset-audit.json`. `ATTRIBUTIONS.md` distinguishes the active
  portrait from this review-only path. The current portrait thumbnail stays active.

### Independent visual rubric

The fixed portrait is 100. These are agent assessments from matched actual renders,
not measured percentages, computed pixel-similarity scores or user approval.
Desktop and mobile-layout results are intentionally assessed separately.

| Dimension | Weight | Desktop 1440×900 | Mobile layout 390×844 | Evidence and reason |
| --- | --- | --- | --- | --- |
| Surface detail/features | 30% | 68 | 78 | `*-comparison.jpg`, `export-detail.png`: broad observed bands survive, but fine cloud eddies and the distinct polar vortex are absent; this is particularly visible at desktop/export scale |
| Lighting/tonal depth | 25% | 78 | 80 | `*-globe-0.png`: three-dimensional terminator and ring-shadow band work, but lower hemisphere is too dark and the prominent portrait shadow on the outer rings is not matched |
| Color | 20% | 85 | 88 | Same comparison: muted cream/ivory identity is retained; globe/rings remain flatter and slightly browner |
| Silhouette/limb/rings | 15% | 86 | 88 | Full physical ring span fits both layouts; Cassini Division is visible, but ring opening/roll differs and fine B-ring contrast is weaker |
| Composition/impression | 10% | 82 | 85 | Same background, camera and physical globe radius; the softer globe and changed ring projection reduce the portrait's presence |
| **Weighted score** | **100%** | **77.95** | **82.90** | **Both fail 95 overall; several dimensions fail the 85 minimum. Do not promote.** |

The first inspection found a bright UV meridian and rings too dark/warm. One batch
removed the derivative discontinuity, corrected ring display color and adjusted
pole/light response. The single confirming inspection found no remaining bright
UV line in reference/90/180/270 views, but the source/detail and lighting gaps above
remain. Safe quality retains identity relative to its portrait baseline; it does
not establish high-tier fidelity or phone performance. No open-ended polish loop
or baseline substitution was used to claim 95%.

### Verification and reproduction

With the review server running, use Node 24 and the installed Playwright module:

```sh
PERIGEE_REVIEW_PASS=final PERIGEE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/hybrid-review/saturn.mjs
PERIGEE_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/hybrid-review/saturn-benchmark.mjs
python scripts/hybrid-review/saturn-compare.py
```

The Python comparison needs Pillow/numpy. Local evidence is ignored under
`tmp/hybrid-h5/final/`; it will not appear in another checkout automatically.
`saturn.html` offers matched layouts, quarter turns, safe/balanced/real views,
links to live review and the actual high-resolution PNGs.

- `results.json`: zero browser/shader errors in Chromium 151 / Apple M4 / ANGLE
  Metal. Reference and three quarter-turn views, high/balanced/safe and real-distance
  presets were captured separately at both layouts. Ring plane and scene Sun
  matrices remained unchanged during motion. Pause, real-rate and suspension
  checks passed; reduced motion held the clock through the export checks.
- Both layouts completed three rounds of rapid Saturn/Moon/Jupiter replacement,
  ending on Saturn, zero outgoing heroes and exactly one lease for each of its
  three assets. Partial-opacity screenshots show front/back depth ordering.
  A first harness check incorrectly used `.length` on the outgoing Set; corrected
  to `.size` before the final run. No runtime transition fix was needed.
- Actual tiled exports are **3840×2400 desktop** and **1774×3840 mobile layout**,
  including four HDR samples per tile. Mean absolute live/export hero-region RGB
  errors are **1.182/255 desktop** and **1.608/255 mobile**, with per-channel bias
  below 0.663/255. These pass the existing <3 / <1.5 compositing thresholds; they
  do not score visual quality. Full-size ring/cloud detail was also inspected.
- Frozen capture plus cancellation reapplied exactly one instant in **52 desktop**
  and **36 mobile-layout** pose calls, restored the same clock values and cleared
  export state. A first attempt began before a reduced-motion media
  change settled and was cancelled by the existing safety behavior; the final harness
  lets that event settle before starting export.
- Node 24 `NUXT_IGNORE_LOCK=1 npm run verify` passes type checking, **276 tests in
  51 files**, and production build. `npm run generate` passes **35 routes**.
  `git diff --check` is clean. Focused Saturn tests cover quarter-turn hierarchy,
  lighting frames, quality/export pose, ring disposal, failed sibling fetches and
  production policy. The shader detector reported no findings.
- This is **desktop hardware and resized desktop layout testing**, not a physical
  phone, touch/pinch, thermal-soak or cross-browser acceptance. Those remain pending.

### Desktop performance evidence

A clean, serial benchmark after the production/static builds completed used visible
Chromium 151, Apple M4 / ANGLE Metal, DPR 1, 30 warm-up frames and 300 measured frames
per case. All eight cases sustained approximately 120 fps in this short run.
Desktop GPU p95: portrait **3.56 ms**, globe high **3.83 ms**, balanced **3.77 ms**,
safe **2.92 ms**. Mobile-layout GPU p95 on that same Mac: portrait **1.69 ms**, high
**1.78 ms**, balanced **1.87 ms**, safe **1.71 ms**. CPU p95 was at most **0.70 ms**.
These meet the desktop 60 fps target in the sampled scenario, not a thermal or
physical-phone guarantee. Resource diagnostics are estimates, not measured GPU
memory residency. The first measurement overlapped static generation and was
contended; it is retained as `hardware-during-build.json` and is not the acceptance
baseline. The clean result is `hardware.json`.

### Next steps and promotion boundary

Continue **H5 before H4**. The next visual iteration needs a better supported
atmospheric/detail source (especially polar coverage) or an explicitly described
reconstruction strategy, and a reference-matched lighting/pole calibration that
preserves the physical globe scale. Do not silently invent observational features.
Retain the fixed portrait and compare both layouts again under the same rubric.

Only after the 95/85 gate and the user's visual approval: promote Saturn in
`renderingPolicy`, use automatic 120× spin with reduced-motion, visibility and
frozen-export behavior,
render a new full-ring thumbnail from the accepted pose, and update public
editorial/method credits. None of those production promotion changes has been made.

## H5 observational revision and lower-hemisphere fix — 2026-09-16

The assessment and promotion hold in this section record the state **before** the
user approved this exact candidate. The final promotion handoff below supersedes
those status statements; source, technical evidence and historical scores remain valid.

**Historical status before user approval: review only, not promoted.** The original portrait is still the
production Saturn. The user rejected the first review and reiterated the 95%
requirement. The retained observational revision improves it substantially, but
my independent assessments are **90.00 desktop / 92.15 mobile layout**, so neither
passes. These are subjective rubric assessments, not measured similarity or user
approval. No lower baseline or test result is substituted for the 95% gate.

The latest comparison is `http://127.0.0.1:4318/scripts/hybrid-review/saturn.html`.
Its images now come from `tmp/hybrid-h5/observational-v1/`, rather than the earlier
failed `final/` folder. Both revisions and the intervening experiments remain in
ignored local evidence. The page exposes reference/quarter turns, quality tiers,
real distance, both actual 4K exports and a live rotation review.

### Rendering decisions

- A shared weak-perspective projection linearizes the globe and rings around
  their physical scene centre. This fixes the exaggerated foreground-ring
  projection that hid the lower hemisphere. It retains their common centre,
  calculated angular scale and depth ordering; it is an authored portrait
  projection, not a claim of exact close-range perspective. The globe remains
  oblate (polar/equatorial ratio 0.90204), and separate rings remain equatorial.
- The pole is fixed at pitch 0.54 and roll -0.16; initial phase is 0.38 radians.
  The authored world Sun is proportional to (-1.5, 0.35, 1). The same Sun drives
  both mutual shadows. Only the globe's spin frame rotates. Mobile keeps the
  existing full-ring horizontal framing guard rather than shrinking the planet.
- Forty-eight annular samples estimate first-bounce ringshine using ring optical
  depth, face illumination, distance, receiver angle and planet occultation.
  A Lambert-phase approximation adds planetshine to rings. These are illustrative
  broadband approximations, not a full multiple-scattering radiative-transfer
  solution. The globe shadow uses an 18% unresolved cloud-scattering floor; ring
  umbra uses a 3.5% display floor. Neither coefficient is a measured Saturn value.
- Ring-shadow derivatives are evaluated before fragment-dependent early returns.
  This removed a dotted shadow-boundary artifact exposed by 4K exports. Narrow
  longitude-edge reconstruction removes the archive map's dark wrap seam.
- Source diagnostics now identify the actual 3600-wide composite rather than
  incorrectly attributing the review surface to the old 1800-wide OPAL asset.
  Quality geometry, leases, cancellation, fades and frozen capture retain the
  Jupiter lifecycle. The optional diagnostics metadata does not change tile LOD.

### Source and period audit

The adjacent JSON files contain source/output hashes, dimensions, URLs and
reproduction details. Runtime maps are `saturn-observational-composite-v1.webp`
and `saturn-cassini-rings.webp`; scripts are `prepare-saturn-map.py` and
`prepare-saturn-rings.py` under `scripts/hybrid-review/`.

- [Cassini ISS global RGB, 2011-08-11](https://atmos.nmsu.edu/data_and_services/atmospheres_data/Cassini/sat_global_map.html),
  documented by [Wang et al. 2025](https://doi.org/10.1038/s41597-025-04392-3):
  original/enhanced FITS are 3601×1801×3, source imagery about 161 km/pixel.
  Their stored north-first order was checked against the paper's storm and
  ring-shadow locations because the FITS/display latitude metadata conflicts.
  After invalid-border rejection, 80.6774% of the Cassini grid is usable before
  filling. That percentage does not describe the final multi-source composite.
- Existing [Hubble OPAL 2024-08-22](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-31)
  supplies broader haze variation. The final mix uses 80% broad Hubble luminance
  in an authored cream palette, 20% low-pass Cassini and bounded Cassini fine
  structure. Input Cassini RGB mixes 85% original / 15% published enhancement.
  Missing ring-obscured strips are interpolated; they are not observations.
- [PIA21611](https://www.jpl.nasa.gov/images/pia21611-saturns-hexagon-as-summer-solstice-approaches/)
  supplies the observed northern cap from its 2013-06-25 left panel. The nominal
  polar-stereographic scale is 25 km/pixel, with approximate registration and
  authored longitude. The blend covers 78.5–81°N. The display palette preserves
  the observed hexagon's chromatic boundary; it is not calibrated reflectance.
- [PIA11142](https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/),
  Cassini RGB 2008-11-26, supplies an 8192-bin ring color strip. Visible boundaries
  register the curved public mosaic approximately; anchors are recorded in JSON.
  Voyager UVS 1981 optical depth remains independent and determines opacity and
  divisions. Public-mosaic brightness is not treated as measured albedo.
- This is explicitly **multi-epoch observational reconstruction**, not the
  atmosphere at one instant. The generated portrait is not projected onto the
  globe, and no generated cloud features are added. The former source maps and
  approved portrait are preserved. NASA/ESA/JPL/SSI/Hampton credits are recorded
  in `public/assets/ATTRIBUTIONS.md`.
- The existing **38,018-second** period remains the Cassini ring-seismology
  interior estimate, [NASA 2019](https://science.nasa.gov/solar-system/scientists-finally-know-what-time-it-is-on-saturn/).
  A 120× turn lasts 316.817 seconds. This is bulk map motion, not differential
  atmospheric winds, a measured current pole or an ephemeris.

The quieter [2016 Cassini mosaic PIA21046](https://www.jpl.nasa.gov/images/pia21046-saturn-approaching-northern-summer/)
was also tested as a zonal-profile source. Its approximate de-lighting did not
improve the comparison and is not in the retained asset. Broad portrait-derived
color-grade experiments and automated photometric fits were likewise rejected;
reduced pixel error was not treated as improved visual quality. Experimental
scripts/results are retained under ignored `tmp/hybrid-h5/`.

### Independent rubric, pre-approval candidate

| Dimension | Weight | Desktop 1440×900 | Mobile layout 390×844 | Evidence and remaining gap |
| --- | --- | --- | --- | --- |
| Surface detail | 30% | 85 | 90 | Real cloud structure and polar data replace the blurred OPAL-only surface; large storm texture and map gridding are still more apparent in the 4K detail than the portrait's finer bands |
| Lighting and depth | 25% | 90 | 91 | Lower hemisphere reads again; mutual shadows and indirect light are coherent, but terminator and ring shadow differ from the artwork |
| Color fidelity | 20% | 92 | 94 | Cream globe, restrained cool pole and ivory rings; the atmospheric balance is still less subtle than the portrait |
| Silhouette/limb/rings | 15% | 94 | 94 | Complete lower silhouette, full ring span, measured divisions and stable ring plane; ring contrast remains comparatively regular |
| Composition | 10% | 95 | 95 | Existing scene scale, object placement and full-ring framing are retained |
| **Weighted result** | **100%** | **90.00** | **92.15** | **Below 95: do not promote** |

See `desktop-inspection.jpg`, `mobile-inspection.jpg`, the matched comparison
images and full PNGs in the current evidence folder. Quarter-turn cloud features
move consistently without rotating the ring plane or the light. Inspecting the
actual 3840×2400 desktop and 1774×3840 mobile-layout exports revealed the remaining
source-detail limitations; the contact sheets alone are insufficient acceptance.

### Verification and product behavior

- The current complete headed Chromium matrix passed with **zero browser errors**:
  reference and 90/180/270-degree views, high/balanced/safe, real distance, partial
  fade, repeated Saturn/Moon/Jupiter replacement, three retained texture leases,
  no outgoing objects after cleanup, and cancellation/disposal behavior.
- Automatic 120×, internal review-only pause and real time, reduced motion,
  hidden/resumed clock behavior, frozen exports and cancellation passed. Per the
  user's later instruction, public rotation settings stay removed; accepted
  spinning objects run automatically. Saturn remains unpromoted and static as
  the approved portrait. The public method page still discloses 120× time-lapse.
- Actual 4K/live parity in the matched object crops: mean absolute RGB difference
  **1.349 desktop / 1.862 mobile layout**, maximum absolute channel bias **0.688**
  on a 0–255 scale. These are export diagnostics, not visual-quality scores.
- Node 24 `NUXT_IGNORE_LOCK=1 npm run verify`: typecheck, **276 tests / 51 files**
  and production build passed. `npm run generate` completed **35 routes**.
  An earlier verification caught a numeric time-lapse rate hard-coded into the
  Jupiter editorial summary; the summary now says automatic time-lapse while
  the method page retains the explicit rate. The tests were not weakened.
- `git diff --check` passed. No commit, push or publication was performed.
- Mobile testing is **resized desktop Chromium on Apple M4**, not a physical
  phone. Touch, thermal behavior and cross-browser device acceptance remain open.

### Remaining work

The 95% request is not completed. Further work must improve source-detail quality
and atmospheric rendering, then repeat the independent desktop/mobile visual
assessment. The user was asked whether explicitly labelled artistic cloud
reconstruction may supplement the observational map; no such permission is
assumed and no synthetic cloud detail is currently used. If reconstruction is
chosen, disclose it beside the observational sources and do not present its
features as measured. If not, continue with higher-quality source registration
and an improved photographic material rather than inflating the rubric score.

Only after the visual target and the user's approval: promote the Saturn policy,
create its reviewed full-ring thumbnail, update public provenance/method copy,
and enable automatic motion with reduced-motion and frozen-capture behavior.
Do not reintroduce rotation settings. Continue H5 before the remaining H4 planets.

### Current GPU benchmark

The clean serial run after builds used headed Chromium 151, Apple M4 / ANGLE
Metal, DPR 1, 30 warm-up frames and 300 measured frames per case. All eight cases
ran at approximately 120 fps. Desktop GPU p95: portrait 3.55 ms, high 6.15 ms,
balanced 6.26 ms, safe 5.31 ms. Mobile-layout GPU p95 on the same Mac: portrait
1.74 ms, high 3.22 ms, balanced 3.20 ms, safe 3.28 ms. CPU p95 was at most 0.80 ms.
The ringshine samples increase GPU cost relative to the initial review; the
sampled Mac still meets 60 fps. This does not establish physical-phone performance,
sustained thermal behavior or device GPU-memory residency. Evidence: current
`hardware.json`, zero browser errors. Both runtime derivative hashes were checked
against their adjacent provenance JSON records after the final asset generation.

## H5 promotion handoff — user approval, 16 September 2026

The user viewed `scripts/hybrid-review/saturn.html?revision=observational-v1`
and said: **“yes, that looks really good You can proceed”**. This explicitly
accepts the displayed observational-v1 candidate and authorizes local promotion.
The renderer, source pixels, shot, lighting and material calibration are unchanged
from that comparison. No generated cloud features were added. The historical
agent scores (90.00 desktop / 92.15 mobile layout) remain recorded; user visual
acceptance supersedes the promotion hold, without inventing a numerical 95 score.
The 95 target remains the requirement for subsequent unapproved migrations.

### Production behavior and provenance

- `renderingPolicy.saturn` is now an accepted globe. The original portrait and
  review override remain available for rollback; other objects are unchanged.
- The globe rotates automatically beneath its fixed equatorial rings. The sourced
  38,018-second period (10h 33m 38s) gives a 316.817-second turn at disclosed 120×.
  Reduced motion and hidden tabs suspend it without catch-up; exports freeze
  one pose. Product rotation settings remain absent for Saturn and Jupiter.
- Public object/editorial/method copy, asset manifest and attribution IDs now
  identify the Cassini/Hubble reconstruction and separate Cassini/Voyager rings.
  `thumbs/saturn-globe-v1.webp` is rendered from this approved geometry, with full
  rings and padding. The original portrait thumbnail remains on disk.
- Multi-epoch imagery, interpolation, approximate polar registration, authored
  colour/light, weak perspective and approximate indirect light are still
  disclosed. Surface source hash remains
  `d913a5610933037d047de2449986b7975cf11a8dd5895109f657aee713296f98`.

### Promotion verification

Evidence: `tmp/hybrid-h5/promoted/` (local, ignored; preserve alongside the
observational-v1 quarter-turn/quality/transition evidence).

- `NUXT_IGNORE_LOCK=1 npm run verify` with Node 24: type checking, **278 tests in
  51 files**, and production build passed. `npm run generate` rendered **35 routes**.
  `git diff --check` passed. Production globe/ring fade tests now supplement the
  retained portrait rollback tests; conservative full-ring framing checks pass.
- `PERIGEE_OBJECT=saturn PERIGEE_OUTPUT=tmp/hybrid-h5/promoted node
  scripts/hybrid-review/rotation.mjs`: default 120× spin, fixed pole/rings/light,
  internal pause/real time, hidden/resume, reduced motion, frozen multi-tile export
  and absence of product rotation settings passed, with zero browser errors.
- `node scripts/hybrid-review/saturn-promotion.mjs`: actual built application
  loaded the observational surface and rendered full-ring Saturn at 1440×900 and
  390×844. Actual **Capture / Save image** downloads were **7680×4800** desktop and
  **3549×7680** mobile layout. Both complete images and surface/ring detail crops
  were inspected. No browser errors. A separate moving-pose 4K export also passed.
- Production reference versus approved observational-v1: mobile pixels identical;
  desktop mean absolute RGB difference **0.0000144**, maximum **1** on a 0–255
  scale. This checks promotion fidelity, not a visual-quality percentage.
- The previous complete quarter-turn, three-quality-tier, transition, lease,
  cancellation, export-parity and Apple M4 benchmark evidence remains applicable:
  this promotion did not change materials, geometry, maps or shot calibration.
  Do not overwrite the original portrait or historical failed candidates.

### Limitations and next steps

Mobile evidence is a **resized desktop Chromium layout on Apple M4**, not a
physical-phone test. Phone GPU, thermal behavior, physical pinch and additional
browser/device acceptance remain unverified. Source-resolution and reconstruction
limits remain visible in high-resolution detail and documented above.

Saturn H5 is locally promoted after user approval. Remaining H4 planets (Mars,
Neptune and Moon) are next when requested, reusing these lifecycle, clock and
capture contracts. Retain the Moon's Earth-facing behavior and source/audit each
period before enabling spin. No commit, push or publication was performed.

## Pre-approval Neptune handoff — review-v9, 17 September 2026

Neptune remains review-only. Its approved portrait, thumbnail, public descriptions,
calculated diameter, presets and framing remain production defaults. Mars,
Jupiter and Saturn remain approved and unchanged. No commit, upload or publication.

The first review-v2 handoff did not finish the requested visual refinement.
The continued work now has cleaner dated Voyager cloud structure, a separately
rendered fixed-pole molecular haze, deeper wavelength-dependent lighting and
explicitly modelled fine zonal texture across the otherwise blank hemisphere.
The final v4 map also corrects the grain mismatch exposed by v8 quarter-turn
exports. No portrait pixels are wrapped around the globe and no new discrete
storms are generated. **Modelled bands are reconstruction, not observations.**

Compare at http://127.0.0.1:4318/scripts/hybrid-review/neptune.html.
Candidate `review-v9` has matched desktop/mobile-layout reference views, quarter
turns, quality tiers, presets, poles and actual 4K/8K exports. The fixed portrait
is unchanged. The plan's weighted rubric is recorded independently for both
layouts in `docs/neptune-hybrid-review.md`. **95% acceptance requires the user's
visual judgement; no numerical score or test-derived acceptance is asserted.**
Do not promote until that approval is explicit.

Source: NASA/JPL PIA01492, August 1989, approximate disc registration and removal
of baked lighting; PIA00058 supplies a small close-up at its captioned 29°N with
explicitly approximate longitude/projection. PIA01492 support remains 24.668% of
spherical area (12.555% at full weighting); these percentages do not describe
pure observational coverage of the final image. Separate masks, source hashes,
model seed and all reconstruction weights accompany
`neptune-voyager-reconstruction-v4.webp`. The 2048×1024 output is a sampling grid,
not new source resolution. The enhanced source blue is not treated as calibrated
colour. Irwin 2024 informs an authored natural-colour approximation; the RGB
atmospheric coefficients are not spectral calibration. A restricted CC BY-NC-ND
mosaic was researched and excluded. Full source/rotation audit and limitations
are in `docs/neptune-hybrid-review.md` and the attribution record.

The 57,996-second prograde bulk map period gives a 483.3-second turn at 120×.
A rigid map cannot represent differential winds or time-evolving weather.
The existing lifecycle, deterministic clock, fixed pole/Sun, reduced motion,
explicit suspension and frozen captures remain shared. No rotation settings.

Node 24 checks passed: typecheck, 289 tests / 53 files, production build and
35-route static generation. Both browser matrices have zero shader/browser
errors; high/balanced/safe, reference/quarter turns, all presets, poles, fades,
cancelled transitions, deterministic motion and frozen moving 8K captures pass.
All four production references (Mars, Jupiter, Saturn and Neptune) are
pixel-identical on both layouts. Source wrap differs by at most one 8-bit level,
and both polar rows are uniform. Evidence: `tmp/hybrid-h4-neptune/review-v9/`.
The independent rubric is qualitative; these checks do not grant visual acceptance.

Physical-phone, thermal, touch and other-browser testing remain pending.
390×844 is desktop Chromium resized to a mobile layout, not a physical device.
A native tab-hiding experiment did not change `document.hidden` in automated
Chromium, so native visibility delivery remains unverified; explicit scene
suspension is tested and the existing visibility handler remains connected.

After approval only: promote the selected Neptune globe, enable public automatic
rotation, regenerate its thumbnail and update active public descriptions/source
IDs to disclose the dated clouds and modelled reconstruction. Moon remains the
other H4 migration; preserve its Earth-facing policy.

## Approved Neptune promotion — 17 September 2026

The user answered **“I approve”** to the review-v9 comparison and promotion
question. This is explicit acceptance of the desktop and mobile-layout visual
review, including the 95% target; it is not a computed quality score.

Neptune now defaults to the accepted oblate globe and rotates automatically at
120×: 57,996 seconds per bulk turn, displayed in 483.3 seconds (about 8.1 minutes).
There are no rotation settings. The deterministic clock, fixed pole/Sun, reduced
motion, suspension and frozen capture remain shared with the approved planets.

The accepted v4 map, surface/atmosphere shaders, pole, light, exposure, physical
size and framing are unchanged. The original portrait and review-v9 evidence
remain the fixed comparison and rollback reference. A new 320×320 WebP thumbnail
is rendered from an actual 4K export of the accepted globe. Object metadata,
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



## Moon H4 review handoff — 17 September 2026

The selected review-v5 globe retains the Moon's Earth-facing policy. No 120×
independent Moon spin, public rotation settings, phase/orbit animation or libration
simulation is added. The original portrait, public description, thumbnail,
3474.8 km diameter and framing remain active. The next step is explicit user
visual approval of the concrete desktop/mobile comparison, not automatic promotion.

[Open the comparison](http://127.0.0.1:4318/scripts/hybrid-review/moon.html).
[Full source audit, independent weighted rubric and verification](moon-hybrid-review.md).
The existing NASA SVS 2025 LROC color and LOLA elevation pair was checked for
hashes, coordinates, units, radius and registration. All 675 derivatives match;
measured regolith/terrain is distinguished from polar reflectance infill,
grid interpolation and authored display photometry. No craters or rays are invented.

Refinement corrected brown observer attenuation, excess exposure, reference
lighting/pole alignment and highlight clipping. A magnified diagnostic exposed a
DEM-shadow mip seam; Moon-only explicit LOD sampling removes it. A Moon-only
lifecycle light override keeps its Sun fixed while outgoing during object fades.
No approved globe material, source map, shot calibration or clock policy changed.
The four approved globes and Moon portrait are pixel-identical to preserved
production references on both layouts. Automated evidence does not confer 95%
visual acceptance; no numerical quality score is invented.

Node 24.15.0 verification: typecheck, 293 tests / 54 files, production build and
35-route static generation pass. Browser matrices, actual 4K/8K outputs, native
crops, quarter turns, poles and measured-terrain stress exports are retained under
`tmp/hybrid-h4-moon/review-v5/`; the source baseline is alongside them. Mobile is
resized desktop Chromium, not a physical phone. Full limitations and exact
browser/product results are in the Moon document.

After explicit approval only: promote the selected Moon policy, keep its
observer-relative period null, render a new thumbnail from the accepted globe,
update active public descriptions/source IDs and repeat promotion-specific checks.
Preserve the portrait for rollback. No commit, upload or publication was made.


Moon v5 continuation: the user challenged the premature v4 stop and requested
continued refinement. Two controlled reflectance/photometry studies and a fresh
hash-verified LOLA normal study led to bounded source-only local contrast and a
more diffuse lighting balance. Runtime source assets, height scale, Sun, pole,
phase and framing remain unchanged. The agent now assesses the target as met
independently on desktop and mobile layout; this is subjective visual judgement,
not an invented metric or user acceptance. The portrait remains production-active.
See the v5 assessment and source limitations in `docs/moon-hybrid-review.md`.


## Approved Moon promotion — 17 September 2026

The user explicitly approved v5 (“I approve it”). Moon now defaults to the
accepted Earth-facing globe, with no automatic 120× spin. Its accepted rendering
is unchanged; an 8K-derived thumbnail, active descriptions and LROC/LOLA credits
replace the portrait-facing metadata. The original portrait remains available
through the explicit rollback selector. This completes H4; later stellar and
galaxy work remains separate. Verification and source limitations are recorded
in `docs/moon-hybrid-review.md`. No commit, upload or publication was performed.

Moon promotion verification passed: 293 tests, typecheck, production build and
35-route static generation, plus desktop/mobile production Capture/Save, fixed
Earth-facing pose, reduced motion and uncropped thumbnail checks. Production Moon
and all four approved planet reference images are pixel-identical to their
accepted baselines. See `tmp/hybrid-h4-moon/promoted/`. Physical phones remain
untested. No commit, upload or publication.
