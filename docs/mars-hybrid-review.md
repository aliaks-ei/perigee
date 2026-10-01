> Superseded candidate: see the [observational refinement](mars-hybrid-refinement.md)
> for the current renderer, source provenance and evidence. This first review is retained.

# Mars H4 review handoff — 17 September 2026

**Review only; not approved or promoted. The 95% visual-quality gate is not met
by the current qualitative assessment.** Production Mars retains its fixed
portrait, thumbnail and descriptions. Jupiter and Saturn remain approved,
automatically rotating globes. No commit, push or publication was made.

Open [the local comparison](http://127.0.0.1:4318/scripts/hybrid-review/mars.html)
with `node scripts/hybrid-review/serve.mjs` running under Node 24. The comparison
includes desktop/mobile layouts, reference/quarter turns, balanced/safe tiers,
near/real distances, actual 4K/8K PNGs and a live 120× review. This is a developer
harness, outside the product routes. Its evidence lives in ignored
`tmp/hybrid-h4-mars/`, so another checkout must reproduce it.

## Preservation and implementation

Before edits, the complete tracked/untracked source was archived in
`tmp/hybrid-h4-mars/starting-source.tar.gz`; `starting-hashes.json` records it.
The original H0/H5 evidence was not overwritten. `pass1/` preserves the first
inspection and `final/` the bounded confirming pass. The fixed portrait renders
are pixel-identical before/after at both layouts. Exact pre-Mars/current engine
comparisons also show **zero maximum RGB difference** for production Mars,
Jupiter and Saturn at both layouts (`approved-regressions.json`). A comparison
against older H2 Jupiter images initially differed slightly; the exact starting
source fixture establishes the appropriate regression baseline.

`RenderingReview.mars` accepts `portrait`, `globe-pilot` or `globe-motion`.
The factory reuses the existing placement → fixed pole → spin → oblate surface,
`CelestialObject`, texture leases, `PlanetTiles`, `CelestialClock` and frozen
still pipeline. Three texture acquisitions settle together, releasing successful
siblings after failure/cancellation. Disposal remains idempotent.

`MarsGlobeMaterial` specializes the existing rocky shader. It adds no generated
surface features, sharpening or portrait projection. Physical MOLA slopes are
attenuated to 0.65 to avoid doubling the source's photographed relief. Relief
uses the existing 600–1500-pixel ramp, with no height exaggeration; safe disables
displacement/shadows. An authored linear RGB gain (1.35, 1.03, 0.73), exposure
3.7, illumination exponent 1.6 and optical-depth parameter 0.016 shape the dusty
ochre palette and thin, Sun-lit haze. These are display choices, not calibrated
reflectance or a radiative-transfer atmosphere. The same color transform applies
to the base and signed detail corrections, preserving export/tile consistency.

The current 6,779 km diameter, distance presets, camera, background and placement
are unchanged. Polar scale is 0.99411. The existing mean-diameter display anchor
and MOLA's 3,396.19 km terrain normalization are retained: this is a small datum
approximation, not a revised apparent-size model. No silhouette or framing change
was used to conceal lower detail. The globe's perspective and oblate outline
differ slightly from the camera-facing circular artwork.

## Imagery, terrain and licensing audit

- [USGS/NASA Ames Viking MDIM 2.1 colorized mosaic](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m):
  simple cylindrical, planetocentric, east-positive, −180…180° longitude,
  −90…90° latitude. USGS reports gap-free coverage assembled from roughly
  4,600 images. The **actual imported derivative is 21,339×10,670, about 1 km/pixel**;
  the 92,160×46,080 / 232 m master was not imported. Source color is warped and
  blended over MDIM terrain imagery. Photometric correction, tone matching and
  roughly 50 km high-pass processing retain topographic shading; this is not
  neutral albedo. USGS lists public domain, no use constraints. Existing credits
  identify NASA Ames / USGS and Viking observations.
- The unchanged runtime version `1b448275b234` has a 2048×1024 base and bordered
  4096/8192/16384 color tiles. All **675 Mars derivatives** match their recorded
  SHA-256 values; aggregate file bytes are 76,341,660, not GPU residency or initial
  download. Color-source SHA-256:
  `fdfcd335559c3dc67052b7e8a9565d850e336ac0d1f3ea7f5eb7826ffb44ecb2`.
- [NASA/JPL MOLA MEGDR](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html):
  the existing `megt90n000eb.img` is a 5760×2880, signed big-endian 16-bit,
  16-pixel/degree topography grid in metres above the areoid. The recipe rolls
  0…360°E into −180…180°E and resamples to 4096×2048. Heights use lossless packed
  RG16; normals are lossless, non-color data. Decoded runtime heights span about
  −8,140 to +21,151 m, within the encoded −12,000…24,000 m bounds. Source SHA-256:
  `d18d9b9ab8c5516d02e157dd2cde0f1d0d160c21940e953ba22391269a545e7b`.
- [MOLA's archive description](https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/catalog/megdrds.cat)
  identifies 1997–2001 observations, east-positive planetocentric coordinates and
  off-nadir observations above 87° at both poles. Gridded data must not be equated
  with an observation at every texel; [PDS describes interpolation between tracks](https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/MGS/MOLA/Intro.htm).
  The exact interpolation fraction for this imported 16-pixel/degree derivative
  has not been established because its observation-count map was not imported.
  The current maintained archive moved to PDS4 in August 2026; no source was
  silently replaced. Existing NASA public-data licensing/credits remain applicable.

Both ice caps are present in the color source. No new polar infill was painted.
The existing terrain recipe averages each endpoint row and sets pole normals to
radial; both endpoint height ranges are exactly zero. Those endpoint values,
resampling and upstream interpolation are reconstruction, not new observations.
The JPEG has no per-pixel acquisition/coverage mask, so no numerical percentage
of observed versus reconstructed color pixels is asserted. The date/season of
individual polar pixels is not established. Polar ice and the bright Hellas
cloud/haze feature are fixed in a multi-image mosaic; embedded cloud brightness
rotates with the map. This is not current weather or seasonal ice simulation.

Longitude uses hardware repeat and bordered tiles; normals and heights share
that map frame. The source edge has a mean RGB difference of 10.32/255 across
the first/last columns: coverage is complete but photometry is not seamless.
No open geometry crack or shader meridian line was observed in the inspected
quarter turns/poles. Residual source tone joins and baked crater shading remain
visible limitations, particularly in high-resolution views. Neither source master
is retained locally; their recorded hashes and current runtime derivatives were
audited, rather than claiming a fresh hash of unavailable masters.

## Rotation and illumination

[NASA's Mars fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)
gives a **24.6229-hour sidereal period**, distinct from the 24.6597-hour solar day.
The motion record uses 88,642.44 seconds. At the existing disclosed 120× multiplier,
a turn takes **738.687 seconds** (12 min 18.687 s). Local +Y is north, rotation is
right-handed/prograde, and the east-positive map convention is retained. The
physical period is separate from the presentation multiplier.

The reference phase is −0.5 rad, pole pitch 0.6 rad, roll −0.08 rad, and scene Sun
is proportional to (−1.15, −0.05, 1). These are authored shot coordinates, not
NASA pole RA/declination, obliquity substituted as a camera tilt, or an ephemeris.
Only surface longitude changes; the pole and world-space illumination remain
fixed. Body-space sunlight follows the spinning terrain frame. Hidden tabs,
reduced motion and captures reuse the approved clock. The review page now mirrors
`PerigeeShell` visibility suspension. No public rotation settings were added.

## Independent visual rubric

The portrait remains baseline 100. **No numerical score is assigned or fabricated.**
Tests, timing and pixel metrics are not evidence of subjective 95% acceptance.

| Dimension | Weight | Desktop 1440×900 | Mobile layout 390×844 |
| --- | --- | --- | --- |
| Detail/features | 30% | Tharsis, Valles Marineris and cap are recognizable; canyon relief and dark albedo contrast fall visibly short of the artwork | Major features survive, but the canyon loses more definition at this size |
| Lighting/depth | 25% | Stable terminator and retained shadow detail; lacks the reference's luminous highlights and depth | Coherent illumination, flatter overall impression |
| Color | 20% | Dusty ochre remains natural-looking, but more uniform and less golden than the portrait | Distinct Mars identity, less tonal variety |
| Silhouette/limb/haze | 15% | Clean oblate globe, thin haze, visible cap; harder and less luminous limb | Full outline and cap survive; weaker bright rim |
| Composition/impression | 10% | Same camera, scale and background, with lower visual presence | Same framing, reduced presence due to flatter contrast |

**Neither layout is cleared for the 95% gate.** The first inspection found a
poorly exposed cap and flat illumination. One calibration batch changed the
reference pose/light and a confirming pass retained the current candidate.
The generated portrait exaggerates/rearranges detail relative to observational
data; its quality baseline was not lowered to excuse the remaining visual gap.

Inspect `*-comparison.jpg`, `*-inspection.jpg`, `pole-inspection.jpg`, actual
`*-globe-4k.png`/`*-globe-8k.png` and their native-detail crops. North/south pole
diagnostic views deliberately change the review pole to expose both caps; they
are not additional production poses. Near/real and tier images retain the same
reference pose. Real-distance Mars is correctly tiny at the calculated scale.

## Verification evidence

- Node 24 `NUXT_IGNORE_LOCK=1 npm run verify`: type checking, **282 tests in
  52 files**, production build passed. Separate `npm run generate`: **35 routes**.
  `git diff --check` passed. New tests cover review-only policy, sidereal timing,
  fixed pole/world light, body-relative terrain lighting, deterministic review,
  disposal and failed sibling acquisition. Existing Jupiter/Saturn tests pass.
- `mars.mjs`: both layouts, reference and quarter turns, high/balanced/safe,
  near/real, phase continuity, pause/real-time review overrides, suspension,
  partial fades, rapid Mars/Moon/Jupiter replacement, cancellation and restored
  export state. Zero browser/shader errors; final outgoing set empty.
- Actual review exports: **3840×2400 / 7680×4800 desktop**, **1774×3840 /
  3549×7680 mobile layout**. 4K/live crop RGB mean absolute differences are
  **1.163/255 desktop and 1.313/255 mobile**, maximum channel mean bias 1.066/255.
  These are compositing diagnostics, not quality scores. Color/terrain resolution
  legitimately increases in saved views.
- `mars-details.mjs`: both poles, bounded high-DPI longitude changes and moving
  8K captures. Moving captures used exactly one instant across **162 desktop /
  130 mobile** pose applications and restored the same clock at completion.
  The first harness incorrectly sampled after asynchronous PNG conversion;
  recording at export resolution fixed the assertion without changing the engine.
- Live DPR1 uses the 2K base. High-DPI mobile-layout turntable selected 4K tiles;
  8K exports reached 4K detail on desktop and 8K on mobile layout, with at most
  24/32 resident tiles. No tile failures. A 16K asset ceiling is **not** a claim
  that these views sampled 16K. Desktop DPR4 request was capped at 3.578 by the
  existing pixel budget; its live turntable remained at the 2K level.
- `mars-production.mjs`: the built application loads the original portrait,
  exposes no rotation settings, and its actual **Capture → Save image** downloads
  are 7680×4800 desktop / 3549×7680 mobile. Captures were opened and inspected.
- `mars-regressions.mjs`: exact archived-start/current production images of
  Jupiter, Saturn and Mars are pixel-identical on both layouts. The comparison
  page's layout/view controls load the corresponding evidence without errors.
- Real OS/browser visibility verification remains **unverified**: automated
  Chromium did not expose `document.hidden` after switching tabs or minimizing
  its test window, including with its backgrounding overrides removed. The
  explicit scene pause/resume and reduced-motion checks passed; they must not be
  described as a successful real hidden-tab event test. `mars-visibility.mjs`
  records this platform limitation separately from engine failures.
- Bounded headed Chromium 151 on **Apple M4 / ANGLE Metal**, 30 warm-up and 300
  measured frames: approximately 60 fps. Desktop globe GPU p95: high 4.60 ms,
  balanced 3.08 ms, safe 4.31 ms; mobile-layout high 4.60 ms, balanced 4.59 ms,
  safe 5.04 ms. Timing variation means this short run does not rank tiers.
  CPU p95 ≤0.70 ms. `hardware.json` preserves the complete measurements.

Mobile evidence is resized desktop Chromium, **not a physical phone**. Phone GPU,
thermal behavior, physical touch/pinch and other-browser acceptance remain open.
Resource estimates are not measured GPU residency. The source/lighting limits
remain even though technical checks pass.

## Next step and promotion boundary

Use the concrete comparison for visual review. The current candidate should not
be promoted as a 95% match. A subsequent bounded refinement should investigate a
better broad-albedo/color source and more convincing thin-limb scattering while
retaining physical relief, rather than sharpening MDIM or inflating its mountains.
Record any source change and repeat matched desktop/mobile acceptance.

Only after explicit user approval: promote Mars, enable its sourced period through
the existing automatic 120× policy, regenerate its thumbnail from the accepted
renderer, and update public descriptions/method/credits. Preserve the portrait for
rollback. Do not add rotation settings, migrate another body, commit or publish
without the corresponding instruction.

Reproduce with `PERIGEE_PLAYWRIGHT_MODULE` pointing to an installed Playwright
module, the review server on 4318 and generated app on 3010. Run `mars.mjs`,
`mars-details.mjs`, `mars-production.mjs`, `mars-benchmark.mjs`,
`mars-regressions.mjs` and `mars-visibility.mjs` serially. `mars-compare.py` needs
Pillow/numpy. The pre-Mars regression fixture is the extracted starting archive;
do not substitute a later renderer for it.
