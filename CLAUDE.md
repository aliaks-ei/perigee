## Commands

```bash
npm run verify       # typecheck + tests + build. Run this before calling work done; CI runs the same.
npm run generate     # static output to .output/public (the `dist` symlink points there)
npx vitest run tests/angular-size.test.ts     # single test file
npx vitest run -t 'settles the promise'       # single test by name
```

## Architecture

Two layers with a one-way dependency rule in mind: Vue owns state and controls, `src/perigee/` owns
rendering. They meet at the `PerigeeController` interface in `app/types/perigee.ts`.

**`app/` — Nuxt SPA shell** (`srcDir: 'app/'`, public dir remapped to `../public`)

Rendering is a hybrid and the switch is inverted on purpose:

- `ssr: true` at the config level, `'/**': { ssr: false }` in `routeRules`, `'/e/**': { ssr: true,
  prerender: true }` on top.
- A global `ssr: false` beats every route rule — Nuxt drops the HTML with "not prerendered because
  `ssr: false` was set" — so the curated encounter routes would ship an empty shell with no title,
  description or social card.
- `/` is in `nitro.prerender.routes` only to keep an `index.html` for static hosts; it is the same
  empty shell as `200.html`.

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
  object. Effects run last, in three passes: bloom (its own pass, enabled only for stars and the
  galaxy), then vignette, AgX tone mapping and the film dither/grain, then SMAA — SMAA is last on
  purpose, because its edge detection is tuned for tone-mapped luma, not raw HDR. High quality also
  uses 4x composer multisampling to preserve crisp hero silhouettes; balanced and safe do not.
- `TextureCache.ts` owns every texture: one per URL for the life of the session, decoded off the main
  thread into an `ImageBitmap`, uploaded to the GPU on load (`renderer.initTexture`) so no shot pays
  for it, prefetched on idle after the first frame by tier. Every texture leaves the cache with
  `flipY` off and the materials flip V once when they sample (`FLIP_V` in `materials/shaderChunks.ts`),
  so ImageBitmap and KTX2 uploads behave the same. It also carries the KTX2/Basis path
  (`scripts/textures.sh`, `VITE_KTX2_TEXTURES`, opt-in), which is tree-shaken out of the bundle when
  the flag is off. `AssetManifest.surfaceMapFor` swaps the 4K maps for their 2K siblings only on the
  safe tier.
- `ShotDirector.ts` owns the single running GSAP timeline and returns the promise the UI awaits to
  unlock controls. `tests/shot-director.test.ts` covers its exit paths.
- `QualityManager.ts` chooses a fixed session tier from device memory/cores. Runtime frame deltas are
  deliberately not used as GPU timings. `setQuality` re-derives the DPR cap, composer multisampling,
  bloom intensity, star opacity and the stellar shader's octave count.
- `materials/` are hand-written `ShaderMaterial`s. Hero materials light themselves, so
  `updateHeroLighting()` feeds them the sun direction transformed into their own space.
- The backdrop takes the hero's projected position and radius each frame and paints its glow into
  the sky and onto the lit parts of the plate. A star's halo is a billboard (`GlareMaterial`), not
  bloom.
- Surface relief has two paths. The rocky bodies carry a normal map built from real elevation data
  (`scripts/normal-maps.py`); everything else falls back to a gradient read out of the albedo. Both
  use the tangent frame `SHARED_VERTEX` derives from the sphere's equirectangular mapping, where +x
  is east and +y is north.

## Contracts to preserve

- **The device pixel ratio is capped inside `PerigeeScene.resize`, never at the call site.** The
  resize observer reports the raw ratio; clamping anywhere else lets an ordinary window resize undo
  the quality tier's cap and render a low-end phone at 3x. Caps are fixed at 2x for high, 1.5x for
  balanced and 1x for safe.
- **Textures and geometry are shared, so `disposeObject` only releases materials.** Anything that
  disposes a cached texture or the shared sphere/ring geometry breaks every later swap.
- **Every shot must be interruptible, and its promise must settle on every exit path** — completion,
  interruption by a new shot, `finish()` on tab hide, `kill()` on dispose. A promise that never
  settles disables the interface permanently. `PerigeeScene` bumps a generation per object swap and
  drops a superseded load; `usePerigee` guards each `finally` with a shot token so a stale shot
  cannot clear the lock on a newer one. Controls stay live during a transition — only the object
  being loaded shows a pending state.
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

The star field's brightness distribution comes from the Yale Bright Star Catalog packed into
`public/assets/stars/bsc5.bin` by `scripts/star-catalogue.py`; a procedural field stands in until it
loads and if it fails.

Normal maps must be named `*-normal.*`. The texture cache keys colour space off that suffix, so a
map named anything else is decoded through sRGB and its slopes come out bent.
`scripts/normal-maps.py` builds them from LOLA/MOLA elevation grids; the source DEMs are ~32 MB each
and are deliberately not kept in the repository.

`scripts/textures.sh` converts the object maps to KTX2/Basis with the `basisu` encoder
(`brew install basis_universal imagemagick`), and the `.ktx2` files are checked in beside their
sources. The codec is chosen per map: ETC1S for the noisy rocky albedos (Moon, Mars), UASTC for
the gas giants, whose smooth banding ETC1S would band, and for the normal maps. The backdrops stay
WebP on purpose. JPEG/WebP is the default because those files are substantially smaller on the
wire. Set `VITE_KTX2_TEXTURES=1` (see `.env.example`) only when GPU memory and upload stalls matter
more than initial transfer size. Rerun
the script whenever a source texture changes, or the stale `.ktx2` wins. The transcoder is served
from `public/assets/basis/` as a byte copy of three's; `tests/basis-transcoder.test.ts` fails when
a three upgrade leaves it behind (copy the two files from
`node_modules/three/examples/jsm/libs/basis/`).

## Notes

- The selection lives in the query string (`?object=&distance=&view=`), written with
  `history.replaceState`. `public/_headers` carries the static-host cache rules.
