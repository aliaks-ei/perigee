# Rendering quality and still export

Implemented 2026-09-07. Runtime/device acceptance is pending user testing.

## Controls and output

Rendering quality is automatic, with no menu control. The initial high tier requests
native display DPR within 16,588,800 total pixels. Known low-memory/low-core devices
start balanced or safe; those tiers retain 3,686,400 / 2,073,600 pixel budgets and
1.5× / 1× DPR ceilings. Texture, renderbuffer and viewport limits constrain every
tier. Missing device hints start high, so Safari and static/reduced-motion views do
not remain soft merely because browser memory hints are unavailable.

SMAA provides antialiasing without stacked MSAA. Existing pacing/GPU-query hysteresis
adapts quality down and recovers more slowly. Eight consecutive eligible frames above
50 ms trigger a quicker downgrade after warmup; frames over 250 ms now count toward
fallback instead of being discarded. Context recovery starts one tier lower to avoid repeating
the same potentially excessive allocation. These are analytical policies, not measured
optimal device budgets or universal frame-rate guarantees.

More → Capture this sky performs automatic capture without a size selector. High
adaptive quality with at least 8 GiB reported device memory and 8 logical cores
tries 8K, then 4K, then the native rendered frame. Balanced quality or missing/lesser
hints tries 4K then native. Safe quality captures the native frame directly without
upgrading source/landscape quality. Failure automatically advances to a lower
candidate inside the same frozen scene transaction; cancellation never retries.

The viewport aspect is preserved. 16:9 high-resolution outputs are exactly
3840×2160 / 7680×4320; portrait reverses those dimensions. 4:3 gives 3840×2880 /
7680×5760. Near-square 8K fits the 60-million-pixel assembly ceiling. Aspect ratios
outside 1:8–8:1 fall back to the native frame. Hints guide selection but do not
establish device capability; actual allocation or encoding failures still fall back.

Every saved image contains only the sky and landscape; captions remain in the
capture dialog. Share links retain the captured subject. A native fallback copies
the drawing buffer without enlargement. A larger image cannot create observations
beyond source resolution: Neptune and reconstructed poles retain their finite detail.

## Snapshot and image pipeline

The controller rejects an active shot, stops scheduling scene frames and snapshots
the camera/time/rotation. It waits for pending sky/plate loads to settle and upgrades
the landscape quality through the existing loader. Survey failure retains the
normal settled sky fallback. It freezes the live full-frame bloom once; its blur
resolution remains the interactive resolution. Broad optical scatter is deliberately
not recomputed separately per tile. Export surface detail is independent of that map.

Every padded tile derives its perspective from the same cloned full-frame camera.
Physical full-output footprint drives high-quality stellar/terrain detail and source
tile LOD. Tile frustum culling keeps the existing 64-slot high-quality stream bounds,
including old/new tile leases. Two-job shared admission, cancellation, crossfade
completion and fallback bases remain in place. Demand readiness has a 45-second
per-tile timeout; missing required detail produces an error. Existing observational
WebP pyramids and lossless data maps deliberately bypass optional KTX2. No source
maps or compression policy changed in this chunk.

Four ±0.25-pixel offsets accumulate in half-float linear HDR, before colour grading.
The final pass uses the installed Three AgX transform, the existing SCREEN bloom
blend, global vignette coordinates, one sRGB conversion and static one-step dither.
Animated grain and SMAA/MSAA are omitted from export. Background screen UVs map to
the full frame even for padded samples outside the final boundary. Four-pixel
padding covers the subpixel sample/filter footprint; global bloom requires no tile
convolution overlap. Native GPU rows are cropped, flipped and assembled without scaling.

## Analytical resource envelope

Environment variants come from `scripts/environment-variants.sh` and share the
master crop within integer-pixel rounding. `environmentAssets.ts` selects the
4K, 2K or safe landscape variant by quality tier, plus Cabo portrait variants
by viewport aspect. Source dimensions, authored detail limits and credits are
recorded in [ATTRIBUTIONS.md](../public/assets/ATTRIBUTIONS.md). Current scientific
asset inventories and delivery contracts are in [planet-assets.md](./planet-assets.md),
[andromeda-assets.md](./andromeda-assets.md) and [stellar-sky.md](./stellar-sky.md).

| Resource | Bound / estimate |
| --- | --- |
| One tile edge, including padding | ≤1024 pixels and device limits |
| HDR sample + depth, HDR accumulation, RGBA8 output | About 24 MiB at 1024² |
| Asynchronous readback + cropped ImageData | About 8 MiB per tile, plus driver staging |
| Assembled 16:9 4K canvas | 31.6 MiB RGBA |
| Assembled 16:9 8K canvas | 126.6 MiB RGBA |
| Assembled square 8K canvas | 225 MiB RGBA |
| Canvas + conservative encoding copy ceiling | <458 MiB, before compressed PNG/driver overhead |
| Dialog preview | Long edge approximately 1200 pixels |
| Source tiles | Existing high stream caps, about 91 MiB per active family |
| Live buffers, pinned bases, source decodes, sky and audio | Existing budgets; additional to export allocations |

One context prevents a second upload of every source map. PNG encoding and GPU
drivers have opaque transient allocations: no hard bound on total browser process
memory is claimed. Browser allocation refusal, incomplete framebuffer or encoding
failure automatically retries a lower resolution; only failure of every candidate
shows an error and a single Try again action. A browser/OS process
termination cannot be caught in JavaScript. 8K is capability-dependent.

Cancellation is checked between preparation, shader readiness, readback, tiles and
PNG encoding. PNG encoding and an in-flight driver readback must finish before their
resources can be retired. Selection and resize wait for cleanup; hide/context loss
cancel; disposal/context restoration wait for release. Full output buffers, camera,
scene links and stored settings never acquire temporary export dimensions or time.

## Manual comparison record

No browser/device measurements or images were generated by the implementation agent.
Record each row independently; emulation is not a real-device result.

| Device/browser | Layout/DPR | Quality | Output | Status |
| --- | --- | --- | --- | --- |
| Desktop Chromium | Landscape + portrait / native DPR | Automatic native + adaptive fallback | Screen/4K/8K | Pending |
| Desktop Safari | Landscape + portrait / native DPR | Automatic native + adaptive fallback | Screen/4K/8K | Pending |
| Real mobile, model/OS recorded | Both orientations | Automatic + safe fallback | Screen/4K; 8K if admitted | Pending |

For each comparison record revision, source versions, device/browser, CSS viewport,
DPR, diagnostics tier/effective DPR, object/preset/landscape, motion, cache state,
load/export duration, timing source and frame/GPU measurements. Capture baseline
and final frames under identical conditions. Check all nine objects, then examine
PNG dimensions, aspect, opacity and colour at 100%, especially dust lanes, terrain,
limbs, poles, ring gaps, point-star widths, tile boundaries and bloom continuity.

Exercise missing detail, cancellation at loading/rendering/encoding, repeated
captures, selection, resizing, tab hiding, reduced motion and context recovery.
Verify the live view resumes at its original size and time, with keyboard controls,
encounters and sharing still usable. Record regressions before visual acceptance.
