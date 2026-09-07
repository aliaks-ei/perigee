# Andromeda observational assets and rendering

Chunk 1, 2026-09-07. Browser appearance and device performance await user testing.

## Reproducible acquisition

Keep masters outside the repository, for example `/tmp/perigee-galaxy-sources`.
The build consumes committed runtime derivatives and does not contact the surveys.

```sh
mkdir -p /tmp/perigee-galaxy-sources
curl -fL https://cdn.esahubble.org/archives/images/large/heic1502b.jpg -o /tmp/perigee-galaxy-sources/heic1502b.jpg
curl -fL https://cdn.esahubble.org/archives/images/large/heic2501a.jpg -o /tmp/perigee-galaxy-sources/heic2501a.jpg
curl -fLG https://gea.esac.esa.int/tap-server/tap/sync \
  --data-urlencode REQUEST=doQuery --data-urlencode LANG=ADQL \
  --data-urlencode FORMAT=csv --data-urlencode MAXREC=100000 \
  --data-urlencode "QUERY=SELECT TOP 100000 source_id,ra,dec,phot_g_mean_mag,parallax,parallax_over_error,pmra,pmdec FROM gaiadr3.gaia_source WHERE ra BETWEEN 7.6 AND 13.8 AND dec BETWEEN 39 AND 43.5 AND phot_g_mean_mag<17 AND (parallax_over_error>5 OR pmra*pmra+pmdec*pmdec>25) ORDER BY source_id" \
  -o /tmp/perigee-galaxy-sources/foreground.csv
python3 -m venv /tmp/perigee-galaxy-venv
/tmp/perigee-galaxy-venv/bin/pip install pillow==12.3.0 numpy==2.5.3 scipy==1.18.1
/tmp/perigee-galaxy-venv/bin/python scripts/galaxy-assets.py /tmp/perigee-galaxy-sources
```

The recipe checks catalogue truncation and records source and derivative SHA-256
hashes. Published astrometry, native dimensions, processing dimensions, full
credits, filter details and transfer sizes are in the generated `provenance.json`.
`--reuse-registered` is only for re-encoding the same run's already registered and
masked linear cache. Use the default command for clean reproduction.

## Registration and colour

DSS2 is the complete field; Hubble provides resolved detail inside its coverage.
The source centres, angular fields and north rotations are taken from the ESA/Hubble
image pages. Both are projected through ICRS gnomonic coordinates onto M31's
J2000 nucleus (10.6847083°, 41.26875°), with a 37.7° major axis. The minor axis
points south-east. The full carrier is 1.25 optical diameters wide, with a 2:1
aspect ratio. M32 and M110 remain in the observation at their sky positions.
Published orientation precision limits subpixel registration; visual seam
acceptance remains manual.

The Hubble two-filter stretch cannot simply be pasted onto DSS2 colour. Its low
spatial frequencies are matched locally in linear light to the complete field;
only the covered detail contributes, with an eroded/feathered survey footprint.
A small photographic sky pedestal is subtracted and the DSS blue cast moderated.
There is no AI detail, super-resolution model, or procedural spiral structure.
The 16K target is a sampling grid, not a claim that DSS2 resolves every one of
those pixels as well as Hubble does.

RGB is encoded as sRGB and decoded by the GPU texture format. Alpha is a linear
transmission proxy constrained to [0.25,1], never compositing opacity. Channels
are resized independently to avoid premultiplying galaxy light by the dust map.
WebP is explicit even when the optional KTX2 build is enabled. Tile borders are
8 pixels on each edge; mipmaps and anisotropic filtering handle sampling.
Compression is quality 94; the complete fallback is lossless. Codec quality
comparison in the browser remains manual.

## Foreground and volume boundaries

41,013 Gaia DR3 entries meet the bounded foreground query; 15,206 masks fall inside
the shipped field. Objects with reliable
parallax or large proper motion are masked by magnitude-dependent radii and
filled from a local annulus. No generic star-removal pass deletes M31 clusters.
The sample stops at G=17; faint unclassified points and plate/epoch residuals can
remain. This is a documented limitation, not verified perfect star separation.
The catalogue sky remains an independent layer; its complete celestial
registration is scheduled in Chunk 3.

Three emission populations reconstruct disc thickness, a bulge and companions.
The image's original perspective is undone before its inferred depths are used;
the minor axis is not inclined again. Dust is a local contrast-derived proxy,
not a measured optical-depth map. Rear and middle light are attenuated before
adding front light; the normalized populations sum to the observed emission at
the reference sightline. This preserves recorded lanes without applying extinction
twice. It does not claim a unique reconstruction or arbitrary-angle radiative transfer.

All galaxy layers draw before the star field, with no depth writes and no opaque
sky cutout. Fine tiles add signed linear-light corrections to the fallback in
the existing RGBA16F scene buffer. A negative dust correction therefore removes
only the corresponding low-detail galaxy light. The same inferred surface is
used by base and tiles so their correction geometry matches exactly.

The optical diameter remains 138,000 ly and the five distance presets are unchanged.
An analytic major-axis correction compensates close-view perspective. Sampling
the ideal optical ellipse gives these residuals relative to the reported diameter:

| Distance | Reported diameter | Reconstructed ellipse | Difference |
| --- | --- | --- | --- |
| 2.5 million ly | 3.1619° | 3.1619° | 0.00% |
| 1 million ly | 7.8943° | 7.8862° | −0.10% |
| 500,000 ly | 15.7144° | 15.6717° | −0.27% |
| 250,000 ly | 30.8590° | 30.6765° | −0.59% |
| 150,000 ly | 49.4049° | 48.9320° | −0.96% |

These are numerical geometry estimates, not measurements of a displayed optical
isophote. Halo light extends beyond the optical boundary. Surface radiance keeps
one exposure as distance changes; no per-pixel inverse-square multiplier is used.
The authored blue halo and ground illumination are zero for every galaxy size.

## Loading and resource limits

Committed image derivatives for version `55825fd3438b` (file bytes, excluding
provenance; not an initial download or GPU-memory measurement):

| Derivative | Tiles | Transfer bytes |
| --- | ---: | ---: |
| 1024×512 complete lossless fallback | 1 | 578,150 |
| 2048×1024 | 8 | 1,378,966 |
| 4096×2048 | 32 | 5,286,984 |
| 8192×4096 | 128 | 19,209,108 |
| 16384×8192 | 512 | 56,007,754 |
| Total committed observational derivatives | 681 | 82,460,962 |

`TileStream` owns transient leases, admits two fetch/decode/upload requests per
hero, cancels superseded requests, releases stale results, and backs off failed
URLs for 30 seconds. There are at most two live heroes during an object transition;
a shared work queue admits only two active tile fetch/decode/uploads across all
heroes, including cancelled decodes still settling. Retiring
an outgoing hero cancels its remaining work. Transient tiles never remain in the
general texture LRU. The base uses the existing shared lease/cache path.

Safe/balanced/high allow 16/32/64 slots per hero, including requested slots. Half
are reserved for the previous detail level during a 350 ms crossfade. The complete
previous level remains until all requested replacement tiles are ready. Missing
tiles therefore retain the earlier observation. Reduced motion applies a ready
level immediately. Tier downgrades retire excess old detail before new allocation.
Visibility and LOD planning runs at most once per 120 ms, with projected physical
pixels, hysteresis, conservative volume bounds and whole-level coarsening to fit.

A 528×528 RGBA8 tile with mipmaps is estimated at 1.42 MiB GPU memory. In-flight
cancelled decodes can temporarily add two slots per hero: about 26/49/94 MiB at the
three tiers, plus the 2.67 MiB base, CPU bitmaps, existing textures and render targets.
A two-galaxy transition can double that tile contribution. These are explicit
subsystem bounds, not measurements of browser/GPU residency. Diagnostics include
selected level, source version, requested/resident tile counts and estimated bytes.
Texture and render-target diagnostics remain separate; do not sum only one of them
and call it total memory. Cross-device performance budgets await manual measurement.

## Manual handoff

Review all five presets, distance motion, pan, safe quality, reduced motion, rapid
object swaps, failed tile loads and context restoration. Look for survey seams,
mask circles, amplified foreground points, doubled nuclei/companions, outer fade,
LOD changes and fine dust. Record viewport/DPR, quality, landscape and source version.
Compare image captures at identical settings; repository tests do not establish
visual quality, frame time, Safari support or memory residency.

After the user accepts the material, run `scripts/andromeda-thumb.py` to prepare
the observed thumbnail, and replace the galaxy encounter/social cards with the
user's accepted browser captures. Existing cards remain historical until then.


Offline derivative verification:

```sh
/tmp/perigee-galaxy-venv/bin/python scripts/verify-galaxy-assets.py
```

For version `55825fd3438b`, all 680 tile dimensions and 1,270 overlapping borders
pass. The worst mean RGB disagreement between independently compressed overlapping
borders is 2.527 of 255 code values; transmission borders agree exactly. The fallback
has no nonblack carrier edge. SHA-256 checks cover all 681 shipped derivatives.
These are file-level checks, not evidence of seam-free browser rendering.


2026-09-07 user review changed the presentation order: the selected galaxy now
covers background catalogue stars and meteors with a soft observed-luminance mask.
This supersedes the earlier foreground-sky composition. The complete base supplies
coverage once, before additive galaxy populations; tile corrections do not change
that coverage. No rectangular opaque carrier is introduced. See `stellar-sky.md`.


2026-09-07 rendering review: emission populations now share the middle surface's
observed sightlines and perspective-correct UV interpolation at every preset.
Finite reconstructed depths no longer separate identical source points or dust
features. The base, detail and occlusion mesh use the same mapping, and tile bounds
follow it. The background mask samples a smooth fixed mip of observed luminance;
its coverage does not reproduce sharp stellar speckles or small dust features as
black sky patches. Observed dust remains in the emission image. Detail tiles match
the base's up-to-8× anisotropy. Source files, hashes and processing are unchanged.
