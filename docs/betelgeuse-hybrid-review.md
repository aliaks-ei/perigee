# Betelgeuse H6: approved stellar globe

## Approved promotion — 29 September 2026

The user answered **"yes, it meet, I approve"** to the `review-v9`
desktop/mobile-layout comparison. This is explicit visual acceptance of the
replacement against the requested 95% quality gate, not a measured numerical
score or physical-phone test.

Betelgeuse now defaults to the accepted globe. The synthetic map, shader,
optical edge, authored orientation, physical size, framing and point-source
transition are unchanged from `review-v9`; no bulk stellar spin was introduced.
The original `betelgeuse-portrait-v1.webp`, its material and thumbnail remain
the fixed reference and an explicit `betelgeuse: 'portrait'` rollback path.
`rotationPeriodHours: 20_000` was removed from public object metadata because
it was not an audited period. No public rotation, orbital or phase controls
were added.

`objects/thumbs/betelgeuse-globe-v1.webp` is a 320×320 preview rendered from
the accepted globe in an actual 8K production export, with other scene objects
hidden. Object metadata, the Betelgeuse object page, encounter copy, `/method`
and source credits now identify the modelled convection and distinguish it
from a measured map. The other five approved globes retain their production
rendering and behavior. The accepted review evidence below is preserved.

Promotion verification and remaining limits are recorded at the end of this
document. No commit, asset upload or publication was made.

## Pre-approval review record

29 September 2026. Betelgeuse's approved `betelgeuse-portrait-v1.webp` remains
the production renderer, thumbnail and visual baseline. The H6 sphere is selected
only by the developer review harness (`renderer=globe`). No promotion, commit,
asset upload or publication has been made. The Moon-specific text in the incoming
task was explicitly corrected by the user; this work concerns Betelgeuse.

[Open the desktop/mobile comparison](http://127.0.0.1:4318/scripts/hybrid-review/betelgeuse.html)
after starting `node scripts/hybrid-review/serve.mjs`. Captures and actual saved
exports are under `tmp/hybrid-h6-betelgeuse/review-v9/`.

## Source and interpretation

- The fixed baseline is project-commissioned generated artwork, not a telescope
  image. Its 1672×941 source and crop are documented in
  `public/assets/ATTRIBUTIONS.md`.
- [ALMA's 2023 submillimetre observations](https://www.almaobservatory.org/en/audiences/alma-reveals-long-lived-hotspots-on-betelgeuses-bubbling-surface/)
  show an irregular, extended atmosphere and hot regions. That wavelength and
  layer cannot be used as an optical RGB map. [ESO SPHERE observations](https://www.eso.org/public/images/eso2109a/)
  show changing visible-light asymmetry during the 2019-2020 dimming, not a
  registered complete surface or far-side texture. [NASA Hubble](https://science.nasa.gov/missions/hubble/hubble-finds-that-betelgeuses-mysterious-dimming-is-due-to-a-traumatic-outburst/)
  discusses a large convective upwelling and subsequent obscuring dust.
- The review asset `betelgeuse-convection-v1.webp` is newly generated synthetic
  artwork, 1774×887 pixels in a 2:1 equirectangular layout, encoded with
  `cwebp -q 94` from the generated PNG. SHA-256:
  `5cd2202bbe79894ffd5d9ba8fcc06cdd16ed3eda45306f9b3e60feb1ff8a33d7`.
  No observational image pixels were copied. The art prompt requested large
  orange and gold convective upwellings, fine fluid filaments, intrinsic
  emission and no disc lighting, limb, sky or baked terminator.
- Its longitude origin, axis, cells and polar rows are invented. The generated
  image is not physically registered to ALMA, ESO or the approved illustration.
  The shader blends a second longitude offset over 12% of UV space on each side
  of the wrap to hide the source's nonmatching borders. This reuses synthetic
  texture locally and is a visible reconstruction limit, not extra data.
  No observed albedo/DEM, elevation units or terrain radius exist for this star;
  the Moon's LRO/LOLA audit is inapplicable. There is no terrain displacement.

## Rendering and motion

`renderingPolicy` leaves Betelgeuse on `portrait` by default. Its optional
`globe-pilot` path uses the existing physical radius, distance presets, camera,
landscape, unresolved-star point and scene clock. A leased sRGB WebP is sampled
on a true sphere; small bounded 3D noise modulates its brightness over time.
The surface and restrained optical edge are composited on the post-AgX display
layer. This retains the generated map's warm display colour and uses the same
live/export finish as the approved portrait. No planet sunlight, atmospheric
scattering, normal map or second AgX transform is applied.

The spin frame exists for deterministic quarter-turn review, but its period is
null. [ALMA line analysis](https://arxiv.org/abs/1711.07983) inferred a projected
rotation corresponding to about 36 +/- 8 years under a solid-body model;
[subsequent synthetic-ALMA work](https://arxiv.org/abs/2311.16885) shows that
large convection can mimic a rotation signal and asks for more observations.
The existing `rotationPeriodHours` is therefore not treated as a sourced
period. No rotation direction or pole is claimed. No public rotation, orbit,
phase or speed controls were added. The shared clock freezes evolution for
reduced motion, hidden-tab suspension and tiled still exports.

## Visual review

The comparison holds the portrait's calculated apparent size and framing at
1440×900 desktop and 390×844 mobile layout. Both views use the production
composer and matching fixed portrait reference. The developer harness captures
0/90/180/270-degree turns, north/south inspection poses, high/balanced/safe
quality and the 250 AU/real-distance presets. Actual 3840 and 7680 long-edge
exports include full images and native-pixel crops.

| Rubric dimension | Weight | Desktop observation | Mobile-layout observation |
| --- | ---: | --- | --- |
| Detail and recognizable regions | 30% | Large luminous cells and fluid filaments now read, but their locations and finer morphology differ from the fixed illustration. The synthetic far side remains coherent. | Large cells remain legible at the unchanged live size; native crops expose the generated texture limit. |
| Lighting and tonal depth | 25% | Emissive disc, bounded limb treatment and a small optical edge avoid a planet-style terminator. The portrait retains richer local contrast. | The globe remains luminous without losing its silhouette; the edge is quieter than the portrait. |
| Colour | 20% | Warm orange/gold identity survives the post-AgX comparison. The new map tends redder in dark lanes. | Bright cells remain warm; small-scale colour separation differs from the portrait. |
| Silhouette and limb | 15% | Physical disc radius is unchanged, with an external optical margin only. | The complete disc stays within the original framing. |
| Composition | 10% | Same landscape, viewpoint and distance. The feature arrangement is new artwork. | Same responsive framing and calculated apparent size. |

This is a qualitative assessment, not a computed 95% score. User visual approval
is still required independently for desktop and mobile layout. A 390×844 desktop
Chromium viewport is not physical-phone testing. The map's individual cells,
redder lanes, unresolved-star colour transition, synthetic poles and authored
optical margin remain for judgement.

## Verification boundary

`scripts/hybrid-review/betelgeuse.mjs` reproduces the review captures with an
installed Playwright module. `tests/betelgeuse-hybrid.test.ts` covers the portrait
default, review sphere, deterministic no-spin pose, display layer and shared
fade/disposal. Production Betelgeuse and all approved planetary globes are not
changed by the review selector.

The final `review-v9` capture run recorded no browser errors. Its matched
desktop/mobile-layout scenes include the portrait, all four review longitudes,
both polar inspections, high/balanced/safe tiers, 250 AU and real-distance
views. The actual saved 4K and 8K PNGs were inspected as complete frames and
at native-resolution detail; the comparison page uses same-crop pixels from
the saved 4K images. The 8K globe exports are also retained for both layouts.
No smaller apparent size or altered baseline was used to improve the match.

The final browser checks passed on both layouts with no page or console errors:
production selects `portrait`, review selects `globe`, the starting calculated
disc radius is exactly equal in each pair (29.01578 px desktop, 29.07881 px
mobile layout), and a near/far round trip changes it by less than 0.00001 px.
The static review has no automatic spin, the 4K export holds one pose across
its tiles, the comparison images load without horizontal overflow, and object
transitions complete. The review 4K blobs measured 10.5 MB desktop and 7.3 MB
mobile layout. `final-browser-checks.json` holds the raw diagnostics.

The generated production app was checked separately at 1440×900 and 390×844.
Both layouts loaded `betelgeuse-portrait-v1.webp`, exposed no rotation-speed
control, and completed actual Capture/Save downloads: 7680×4800 desktop and
3549×7680 mobile layout. `product/production-results.json` records zero errors.
All five approved globe production captures (Moon, Mars, Jupiter, Saturn,
Neptune) were compared against the H4 promotion references at both layouts:
maximum channel difference was **0 in all ten images**. The new captures are in
`preservation/` and can be reproduced by `betelgeuse-preservation.mjs`.

`NUXT_IGNORE_LOCK=1 npm run verify` passed (typecheck, Vitest and production
build), and `npm run generate` completed 35 routes using Node 24. These are
automated checks, not the 95% visual judgement. No physical phone, phone GPU,
thermal, cross-browser or accessibility-device test was performed.

The generated WebP is local and not in the R2 restoration bundle. Any later
authorized promotion needs explicit user acceptance, a product thumbnail from
the accepted globe, public copy and active source credits, clean-checkout asset
delivery and promotion-specific regression checks. The portrait remains the
reference and rollback path.

## Promotion verification and next steps

After approval, `NUXT_IGNORE_LOCK=1 npm run verify` passed typecheck, **297
tests in 55 files**, and the production build. Node 24 `npm run generate`
completed **35 static routes**. `git diff --check` is clean. The earlier
portrait-default motion assertion was updated to the approved policy, while an
explicit rollback assertion and active-asset/thumbnail delivery tests were
added. The selected shader and map pixels were not altered after the user's
`review-v9` acceptance; the production selector and shared map URL were updated.

Headed Chromium checked the generated production app at 1440×900 desktop and
390×844 mobile layout. On both, the globe map loaded, the 320×320 menu image
loaded uncropped, the public Betelgeuse page described artistic reconstruction
without the unsourced 20,000-hour period, and no rotation-speed control was
exposed. Simulated time advanced while bulk spin stayed exactly fixed; pole and
world light stayed fixed too. Actual Capture → Save produced 7680×4800 desktop
and 3549×7680 mobile-layout PNGs. The browser recorded no page or console
errors. See `tmp/hybrid-h6-betelgeuse/promoted/production-results.json`.

The approved globe's production reference, portrait rollback, and all five
already approved globes were compared to their pre-promotion references on
both layouts: **maximum channel difference 0 in all 14 images**. The selected
map's SHA-256 is unchanged. `promoted/preservation.json` and
`betelgeuse-promotion-audit.py` record and reproduce this check. The actual 8K
menu-thumbnail source and full production saved exports were inspected; the
selected `review-v9` 4K/8K full frames and native-pixel detail remain the
high-resolution comparison evidence.

The local generated texture and new thumbnail are untracked assets, not part
of the R2 bundle. A future authorized commit must include them or arrange
another clean-checkout delivery path before release. No upload, commit or
publication was performed. Physical-phone rendering, GPU/thermal behavior and
native hidden-tab behavior remain untested; resized desktop Chromium is only
mobile-layout evidence. Sun, Sirius, Rigel and Andromeda retain their portraits
and need separate review and approval before any migration.
