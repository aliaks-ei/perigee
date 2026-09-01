# Andromeda: first new object class

Status: complete, realistic direction approved and gate G4 passed

Chunk: R3.2, first stage

## Why Andromeda

The selection gate in the expansion plan asks for an object that adds a visual
behaviour the current catalogue does not have. Of the three candidates:

- **Andromeda** is the only one that is not a sphere. It needs a flat inclined
  disc, an exponential brightness profile, spiral arms and dust lanes. Nothing
  in the existing renderer produces any of that.
- **The Sun** reuses the stellar sphere path Betelgeuse, Sirius and Rigel
  already run. It is the cheapest to build and the weakest against the gate.
- **A comet** adds motion and a time-dependent form, but its whole identity
  depends on animation, which fights the reduced-motion rule, and it carries the
  highest art-direction risk.

Andromeda also tells a story the catalogue cannot: it is the one object whose
*real* distance is already remarkable. It spans six full Moons in tonight's sky
and almost nobody has ever seen it that way.

## Production approach

Procedural, not photographic. The galaxy is a hand-written `ShaderMaterial`
(`src/perigee/materials/GalaxyMaterial.ts`), in the same spirit as
`StellarMaterial`. That decision means no new runtime texture, no third-party
licence to clear, no manifest entry, and a look that scales across the three
quality tiers through the octave count.

### The carrier is a billboard, and the shader does the projection

The first build put the disc on a `CircleGeometry` tilted by the inclination and
rolled by the position angle. That is the obvious reading of the geometry and it
is the wrong one. M31 is 2.5 Mly away, so its projection onto the sky is
orthographic; a plane physically tilted in the scene picks up perspective the
real object does not have, and at the closest presets the near half of the disc
is measurably larger than the far half.

The carrier is now a camera-facing plane. `vSky` is the plane of the sky in
units of the D25 semi-major axis, and the shader recovers the disc's own plane
by dividing the minor axis by `cos(inclination)`. Three things follow:

- The projection is correct at every preset, and the disc keeps its measured
  axis ratio however far the viewer turns.
- The bulge and the halo are spheroids rather than disc features, so they can
  keep their own axis ratios on the sky instead of foreshortening to slivers
  with the disc. On a tilted plane they could not.
- M32 and M110 can be placed at their real sky offsets. Both sit further from
  the centre along the minor axis than a foreshortened disc plane reaches.

`PerigeeScene.render` refreshes the carrier's orientation each frame: it copies
the camera's quaternion and then rolls by the position angle, which is a
rotation about the view axis and nothing more.

### Brightness is set against the tone curve

The scene tone-maps with ACES, and the galaxy material carries no exposure of
its own. ACES lifts its mid-tones hard, so a galaxy bright enough to look right
in a raw buffer arrives on screen as a white smear with the dust lanes flattened
out of it — which is exactly what the first build did. Everything but the
nucleus is now kept in the lower half of the curve, and the lanes are cut deeper
than a linear output would need. Bloom for a galaxy is 1.15x the tier's base
rather than a star's 4.1x, for the same reason: past a light lift on the
nucleus, bloom blurs the structure back into the soft field it was drawn to
escape.

## Scientific assumptions

Every number below is recorded so the rendered angular size stays computed
rather than tuned.

| Quantity | Value used | Basis |
| --- | --- | --- |
| Distance | 2,500,000 ly | NASA Science, Messier 31 |
| Diameter | 138,000 ly | The catalogued D25 optical major axis, about 190 arcmin, expressed as a length at that distance |
| Inclination | 71.5 degrees from face-on | Optical D25 axis ratio of about 0.32, used for the visible-light silhouette |
| Position angle | 37.7 degrees | Measured over the same radial range |
| Arm pitch | 8 degrees | The two symmetric arms are quoted at 7.7 and 8.0 degrees |
| Bulge | Sersic n = 2.2, effective radius 1.0 kpc | Published photometric decomposition |
| Disc scale length | 5.3 kpc, so 0.25 semi-major axes | The same decomposition |
| Star-forming ring | 10 kpc, so 0.47 semi-major axes | M31's dominant structure, the "10 kpc arm" |
| M32 offset | 0.20 semi-major axes along the major axis, 0.15 along the minor | Its catalogued position resolved into the two axes |
| M110 offset | 0.04 and 0.38 | The same |

Pairing the D25 major axis with NASA's distance is deliberate. It makes the
scene compute 3.16 degrees at the real preset, which is the catalogued apparent
size and matches NASA's own phrasing, "six times the apparent diameter of the
full Moon". `tests/preset-ladders.test.ts` asserts that the scene reaches this
from the diameter and distance alone.

### Four things worth flagging

1. **Disc size depends on where you stop measuring.** NASA also describes the
   disc as spanning about 260,000 ly, which includes faint outer structure well
   beyond the D25 isophote. Perigee uses the isophotal figure because that is
   the one the catalogued apparent size is measured against.
2. **Two published inclinations describe different measurements.** The
   kinematic value, 77.5 degrees, describes the inner ring and gives an
   infinitely thin sheet an axis ratio near 0.22. The optical D25 ellipse is
   closer to 0.32, corresponding to 71.5 degrees. Perigee uses the optical
   value because this renderer depicts the visible-light silhouette; the
   kinematic value made the galaxy read as an implausibly thin luminous ring.
3. **Two published arm pitches disagree, by a factor of three.** One line of
   work derives 24.7 degrees from rotation-curve shear; another measures 7.7 and
   8.0 degrees from the arms themselves. Because M31 is so highly inclined, the
   arms are hard to trace directly, which is where the spread comes from.
   Perigee renders 8 degrees, the figure taken from the visible structure.
4. **The satellites are drawn inside M31's own frame.** M32 and M110 are
   separate galaxies at their own distances. Perigee paints them into the same
   billboard at their catalogued sky offsets, so they scale with M31 down the
   whole ladder. That is right for the real preset and a convenience at every
   step below it.

## Distance ladder

A galaxy has no useful Solar-System step, so the ladder walks the Local Group
inward. The closest step brings the two discs to roughly touching range; nothing
on this ladder endangers Earth, so no step carries hazard copy.

| Preset | Distance | Apparent size | Full Moons |
| --- | --- | --- | --- |
| Real | 2.5 Mly | 3.16 degrees | 6.1 |
| 1 Mly | 1,000,000 ly | 7.89 degrees | 15.2 |
| 500 kly | 500,000 ly | 15.71 degrees | 30.3 |
| 250 kly | 250,000 ly | 30.86 degrees | 59.6 |
| 150 kly | 150,000 ly | 49.40 degrees | 95.4 |

The last step stays under the camera's own field of view on purpose, so the
galaxy reads as an object in a sky rather than as a wash over the whole frame.

## Simulation boundaries

Recorded as the `andromeda-disc-boundary` discovery and repeated here:

- **Rendered:** the Sersic bulge, the exponential disc, fragmented traces of
  the 10 kpc ring and outer arcs, logarithmic arms broken along their length,
  irregular dust filaments, restrained HII regions, the stellar halo, and M32
  and M110. All procedural, none photographic. Projected pixel size suppresses
  unresolved detail at the real-distance preset so it collapses into a faint
  spindle instead of a miniature long exposure.
- **Calculated:** the angular size at every step, and the Moon-width comparison.
- **Not simulated:** three-dimensional disc thickness, physical galactic
  rotation, and everything two approaching galaxies would do to each other.
  The visible silhouette uses the measured optical axis ratio, and a restrained
  procedural displacement suggests the observed outer warp and filamentary
  dust without claiming a volumetric model. It does not turn, because a real
  galaxy rotates over hundreds of millions of years and visible motion would be
  invention.

## Defects found

**A reported freeze that was not one.** The first prototype was recorded as
freezing the tab when the object-browser panel opened over the galaxy. It does
not. The measurement was taken through a browser tab whose `visibilityState`
was `hidden`; the scene pauses rendering on tab hide by design, so no animation
frame ever fires, any `await`ed frame-driven promise never settles, and the
tooling times out and calls the tab frozen. A control run on the Moon reproduced
the same symptom, which is the tell. The panel opens and renders normally.
Anything measured against `requestAnimationFrame` in a background tab will hit
this, whatever the object.

**A real NaN.** `pow()` is undefined for a negative base, and
`0.5 + 0.5 * cos()` lands just under zero often enough to matter. The unclamped
call put NaN into the additive HDR target, the bloom mip chain spread it over
the whole frame, and the galaxy rendered black while the frame rate collapsed.
Every `pow` base is now clamped, in the shader and in the thumbnail script.

## Completion evidence

- The realistic direction passed visual sign-off after desktop and 390 x 844
  reviews at the real and 150 kly presets. Balanced and safe tiers preserve the
  bulge, diffuse disc, dust structure, and companions; their reduced octave
  counts remove fine mottling first.
- `The galaxy hiding in our sky` reveals the real-distance core, the diffuse
  disc at 500 kly, dust filaments at 250 kly, and the full 150 kly view. Its
  source disclosure and final handoff to free exploration work on desktop and
  through the complete 390 x 844 keyboard path.
- `/e/the-galaxy-hiding-in-our-sky` restores beat 1 and carries a generated
  1200 x 630 social card. The verified production suite contains 50 tests.
