# H7 Andromeda assessment and H8 consolidation — 1 October 2026

**Retain the approved cleaned portrait.** H7 is optional and has the permitted
retain-portrait outcome. No depth candidate was built or promoted; no visual
approval is needed to keep the incumbent. H8's safe local consolidation is done.
The entire plan is not complete while mandatory device acceptance is outstanding.
No commit, asset upload, push or publication was performed.

Comparison: <http://127.0.0.1:4318/scripts/hybrid-review/andromeda.html>.
This page compares starting/final frames and production/portrait-path downloads;
it does not present a nominal candidate or assign a visual score.

## Explicit retention approval — 1 October 2026

After reviewing the H7/H8 comparison, the user said **“I approve andromeda”**.
This records approval of retaining the exact cleaned portrait v2 production
renderer and thumbnail v3 shown in that comparison. No depth candidate existed,
so no geometry promotion, new asset derivative or public copy change follows.
Andromeda motion remains disabled. This is visual acceptance of the retained
outcome, not a calculated 95% score or physical-device/performance acceptance.
No commit, asset upload, push or publication is authorized by this approval.

## Why depth does not help the existing interaction

`CameraRig` changes camera quaternion, never camera position. Drag clamps aim to
±0.15 rad yaw and −0.07…+0.085 rad pitch. Hover adds only small aim offsets.
`PerigeeScene.setViewpoint` selects a landscape and moves the hero's composition,
preserving apparent size; it is not an observer's travel around M31. Browser
checks at both aim extremes record observer position `[0,0,0]` on both layouts.

Pure camera rotation cannot establish a new physical sightline through a galaxy.
Distributing pixels along their original rays produces no useful differential
parallax without observer translation. Separating the baked dust/core/companions
would require arbitrary emission assignments and hidden-surface information.
The current plane is a display-referred composition with baked orientation,
not a projected measured volume; inventing depth to counter its presentation
behavior would change the interaction or the accepted image. No convincing
existing-interaction benefit justifies that cost here. No orbit/displacement
control, companion separation, extruded dust, re-inclination or spin was added.

The actual 1672×941 cleaned PNG was inspected before this decision. It contains
the bright warm core, cool outer disc, dark dust and two diffuse companions; the
surrounding source is black and cleaned of isolated stars. `AndromedaMaterial`
keeps its aspect/orientation and uses a broad mip-derived opacity envelope to
prevent isolated pixels revealing a rectangle. One image contributes once with
straight alpha, no additive layer stack and no repeated dust attenuation. A
single portrait lease, no spin frame and no galaxy/point material remain active.
The separate catalogue owns the surrounding sky. Tiny points inside the galaxy
are original artwork, not newly resolved observational stars.

`renderingPolicy.andromeda.accepted = false` records that a geometry migration
has not been approved; it does not revoke the approved portrait artwork.

## Primary evidence, rights and uncertainty

Sources were opened on 2026-10-01. No external pixels, figures or datasets were
downloaded, resampled or redistributed; no candidate assets were generated.

| Source | Observed information | Inference/display limits and rights |
| --- | --- | --- |
| [NASA Hubble PHAT+PHAST mosaic](https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/) | ACS projected mosaic, exposures July 2010–December 2022; F475W/F814W; release 2025-01-16. Projected dust, stellar populations and a companion are visible. | Blue/yellow are assigned to separate filters; mosaicked coverage has gaps. NASA describes a nearly edge-on 77° view, not pixelwise measured depth. Credit NASA/ESA, Williams, Chen, Johnson; processing DePasquale/STScI. Research/reference only; no media reused or rights transferred. |
| [NASA SVS optical/infrared comparison](https://svs.gsfc.nasa.gov/30990) | Optical disc light and infrared dust-ring emission are distinguished. | Infrared dust emission is not visible-light emissivity or a depth map. Optical credit NOAO/AURA/NSF; infrared NASA/JPL-Caltech/K. Gordon; visualization NASA/ESA/G. Bacon. Reference only, original rights remain. |
| [Courteau et al. 2011, luminosity profile](https://arxiv.org/abs/1106.3564) | Optical imaging/star counts and Spitzer/IRAC support projected light profiles. | Bulge/disc/halo separation is a photometric fit; method-dependent uncertainties and other constraints can change structural parameters. No unique per-pixel depth, measured hidden surface or artwork calibration follows. Paper/figure rights retained; no content redistributed. |

The existing `disc.inclinationDegrees = 71.5` is an older optical-ellipse
approximation for the inactive reconstruction. It is not applied to the already
inclined portrait and must not be reapplied to it. The literature's geometry
does not recover this authored image's missing pixels. The two diffuse companion
forms are retained in the single approved image without invented distances,
trajectories or motions. Public scientific/descriptive boundaries stay fixed.

The production portrait v2 is original AI-assisted Perigee artwork, recorded
under MIT in `public/assets/ATTRIBUTIONS.md`; thumbnail v3 uses that cleaned
source with square padding. No new processing was applied. Source/hash records
and review crops are local evidence, not runtime assets or telescope data.

## H8 usage and lifecycle audit

| Area | Decision and evidence |
| --- | --- |
| Nine accepted materials/maps | Retained byte-for-byte, including all reference phases, presets, thumbnails, social images, public object descriptions and motion values. |
| Portrait rollback | All nine explicit selectors/materials retained. Manifest `requiredFor` consistently identifies portrait-review entries instead of implying production use. Andromeda remains the production portrait. |
| Obsolete warmup | Removed only `PerigeeScene`'s galaxy shader warmup and its private 2.5×2.5 carrier. The current factory never returns a galaxy material and never consumes this probe; it previously compiled an inactive null-texture shader. Stellar fallback warmup remains. |
| Observational galaxy stack | `ObservedGalaxy`, `galaxyLayerMaterial`, geometry/projection math, derivative pack, provenance and regression tests remain. Inactive production status is not deletion authorization. |
| Runtime inventory | Moon's original-tree base/colour tiles, Moon/Mars terrain and Saturn ring optical depth remain. Mars uses its accepted observational-v3 base/tiles; Jupiter/Saturn/Neptune use accepted dedicated maps. Superseded original colour bases and Mars colour tiles are removed only from runtime inventory. All source files/restoration packs remain. |
| Public audit | Object descriptions, thumbnails/social assets and current object attribution IDs match the accepted paths. Corrected one contradictory `/method` sentence from legacy Solar System Scope ring colour to [Cassini PIA11142](https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/), NASA/JPL/Space Science Institute. Andromeda copy, thumbnail, social image, manifest entry and attribution remain unchanged. |
| Shared contracts | No lighting/quality tuning or renderer refactor. Placement/angular size, transitions, cancellation, texture leases, ownership, reduced motion, clock and capture composition remain. Neptune's outdated motion comment and root guidance were corrected; numerical motion records did not change. |
| Documentation | Repository renderer/asset/motion and milestone tables now record all nine approvals. Downloads plan identifies historical sections, replaces superseded next-task instructions and records H7 retention/H8 decisions with outstanding device acceptance. |

Live order remains HDR/bloom → one AgX → display-linear portrait → film/SMAA →
sRGB. `toneMapped:false` prevents regrading this display artwork. StillRenderer
uses the same display layer after AgX. No bloom, exposure or opacity recipe was
changed. All tiles/samples use a single frozen state and camera pose.

## Verification, preservation and saved-export inspection

Starting dirty work is archived in `tmp/hybrid-h7-h8/starting-dirty-state.tar.gz`
(228 files), with a binary patch, status, original Downloads plan and SHA-256
inventory of 3,802 relevant source/runtime/evidence files. Restored ignored source
trees were hashed and retained; previous `tmp/` source archives were not deleted.
Deterministic references were captured before source changes: ten objects × two
layouts. Hash audit allows only the listed H8 files and review harness edits;
all unrelated starting files and accepted materials/assets are byte-identical.

Node **24.15.0**: `NUXT_IGNORE_LOCK=1 npm run verify` passed typecheck, **324 tests
in 59 files**, and production build; `npm run generate` passed **37 routes**;
`git diff --check` passed. Five new regression cases cover the single display
contribution/frozen portrait, disabled spin, both cancellation/disposal exits,
bounded aim without observer translation, rollback inventory and nine approvals.
Planet inventory assertions now cover only actual runtime colour/terrain entries.

Headed macOS Chromium at DPR 1 passed both **1440×900** and **390×844** layouts:
five presets × four landscapes, aim extremes, object round trips, superseded
selection, one active portrait lease and idempotent disposal, reduced-motion
freeze, normal clock advancement without galaxy spin, and actual product
**Capture → Save**. No inactive galaxy tree was requested. Browser/WebGL error
logs are empty. The comparison page loads all 56 images and checks 64 PNG links
on each layout with no horizontal overflow. Controlled visibility events suspended the clock; native tab
switching did not hide the document on this host.

| Actual downloaded PNGs, each production and portrait path | Desktop | Mobile layout |
| --- | --- | --- |
| 4K | 3840×2400 | 1774×3840 |
| 8K | 7680×4800 | 3549×7680 |
| Public Capture → Save | 7680×4800 | 3549×7680 |

All four production/portrait export pairs are pixel-identical. Each download
uses **one unique frozen state/pose**: 50/162 tile-sample calls for desktop
4K/8K and 34/130 for mobile layout. Complete saved PNGs and unscaled 320×320
centre, dust, edge and transparency crops were inspected. Core colour, dust
contrast and soft clean edges remain; catalogue background is visible through
transparent outer areas, without a rectangular star field or duplicated image
contribution. Public downloads match the corresponding retained export detail.
8K enlarges the finite source sampling and adds no observational resolution.

**18 of 20 initial frames are pixel-identical.** Saturn's two frames differ by
at most **one 8-bit channel level**, on 48 desktop / 17 mobile pixels around its
rings. Framing, zero-time motion, material and asset hashes are identical. The
single bounded confirming pass reconstructed the starting engine: its desktop
repeats also differ by one level on the same 48 pixels, and one archived/current
desktop pair is exact. Current repeats are exact; the mobile archived/current
17-pixel difference persists. This supports existing ring rasterization/rounding
variability, not a retuned surface; no visible difference was observed. Exact
pixel equality is not claimed for those two initial Saturn frames.

The requested **95% overall target, 85 per-dimension floor and no critical
defect** remain the gate for a future replacement. No tests, pixel differences
or artifact diagnostics assign a visual score. Retention preserves the already
approved portrait; it does not seek approval for an unbuilt candidate.

Evidence: `tmp/hybrid-h7-h8/final/results.json`, `preservation.json`,
`source-hashes.json`, `saturn-confirmation.json`, `saturn-variance.json`, original
PNG downloads and native crop sheets. Reproduce with Node 24
`scripts/hybrid-review/serve.mjs`, `andromeda.mjs` (generated product on 3012),
`andromeda-artifacts.py` (NumPy/Pillow) and `andromeda-page.mjs`.
The local harness alone supports `h7Baseline=true`; it reads the reconstructed
ignored source archive and never creates a product route or renderer switch.

## Exact remaining plan work

- Physical-phone touch/drag/pinch behavior, GPU/thermal and sustained FPS/residency
  acceptance. Resized desktop Chromium is only mobile-layout evidence.
- Native hidden-tab suspension acceptance and Safari/Firefox/other-GPU checks.
- Release preparation was authorized on 2026-10-01. The approved Mars colour
  tree is covered by a separate immutable R2 bundle in
  `scripts/asset-bundles.json`; restoration and per-file provenance regression
  tests protect clean-checkout delivery. Publication results are recorded in
  the release PR and deployment evidence.
- Automatic stellar motion remains a separate research/approval task if pursued;
  renderer acceptance authorizes no missing pole, period, direction or evolution.
- H7 needs no further implementation to retain the portrait. Reopen only for a
  concrete supported interaction benefit; a future candidate needs complete
  matched saved-export evidence and explicit approval in a subsequent turn.

No sustained performance benchmark was collected in this consolidation. Export
download durations in `results.json` are measured wall times for these runs,
not GPU timings or sustained FPS. Resource byte figures in engine diagnostics
remain estimates. Touch, thermal, native hidden-tab and cross-browser gaps are
not established by the unit tests or the controlled visibility event.
