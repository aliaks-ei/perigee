# Rendering implementation baseline

Historical evidence from 2026-09-06. Current rendering behavior, resource limits and
verification boundaries are in [Rendering quality and still export](./rendering-quality.md).

Baseline commit: `a9fc1946d6fb21edf750feed52835ad96e26d06f`.
Implementation toolchain: Node 24.20.0.

The baseline used a fixed hint-derived tier, DPR ceilings of 2/1.5/1, high-tier
4x composer MSAA plus SMAA, half-float HDR ping-pong targets, bloom for stars/galaxy,
and a final vignette/AgX/film pass before SMAA. Assets were URL-deduplicated but held
until teardown; idle speculation could upload the whole catalogue. Three core plates
used the same 3172×1984 file at every tier. The scene ran one rAF loop at normal cadence.

The implementation retains detailed balanced/high surface maps and high-tier AA while
adding explicit pixel budgets, bounded leased textures, cancellable preparation,
resolution-aware procedural detail and reduced-motion invalidation. See
[the historical asset inventory](./asset-inventory.md).

No browser baseline, FPS result, GPU timing sample or measured GPU-memory figure was
collected. Compare the same build mode, viewport/DPR, selection, cache state, motion
preference and tab visibility when manually testing. Diagnostics report estimates
separately from GPU query timing and frame pacing. Suggested initial comparisons:

- 1920×1080 at DPR 2, Saturn at Moon swap and closest distance.
- 390×844 at DPR 3, all five Saturn distances and Cabo portrait.
- Large viewport (3840×2160), all three tiers: verify pixel cap and edge quality.
- Betelgeuse closest/real, then Andromeda closest/real: observe cost and resolved detail.
- Reduced motion: settled frame, drag, selection, resource arrival and capture.
- Rapid object/distance/viewpoint changes; hide/resume and context loss/restoration.

The user owns manual browser acceptance for the current chunked implementation.
The agent provides code and repository checks, then stops at each handoff. Automated
checks alone do not prove runtime behavior, GLSL driver compatibility or
visual/performance improvements.


## Chunk 1 handoff baseline — 2026-09-07

The rendering work began from `a8d1471aab8299cd81d8456373e59dfd92178839` with the
planning documentation already modified. Browser baselines and timings are user-owned,
per the new instruction to provide code and repository checks only. No new browser
captures or measured GPU/frame-time claims are provided. The observational source
version is `55825fd3438b`; reproduction and numerical geometry estimates are in
[andromeda-assets.md](./andromeda-assets.md). Current rendering and capture behavior is
documented in [rendering-quality.md](./rendering-quality.md).
