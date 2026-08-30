# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Nuxt dev server (SPA, no SSR)
npm run verify       # typecheck + tests + build. Run this before calling work done; CI runs the same.
npm run typecheck    # nuxt typecheck (strict, vue-tsc)
npm test             # vitest run
npm run test:watch   # vitest watch
npx vitest run tests/angular-size.test.ts     # single test file
npx vitest run -t 'settles the promise'       # single test by name
npm run generate     # static output to .output/public (the `dist` symlink points there)
```

Node >= 20.19 (`.nvmrc` pins 20.19.5).

## Architecture

Two layers with a one-way dependency rule in mind: Vue owns state and controls, `src/perigee/` owns
rendering. They meet at the `PerigeeController` interface in `app/types/perigee.ts`.

**`app/` — Nuxt SPA shell** (`srcDir: 'app/'`, `ssr: false`, public dir remapped to `../public`)

- `composables/usePerigee.ts` holds module-level refs, so state is a singleton shared by all
  components, not per-instance. It owns the controller handle and the `transitioning` lock that
  gates every user action while a shot runs.
- `data/objects.ts` is the single source of truth for objects: real diameters, real distances, the
  five-step distance ladder (`planetPresets` / `starPresets`), and the `shot` definition (sky
  palette, sun direction, accent) used by both the UI and the renderer.
- `components/perigee/` are presentational; they call `usePerigee()` directly rather than take props.

**`src/perigee/` — framework-independent Three.js engine**

- `PerigeeScene.ts` implements `PerigeeController` and is the only entry point. Lazily imported in
  `usePerigee.initialize()` so Three.js stays out of the first bundle.
- One scene, one camera, one composer. `createSkyScene` holds an opaque full-screen backdrop
  (`createEnvironmentLayer`, a photographic plate per viewpoint), the star field, and the hero
  object. Effects run last: bloom, vignette, ACES tone mapping, then SMAA — SMAA is last on purpose,
  because its edge detection is tuned for tone-mapped luma, not raw HDR.
- `TextureCache.ts` owns every texture: one per URL for the life of the session, decoded off the main
  thread with `Image.decode()`, prefetched on idle after the first frame. Hero swaps never dispose a
  texture. It also carries the optional KTX2/Basis path (`scripts/textures.sh`, `VITE_KTX2_TEXTURES`),
  which is tree-shaken out of the bundle while it is off.
- `ShotDirector.ts` owns the single running GSAP timeline. Every transition returns a promise the UI
  awaits to unlock controls, so the promise must settle on **every** exit path — completion,
  interruption by a new shot, `finish()` on tab hide, `kill()` on dispose. A promise that never
  settles disables the interface permanently. `tests/shot-director.test.ts` covers these paths.
- `QualityManager.ts` picks a starting tier from device memory/cores, downgrades after sustained slow
  frames, and allows exactly one recovery back up so a transient stall does not demote the session
  for good. `setQuality` re-derives the DPR cap, composer multisampling, bloom intensity, star
  opacity and the stellar shader's octave count.
- `materials/` are hand-written `ShaderMaterial`s. Hero materials light themselves, so
  `updateHeroLighting()` feeds them the sun direction transformed into their own space.
- Surface relief has two paths. The rocky bodies carry a normal map built from real elevation data
  (`scripts/normal-maps.py`); everything else falls back to a gradient read out of the albedo. Both
  use the tangent frame `SHARED_VERTEX` derives from the sphere's equirectangular mapping, where +x
  is east and +y is north.

## Contracts to preserve

- **The device pixel ratio is capped inside `PerigeeScene.resize`, never at the call site.** The
  resize observer reports the raw ratio; clamping anywhere else lets an ordinary window resize undo
  the quality tier's cap and render a low-end phone at 3x.
- **Textures and geometry are shared, so `disposeObject` only releases materials.** Anything that
  disposes a cached texture or the shared sphere/ring geometry breaks every later swap.
- **Every shot must be interruptible.** `PerigeeScene` bumps a generation per object swap and drops
  a superseded load; `usePerigee` guards each `finally` with a shot token so a stale shot cannot
  clear the lock on a newer one. Controls stay live during a transition — only the object being
  loaded shows a pending state.
- **Angular size is computed, never tuned.** `math/angularSize.ts` derives θ from real diameter and
  distance; `renderRadiusForAngularDiameter` converts it to a render radius against the fixed
  `HERO_POSITION` distance. If `HERO_POSITION` changes, the scale math follows automatically — do
  not compensate by hand-scaling objects.
- Distance ladders: exactly 5 presets per object, unique ids, positive distances. `hazardCopy`
  belongs only on the star `impossible` preset. Enforced by `tests/preset-ladders.test.ts`.
- Reduced motion: every animated path checks `prefers-reduced-motion` and shortens durations
  (`PerigeeScene`, `usePerigee.queueHazard`). Keep new animation behind the same check.
- WebGL2 is required. `initialize()` throws `WEBGL2_UNAVAILABLE`, which `usePerigee` maps to the
  `CapabilityFallback` component. Asset load failures fall into the `'asset'` branch.
- Disposal is manual and explicit: `disposeObject` walks geometries, maps, and materials on every
  hero swap. New Three.js objects need matching disposal.

## Assets

Runtime textures in `public/assets/objects/` are CC BY 4.0 from Solar System Scope and are **not**
relicensed by this repo. Any new asset needs an entry in `public/assets/ATTRIBUTIONS.md`,
`src/perigee/AssetManifest.ts`, and the object's `attributionIds`.

`thumbnail` must point at `public/assets/objects/thumbs/` (160x160 WebP), never at a full surface
map — the object browser renders all of them at once.

Normal maps must be named `*-normal.*`. The texture cache keys colour space off that suffix, so a
map named anything else is decoded through sRGB and its slopes come out bent.
`scripts/normal-maps.py` builds them from LOLA/MOLA elevation grids; the source DEMs are ~32 MB each
and are deliberately not kept in the repository.

`scripts/textures.sh` converts the surface maps to KTX2/Basis. It is opt-in: run it, then set
`VITE_KTX2_TEXTURES=1` (see `.env.example`) and rebuild. Without the flag the loader uses the
JPEG/WebP files and the transcoder is not shipped.

## Notes

- Styling is a hand-written stylesheet (`assets/css/perigee.css`, ~1000 lines) plus Tailwind for
  utility cases. Component-level styles live in that file, not in SFC `<style>` blocks.
- `backdrop-filter` blurs composite over a canvas that repaints every frame, so their radius is a
  per-frame cost. Keep them small.
- The selection lives in the query string (`?object=&distance=&view=`), written with
  `history.replaceState`. `public/_headers` carries the static-host cache rules.
- The README references `product-overview.md`, `implementation-plan.md`, and `tech-stack.md`. Those
  files are not in the repository.
