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
- Two scenes, two cameras, one composer: sky (`createSkyScene`) renders first, a `DepthClearPass`
  wipes depth, then ground (`createGroundScene`, with `clearPass.enabled = false`) draws on top.
  Effects (bloom, SMAA, vignette, ACES tone mapping) run last over the combined frame.
- `ShotDirector.ts` owns the single running GSAP timeline. Every transition returns a promise the UI
  awaits to unlock controls, so the promise must settle on **every** exit path — completion,
  interruption by a new shot, `finish()` on tab hide, `kill()` on dispose. A promise that never
  settles disables the interface permanently. `tests/shot-director.test.ts` covers these paths.
- `QualityManager.ts` picks a starting tier from device memory/cores and downgrades after sustained
  slow frames; `setQuality` re-derives DPR cap, bloom intensity, and per-scene detail.
- `materials/` are hand-written `ShaderMaterial`s. Hero materials light themselves, so
  `updateHeroLighting()` feeds them the sun direction transformed into their own space.

## Contracts to preserve

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

## Notes

- Styling is a hand-written stylesheet (`assets/css/perigee.css`, ~1000 lines) plus Tailwind for
  utility cases. Component-level styles live in that file, not in SFC `<style>` blocks.
- The README references `product-overview.md`, `implementation-plan.md`, and `tech-stack.md`. Those
  files are not in the repository.
