# Perigee experience improvement plan

Status: core rendering-budget and smoothness implementation complete. Realism work
is partly implemented; source-dependent and measurement-dependent extensions are
explicitly deferred in section 13. Browser/runtime acceptance belongs to the user
and has not been performed by the coding agent.

Created: 2026-09-06.

Scope: UI smoothness and rendering performance; realism and visual quality of celestial objects first, landmarks and landscapes second.

Basis: the current repository review and focused Node diagnostics. This is an implementation plan, not a completed performance or visual audit. No measured FPS improvements, GPU timings, mobile results, or completed visual acceptance are claimed.

The user requested code analysis instead of further browser execution. The current implementation request authorizes code changes and automated checks, but excludes browser testing. No publication, deployment, or replacement-source acquisition has been performed. Future runtime checks below are acceptance work to perform when in scope, or to hand off to the user; until then, record them as pending rather than treating code tests as visual proof.

## 1. Intended outcome

Perigee should feel responsive while looking physically coherent: changing objects, distance, and landscape should form a continuous scene transition; the main object should retain crisp, credible detail; its lighting should make sense against the surrounding sky and ground; and the renderer should stay within an explicit device budget.

The experience should remain focused on the current object, distance, and viewpoint. Performance diagnostics, advanced settings, rendering parameters, and scientific qualifications must not accumulate on the resting interface. Use the existing More sheet and discovery disclosures where a user-facing control or explanation is necessary.

Success means:

- Rapid interaction never leaves an incomplete fade, stale object, incorrect size, mismatched background, or permanently busy interface.
- Rendering quality follows actual workload and resource limits, with stable changes that preserve the object's identity and scientific scale.
- First arrival loads the selected composition efficiently; later exploration avoids unnecessary downloads and unbounded resource retention.
- Planets, moons, stars, and Andromeda have appropriate surface and light behavior rather than sharing convenient but misleading effects.
- Motion is intentional, object-specific, and compatible with reduced motion.
- Landscapes gain convincing occlusion and light interaction without becoming an expensive full-world simulation.

## 2. Evidence and confidence

Use these evidence labels in implementation notes:

- **Confirmed code behavior:** directly established from the current implementation or a focused diagnostic.
- **Code-derived risk:** an execution path permits an undesirable result, but its frequency or visible severity has not been measured.
- **Proposed improvement:** a design or engineering change whose benefit needs comparison.
- **Measurement-dependent:** do not select a final configuration until comparable runtime evidence exists.

### Findings carried into this plan

| ID | Finding | Evidence | Planned work |
| --- | --- | --- | --- |
| F01 | Finishing a timeline suppresses callbacks, although render state is applied in callbacks. | Confirmed mechanism: `ShotDirector.finish()` calls `progress(1, true)`. A Node reproduction reached proxy value `1` while its callback-owned opacity stayed `0`. This reproduces the state-update mechanism, not a complete WebGL frame. | S1 |
| F02 | An object request is checked after loading, but not again after awaited shader compilation. | Code-derived race in `PerigeeScene.setObject()`. | S2 |
| F03 | Pending distance selection is validated against the currently committed engine object before the pending-object path. | Code-derived risk when a newly selected object's preset IDs differ from the outgoing object's IDs. | S2 |
| F04 | Distance completion updates state after an await without a request-generation check. | Code-derived stale-completion risk in `setDistance()`. | S1, S2 |
| F05 | Viewpoint changes move the hero and change the camera before the replacement plate has loaded; the returned promise does not cover the full plate fade. | Confirmed ordering in `PerigeeScene.setViewpoint()` and `createEnvironmentLayer`. | S3 |
| F06 | A new plate transition resets its mix to zero against the last committed plate. | Code-derived discontinuity if a second landscape is selected mid-fade. | S3 |
| F07 | Environment tint changes discontinuously at input strength `0.08`. | Confirmed calculation: `0.11` at the boundary; approximately `0.368` immediately above it. | S4 |
| F08 | The quality tier is selected permanently from reported memory and CPU count, with missing values defaulting to eight. | Confirmed in `QualityManager`. No GPU capability or workload measurement. | P1 |
| F09 | `setQuality()` changes settings while subsequent loads and lighting still consult the original `quality.current`. | Confirmed state inconsistency relevant to adding runtime adaptation. | P1 |
| F10 | High quality can combine 2x DPR, 4x multisampling, SMAA, and HDR postprocessing. | Confirmed configuration; its actual cost is unmeasured. | P2 |
| F11 | Every loaded texture remains cached until teardown; three landscapes use the same large asset in all tiers. | Confirmed in `TextureCache` and `environmentAssets`; current tests explicitly preserve that landscape behavior. | P3, P4 |
| F12 | Prefetch starts during idle time, but decode/upload completion is not constrained to an idle or interaction-safe window. | Confirmed scheduling structure; stall severity needs measurement. | P3 |
| F13 | Global preloads always request Rooftop and Saturn despite varied arrivals and routes. | Confirmed in `nuxt.config.ts` and `app/data/arrivals.ts`. | P5 |
| F14 | Reduced motion does not cover all renderer animation paths. | Confirmed: hero spin, star-field drift/twinkle, procedural animation, film time, and landscape fades need a policy beyond current checks. | S5 |
| F15 | All planets and stars use the same `0.018` radians/second spin; individual rotation periods are unused by this path. | Confirmed: approximately one revolution every 5.8 minutes. | R2 |
| F16 | Gas-giant relief is inferred from albedo gradients; Moon and Mars share the regolith branch. | Confirmed in `PlanetMaterial`. | R4, R5 |
| F17 | The ring shader casts the planet's shadow onto rings, but the planet shader has no corresponding ring-shadow term. | Confirmed material asymmetry. | R3 |
| F18 | Saturn's 4096x2048 texture was upscaled from 1774x887; three landscape plates were doubled from 1586x992. | Confirmed by asset provenance. File dimensions exceed native source detail. | R1, L1 |
| F19 | Scene lighting uses separate authored rules for exposure, palette, star opacity, bloom, glow, and ground tint. Planet glow does not use the computed resolved-light factor. | Confirmed in `applyShot`, `applyGlow`, and `createSkyScene`. | R0 |
| F20 | Environments are screen-space image plates with UV movement and luminance-based tinting, without geometry/depth-driven occlusion or reflections. | Confirmed in `createEnvironmentLayer`. | L1, L2 |
| F21 | `CameraRig.dispose()` does not remove its registered window resize listener; texture teardown does not explicitly close owned ImageBitmaps. | Confirmed cleanup omissions; cumulative impact is unmeasured. | S6, P3 |

## 3. Constraints and existing strengths to preserve

Read [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md), and [app/CLAUDE.md](../app/CLAUDE.md) before implementation. Read current source as the authority when a descriptive comment or older document differs from behavior.

- Preserve the Vue/engine boundary. Vue owns selections and controls; framework-independent modules under `src/perigee/` own rendering.
- Preserve the existing object IDs, shared-link format, preset aliases, five-rung ladders, and closest-to-farthest ordering unless an explicit product change requires otherwise.
- Preserve computed apparent size. Do not compensate for a visual problem by arbitrarily scaling the hero or changing preset distances.
- Treat the existing angular-size formula and diameter/distance conventions as a compatibility contract. Validate the UI number against rendered projection, including large nearby bodies and oblate silhouettes; any scientific correction requires a separately documented derivation and content/test update, not an incidental shader edit.
- Preserve shared geometry, URL deduplication, off-main-thread image decoding where available, asynchronous shader compilation, the lazy scene import, and bloom disabled for ordinary planets.
- Preserve normal-map orientation, tangent-space conventions, data color space, and the single V-flip contract across image and KTX2 paths.
- Preserve explicit disposal ownership. A hero swap must never dispose a texture or geometry still used by another object or transition.
- Preserve the minimal resting UI, stable control placement, keyboard navigation, focus restoration, and staged disclosure.
- Follow the stylesheet order, Tailwind-first rule, token mirroring, breakpoints, and named transitions in `app/CLAUDE.md` when UI changes are needed.
- Preserve the existing sound behavior. This plan does not redesign the music, replace tracks, or widen crossfade overlap. Scene completion changes must be checked against the existing audio handoff.
- Preserve capture correctness, source disclosures, capability fallback, curated encounters, and supported route rendering.
- Do not split Three.js internals simply to silence a bundle-size warning. Bundle work must address measured loading or execution cost.
- Do not introduce a WebGPU migration, new engine, full planetarium, weather simulation, path tracer, or fully modeled open world as a prerequisite.
- Do not add user-facing quality controls unless they solve a demonstrated need. If needed, place a compact preference in More.
- Record new runtime assets and derivatives in the attribution record, manifest, and relevant object/content records before shipping them.

## 4. Delivery order and progress tracker

Priority indicates recommended order, not measured benefit. Task checkboxes below preserve the original acceptance checklist; current implementation evidence and explicit deferrals are in section 13. Implemented does not mean visually accepted.

| Chunk | Priority | Deliverable | Dependencies | Status |
| --- | --- | --- | --- | --- |
| B0 | Foundation | Baseline inventory and acceptance scenarios | None | Inventory recorded |
| S1 | Critical | Correct finish/interruption semantics | B0 | Implemented; runtime pending |
| S2 | Critical | Safe asynchronous object/distance transitions | S1 | Implemented; runtime pending |
| S3 | High | Coordinated and interruptible viewpoint transitions | S1, S2 | Implemented with queued-blend policy |
| S4 | High | Continuous environment tint response | B0 | Implemented; unit-tested |
| S5 | High | Complete reduced-motion policy | S1, S3 | Implemented; runtime pending |
| S6 | High | Renderer lifecycle and recovery cleanup | S1, S2 | Implemented; recovery runtime pending |
| P1 | High | Single quality state and adaptation policy | B0, S6 | Implemented; thresholds provisional |
| P2 | High | Pixel, antialiasing, and postprocessing budgets | P1 | Implemented; edge review pending |
| P3 | High | Bounded texture residency and safe upload scheduling | P1, S6 | Implemented; estimates only |
| P4 | High | Resolution variants for every environment | P3 | Landscape variants implemented; surface LOD deferred |
| P5 | Medium | Selection-aware first load and prefetch | P3, P4 | Implemented; cold-load review pending |
| P6 | Medium | Screen-size-driven shader work and idle rendering policy | P1, P2, S5 | Implemented; runtime pending |
| R0 | High | Shared exposure, visibility, and atmosphere model | S4, P1 | Partial; appearance contract implemented |
| R1 | High | Native-detail asset specification and source audit | B0 | Audited; replacement source deferred |
| R2 | High | Body-specific orientation and motion | S5, R0 | Implemented; orientation review pending |
| R3 | High | Saturn rings, shadows, and atmosphere | R0, R1, R2 | Implemented; visual review pending |
| R4 | Medium | Jupiter and Neptune cloud-lighting response | R0, R1, R3 | Implemented; visual review pending |
| R5 | Medium | Moon and Mars material separation | R0, R1, R2 | Implemented; visual review pending |
| R6 | Medium | Stellar color, photosphere, and optical appearance | R0, R1, R2, P6 | Motion/detail implemented; color calibration deferred |
| R7 | Medium | Andromeda observational/hybrid comparison | R0, R1, P6 | Procedural retained; comparison documented |
| L1 | Secondary | Layered environments and landmark source fidelity | P4, R0, R1 | Source-dependent layers deferred |
| L2 | Secondary | Foreground occlusion, water, and localized lighting | L1 | Source-dependent effects deferred |
| V1 | Release | Integration, evidence, documentation, and handoff | Accepted implementation chunks | Automated validation and handoff complete |

Recommended sequence:

1. Establish the code baseline, fix transition correctness, remove the tint discontinuity, and complete lifecycle/reduced-motion work.
2. Establish quality/resource budgets and improve loading without changing the artistic look in the same patch.
3. Introduce shared lighting and use Saturn as the first complete object-quality reference.
4. Extend the approach to the remaining object families, then improve scene depth.
5. Complete integration and record automated and visual evidence separately.

R1 source research can proceed independently of transition implementation once that work is requested. Do not block concrete correctness fixes on asset acquisition or broad visual research.

## 5. Baseline and acceptance preparation

### B0 — Establish a repeatable baseline

Primary files: [package.json](../package.json), [PerigeeScene.ts](../src/perigee/PerigeeScene.ts), [objects.ts](../app/data/objects.ts), [arrivals.ts](../app/data/arrivals.ts), [environmentAssets.ts](../src/perigee/scenes/environmentAssets.ts), and existing tests.

Tasks:

- [ ] Record the implementation commit and any existing working-tree changes before changing code.
- [ ] Use the Node version required by `package.json` (currently Node 24 or newer). The earlier standalone diagnostic initially encountered a Node 20 shell; do not confuse a tooling-version mismatch with an application failure.
- [ ] Inventory quality settings, render-target formats, postprocessing passes, active asset variants, cached texture ownership, and animation loops.
- [ ] Record actual texture dimensions, native source dimensions, transfer sizes, estimated decoded CPU memory, estimated GPU residency, and compressed variants separately.
- [ ] Capture the existing behavior of shared links, fresh random arrivals, object changes, distance changes, landscape changes, captures, and encounter interruption in deterministic tests where practical.
- [ ] Establish an internal diagnostics interface that can report active tier, effective DPR, buffer dimensions, render-target estimates, resident/pending assets, active transition IDs, and enabled effects without adding normal UI clutter.
- [ ] Define optional timing markers for selection-to-feedback, asset-ready, shader-ready, transition-start, transition-end, and first usable scene.
- [ ] Keep local diagnostic output separate from production analytics; do not add telemetry collection merely to implement quality management.
- [ ] When runtime work is in scope, collect production-build baselines using the same selection, viewport, DPR, cache state, motion preference, and browser foreground state.

Acceptance:

- Every later comparison names its baseline and configuration.
- Resource estimates are labeled as estimates, not direct GPU-memory measurements.
- No performance targets are declared achieved from unit tests or development-server observations.

## 6. Smoothness, state, and lifecycle

### S1 — Separate finishing from interrupting a shot

Primary files: [ShotDirector.ts](../src/perigee/ShotDirector.ts), [PerigeeScene.ts](../src/perigee/PerigeeScene.ts), [shot-director.test.ts](../tests/shot-director.test.ts).

Problem: `finish()` suppresses `onUpdate`, and `replace()` calls `finish()`. Merely resolving a timeline's promise does not guarantee callback-owned uniforms or transforms reach the intended state. Finishing every old shot also conflicts with smoothly retargeting from the current visual state.

Tasks:

- [ ] Define explicit semantics for normal completion, replacement/interruption, tab-hide settlement, and disposal.
- [ ] Make a normal finish apply the complete final render state exactly once, including uniforms updated through proxy objects.
- [ ] Make interactive replacement preserve the current rendered state and use it as the next shot's origin.
- [ ] Consider an internal typed completion result (`completed`, `interrupted`, `disposed`) so callers can avoid applying final-state work after cancellation. The public controller can remain promise-based.
- [ ] Centralize final-state application or animate actual state owners where safe. Do not rely on suppressed callbacks accidentally updating a mesh.
- [ ] Guard all post-await finalization in distance/object callers against an obsolete shot identity.
- [ ] Ensure each promise settles exactly once even if interruption, hide, and disposal occur close together.
- [ ] Preserve cleanup of outgoing heroes without allowing an older completion to remove a newly active hero.

Regression cases:

- Finish a proxy-driven opacity animation before its first tick: actual opacity must reach the final value.
- Finish a proxy-driven log-radius animation: mesh scale, stored radius, point size, glow, and reported diameter must agree.
- Replace a distance animation halfway through: the new animation begins at the current scale, not the abandoned destination.
- Replace an object fade with a distance change and with another object change.
- Hide and resume during an object fade; dispose during a fade; issue repeated finish/kill calls.

Acceptance: no unresolved promises, stale finalization, incomplete opacity, or discontinuous forced endpoint during ordinary retargeting.

### S2 — Make object loading and distance selection transactional

Primary files: `PerigeeScene.setObject`, `PerigeeScene.setDistance`, [usePerigee.ts](../app/composables/usePerigee.ts), [perigee.ts](../app/types/perigee.ts).

Tasks:

- [ ] Represent the pending object selection explicitly, including object ID, selected preset, request generation, and lifecycle state.
- [ ] Resolve distance requests against the pending object's preset list when an object is loading; do not validate first against the outgoing object.
- [ ] Check request identity and disposed state after every asynchronous boundary, including texture load and shader compilation.
- [ ] Keep the outgoing scene valid while preparing the replacement. Avoid publishing new active pointers or lighting before the replacement is ready to own the transition.
- [ ] Dispose stale prepared materials and release their resource leases without affecting shared textures still in use.
- [ ] Clear pending selection on every failure path. A failed load must not leave future distance requests stuck in a pending branch.
- [ ] Preserve immediate UI feedback while distinguishing requested selection from the renderer's committed selection internally.
- [ ] Ensure error rollback restores a coherent object/preset/viewpoint combination in both the composable and engine.
- [ ] Coordinate with S1 so stale distance completions cannot apply old radius/glow state to a newer object.

Regression cases:

- Moon to Saturn while selecting a Saturn-only preset during loading.
- A to B to C where B finishes loading or compiling after C.
- Object load failure followed by a distance change, retry, or different object selection.
- Disposal while compilation is outstanding.
- Simultaneous encounter selection of an object, distance, and viewpoint.

Acceptance: the latest valid requested selection wins; no superseded request starts a new visible shot or changes the active lighting.

### S3 — Coordinate landscape, camera, hero placement, and completion

Primary files: `PerigeeScene.setViewpoint`, `applyViewpointCamera`, `placeHeroForCurrentViewpoint`, [createEnvironmentLayer.ts](../src/perigee/scenes/createEnvironmentLayer.ts), `usePerigee.selectViewpoint`.

Tasks:

- [ ] Prepare the target plate before committing a camera/FOV/hero-position change that depends on it.
- [ ] Define one transition progress value or equivalent coordinated timeline for the plate, camera, hero placement, and scene lighting.
- [ ] Interpolate placement and FOV without changing the intended angular-size contract. Recompute projected size and locator coordinates from the same current camera state.
- [ ] Handle the special portrait Cabo composition and its wider FOV without a one-frame jump.
- [ ] Make completion semantics explicit: the controller promise should represent a visibly settled scene, not only a completed download.
- [ ] Make a second viewpoint choice begin from the currently visible blend. Compare a bounded transition snapshot with retaining the active pair of plates; choose the lowest-memory solution that preserves continuity.
- [ ] Include any temporary blend target in the resource budget and release it after completion/cancellation.
- [ ] Keep a failed replacement on the last valid scene and preserve retry behavior.
- [ ] Ensure tab hide, resize, orientation change, capture, and encounter interruption have deterministic settlement behavior.
- [ ] Check that the existing audio handoff still follows the requested viewpoint without acquiring a second competing transition controller.

Acceptance: fast A-to-B-to-C changes do not flash back to A; title/selection, background, camera, and hero settle on C; reduced motion uses the policy in S5.

### S4 — Remove the tint discontinuity as an isolated fix

Primary files: `createSkyScene.setGlow`, `PerigeeScene.applyGlow`.

Tasks:

- [ ] Replace the branch at strength `0.08` with a continuous bounded response function.
- [ ] Extract the response into a pure helper so its curve and boundary behavior can be tested independently of WebGL.
- [ ] Preserve the intended low-light restraint and upper bound; do not introduce a broad exposure redesign in this patch.
- [ ] Sample the curve around the former boundary and across the full supported input range.
- [ ] Verify the response remains finite, continuous, and monotonic where increasing light should increase tint strength.
- [ ] Check zero-strength behavior explicitly: decide which baseline ambient tint is authored and which contribution should disappear with the hero.

Acceptance: infinitesimally different light strengths cannot produce the current approximately 0.258 jump in tint strength. Full shared lighting follows in R0.

### S5 — Apply reduced motion consistently

Primary files: [CameraRig.ts](../src/perigee/CameraRig.ts), `PerigeeScene.render`, [createSkyScene.ts](../src/perigee/scenes/createSkyScene.ts), [StellarMaterial.ts](../src/perigee/materials/StellarMaterial.ts), [GlareMaterial.ts](../src/perigee/materials/GlareMaterial.ts), [StarPointMaterial.ts](../src/perigee/materials/StarPointMaterial.ts), [FilmEffect.ts](../src/perigee/effects/FilmEffect.ts), `createEnvironmentLayer`, `app/CLAUDE.md`.

Tasks:

- [ ] Define a shared motion policy: direct user input remains available; ambient motion stops; transitions use an immediate update or short opacity-only change where appropriate.
- [ ] Apply it to hero spin, star-field drift/twinkle, photosphere animation, glare breathing, optical-point twinkle, film/grain time, meteors, arrival approaches, and background fades.
- [ ] Preserve static dithering if needed for banding prevention; do not require temporal noise merely to avoid gradient artifacts.
- [ ] Observe changes to the media query during the session and clean up its listener on disposal.
- [ ] Preserve direct drag behavior while removing incidental hover motion.
- [ ] Audit CSS transitions against the existing global reduced-motion treatment before adding component-specific exceptions.
- [ ] Ensure the idle-rendering policy in P6 can recognize a settled reduced-motion scene.

Acceptance: a settled reduced-motion scene has no unsolicited visible animation, and all controls still operate without waiting through cinematic travel.

### S6 — Complete cleanup, resize, and context recovery

Primary files: `CameraRig.dispose`, `PerigeeScene.initialize/pause/resume/dispose/resize`, [PerigeeShell.vue](../app/components/PerigeeShell.vue), `TextureCache`, [TextureCompression.ktx2.ts](../src/perigee/TextureCompression.ktx2.ts).

Tasks:

- [ ] Remove the camera's window resize listener during disposal.
- [ ] Track and cancel pending idle callbacks, timeout fallbacks, warmup work, and pending resource jobs.
- [ ] Audit the lifecycle of the module-level neutral normal texture, shared geometries, warmup materials, texture renderer handle, and optional KTX2 loader/workers.
- [ ] Make initialization failure clean up partially constructed resources and permit a clean retry.
- [ ] Handle WebGL context loss by pausing work and preserving selection; implement restoration or a clear recoverable fallback using the existing capability/error surface.
- [ ] Do not assume a context-restored texture can reuse a closed CPU bitmap: coordinate source retention/reload with P3.
- [ ] Deduplicate resize work when effective dimensions and DPR are unchanged.
- [ ] Avoid reallocating full render targets for every resize callback; preserve correct camera aspect and responsive framing while buffer changes settle.
- [ ] Ensure repeated mount/dispose cycles leave no accumulating listeners, worker pools, frame callbacks, or pending transitions.

Acceptance: disposal is idempotent, asynchronous completion cannot resurrect disposed rendering work, and recovery returns to a valid selection without restarting unrelated product state.

## 7. Performance and resource budgets

### P1 — Introduce one authoritative quality state

Primary files: [QualityManager.ts](../src/perigee/QualityManager.ts), `PerigeeScene.setQuality/createHero/applyShot/applyGlow/warmCaches`, [quality-manager.test.ts](../tests/quality-manager.test.ts).

Tasks:

- [ ] Store current effective quality explicitly and route all material creation, asset selection, bloom settings, prefetch, and resizing through it.
- [ ] Use memory/CPU hints only to choose an initial conservative configuration, not as proof of GPU performance.
- [ ] Account for viewport pixels, DPR, available capabilities, and active object/effect workload.
- [ ] Separate CPU long-task or scheduling delays from GPU execution time. Use non-blocking timer queries where available, discard disjoint/invalid results, and never busy-wait for a result.
- [ ] Provide a conservative fallback when timer queries or device hints are unavailable. A moving frame-pacing window can indicate missed deadlines but must not be labeled GPU timing.
- [ ] Add hysteresis, warmup exclusion, minimum dwell times, and asymmetric recovery so tiers do not oscillate.
- [ ] Ignore hidden-tab timing and reset observation windows appropriately after resume or major resize.
- [ ] Prefer changing render resolution/effect cost before switching away from an important surface map.
- [ ] Ensure in-flight resources and newly created heroes use the same effective policy after a change.
- [ ] Keep quality diagnostics internal. A manual preference is optional and should be introduced only if automatic behavior needs an understandable override.

Acceptance: pure policy tests cover missing hints, invalid timings, sustained overload, isolated spikes, recovery, and no rapid oscillation. Changing quality persists across object/viewpoint swaps.

### P2 — Budget pixels, antialiasing, and postprocessing independently

Primary files: `PerigeeScene.initialize/setQuality/resize/setAntialiasing`, `FilmEffect`.

Tasks:

- [ ] Define tier configurations for maximum drawing-buffer pixels, DPR ceiling, multisampling, SMAA, bloom resolution/levels, and optional effects.
- [ ] Compute an effective DPR bounded by both tier DPR and a pixel budget. Candidate relationship: `min(deviceDpr, tierDprCap, sqrt(maxPixels / (cssWidth * cssHeight)))`; choose practical lower limits from evidence.
- [ ] Account for render-target format, depth buffers, multisample storage, ping-pong buffers, and bloom intermediates in estimates.
- [ ] Compare high-quality MSAA+SMAA with carefully selected alternatives. Preserve ring edges and small-body silhouettes; do not remove antialiasing merely because a pass looks redundant on paper.
- [ ] Preserve final-pass ordering: tone mapping/output treatment before SMAA, and exactly one appropriate final pass writing to screen.
- [ ] Skip the bloom pass when the active contribution is effectively zero, including unresolved stars if no other intended source needs it; preserve stable transitions into and out of the pass.
- [ ] Prefer lower-resolution bloom and constrained glare coverage over blurring the hero texture.
- [ ] Verify capture paths use a coherent, budgeted output size and do not silently allocate a second unbounded full-resolution pipeline.
- [ ] Keep quality-specific edge, banding, and detail comparisons independent of material changes.

Acceptance: buffer size is bounded on large/high-DPR screens; no black frame when passes toggle; safe quality remains legible; any antialiasing change has explicit edge-quality evidence when runtime review becomes available.

### P3 — Bound texture residency and separate loading stages

Primary files: [TextureCache.ts](../src/perigee/TextureCache.ts), `TextureCompression.ktx2.ts`, `PerigeeScene.createHero/warmCaches/dispose`, `createEnvironmentLayer`.

Current estimates, assuming uncompressed RGBA8 plus a full mip chain:

- A 4096x2048 surface is approximately 42.7 MiB of GPU texture storage.
- A 3172x1984 plate is approximately 32.0 MiB.
- CPU-side decoded images, compressed source bytes, normal maps, and render targets are additional costs.
- These are analytical estimates; formats, driver allocations, and compressed variants change actual residency.

Tasks:

- [ ] Track asset state separately: requested, downloaded, decoded, uploaded, resident, failed, and retired.
- [ ] Retain URL deduplication and failed-load retry behavior.
- [ ] Add explicit resource leases/reference counts or equivalent pinning for active heroes, outgoing/incoming transitions, and required captures.
- [ ] Define tier-specific residency budgets and an eviction policy for unpinned assets, such as least recently used.
- [ ] Keep the active asset and a bounded set of likely next choices resident. Do not automatically upload the whole catalogue on every capable device.
- [ ] Separate network/decode prefetch from GPU upload; queue expensive uploads against a bounded work budget and pause speculative work during interaction.
- [ ] Give demand loads priority over speculative loads and coalesce duplicate requests.
- [ ] Respect Save-Data and use connection hints only when available; absent hints must not prevent normal use.
- [ ] Cancel obsolete jobs and prevent post-dispose uploads or warmups.
- [ ] Explicitly close cache-owned ImageBitmaps when resources are truly retired. Retain or reload source data when context restoration needs it.
- [ ] Dispose compressed texture loaders/workers at the appropriate lifecycle boundary.
- [ ] Keep KTX2 optional until transfer size, transcode latency, format quality, and residency are compared. Do not assume it improves every asset or device.

Regression cases: shared texture in two transitioning heroes; eviction during an active fade; demand request overtaking prefetch; failure followed by retry; disposal during decode; revisiting an evicted object; context restore after eviction.

Acceptance: tracked residency stays within the configured budget apart from explicitly bounded active-transition overhead, and eviction never invalidates an active draw.

### P4 — Add appropriate landscape and surface variants

Primary files: [environmentAssets.ts](../src/perigee/scenes/environmentAssets.ts), [AssetManifest.ts](../src/perigee/AssetManifest.ts), asset conversion scripts, [environment-assets.test.ts](../tests/environment-assets.test.ts), [ATTRIBUTIONS.md](../public/assets/ATTRIBUTIONS.md).

Tasks:

- [ ] Generate safe and balanced variants for Rooftop, Hilltop, and Lakeside, using the same crop and color treatment as the current source.
- [ ] Evaluate portrait-specific crops when a generic crop removes an important horizon or landmark; do not generate variants without a framing benefit.
- [ ] Preserve Cabo's orientation-specific asset selection and make all viewpoints use a consistent variant-selection interface.
- [ ] Choose surface detail using projected pixel demand as well as tier. Large close-up objects may justify a detailed map while a small distant object does not.
- [ ] Avoid flicker and texture churn at selection thresholds; use stable thresholds and retain the current asset during active transitions where possible.
- [ ] Preserve normal/albedo alignment across variants. Do not resample or flip one independently in a way that moves relief relative to visible features.
- [ ] Update the test that currently asserts safe and high Rooftop assets are identical; replace it with explicit quality/crop/orientation contracts.
- [ ] Update warmup lists so they request only variants relevant to the current orientation and budget.
- [ ] Record native source resolution separately from delivered dimensions.

Acceptance: every viewpoint has a budget-appropriate path; switching variants preserves composition and color; safe quality no longer requires the same large plate as high quality.

### P5 — Prioritize the selected first scene

Primary files: [nuxt.config.ts](../nuxt.config.ts), `usePerigee.initialize`, `arrivals.ts`, curated route entry points, `TextureCache`.

Tasks:

- [ ] Resolve the initial selection once, early enough to prioritize its actual plate and hero assets.
- [ ] Ensure random arrival selection is not performed twice by separate preload and initialization paths.
- [ ] Replace unconditional Saturn/Rooftop preload behavior with route/selection-aware hints where possible, or remove hints that consistently prioritize the wrong assets.
- [ ] Preserve the distinction between static prerendered encounter metadata and client-side query selection; arbitrary shared queries cannot be assumed known at build time.
- [ ] Match fetch mode and credentials so preloads can be reused rather than downloaded twice.
- [ ] When KTX2 is enabled, prioritize the variant the loader actually requests and preserve its fallback behavior.
- [ ] Stage speculative prefetch after first usable rendering, then prioritize likely next objects/viewpoints using existing product flows rather than loading everything.
- [ ] Keep progress reporting honest about what is ready, while preserving the existing music-entry behavior.
- [ ] Check cold and warm entry for all six arrival frames, explicit shared links, and curated encounter routes when runtime checks are in scope.

Acceptance: the first selected scene is not delayed by an unrelated preload; one visit produces one arrival choice; cache reuse and error fallback remain correct.

### P6 — Scale shader work to the visible result

Primary files: `StellarMaterial`, [GalaxyMaterial.ts](../src/perigee/materials/GalaxyMaterial.ts), `GlareMaterial`, `createMeteorLayer`, `PerigeeScene.render`.

Tasks:

- [ ] Combine projected size, pixel derivatives, and effective quality to fade out procedural frequencies that cannot be resolved.
- [ ] Use smooth detail changes where possible; avoid creating many shader variants that cause compilation stalls.
- [ ] Evaluate cached procedural Andromeda textures because its appearance is static. Define cache keys for material parameters and sufficient output resolution; preserve tone mapping and dust-lane contrast.
- [ ] Compare procedural, baked, and observational/hybrid Andromeda options within the same texture budget in R7. Baking is a candidate, not a mandatory rewrite.
- [ ] Bound glare and other transparent geometry to meaningful coverage where feasible. Avoid unnecessary full-screen fragment work for a small effect.
- [ ] Consider a tight meteor quad or bounded effect region if profiling shows its currently full-screen shader matters. Keep its rare schedule and subtle appearance.
- [ ] Make settled reduced-motion scenes eligible for on-demand rendering; invalidate on input, resize, selection, resource arrival, recovery, or capture.
- [ ] For normal motion, consider a lower idle cadence only if it preserves smooth transitions and avoids visible stepping in stars or grain. Do not throttle active dragging or guided shots arbitrarily.
- [ ] Preserve hidden-tab suspension and one authoritative animation/render loop.

Acceptance: small objects avoid unresolvable detail work, detail transitions do not shimmer, and render scheduling never misses a state change or returns a stale capture.

## 8. Shared realism and asset foundations

### R0 — Unify exposure, atmosphere, and visibility

Primary files: `PerigeeScene.applyShot/applyGlow/applyStarAppearance/updateHeroScreen`, `createSkyScene`, `createEnvironmentLayer`, [stellarAppearance.ts](../src/perigee/math/stellarAppearance.ts), material shaders, `app/types/perigee.ts`.

Tasks:

- [ ] Define a documented scene-appearance contract with separate physical inputs and authored presentation parameters.
- [ ] Keep color values and lighting calculations in a consistent linear/HDR space, with a single intentional output conversion/tone-mapping path.
- [ ] Separate surface radiance, total incident illumination, angular extent, observer exposure, atmospheric scattering, and optional locator treatment.
- [ ] Do not apply inverse-square dimming blindly to every pixel of a resolved extended source. Distinguish surface brightness from integrated flux and environmental illumination.
- [ ] Derive background-star suppression, object glare, bloom eligibility, and ground/sky contribution from coherent inputs instead of unrelated constants.
- [ ] Make environmental contribution continuous through every preset and point-to-disc transition.
- [ ] Gate the authored glow of visually unresolved/invisible objects according to the existing product contract; do not interpret locator visibility as permission to illuminate the landscape.
- [ ] Apply foreground atmospheric extinction/haze consistently to objects and the sky, based on elevation and viewpoint conditions. Keep it separate from intrinsic planetary atmosphere and surface shading.
- [ ] Preserve readable close-up detail with an intentional exposure adaptation curve and bounded response time rather than arbitrary per-effect compensation.
- [ ] Interpolate appearance parameters with the scene transition; avoid one-frame palette or exposure switches while the outgoing object remains visible.
- [ ] Keep optical glare restrained and identify it as an observer/camera effect, not a resolved stellar corona.
- [ ] Document impossible-proximity illumination as authored where a full physical environment response is not simulated.
- [ ] Review exposure, atmosphere, and visibility behavior across all object families before tuning one family to compensate for a pipeline issue.

Acceptance: brightness transitions have no threshold jumps, hidden objects leave no detached authored halo, stars and landscape respond coherently, and one object's material no longer needs contradictory corrections for the shared tone pipeline.

### R1 — Define and audit real source detail

Primary files: `public/assets/objects/`, `public/assets/environments/`, `ATTRIBUTIONS.md`, `AssetManifest.ts`, [objects.ts](../app/data/objects.ts), asset preparation scripts.

Tasks:

- [ ] Create an asset inventory with source, author, license, native dimensions, delivered dimensions, wavelength/color interpretation, projection, modifications, and intended closest usable view.
- [ ] Calculate required source detail from projected object size and visible texture coverage; a displayed hemisphere does not use the whole equirectangular map at uniform density.
- [ ] Identify limitations caused by source resolution separately from texture filtering, normal-map detail, exposure, or atmosphere.
- [ ] Prioritize replacing genuinely limiting sources, particularly Saturn's upscaled map, before increasing delivered dimensions.
- [ ] Prefer traceable observational/reference-based maps where feasible. Check for baked directional lighting, seams, stitching artifacts, exaggerated color, and reconstruction of unmapped regions.
- [ ] Preserve appropriate latitude/longitude orientation and document conventions so color, height, and normal data agree.
- [ ] Specify a per-asset transfer/residency budget and a fallback before introducing a larger source.
- [ ] Keep high-resolution source masters outside runtime delivery unless required. Preserve a reproducible conversion command/script and source provenance.
- [ ] Update attribution IDs accurately; the current Saturn material source is AI-assisted artwork even though the object's attribution IDs currently point to the general texture collection.
- [ ] Regenerate thumbnails and public captures only after the final material/asset combination is accepted, so browser choices and social images match the scene.

Acceptance: delivered dimensions are not described as native detail, all new runtime assets have traceable provenance, and larger files have an explicit visual use case.

### R2 — Make orientation and motion body-specific

Primary files: `objects.ts`, `PerigeeScene.createHero/render`, `CameraRig`, material time uniforms.

Tasks:

- [ ] Replace the common spin rate with explicit per-body rotation behavior derived from source data and a documented display-time policy.
- [ ] Decide whether the normal view uses real-time motion, one shared time-compression factor, or a deliberately authored capped rate. Do not silently imply real time while showing minute-long rotations.
- [ ] Preserve relative body behavior where using a shared time scale; avoid making every body complete a turn at the same speed.
- [ ] Keep the Moon's Earth-facing presentation stable by default; any libration should be restrained and sourced rather than continuous globe rotation.
- [ ] Use object orientation data consistently. Audit `objectPitch`, which is recorded but not applied by the current common group rotation.
- [ ] Keep body tilt, spin axis, and Saturn's ring plane geometrically consistent. Spin the body around its local axis without precessing the whole placement group.
- [ ] Keep Andromeda static and avoid equating photosphere convection with solid-body rotation on stars.
- [ ] Document the background-star drift as authored, or replace it with a coherent selected sky orientation/time policy. Full live-location planetarium behavior is outside scope.
- [ ] Apply S5 motion policy and define whether time pauses while the tab is hidden; avoid discontinuous jumps on resume.

Acceptance: motion communicates the object's character, ring orientation does not wander, and no body uses an unexplained common 5.8-minute day.

## 9. Celestial object improvements

### R3 — Make Saturn the first complete realism reference

Primary files: [PlanetMaterial.ts](../src/perigee/materials/PlanetMaterial.ts), [RingMaterial.ts](../src/perigee/materials/RingMaterial.ts), `PerigeeScene.createHero/updateHeroLighting`, Saturn's object record and asset maps.

Tasks:

- [ ] Establish a small reference set of natural-color Cassini views covering lit rings, unlit rings, the planet's shadow on rings, and ring shadows on the planet.
- [ ] Keep the Sun direction and coordinate transforms identical between planet shading and ring shading.
- [ ] Align the ring plane with the oblate body's equator, using the same local orientation basis.
- [ ] Implement the ring-to-planet shadow by intersecting the surface-to-Sun ray with the ring plane and sampling the ring's radial opacity/optical-depth profile.
- [ ] Handle grazing rays, nearly parallel Sun directions, front/back intersections, and ring inner/outer edges without division instability or seams.
- [ ] Account for the oblate body in the existing planet-to-ring shadow as far as the chosen approximation requires; do not assume a spherical shadow is exact.
- [ ] Derive penumbra softness from a documented approximation instead of adding a fixed blur that erases narrow features.
- [ ] Separate ring transmission from reflection and use optical depth/viewing geometry to control the lit and unlit faces.
- [ ] Preserve the Cassini Division and fine radial structure with appropriate filtering and pixel-footprint-aware smoothing.
- [ ] Audit transparent sorting and body/ring intersections throughout fades; the near ring must not incorrectly disappear behind the body or show the background through an opaque planet.
- [ ] Replace cloud-color-derived bumpiness with an appropriate atmosphere response and restrained highlights.
- [ ] Evaluate a genuinely detailed Saturn source map under the shared exposure model; do not bake shadows or limb lighting into the albedo.
- [ ] Preserve readable cream/band coloration without a universal gold tint or compensating overexposure.

Validation:

- Deterministic math tests for ring-plane intersection, shadow direction, boundaries, and finite output.
- All five distances; desktop and portrait framing; lit/unlit ring cases; extreme Sun-angle diagnostic configurations.
- Edge quality on every tier, plus repeated object swaps and interrupted fades.

Acceptance: both directions of cast shadow agree, the rings belong to the same physical body, and detail remains stable under motion without a seam or artificial dark belt.

### R4 — Improve Jupiter and Neptune cloud response

Primary files: `PlanetMaterial.ts`, Jupiter/Neptune records, surface assets, shared lighting helpers.

Tasks:

- [ ] Stop inferring hard surface slopes directly from brightness differences in the cloud color map.
- [ ] Introduce separate, restrained cloud-lighting parameters for gas giants and ice giants, with body-specific color and limb response.
- [ ] Preserve Jupiter's band/storm contrast without sharpening halos, excessive specular glints, or a general atmospheric wash over the whole disc.
- [ ] Verify Neptune color against the selected natural-color reference and document any enhanced-color source treatment.
- [ ] Use cloud-height or normal information only when it is supported by a source or an explicitly documented approximation.
- [ ] Consider latitude-dependent cloud motion only as a later enhancement if it preserves recognizable features and has a clear time-scale policy; it is not required for the first material improvement.
- [ ] Keep atmosphere sampling bounded and avoid introducing expensive volumetric rendering as a default.

Acceptance: the planets read as atmospheric bodies, not polished rocky spheres; source cloud detail survives the shared lighting pipeline and all quality tiers.

### R5 — Separate Moon and Mars surface behavior

Primary files: `PlanetMaterial.ts`, [scripts/normal-maps.py](../scripts/normal-maps.py), Moon/Mars records and maps.

Tasks:

- [ ] Give the Moon an airless material response with justified regolith scattering, opposition behavior, and limited night-side contribution.
- [ ] Treat Earthshine as a separate physical/authored contribution rather than a blue atmospheric rim on the Moon.
- [ ] Give Mars its own dusty surface response and thin atmosphere rather than reusing the lunar branch wholesale.
- [ ] Verify measured normal-map alignment, tangent handedness, pole behavior, and strength under several Sun directions.
- [ ] Review the documented relief exaggeration factors (Moon 1.8x, Mars 5.2x) against the selected source and target view. Keep any exaggeration disclosed.
- [ ] Do not claim normal mapping produces actual crater cast shadows: it changes local shading but does not model displaced geometry or shadowing.
- [ ] Evaluate height/parallax or mesh displacement only for close views that resolve its benefit. Include its additional samples, geometry, and shadow approximation in the performance budget.
- [ ] Avoid applying displacement at distant presets where it cannot improve a pixel.
- [ ] Keep the terminator detailed without turning normal-map noise into a jagged silhouette or broad dark artifacts.

Acceptance: Moon and Mars have distinct plausible light responses, elevation agrees with surface features, and any added relief earns its cost at the supported close distances.

### R6 — Calibrate stars as light sources

Primary files: `StellarMaterial.ts`, `GlareMaterial.ts`, `StarPointMaterial.ts`, `stellarAppearance.ts`, stellar records in `objects.ts`.

Tasks:

- [ ] Add only the sourced stellar properties needed by the chosen appearance model, such as effective temperature and a brightness/luminosity reference with uncertainty where relevant.
- [ ] Derive a plausible visible color from those properties through the shared exposure pipeline, keeping UI accent color independent from emitted-light color.
- [ ] Make Sirius and Rigel read as hot luminous sources with restrained surface contrast; avoid treating the current blue marbling as observed surface structure.
- [ ] Make Betelgeuse's convection irregular and low-frequency rather than a repeated cellular pattern. Use wavelength-aware observational references to constrain character, not as literal visible-color textures when the observation is infrared/radio.
- [ ] Separate convection timescale, spin, observer glare, and point-source scintillation.
- [ ] Keep the compact unresolved point and continuous transition to the resolved disc; check CSS-pixel versus drawing-buffer-pixel conventions across DPR and resize.
- [ ] Ensure surface, point, halo, bloom, and landscape contribution cannot double-count brightness during the transition.
- [ ] Keep any photospheric burnout gradual and exposure-dependent. Preserve restrained limb detail without adding a detached luminous ring.
- [ ] Apply size-aware noise filtering from P6 so texture patterns do not crawl as the star moves or shrinks.
- [ ] Preserve the existing product rule that an invisible/unresolved object must not leave a large authored environmental glow.

Acceptance: each star has a distinct but plausible character, unresolved sources remain compact, and proximity does not turn the surface into an unrelated decorative effect.

### R7 — Compare Andromeda representation options

Primary files: [GalaxyMaterial.ts](../src/perigee/materials/GalaxyMaterial.ts), Andromeda's `disc` data, [scripts/andromeda-thumb.py](../scripts/andromeda-thumb.py), `TextureCache`.

Tasks:

- [ ] Retain the measured inclination, position angle, angular-size convention, bulge/disc structure, and lack of visible rotation as the starting contract.
- [ ] Compare three bounded options: improved current procedural model; cached procedural texture; observationally grounded texture with lightweight procedural exposure/detail treatment.
- [ ] Use a consistent reference projection and crop so an image's empty border does not change the apparent diameter.
- [ ] Preserve irregular dust lanes, asymmetric structure, and satellite placements; verify whether stars in a photographic source are foreground stars before treating them as part of the galaxy.
- [ ] Avoid duplicating foreground stars between the galaxy texture and the live star field.
- [ ] Preserve unresolved-distance appearance and filter high-frequency structure using pixel footprint.
- [ ] Keep the difference between photographic long-exposure appearance and naked-eye visibility explicit in existing discovery copy.
- [ ] Compare shader work, texture residency, transfer size, compile/warmup time, and close-view detail before choosing an implementation.
- [ ] Keep a procedural fallback if a new optional observational asset fails, where this can be done without duplicating the full rendering cost.
- [ ] Regenerate the thumbnail/derived imagery from the accepted approach and update provenance.

Acceptance: the chosen approach has a documented visual and resource advantage, remains static, and does not introduce aliasing, repeated synthetic patterns, or misleading scale.

## 10. Landscapes and landmarks

### L1 — Introduce a small number of meaningful scene layers

Primary files: `createEnvironmentLayer.ts`, `environmentAssets.ts`, [viewpoints.ts](../app/data/viewpoints.ts), environment assets and provenance.

Tasks:

- [ ] Define a scene asset package containing the distant plate and only the masks/depth/foreground layers needed for that viewpoint.
- [ ] Separate sky/horizon, distant landscape, and nearby silhouettes where that improves occlusion or movement. Keep the number of layers bounded.
- [ ] Use camera projection consistently for plate reprojection, masks, and geometry. Avoid making sky/landmarks slide at incompatible rates during a rotation-only look gesture.
- [ ] Do not invent translational parallax if the camera only rotates. If subtle camera translation is introduced, bound it and use depth-aware reprojection/geometry that can support it.
- [ ] Define valid yaw/pitch limits per asset coverage rather than assuming every crop supports the same pan range.
- [ ] Preserve sky/ground boundaries in portrait and landscape crops and throughout transitions.
- [ ] For Cabo da Roca, compare the current generated derivative against a traceable geographic reference. Prefer photographic or reconstructed landmark geometry when architectural fidelity is the goal.
- [ ] Preserve the lighthouse/cliff composition and licensing obligations for source-derived assets.
- [ ] Upgrade native source detail only when the existing plate is demonstrably the limiting factor.
- [ ] Keep a single-plate fallback for safe quality and failed optional-layer loads.

Acceptance: landscape depth is coherent with camera movement, important landmarks retain their identity, and the scene remains usable within the safe-tier budget.

### L2 — Add occlusion, water, and localized light response

Primary files: environment layer implementation, new narrowly scoped scene/material helpers if needed, `PerigeeScene` composition, shared lighting model.

Tasks:

- [ ] Introduce horizon/foreground masks or geometry so celestial objects cannot draw through a hill, building, tree line, cliff, or lighthouse.
- [ ] Apply the same masks to background stars and atmospheric effects where appropriate; the current broad altitude fade is not an exact skyline mask.
- [ ] Give layer depth and draw ordering an explicit contract covering hero surfaces, transparent rings, glare, stars, meteors, and foregrounds.
- [ ] Reassess meteor ordering physically: atmospheric meteors are in front of distant celestial bodies but behind nearby foregrounds. The existing behind-hero treatment is an authored choice; compare carefully before changing it.
- [ ] For Lakeside, implement a bounded water region with a hero-dependent reflected contribution, appropriate distortion, and intensity tied to the same scene light.
- [ ] Prevent reflections from appearing on land or extending outside the water mask. Account for object elevation and camera direction.
- [ ] Add subtle water movement only when normal motion is allowed; reduced motion must retain a plausible static reflection.
- [ ] Use simple receiving surfaces or normal/depth masks for local light response where useful. Do not infer all surface orientation from the plate's existing brightness.
- [ ] Keep existing window/lighthouse lights distinct from newly received celestial illumination; avoid recoloring every light source with the selected object accent.
- [ ] Avoid flattening dark scenes into uniformly bright images. Retain occlusion and silhouette contrast under strong illumination.
- [ ] Include transition masks/reflection resources in P3's resource ownership and budget.

Acceptance: foregrounds correctly hide distant objects, water responds only where it exists, and lighting adds spatial coherence without a large full-screen performance penalty.

## 11. Validation and acceptance matrix

### Automated validation

Add tests for changed contracts, not snapshots that only mirror implementation details.

| Area | Required behavior to verify | Existing starting point |
| --- | --- | --- |
| Shot settlement | Proxy-owned render state, interruption, exact-once settlement, stale finalization | `tests/shot-director.test.ts` |
| Async selection | Latest request wins, pending preset validation, load/compile failure, disposal | New focused tests around extracted transition/resource state |
| Lighting | Continuous tint, zero contribution, finite outputs, visibility boundaries | `tests/stellar-appearance.test.ts` plus pure appearance helpers |
| Quality | Single state, hysteresis, missing hints, invalid timing, pixel limits | `tests/quality-manager.test.ts` |
| Texture lifetime | Deduplication, pinning, eviction, job cancellation, retry | New cache tests using controlled loaders/renderer hooks |
| Asset selection | Tier/orientation variants and matching prefetch | `tests/environment-assets.test.ts` |
| Geometry/science | Angular-size compatibility, projected-size agreement, ring shadow math | `tests/angular-size.test.ts`, preset tests, new pure math tests |
| Motion | Body-specific policy and reduced-motion propagation | New policy tests; existing meteor/disclosure tests |
| Editorial/capture | Correct sources, selection labels, captures, derived assets | Existing editorial, SEO, thumbnail, and scene-capture tests |

Use controlled promises and clocks to exercise race conditions deterministically. A mocked WebGL renderer can verify ownership/order, but cannot prove shader appearance or actual GPU performance.

### Future runtime scenarios

These are planned checks, not completed work. Respect the current no-browser preference until runtime work is requested or the user performs the checks.

| Scenario | Conditions | Inspect |
| --- | --- | --- |
| First arrival | Each of six arrivals; cold/warm cache; normal/reduced motion | Correct asset priority, first usable scene, approach takeover |
| Hero selection | All nine objects; cold and prefetched resources | Feedback, compile stalls, fade continuity, correct committed state |
| Distance | All five presets per object; rapid reversal and repeated stepping | Scale, opacity, point/disc transition, lighting continuity |
| Viewpoint | All four scenes; rapid A-B-C; failed optional load | Camera/background alignment, completion, no flashback |
| Resize | Desktop resize; mobile portrait/landscape; Cabo FOV change | Stable framing, pixel budget, no repeated reallocations or jumps |
| Resource pressure | Long exploration; revisits; optional context-loss test | Bounded residency, successful reload/recovery, no stale assets |
| UI overlays | Object browser, discovery, More, capture, encounter overlay | Responsive input, focus, text contrast, blur/compositing cost |
| Hidden tab | Hide/resume during load, compile, distance shot, and landscape fade | Settled promises, no time jump or timing-policy misclassification |
| Reduced motion | Preference enabled before load and changed during session | No ambient animation; direct controls remain responsive |
| Capture | Each object family and representative landscape; settled/transition policy | Correct size, exposure, framing, and no blank/stale output |

Representative viewport matrix: 390x844 and 430x932 portrait phones; 844x390 landscape phone; 768x1024 tablet; 1440x900 desktop; a large 2560x1440 display. Include DPR 1/2/3 where relevant and verify that effective rendering still obeys its pixel budget. Device emulation is not a substitute for a physical low-memory phone.

Representative browser/device matrix, when available: desktop Chromium, desktop Safari, mobile Safari, and Android Chromium, including an integrated-GPU or otherwise constrained device. Record unavailable coverage explicitly.

### Performance measurements and provisional targets

Before changing budgets, agree on representative devices and record:

- Selection-to-feedback latency and selection-to-settled-scene duration separately.
- Frame interval distribution (median/p95/p99), missed presentation deadlines, and long tasks.
- GPU time where supported, with sample validity and disjoint handling.
- Active/prefetched transfer bytes, decode time, upload timing, resident texture estimates, and render-target estimates.
- Cold/warm first usable scene time and first interaction cost.
- Quality transitions, time spent per tier, and whether the scene changes quality repeatedly.

Provisional goals, to calibrate against baseline rather than report as achieved:

- Aim for stable 60 Hz presentation on the agreed primary device class (16.7 ms frame interval); choose a deliberate sustainable target for constrained devices if 60 Hz is not practical.
- Prioritize p95/p99 frame pacing and input response over average FPS.
- Avoid recurring main-thread tasks over 50 ms during active interaction; investigate asset upload/compile outliers separately.
- Keep immediate control feedback independent of asset download and the authored transition duration.
- Keep resident resources within the selected budget plus bounded transition overhead.
- Do not accept frequent quality oscillation, detail popping, or visibly softened primary objects as an unexplained performance tradeoff.

Do not compare development-server results with production builds, foreground results with hidden tabs, or different resolutions without labeling the difference.

## 12. Integration, risks, and release readiness

### V1 — Finish integration and keep claims aligned with behavior

Tasks:

- [ ] Verify all accepted chunks together across objects, viewpoints, distances, arrivals, encounters, and captures.
- [ ] Update `CLAUDE.md` architecture descriptions when transition ownership, resource caching, quality policy, or environment composition changes. Remove stale claims rather than preserving conflicting descriptions.
- [ ] Update asset records and the scientific/rendered/described-not-simulated disclosures using [editorial-content.md](./editorial-content.md).
- [ ] Keep route metadata, thumbnails, social captures, and README imagery aligned with the accepted appearance when those outputs change.
- [ ] Run focused tests during implementation and the required `npm run verify` before a PR. Use the existing documented `NUXT_IGNORE_LOCK=1` workaround only when needed for the local Nuxt lock.
- [ ] Run `git diff --check` and inspect the final diff for accidental generated files, source masters, secrets, or unrelated changes.
- [ ] Record visual/runtime acceptance separately from automated checks. If the no-browser constraint remains, leave those acceptance fields pending and provide exact user-check scenarios.
- [ ] Prepare focused commits/PR descriptions only when publication work is requested. This plan itself does not authorize a push, PR, merge, or deployment.

### Risks and mitigations

| Risk | Mitigation / rollback boundary |
| --- | --- |
| Transition fix changes encounter timing or capture readiness | Keep selection/settlement contracts explicit; test encounter and capture integration in S1-S3. |
| Adaptive resolution makes fine rings shimmer or the hero soften | Stabilize thresholds; preserve detail; compare AA choices separately; retain the prior configuration for rollback. |
| Texture eviction breaks shared assets | Pin active and transitional resources; use ownership tests and bounded delayed release. |
| Closing bitmaps prevents context restoration | Reload or retain a budgeted source path; make recovery part of resource design. |
| New lighting washes out objects or landscapes | Introduce the shared contract before object tuning; compare fixed representative scenes and isolate each material family. |
| Ring shadows recreate a seam or broad dark band | Use geometric intersection tests and multiple Sun/view angles; keep R3 independent of other material rewrites. |
| Larger source assets increase first-load cost | Require a demonstrated detail benefit, variants, residency estimates, and selected-scene loading. |
| Photographic sources contain baked lighting or foreground stars | Audit provenance and projection; remove or account for baked contributions before compositing. |
| Layered scenery causes sliding, edge gaps, or high memory use | Use consistent camera projection, bounded coverage, resource estimates, and a single-plate fallback. |
| A visual improvement changes scientific meaning | Recheck computed/rendered boundaries and relevant disclosures; document authored approximations. |
| Automated checks are mistaken for visual completion | Maintain separate evidence fields; mark missing runtime/visual evidence pending. |

### Explicit decisions to resolve during implementation

These are not blockers to creating the plan or implementing unrelated correctness fixes. Resolve each before its dependent visual/configuration work becomes final.

| Decision | Recommended starting position | Resolve by |
| --- | --- | --- |
| Primary performance devices and targets | A representative phone and integrated-GPU desktop; stable frame pacing prioritized | B0 / P1 |
| Pixel and texture budgets | Conservative tier defaults, calibrated with real workload evidence | P1-P3 |
| Manual quality preference | Automatic policy first; add a compact More setting only if useful | P1 |
| Scene exposure intent | Cinematic, physically coherent authored exposure; avoid implying naked-eye equivalence | R0 |
| Rotation time policy | Body-specific, explicitly documented; stable Earth-facing Moon | R2 |
| Saturn source replacement | Native-detail, traceable map without baked lighting | R1 / R3 |
| Andromeda representation | Compare current procedural, cached procedural, and observational/hybrid before selecting | R7 |
| Landmark fidelity | Traceable photographic/reconstructed reference for Cabo; modest layer count | L1 |
| Camera movement model | Preserve rotation-only look unless depth-aware translation has a clear benefit | L1 |
| Runtime verification ownership | Follow the user's code-only preference; record user checks or later requested runtime checks explicitly | Every visual/performance chunk |

## 13. Implementation evidence and deferrals — 2026-09-06

The supplied document described work as implemented and claimed 224 passing tests,
but those implementations and tests were absent from the baseline source. Those
claims have been replaced with the evidence from this implementation. No prior
visual acceptance is carried forward.

### Baseline and checks (B0, V1)

- Baseline commit: `a9fc1946d6fb21edf750feed52835ad96e26d06f`.
- Initial working tree: only this plan was untracked; no existing code edits.
- Toolchain: Node 24.20.0. The default shell's Node 20 was not used for verification.
- Inventory: [asset-inventory.md](./asset-inventory.md), including measured dimensions,
  bytes, native-detail limitations, and separate memory estimates.
- Validation: `NUXT_IGNORE_LOCK=1 npm run verify` (typecheck, Vitest and production
  build) passed: **150 tests across 30 files**, strict typecheck and production build.
  `git diff --check` is clean. Six derivative dimensions match their runtime records.
  The optional `VITE_KTX2_TEXTURES=1` production build also passes; the default
  image-texture build is restored for the local handoff.
- Visual/runtime acceptance: pending, owned by the user. No browser was opened or
  controlled, and no FPS, GPU-memory, mobile or visual-quality target is claimed.
- No commit, push, PR, publication or deployment was performed.

### Transition and lifecycle behavior (S1–S6)

- `ShotDirector` reports completed/interrupted/disposed results, runs callback-owned
  final state on finish, and preserves current values on replacement. Empty shots
  settle. Object opacity, distance, and viewpoint movement use separate directors.
- Object preparation commits only after assets and cancellable asynchronous shader
  readiness. Generations are checked after awaits. Pending distance selections use
  the pending object's presets; failures leave the committed hero valid. Obsolete
  loads cancel their texture leases. UI pending indicators have separate ownership
  from the most recent distance/viewpoint action.
- Distance interpolation preserves angular radius during resizing and viewpoint
  movement. Obsolete finalizers cannot overwrite a newer distance or object.
- Viewpoint movement starts after its plate loads, and promises include the fade.
  **Selected alternative to immediate mid-blend retargeting:** complete the visible
  two-plate blend, then start only the latest queued selection. This preserves the
  visible mixture and bounds active plate samplers/resources without allocating a
  snapshot render target. A rapid second landscape can wait up to the remaining
  0.9-second fade; it does not reset the visible blend to zero.
- Tint is a continuous bounded curve, tested around the old 0.08 discontinuity.
- Reduced motion is live: spin, star drift/twinkle, shader time, film time, meteors,
  hover parallax and cinematic travel stop. Settled scenes use on-demand rendering;
  input, resize, resources, selection and restoration invalidate the same loop.
- Pointer/resize/media/context listeners, idle jobs, pending shader polls, KTX2
  workers, neutral normal texture and owned ImageBitmaps have explicit cleanup.
  Initialization failure and stale mount completion cannot revive old UI state.
- `compileScene.ts` follows the installed Three r185 readiness mechanism but captures
  program references and cancels its timer on teardown/context loss. GPU resource
  retirement waits for pending compiler promises. Recheck this compatibility shim
  on a Three upgrade.
- Context loss pauses rendering and retains selection; restoration reapplies budgets
  and prepares the retained selection. This recovery path still needs runtime review.

Regression evidence: `shot-director`, `scene-transitions`, `environment-transition`,
`texture-cache` and `compile-scene` tests exercise completion, cancellation, failed
loads, demand reuse, resource ownership and obsolete asynchronous work in Node.

### Resolution and workload (P1–P6)

- One mutable tier drives new materials, textures, effects and resize. Missing device
  hints start balanced. Four pending GPU timer queries maximum; unavailable results
  are never read, and disjoint results are discarded. The fallback is explicitly
  frame pacing, not GPU timing. Warmup/interaction/hidden timing is excluded, with
  10-second downgrade dwell and slower 60-second recovery.
- Proposed buffer ceilings: high 8,294,400 pixels at up to 2x DPR, balanced 3,686,400
  at 1.5x, safe 2,073,600 at 1x. Device texture-size limits also apply. These defaults
  require comparison on the user's target devices; they are not measured optima.
- High retains up to 4x MSAA plus SMAA (hardware-limited). No unsupported claim that
  one can be removed without affecting ring/hero edges. Tone mapping remains before
  SMAA and exactly one final pass writes to screen. Invisible contributions skip bloom.
- Cache leases protect both sides of hero/plate transitions. Unpinned textures are
  evicted by recency against estimated 256/160/96 MiB budgets. Pinned transition
  resources can exceed this soft budget; diagnostics expose the estimate.
- Speculation decodes at most two candidates and performs no GPU upload. The actual
  warmup list prefers one next body; it no longer downloads the whole catalogue.
  Save-Data suppresses speculation. Demand uses the same deduplicated decode and
  uploads before starting its shot. Shader warmup waits for settled interaction.
- All four landscapes now have tier-appropriate variants; Cabo preserves portrait
  selection. Six new files and their conversion script/provenance are recorded.
- Unconditional Saturn/Rooftop preloads are removed. Initialization remains the sole
  random-arrival selector; selected hero and plate still load concurrently.
- Stellar and galaxy noise fades high frequencies using projected physical pixels
  and derivatives. Normal-motion cadence is retained. No per-tier shader recompilation
  or procedural texture cache was introduced.
- `usePerigee().getDiagnostics()` exposes buffers, tier, timing source, effects,
  generations and texture estimates internally, without UI or telemetry.

Regression evidence: `quality-manager`, `gpu-timer`, `texture-cache`, and
`environment-assets` tests. Explicit deferrals: projected-size **surface texture**
replacement (avoid churn during approach), a dedicated upload work scheduler (demand
upload remains immediate before the shot), and alternative AA tuning (requires edge
comparison). KTX2 remains opt-in pending transfer/transcode/quality comparison.

### Celestial appearance (R0–R7)

- R0: a shared appearance helper separates surface rendering from authored ground,
  sky-glow and bloom contributions; unresolved bodies leave no detached illumination.
  Environmental contribution/color interpolates through object fades. Existing
  palette/star-opacity and surface exposure remain authored; a full common atmospheric
  extinction/exposure-adaptation model is deferred pending comparative calibration.
- R1: inventory distinguishes native and delivered detail. Saturn's 1774×887 source
  is still the limiting map; it is not advertised as native 4K detail. Its attribution
  IDs now include the AI-assisted source. Replacement requires traceable asset work.
- R2: recorded periods drive planet rotation at one documented 60x time scale. The
  Moon, stars and galaxy do not spin. Recorded object pitch is used; Saturn's ring
  plane and oblate equator share an orientation. `/method` states the authored policy.
- R3: surface-to-Sun rays intersect the ring plane and sample the radial opacity strip;
  parallel/backward/outside-ring cases are bounded. Ring-to-planet and oblate
  planet-to-ring shadows share the same Sun basis. Pixel footprint and an authored
  solar angular radius determine softness. Ring alpha remains an optical-depth proxy.
- R4: cloud decks no longer use albedo gradients as relief or a solid-surface specular
  highlight. Their color-map detail stays intact, with bounded limb scattering.
- R5: Moon illumination stays airless/neutral; Mars uses a gentler dusty scattering
  response and thin haze. Existing normal maps/V flip are preserved. `/method` discloses
  relief exaggeration and the absence of displaced geometry/crater cast shadows.
- R6: stellar solid-body spin is removed and procedural work scales with physical
  pixels. Temperature-derived palette/luminosity recalibration and new convection
  art direction are **deferred**, so this implementation does not silently replace
  baseline stellar colors without a sourced, comparative calibration.
- R7: procedural Andromeda is retained with resolution-aware detail. Baked and
  observational alternatives, memory costs and source/crop issues are documented in
  the inventory. No measured speed comparison is claimed.

Regression evidence: `scene-appearance` tests and `ring-shadow` mathematical reference
cases. Typechecking/building does not compile GLSL on a browser GPU. Saturn's ring
opening/shadows and the Moon/Mars/cloud response require the user's visual review.

### Landscape/source extensions (L1, L2)

Explicitly deferred: separate foreground masks/depth layers, water reflections,
localized ground illumination, a replacement Cabo reference, and a new atmosphere/
skyline calibration. Reliable masks and water regions must be authored against the
actual plates and reviewed; luminance alone is not a trustworthy depth/normal map.
The existing single-plate path remains, now with bounded variants and safe handoff.
No claim is made that foreground silhouette occlusion or reflections are implemented.

### User-owned acceptance priorities

Use section 11's matrix. Highest-value checks for this implementation are rapid object
and distance changes during loading, interrupted landscape fades, resize during an
approach, Saturn's ring alignment/shadows at all five distances, close-up detail at
high DPR, live reduced-motion changes, hidden-tab resume, context recovery, and capture
correctness. Source replacements, landscape layers, stellar palette calibration and
new derived thumbnails/social imagery remain deferred as described above.

## 14. Reference material

Repository references:

- [Repository overview and scope](../README.md)
- [Engine and cross-layer contracts](../CLAUDE.md)
- [UI styling and disclosure contracts](../app/CLAUDE.md)
- [Runtime asset provenance](../public/assets/ATTRIBUTIONS.md)
- [Editorial and scientific disclosure process](./editorial-content.md)
- [Engagement measurement contract](./engagement-events.md)

External references consulted during the preceding review; recheck the relevant documentation/source before implementation:

- [Three.js WebGLRenderer: asynchronous compilation and texture initialization](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Three.js resource disposal, including explicit ImageBitmap cleanup](https://threejs.org/manual/en/how-to-dispose-of-objects.html)
- [Khronos WebGL2 timer-query extension specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
- [NASA/JPL: Saturn with both ring shadows and the planet's shadow](https://www.jpl.nasa.gov/images/pia00335-full-disk-color-image-of-crescent-saturn-with-rings-and-ring-shadows/)
- [NASA: natural-color Saturn ring-shadow reference](https://science.nasa.gov/photojournal/tourniquet-shadows/)
- [ESO: visible-light Betelgeuse surface observations and the Great Dimming](https://www.eso.org/public/news/eso2109/)
- [NASA 3D resources index for source discovery](https://science.nasa.gov/3d-resources/)

External references constrain techniques and appearance; they do not establish that a proposed implementation is fast, accurate, or visually accepted in Perigee. Verify licenses and wavelength/color interpretation for any asset actually selected.
