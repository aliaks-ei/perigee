> **Approved and locally promoted, 17 September 2026.** The user explicitly
> answered “Meets the target — approve Mars” after reviewing display-v6 for both
> layouts. The development record below is retained; the promotion handoff is
> at the end. This records user acceptance of the 95% target, not an automated score.

# Mars H4 display and terrain refinement

17 September 2026. Review-only continuation after observational-v3. The approved
portrait remains the fixed production reference. No promotion, thumbnail change,
commit or publication is authorized by this work. The 95% gate requires the
user's visual judgement; this document does not manufacture a numerical score.

## Changes

The previous globe sent an already photographic display composite through AgX.
This reduced its color separation and apparent relief. Mars now reuses the
existing display layer after scene tone mapping, while retaining real geometry,
MOLA displacement/shadows, surface rotation and view/body-space sunlight.
Jupiter and Saturn continue through their approved HDR materials unchanged.

The display layer clears its own depth before drawing the globe, so an HDR
composer buffer's previous depth cannot punch holes in it. Detail tiles inherit
the base surface's layer. Still capture uses a bounded half-float display target
with depth, blends signed detail corrections in linear light and encodes sRGB
only afterward. The additional target is tile-sized, never an 8K full-frame
buffer. Non-display-globe captures retain the existing path. Failure and abort
checks cover disposal/restoration with and without the extra target.

The local `mars-observational-v3` pyramid replaces v2. It removes the additional
MDIM high-pass contrast contribution that produced chalky ridges. Native Viking
fine detail uses a bounded 0.55–1.65 ratio with exponent 0.45 (previously 0.65).
MDIM remains the polar-color source, blended over 68–78° absolute latitude.
The 2K base, 672 bordered 4K/8K/16K tiles, source widths, geographic coordinates
and original MOLA heights are unchanged. Both earlier source trees and their
comparison evidence remain available. The new tree has not been uploaded to R2.

The source acquisition, rights, coverage and reprojection audit in
[mars-hybrid-refinement.md](mars-hybrid-refinement.md) still applies. HRSC color,
TES broad brightness and older Viking photographic luminance remain a
multi-epoch display reconstruction, not calibrated contemporary RGB albedo.
Upstream interpolated gaps have no supplied coverage mask; no invented observed
percentage is reported. Photographed shadows and residual upstream sharpening
remain. No generated geography, painted cap or exaggerated height is introduced.

Selected authored settings: exposure 1.8, luminance contrast 2.2, saturation 0.85,
bright-terrain linear tint (1.06, 0.98, 0.87), restrained cooler dark-terrain
balance, Lambert fraction 0.4, illumination exponent 2.2. The MOLA normal response
is 0.6 times physical slope (not amplified). Atmospheric optical depth is 0.022,
scattering gain 1.6 and scale height remains 11 km. This is an approximate
single-scattering model, not a measured weather solution.

The stable authored pole has pitch 0.4 rad and roll −0.18 rad; initial phase is
−0.25 rad and fixed world-space Sun is proportional to (−0.65, 0.2, 1). This gives
a clearer cap and upper-left illumination. Diameter 6,779 km, flattening 0.00589,
camera, presets, placement, background and framing are unchanged. These shot
coordinates are not an ephemeris. The existing 88,642.44-second sidereal period,
automatic 120× clock, reduced motion, pause lifecycle and frozen captures remain
in use. There are no public rotation controls.

## Additional source research and rejected alternatives

- [Tianwen-1/MoRIC dataset description](https://jmars.asu.edu/node/2891) and
  [Liu et al. (2024)](https://doi.org/10.1016/j.scib.2024.04.045): evaluated a
  4096×2048 derivative of the 76 m global mosaic via CDS HiPS. Its native spatial
  resolution does not mean the tested 4K derivative contains 76 m detail. It did
  not improve the fixed-pose visual comparison. CDS's ODbL database notice does
  not by itself license original image contents; original-image redistribution
  terms were not established. No Tianwen imagery is included in runtime assets.
- [MGS/MOC PIA04268](https://www.jpl.nasa.gov/images/pia04268-a-mid-northern-summersouthern-winters-mars/):
  tested cloud extraction from six synthetic views made from 14 February 2003
  global observations. Approximate registration and blue-excess extraction also
  picked up surface features and visible mosaic boundaries. Rejected. The
  processed MSSS image has its own reuse policy; it was not labeled public domain.
- [Hubble PIA01588](https://science.nasa.gov/photojournal/a-closer-hubble-encounter-with-mars-global-view/):
  tested a Mollweide-to-cylindrical cloud-mask reconstruction from the 1999
  observational map. Southern coverage below about 60°S is absent. The acquired
  derivative was 900×450 JPEG despite a TIFF-named dynamic URL. Thresholding
  confused some surface/ice structure with clouds and produced a conspicuous
  southern band. Rejected. No Hubble pixels or extracted cloud masks are active.

The experiments remain in ignored `tmp/hybrid-h4-mars/`. No new cloud layer was
selected merely to imitate the portrait. Its absence is a remaining difference
from the reference, not evidence that Mars has no water-ice clouds.

## Evidence and visual rubric

The selected evidence directory is `tmp/hybrid-h4-mars/display-v6/`. Earlier
`display-v4`, `display-v5`, material, pole, atmosphere and source studies remain separate.
Mobile layout means resized desktop Chromium, not a physical phone.
The comparison page provides full-frame views and same-scale 4K crop previews;
its linked 4K/8K PNGs contain the actual full-resolution outputs.


| Dimension | Weight | Desktop assessment | Mobile-layout assessment |
| --- | --- | --- | --- |
| Detail and features | 30% | Olympus/Tharsis, Valles Marineris, albedo and caps are recognizable; removing the extra MDIM contrast reduces chalky ridges. Native export detail remains observational. The portrait has larger, differently arranged illustrative calderas. | Volcanoes, canyon and regional dark terrain remain legible at the same size. Quarter turns retain identity; the illustration's calderas remain more conspicuous. |
| Lighting and depth | 25% | Display-layer rendering preserves separation lost through AgX. A more frontal fixed Sun restores the full illuminated-disc impression. Baked photographic shading remains a relighting limitation. | Corrected phase avoids the narrow impression of the earlier pass. Local terrain contrast remains gentler than the illustration. |
| Color | 20% | Rich ochre/gold and subdued dark terrain survive live and saved rendering; caps retain cream/white. This is an authored display balance, not a true-color calibration. | Golden dust and dark regions remain distinct, without the previous overall pale tone. The reference's palette still differs. |
| Silhouette, limb and atmosphere | 15% | Continuous thin haze and physical oblateness; pole views show observed cap structure without a radial seam. Polar imagery retains upstream contrast and interpolation. | Fuller disc, soft limb and readable cap, with unchanged physical size. No extra cloud field masks surface differences. |
| Composition and impression | 10% | Same camera, placement, background and calculated scale; comparison captions now align the two frames even when text wraps. | Same camera/framing and complete body. This is a responsive-layout comparison, not phone hardware evidence. |

No numerical quality score is assigned. These findings support direct visual
review against the fixed portrait; they do not establish 95% through tests or
pixel similarity. The portrait's commissioned illustration and the observational
map retain different local relief and atmospheric structure. The baseline is
neither replaced nor downgraded. User visual approval remains required before
promotion; no acceptance is inferred from the request to continue improving.

## Verification of the selected candidate

- Node 24.20.0: `NUXT_IGNORE_LOCK=1 npm run verify` passed type checking,
  **285 tests in 52 files**, and the production build. `npm run generate`
  completed **35 routes**. `git diff --check` passed.
- Matched 1440×900 desktop and 390×844 mobile-layout images: reference and
  90°/180°/270° views, balanced/safe tiers, near/real presets, fades, replacement,
  cancellation, reduced motion and automatic rotation. Zero browser/shader errors.
- Both poles inspected in actual 4K captures; exported 8K source-pixel crops
  inspected for tile edges and texture/terrain artifacts. Fine source shading and
  bright cap contrast remain visible limitations, not hidden by rescaling.
- Actual 4K outputs: 3840×2400 desktop, 1774×3840 mobile layout. Actual 8K:
  7680×4800 and 3549×7680. Live versus downsampled 4K hero RGB mean absolute
  differences: **1.195** and **1.340** out of 255; largest mean channel bias
  **1.115**. These are capture-pipeline diagnostics, never quality percentages.
- Moving 8K exports used one frozen time across **162 desktop / 130 mobile**
  pose applications and preserved the clock through the transaction. Capture
  detail reached 4K desktop / 8K mobile, with at most **28 / 32 resident tiles**.
  The default desktop high-DPI reference remained within the 2K LOD threshold;
  that particular reference run does not establish desktop tile replacement.
- Exact approved-body regressions: public Jupiter, Saturn and Mars have maximum
  RGB difference **0** from the archived pre-Mars screenshots on both layouts.
- Headed Chromium 151, ANGLE Metal **Apple M4**, 30 warm-up plus 300 sampled frames:
  approximately 120 fps. High/balanced/safe GPU p95: **3.690/3.901/3.061 ms** desktop,
  **3.014/2.351/2.685 ms** mobile layout; CPU p95 no more than 0.5 ms for the globe.
  These short local measurements do not establish phone thermals or frame rates.
- Rebuilt production app: actual Capture → Save image succeeded on both layouts,
  downloading the real 8K dimensions above. Mars remained the portrait and the
  rotation settings were absent. Downloaded PNGs were opened and inspected.
- Native hidden-tab event delivery remains unverified in this automation setup;
  explicit pause/resume and reduced motion were verified. Physical phones,
  touch/pinch and other browsers remain untested. Do not label resized desktop
  results as physical-device acceptance.

Logs use `tmp/hybrid-h4-mars/display-v6-*.log`. Browser records, parity metrics,
regression images and hardware measurements are in `display-v6/`; actual product
saves are in `display-v6-production/`. The new runtime pyramid is 29,228,594 bytes
across 673 image files, with hashes in its provenance JSON.


Additional source-resolution verification: `mars-export-quarters.mjs` saved actual
7680×4800 PNGs at 90°, 180° and 270°, each reaching the 4K tile level with at most
28 resident tiles and no loading/browser errors. Export crops were inspected;
no tile-border discontinuity was found. A separate near-pass streaming assertion
was rejected as a test setup error: the 96,000 km preset is farther away than
close-pass and legitimately needs only the 2K base. No production change was made
to force higher LOD or change framing merely to satisfy that assertion. The real
8K exports provide the higher-resolution evidence instead.

After the user's visual approval: promote only the selected Mars renderer,
regenerate the thumbnail from its frozen reference, update public descriptions
and credits, then repeat promotion-specific browser/regression checks. No commit,
publish, asset upload or alteration of approved Jupiter/Saturn is authorized.


## Promotion after user approval

The user explicitly accepted display-v6 as meeting the 95% target on both layouts
and authorized promotion. The selected material, map, pole, Sun, camera, diameter
and framing were promoted unchanged. Mars now defaults to the globe and rotates
automatically at the existing 120× rate, with no product rotation settings.
`globe-pilot` remains frozen for comparison; explicit `portrait` remains rollback.

The object record selects the active observational base and source credits.
`mars-globe-v1.webp` is a 320×320 thumbnail rendered from the frozen approved globe.
The object description, science sources and public method page now explain
Viking/HRSC/TES/MOLA provenance, interpolated gaps, inherited shadows, authored
color/haze and the non-simultaneous imagery. Public copy discloses Mars's 24.6229-hour
sidereal period and about 12.3 minutes per turn at 120×.

No commit or publication was made. The new 29.2 MB source pyramid is present
locally and reproducible, but remains in the ignored planet-assets tree and is
not yet in the R2 restoration bundle. A future authorized release must include
that delivery work; this session does not claim a clean checkout can download
this new pyramid from R2. Existing original assets and portrait rollback remain.

### Promotion verification

- `npm run verify`: typecheck, all 285 tests across 52 files, production build
  passed. `npm run generate`: 35 routes passed. `git diff --check` passed.
- `mars-promotion.mjs` exercised the generated application on port 3010 and the
  production renderer harness. Desktop 1440×900 and mobile layout 390×844 passed
  automatic 120× spin, stable pole/Sun, reduced-motion freeze and absence of
  rotation settings. Browser errors: zero. The reduced-motion check waits for
  the browser's asynchronous media event before sampling the frozen pose.
- Actual product Capture → Save downloaded desktop 7680×4800 and mobile-layout
  3549×7680 PNGs. Saved images were opened and inspected; the earlier display-v6
  native-resolution tile/quarter-turn evidence remains applicable unchanged.
- Both production Mars reference images match the user-approved display-v6
  frozen view exactly (maximum RGB difference 0). Jupiter matches the pre-Mars
  archive exactly on both layouts. Saturn matches exactly on desktop; its mobile
  comparison has maximum RGB difference 1/255 and mean 0.0000213/255. These are
  regression diagnostics, not numerical visual acceptance scores.
- Generated Mars editorial/method pages contain the new scientific description
  and time-lapse disclosure. The emitted thumbnail matches the source bytes and
  is referenced by the client bundle; the static editorial page itself does not
  include the selector thumbnail.
- Evidence: `tmp/hybrid-h4-mars/promoted/production-results.json`,
  `promotion-pixel-regressions.json`, full product captures and browser screenshots;
  logs `promotion-verify.log`, `promotion-generate.log`, `promotion-browser.log`.

The next object remains a separate H4 migration (Neptune or Moon). Physical-device
and cross-browser testing, native hidden-tab event delivery, and future asset
restoration packaging remain explicit limitations; no publication occurred.
