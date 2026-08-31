# Cabo da Roca visual target

Status: selected direction, awaiting final target approval

## Direction

Option 1 was selected on 2026-08-31.

- Visual thesis: a moonless Atlantic threshold in ink navy and restrained
  lighthouse amber, with Saturn carrying the awe and Cabo da Roca supplying a
  quiet human scale.
- Content plan: establish the real place, reveal Saturn without copy, then add
  one calculated observation and one free-explore action.
- Interaction thesis: crossfade into the viewpoint, let the Saturn transition
  complete in silence, then introduce the Celestial Cut copy; reduced motion
  uses a short cut/fade with the same information order.

The final review targets are:

1. [`resting-desktop.png`](./resting-desktop.png) - free exploration with
   Saturn at real distance.
2. [`saturn-reveal-desktop.png`](./saturn-reveal-desktop.png) - the silent
   Moon-swap reveal.
3. [`encounter-copy-desktop.png`](./encounter-copy-desktop.png) - the authored
   observation after the reveal.
4. [`encounter-copy-mobile.png`](./encounter-copy-mobile.png) - the most
   constrained state recomposed at the 390 x 844 target ratio.

These are review targets, not runtime plates. They contain rendered Saturn and
interface content that must remain separate in the application.

## Camera and atmosphere

- Camera location: `38.780300, -9.498900`, the geotagged southwestern coastal
  viewpoint in the licensed reference photograph.
- Eye height: approximately 1.65 m.
- Frame heading: approximately 010 degrees true with a wide natural field of
  view. The lighthouse is about 228 m away at bearing 037 degrees, placing it
  in the right third while the Atlantic and offshore rocks remain open left.
- Time: an authored moonless astronomical night, visually equivalent to about
  22:30 WEST in late summer or early autumn. This is not a live ephemeris view.
- Weather: clear after an Atlantic front, thin high cloud, low marine haze,
  dark wet rock, and moderate wind implied through vegetation and water.
- Lighthouse: the square white-tiled tower, red lantern, terracotta roofs, and
  a few warm windows remain visible. No beam appears in the approved targets.
  If R2.2 adds a sweep, it must follow the documented four-white-flashes per
  17-second characteristic and be disabled for reduced motion and the safe
  quality tier.

## Runtime production decision

R2.2 should retain the existing environment-layer architecture rather than add
a navigable terrain scene.

1. Produce clean environment plates with no Saturn, stars, copy, or controls.
2. Create separate landscape and portrait masters. A single landscape plate
   cannot preserve both the Atlantic opening and lighthouse in the current
   cover crop at 390 x 844.
3. Export tiered WebP variants and load only the active aspect/tier:
   landscape high `3172 x 1984`, balanced `2048 x 1280`, safe `1280 x 800`;
   portrait high `1280 x 2768`, safe `832 x 1800`.
4. Keep Saturn, stars, tint, ocean shimmer, and any lighthouse sweep as runtime
   effects. Do not bake them into the plate.
5. Add a Cabo-specific focal offset and verify the environment crossfade does
   not expose an edge at maximum supported camera yaw/pitch.

Estimated transfer cost is 250-500 KB for the selected WebP plate. Estimated
decoded texture memory ranges from about 5.5 MB for the safe landscape plate
to 24 MB for the high landscape plate, with only one Cabo aspect variant
resident. The current 0.9-second crossfade may temporarily retain the outgoing
and incoming plates; R2.2 must measure this on balanced mobile hardware.

## Sources and licensing

- Geographic and architectural source: [Cabo da Roca lighthouse and coastal
  cliffs, Portugal - May 2025](https://commons.wikimedia.org/wiki/File:Cabo_da_Roca_Lighthouse_and_coastal_cliffs,_Portugal_-_May_2025.jpg),
  LensaCibi, photographed 2025-05-20, CC BY-SA 4.0. The page records the camera
  location used above.
- Lighthouse position, access, and current visitor context: [Parques de Sintra
  panoramic visit](https://bilheteira.parquesdesintra.pt/info/farol-do-cabo-da-roca-visita-panoramica/1389/en).
- Lighthouse dimensions and light characteristic: [Portuguese National
  Maritime Authority](https://www.amn.pt/DF/Paginas/FaroldoCabodaRoca.aspx).
- Cultural and architectural description: [Parques de Sintra](https://www.parquesdesintra.pt/en/parks-monuments/cabo-da-roca-lighthouse/).
- Protected-landscape and trail context: [Sintra PR7 route](https://cm-sintra.pt/phocadownload/PDF/percurso_pedestre/pr7-caboroca.pdf).

The four target images are AI-assisted adaptations of the CC BY-SA 4.0 source
photograph, generated with OpenAI image generation and art-directed to the
existing Perigee visual system. They are distributed under CC BY-SA 4.0 with
credit to LensaCibi; the app code is not part of that image license. Any R2.2
runtime derivative must repeat the credit, license link, and modification note
in `public/assets/ATTRIBUTIONS.md`.

## Final prompt set

- Resting: transform the licensed daytime photograph into a moonless Perigee
  night while preserving the real lighthouse, cliffs, rocks, camera, and
  coastline; add real-distance Saturn and the compact resting controls.
- Reveal: preserve the resting environment exactly; replace the distant object
  with the physically lit Moon-swap Saturn and remove all UI except the mark
  and exit action.
- Encounter copy: preserve the reveal exactly; add the approved 33-Moon
  observation in two lines, `Explore this sky`, and `3 of 3` transport with no
  panel.
- Mobile: recompose the same reveal and copy for 390 x 844 while retaining the
  full rings, recognizable lighthouse, Atlantic band, and bottom transport.

