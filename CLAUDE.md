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

Node >= 24 (`.nvmrc` pins 24.20.0). Node 20 reached end of life on 30 April
2026; Node 24 is the Active LTS line, and Wrangler requires Node >= 22.

## Architecture

Two layers with a one-way dependency rule in mind: Vue owns state and controls, `src/perigee/` owns
rendering. They meet at the `PerigeeController` interface in `app/types/perigee.ts`.

**`app/` — Nuxt SPA shell** (`srcDir: 'app/'`, public dir remapped to `../public`)

Rendering is a hybrid, and the switch is inverted on purpose: `ssr: true` at the config level,
`'/**': { ssr: false }` in `routeRules`, and `'/e/**': { ssr: true, prerender: true }` on top. A
global `ssr: false` beats every route rule — Nuxt drops the HTML with "not prerendered because
`ssr: false` was set" — so the curated encounter routes would ship an empty shell with no title,
description or social card. `/` is listed in `nitro.prerender.routes` only to keep an `index.html`
in the output for static hosts; it is the same empty shell as `200.html`.

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

## Styling

Six stylesheets, loaded in the order set by `nuxt.config.ts`. **The order is a contract, not a
preference.**

| # | File | Holds |
| --- | --- | --- |
| 1 | `tailwind-base.css` | `@tailwind base` and `@tailwind components` |
| 2 | `tokens.css` | Every design token as a custom property on `:root` |
| 3 | `base.css` | Element defaults, the focus ring, the shared hover, link styling |
| 4 | `perigee.css` | Component rules |
| 5 | `animations.css` | Every `@keyframes` and every Vue `<Transition>` class |
| 6 | `tailwind-utilities.css` | `@tailwind utilities` |

Preflight first, so component rules override it. **`animations.css` must stay after `perigee.css`:**
a transition class such as `.dock-enter-from` ties on specificity with the component class it lands
on (`.control-panel`), so it only wins by coming later. Put it earlier and every transition on a
positioned element silently stops moving — the classes are applied, the computed style never
changes, and nothing looks broken in the markup. Utilities last, so a class in a template always
beats the component class beside it. `@nuxtjs/tailwindcss` runs with `cssPath: false` because it
injects only one file and the directives are split across two.

**Reach for a Tailwind utility first.** Layout, spacing, flex and grid, `uppercase`, font weights,
`cursor-*`, `pointer-events-*`, `object-cover`, `rounded-full`, `sr-only`, `animate-spin` all belong
on the template. If a rule in `perigee.css` starts with `display: flex`, it is in the wrong place.

**What stays in CSS**: the `clamp()` layout, layered gradients and glass, `color-mix()`,
`backdrop-filter`, the measured sliding indicator, and font sizes. Font size is deliberate — the
type scale (9px, 10px, 12.5px, 21px) does not sit on Tailwind's steps, and `text-xs` would also
impose a `line-height` the design never asked for. Do not convert it with arbitrary values.

**Tokens are mirrored, not duplicated.** `tokens.css` holds the values; `tailwind.config.ts` maps
them to utilities as `var(...)` references. Two consequences: the opacity modifier
(`text-ink-primary/50`) does not work, so use a token that already carries the alpha; and
`--accent-object`, which `app.vue` rewrites per object, re-tints every `accent` utility for free.
`borderRadius`, `transitionDuration` and `transitionTimingFunction` deliberately shadow the stock
Tailwind scales. Add a new token to both files or to neither.

**Breakpoints.** The layout was built against max-width queries, registered as `lt-lg` (1100px),
`lt-md` (900px) and `lt-sm` (640px). Use those variants on templates; the `@media` blocks in
`perigee.css` are for the clamp geometry and the type scale only.

**Animation stays in CSS.** No animation library — GSAP is for the 3D scene, not the interface. The
`@keyframes` live in `animations.css` because three of them are driven by an ancestor state class
(`.scene-ready`) and Tailwind only emits keyframes an `animate-*` utility names; the config
registers the shorthands on top. The reduced-motion block clamps `animation-duration` globally, so a
new animation must be CSS-driven or carry its own `prefers-reduced-motion` guard.

**Every state change needs a transition.** The named ones, all defined in `animations.css`:

| Name | For |
| --- | --- |
| `dock` | The control panel above the rail |
| `hint` | Small notices that fade up in place — the drag hint, the scene notice |
| `hazard` | Same shape, kept for notices that do not change the layout |
| `encounter-title` | Encounter beat copy and the discovery aside |
| `collapse` | A block that has to take its height with it |
| `fade` | Full-bleed overlays — loading, capability fallback |
| `chrome` | The idle interface stepping aside for a guided encounter |

Two rules when adding one:

- **A centred element declares `--center-x: -50%` and writes `transform: translateX(var(--center-x))`.**
  The transition classes compose their movement as `translate(var(--center-x, 0), …)`. Set the
  transform directly and the element loses its centring the moment the transition starts, so it
  jumps sideways while it moves.
- **A block whose appearance changes the height of its neighbours uses `collapse`, not a fade.**
  Wrap it in `<div class="collapsible"><div>…</div></div>`; the shell is a one-row grid animating
  between `0fr` and `1fr`, and the inner element clips so the content's own margin collapses with
  it. Fading alone leaves the layout snapping at the end of the transition, which reads as no
  animation at all. `ObjectIdentity.vue` is the reference — its block is anchored to its bottom
  edge, so anything opening inside it moves the title.

**Every interactive element needs a visible hover and focus state.** `base.css` gives every
non-disabled button a colour lift and every link an underline treatment, both on `:hover` and
`:focus-visible`. That shared rule is specificity (0,3,1) on purpose, so it outranks the component
rule setting a button's resting colour — a component that needs a different hover must match the
same `button:not(:disabled):hover` shape to win on source order. When a component rule adds a
`:hover`, it adds `:focus-visible` alongside it. An element already at full ink needs another
affordance: see `.brand-word`, which uses opacity.

## Notes

- Component-level styles live in `assets/css/perigee.css`, not in SFC `<style>` blocks.
- `backdrop-filter` blurs composite over a canvas that repaints every frame, so their radius is a
  per-frame cost. Keep them small.
- The selection lives in the query string (`?object=&distance=&view=`), written with
  `history.replaceState`. `public/_headers` carries the static-host cache rules.
- The README references `product-overview.md`, `implementation-plan.md`, and `tech-stack.md`. Those
  files are not in the repository.
