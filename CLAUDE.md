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
  components, not per-instance. It owns the controller handle, the `busy` lock that marks a
  running shot, and the disclosure `stage` that reveals the interface in steps (see
  `app/CLAUDE.md`, "Staged disclosure").
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
  purpose, because its edge detection is tuned for tone-mapped luma, not raw HDR.
  Automatic high quality requests native DPR within device/pixel limits and uses
  SMAA alone; balanced/safe preserve lower budgets. A separate tiled still renderer
  accumulates four HDR samples and reuses frozen full-frame bloom.
- `TextureCache.ts` owns URL-deduplicated textures through explicit leases. Active and transitioning
  heroes/plates pin their maps. Unpinned entries are evicted by recency against 256/160/96 MiB
  estimated high/balanced/safe budgets. Speculation decodes at most two candidates without uploading;
  demand uploads before the shot. Abandoned demand requests can be cancelled. Retired owned
  ImageBitmaps are closed. KTX2 remains opt-in, and loaders/workers are disposed at teardown.
- `ShotDirector.ts` distinguishes completion, interruption and disposal. `finish()` applies callbacks;
  replacement preserves the rendered state. Object opacity, distance and viewpoint movement have
  separate directors so distance input cannot strand an object fade. Object preparation is transactional
  through texture loading and shader compilation. `compileScene.ts` preserves Three r185's asynchronous
  readiness checks with cancellation and captured program references; revisit it when upgrading Three.
- `QualityManager.ts` is the authoritative mutable policy. Device hints choose an initial tier,
  then valid GPU queries (or explicitly labeled frame pacing) drive hysteretic adaptation with
  warmup exclusion and slower recovery. Buffers are bounded by both DPR and total pixels. Surface
  maps already in use remain pinned across tier changes. Internal `getDiagnostics()` reports estimates
  and timing source without adding UI or telemetry.
- `materials/` are hand-written `ShaderMaterial`s. Hero materials light themselves, so
  `updateHeroLighting()` feeds them the sun direction transformed into their own space.
- The backdrop takes the hero's projected position and radius each frame and paints its glow into
  the sky and onto the lit parts of the plate. A star's halo is a billboard (`GlareMaterial`), not
  bloom.
- Planetary maps and terrain are prepared by `scripts/planet-assets.py`; `planet/PlanetTiles.ts`
  streams budgeted colour detail over complete bases. Rocky normals use physical elevation slopes;
  sufficiently large views also displace the surface and sample terrain shadows. Saturn uses a
  measured UV optical-depth profile independently of ring colour/alpha. Inferred coverage and
  photometric limits are documented in `docs/planet-assets.md` and `/method`.
- Reduced motion freezes hero spin, shader time, film time, star drift/twinkle and meteors. Settled
  scenes render on invalidation; pointer input, resources, selection, resize and recovery wake the
  same frame loop. Normal motion remains full cadence. Planets use recorded periods at 60x time;
  the Moon, stars and Andromeda have no solid-body spin.
- Viewpoint loading precedes composition movement. An active two-plate blend completes before the
  newest queued plate starts, bounding sampler/residency cost without resetting visible mix. Its
  promise covers both loading and the fade. Foreground masks and water reflections are not shipped.

**`src/perigee/audio/` — ambient music**

- One composed piece per viewpoint, looped and crossfaded. `AmbientSoundEngine` fetches, decodes,
  loops and crossfades; there is no synthesis left. The soundscape used to be built from noise beds,
  a sustained major chord and a heart-rate pulse, and listeners read it as dark rather than calm.
- `AudioManifest.ts` is generated by `scripts/audio.sh` and checked in. Filenames carry the first
  eight hex characters of each file's SHA-256, so `/assets/*` can stay immutable for a year.
- `AudioLoader` decodes each track once and can release it again. A track is ~40 MB decoded against
  1.8 MB on the wire, so the previous viewpoint's track is dropped once its crossfade has finished
  rather than holding all four.
- `audioOutput.ts` is the iOS fix. Web Audio plays on the ringer channel there, so the side switch
  silences it while everything reports as working. `navigator.audioSession.type = 'playback'` moves
  it to the media channel; iOS 16 and earlier get a looping silent media element instead.

## Contracts to preserve

- **The device pixel ratio is capped inside `PerigeeScene.resize`, never at the call site.**
  The observer reports raw DPR. Automatic high requests native DPR within 16,588,800
  pixels; balanced/safe use 1.5×/1× and 3,686,400/2,073,600 pixels. Hardware texture,
  renderbuffer and viewport dimensions also bound allocation. There is no quality
  menu. Sustained overload lowers quality; known weak devices start lower. Identical
  resizes do not reallocate buffers, and interrupted angular scale stays intact.
- **Textures and geometry are shared; `disposeObject` releases materials and texture leases.** Anything that
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
- Distance ladders: exactly 5 object-specific presets, ordered closest to farthest with positive,
  strictly increasing distances. `hazardCopy` belongs only on the star `impossible` preset.
  Enforced by `tests/preset-ladders.test.ts`.
- **Nothing is fetched until the listener asks for it, and the context is created and resumed
  inside their gesture.** iOS grants an `AudioContext` nothing that is not claimed synchronously in
  the task the gesture started, so `start()` runs `ensureGraph`, `claimPlaybackOutput` and
  `context.resume()` before its first `await`. The track download comes after.
- **A viewpoint change hands one piece over to the next; it does not crossfade them.** These are
  four separate compositions, not four layers of one, so a proper equal-power overlap plays two
  piano melodies at 1/√2 each for several seconds and is heard as a pile-up. `SCENE_TRANSITION`
  therefore runs mostly sequentially — the outgoing piece fades for 2.5 s, the incoming one waits
  1.7 s and then fades in over 3.5 s — so they touch only near their quiet ends. Do not widen the
  overlap to "smooth" it; that is the thing that sounded wrong.
- **Fades are cos/sin, never exponential ramps from a floor.** Such a ramp is 50 dB down at its
  midpoint, which put four seconds of near-silence in the middle of every viewpoint change and made
  the four-second start fade inaudible until its last second. `crossfadeCurve` feeds
  `setValueCurveAtTime`. A deck carries a separate rise and fall gain because a value curve
  scheduled over one still running throws, and a deck retired mid-arrival is what two quick
  viewpoint changes look like.
- **An incoming track joins where the outgoing one had got to**, from `loopPositionAt` against a
  clock that starts with the music. Restarting each piece at its own head both resets the music on
  every viewpoint change and enters at the baked loop join, which is the one passage that is two
  parts of the piece layered over each other.
- **Every track swap must survive being superseded.** `playTrack` bumps a generation before it
  loads and drops a stale result, so two fast viewpoint changes leave one deck playing, not two. A
  failed load keeps the current track running: the wrong place is a better answer than silence.
- Reduced motion is live: media-query changes settle shots and freeze ambient shader/camera motion.
  Keep new animation behind that policy, including invalidation when a static scene changes.
- WebGL2 is required. `initialize()` throws `WEBGL2_UNAVAILABLE`, which `usePerigee` maps to the
  `CapabilityFallback` component. Asset load failures fall into the `'asset'` branch.
- Disposal is explicit and idempotent. Cancel asynchronous work before retiring resources, retain
  resources until compiler checks settle, and never dispose shared geometry on a hero swap.

## Assets

Runtime textures in `public/assets/objects/` have source-specific terms: NASA/USGS/Hubble
observational products, CC BY 4.0 Andromeda imagery, and the legacy Solar System Scope ring
colour. They are **not** relicensed by this repo. Any new asset needs an entry in `public/assets/ATTRIBUTIONS.md`,
`src/perigee/AssetManifest.ts`, and the object's `attributionIds`.

`thumbnail` must point at `public/assets/objects/thumbs/` (160x160 WebP), never at a full surface
map — the object browser renders all of them at once.

The star field's brightness distribution comes from the Yale Bright Star Catalog packed into
`public/assets/stars/bsc5.bin` by `scripts/star-catalogue.py`; a procedural field stands in until it
loads and if it fails.

Data maps must be named `*-normal.*`, `*-height.*` or `*-depth.*`; the texture cache uses these
suffixes to bypass sRGB conversion. `scripts/planet-assets.py` builds aligned physical terrain
from LOLA/MOLA. Scientific masters stay outside the repository. The earlier
`scripts/normal-maps.py` recipe is historical and produces exaggerated legacy normals.
New `/planets/` and `/andromeda/` assets intentionally bypass optional KTX2 siblings.

`scripts/audio.sh` prepares the ambient music with `ffmpeg` (`brew install ffmpeg`): it cuts a
loopable section out of each master, normalises it to −20 LUFS, bakes a four-second crossfade so the
file's end runs into its own start, encodes to 128 kbps MP3, names the file by its content hash and
rewrites `AudioManifest.ts`. The masters go in a git-ignored `tmp/audio-sources/` and are not kept
in the repository, following the normal-map DEM precedent. The crossfade order matters: the join is
the head of the file and the body follows it, so nothing is heard twice at the loop point.

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
- A visit with no query string lands on a random frame from `app/data/arrivals.ts` and approaches
  it from the real distance; `tests/arrival-frames.test.ts` keeps those frames inside the ladders
  and away from the hazard presets. Shared links and `/e/` routes bypass it. The arrival is
  deliberately random every time — the last sky is not remembered.
- What a returning visitor keeps lives in one versioned record under `perigee:settings`
  (`app/utils/settingsStore.ts`): the answer to the music offer, the volume, and the highest
  disclosure stage reached. `parseSettings` validates every field and drops the record whole on
  anything unexpected, so the worst case is a first visit. A record older than
  `SETTINGS_MAX_AGE_MS` (90 days) expires, and every write restamps it. The store is read once per
  page and cached; storage that is missing or refuses a write leaves the settings live for the page
  lifetime.
