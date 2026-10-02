# Night sky studies

Review-only prototype, 2 October 2026. This standalone exploration does not alter
the production route; the subsequently selected treatment is integrated separately.

The naked-eye treatment with occasional fireballs was subsequently selected for
production integration. `baselineSkyScene.ts` and `baselineMeteorLayer.ts` retain
the original renderers so this exploration remains a stable comparison reference.
The production implementation is documented in `docs/stellar-sky.md`.

From the repository root:

```sh
node node_modules/vite/bin/vite.js docs/prototypes/night-sky --host 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100. Switch studies, replay a meteor, compare current,
drag the view, change landscapes, or inspect the 390 × 844 phone layout.
The same catalogue geometry, magnitude flux, atmospheric extinction, fixed
reference orientation and AgX display pass are reused across treatments.
There is no selected celestial hero, so the background itself is easy to judge.

## Current implementation

- `createSkyScene.ts`: 9,096 Yale + 96,968 Gaia entries, B−V colour proxy,
  normalized 0.65 CSS-pixel Gaussian, integrated diffuse G-band map, atmospheric
  transmission, magnitude limit by viewpoint, altitude-dependent irregular twinkle.
- All stars have the same optical profile; magnitude controls flux. The Gaussian
  has no longer optical wings around bright stars. This is a design limitation,
  not an assertion that each physical star should have a large visible disc.
- `createMeteorLayer.ts`: one reusable clip-space quad, linear motion, taper,
  fast ignition, gradual burnout, small sinusoidal flicker and five white-ish tints.
  Stars/meteors draw behind celestial heroes. Trails occupy a small left/right
  area. Full tail length is present at ignition. There is no separately aging train.
- `MeteorScheduler.ts`: 30–60-second gaps, 1.15–1.65-second durations.
- The illustrated landscape plates also contain baked stars. The actual sky is
  therefore the catalogue plus an independent fixed star layer in the backdrop.
  Those background points cannot acquire true catalogue motion or photometry.

## Three studies

| Study | Stars | Meteor behavior | Intended use |
| --- | --- | --- | --- |
| Naked eye | Narrow core, faint bright-star wings, stronger irregular twinkle near horizon | 0.45–0.85s, growing tail, constant-speed travel, no afterglow | Recommended everyday direction |
| Night lens | Wider low-energy wings around bright sources | 0.7–1.2s, brighter core, warm burnout | Slightly more photographic display style |
| Rare fireball | Naked-eye star treatment | Bright ablation flare, separately aging train over 2.2s, subtle lateral drift | Rare exceptional event, not every shooting star |

Durations, intensity and train decay are illustrative review settings. These
are not measured event reconstructions, calibrated eye sensitivity, or a shower
forecast. Meteors are replayed on demand. Automatic review events retain long
quiet gaps; the fireball study deliberately shows a fireball each time so it can
be inspected. A shipping event mix should contain mostly faint, short meteors
and very occasional fireballs, with brightness and duration distributions.

Improved trajectories are fixed in scene coordinates and projected every frame;
they remain in the sky when the camera pans. Their angular path is authored for
review, not a three-dimensional atmospheric orbit. Trail width is in CSS pixels,
and the tail grows only along the distance already travelled. The persistent
train stays on the traversed path while each segment ages separately.

## Background and verification boundaries

The prototype uses the existing landscape assets. A disclosed 25-tap upper-sky
filter softens baked stars to make the catalogue treatment easier to compare.
It does not guarantee removal, preserve fine Milky Way detail, or provide a
geographic horizon matte. It is expensive and must not be shipped as a fix.
Turn it off in Settings to judge the optics on the unmodified source backdrop.
The comparison button restores the original backdrop and star/meteor shaders.
The replay is an approximation of the original scheduler's appearance. Replays
repeat a seeded path so treatment comparisons use the same location and angle;
automatic events vary. Run `npm run dev` to inspect the full production scene.

Final implementation should prepare star-free versions of the approved landscape
plates and preserve their exact ground/horizon. Catalogue stars must remain the
single positional source. Integrate the chosen optics with the existing area
sampling, flux normalization, mobile quality budgets and frozen still exports.
The prototype's Moffat wings are analytically normalized over infinite support;
their finite sprite truncation and pixel-area sampling need production refinement.
It omits production film, SMAA, selected heroes and adaptive GPU quality. This
preview cannot establish hero occlusion, exact production color parity, saved
high-resolution export parity, physical-phone FPS, thermals or Safari acceptance.

Reduced motion starts paused and Replay shows a static event frame. Resume is an
explicit user choice to animate the preview. Hidden tabs do not advance time.

## Research

- [ESO: atmospheric twinkling](https://www.eso.org/public/blog/twinkle-twinkle-little-star/)
- [American Meteor Society: fireball trails and trains](https://amsmeteors.org/fireballs/faqf/)
- [American Meteor Society: meteors](https://www.amsmeteors.org/meteor-showers/meteor-faq/)

Existing catalogue/landscape provenance remains in `public/assets/ATTRIBUTIONS.md`.
No new runtime raster asset is introduced by these studies.

## Validation

`NUXT_IGNORE_LOCK=1 npm run verify` passed: typecheck, 60 test files / 326 tests,
and production build. The standalone Vite prototype build passed. The design
detector reported no findings. Reviewed desktop and 390 × 844 mobile-layout
captures, the three meteor frames, baseline comparison and landscape switching.
Browser rendering reported no shader or runtime errors during that review.
Physical-phone performance and export parity remain untested.
