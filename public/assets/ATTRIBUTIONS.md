# Asset Attributions

## Jupiter globe (`jupiter-cassini-map`)

- File: `objects/jupiter-cassini-pia07782.jpg`, unchanged 3601×1801 source JPEG.
- Source: [Cassini's Best Maps of Jupiter, PIA07782](https://www.jpl.nasa.gov/images/pia07782-cassinis-best-maps-of-jupiter-cylindrical-map/).
  **NASA/JPL/Space Science Institute**, Cassini ISS, 11–12 December 2000.
- Download: https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA07782.jpg
- SHA-256: `6b835ddd8036ea9efd25def04f75aa60b69b096025a37eeae5e9b6978e0a2281`.
- Full 360° longitude / 180° planetocentric latitude, including both endpoints.
  Near-infrared/blue composite approximates natural color; it is not calibrated
  RGB albedo or a present-day weather map. Polar regions are hazy and less resolved.
- Usage: [JPL image use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/),
  credited NASA/JPL/Space Science Institute; no endorsement implied.
- Runtime modifications: source-centre UV sampling, authored contrast/exposure,
  oblate geometry, scene-space illumination and AgX. No generated cloud features.
  Approved on 16 September 2026 as the default Jupiter globe. Menu thumbnail
  `objects/thumbs/jupiter-globe-v1.webp` is rendered from the same accepted pose;
  `scripts/hybrid-review/thumbnail.mjs` records the recipe. The previous portrait
  and its attribution remain available for rollback.

## Current planetary observations (`planetary-observations`)

The September 2026 observational update supersedes the legacy surface/normal
paths listed below. Active URLs come from `src/perigee/planet/planet-manifest.json`.
Files: `objects/planets/<version>/<body>/base.webp`, Moon/Mars colour tile levels,
terrain maps, `saturn/rings-depth.png`, `provenance.json`, and source-crop menu
thumbnails `objects/thumbs/<body>-<version>.webp`.

- Moon colour: [NASA's Scientific Visualization Studio CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/),
  Ernie Wright, NASA/GSFC, LROC and LOLA teams. December 2025 colour release,
  16384×8192 source derivative. Prepared 2K base and 4K/8K/16K tile pyramid.
- Mars colour: [USGS Astrogeology / NASA Ames Viking MDIM 2.1 colourized mosaic](https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m),
  21339×10670 1 km derivative. Prepared 2K base and 4K/8K/16K tile pyramid.
- Jupiter, Saturn, Neptune: **NASA, ESA, STScI, Amy Simon and the Hubble OPAL team**,
  [OPAL Cycle 31](https://archive.stsci.edu/hlsp/opal), November 2024 Jupiter,
  August 2024 Saturn, June 2025 Neptune. Native maps 3600×1800, 1800×900 and
  721×361 (Neptune repeated endpoints removed to 720×360).
- Usage: NASA data/media under the [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/);
  USGS identifies the Mars mosaic as public domain with no use constraints.
  Hubble/MAST maps under the [STScI content use policy](https://www.stsci.edu/copyright),
  which permits public-domain use unless a product states a restriction; these
  OPAL products carry no separate restriction. Credits identify source material,
  not agency endorsement of Perigee's processing or rendering.
- Modifications: OPAL latitude/longitude reprojection, missing-pole and Saturn
  ring-obscuration interpolation, restrained display white balance, Neptune
  contrast reduction; colour compression and bordered tiles. The source maps
  retain finite resolution, coverage and calibration limits. Runtime RGB is sRGB.
  Menu thumbnails are centre crops, not browser-rendered captures.
- Prepared: 2026-09-07. Recipe, exact source URLs, per-file SHA-256 and byte counts
  are in `docs/planet-assets.md`, `scripts/planet-assets.py` and provenance.

### Current terrain (`planetary-elevation-data`)

- Moon: NASA/GSFC LOLA through the CGI Moon Kit's 23040×11520 unsigned half-metre
  elevation product. Mars: NASA/JPL MOLA MEGDR 5760×2880 metre grid from the PDS
  Geosciences Node linked in the legacy normal-map record below.
- Both are NASA public scientific data. Heights are resampled to 4096×2048,
  encoded in lossless RG16 PNG; **1× physical slopes** are encoded as lossless
  tangent normal maps. Longitude is aligned to the colour products and poles
  converge to one height/normal. These replace the exaggerated legacy normals.
- Files: `<body>/terrain-height.png`, `<body>/terrain-normal.webp` beneath the
  versioned planetary directory. Runtime data channels are linear, not sRGB.

### Measured ring structure (`ring-occultation-data`)

- Source: **NASA Voyager 2 UVS team / PDS Ring-Moon Systems Node**,
  [delta Sco egress, 5 km radial profile](https://pds-rings.seti.org/holdings/volumes/VG_28xx/VG_2802/EASYDATA/KM005/US1P01.TAB),
  26 August 1981. Public NASA/PDS scientific data.
- Modifications: exclude missing samples; interpolate normal optical depth into
  8192 radial bins; clip noise below zero and saturated values at tau=8; encode
  losslessly in RG16 PNG. Outside observed coverage is transparent.
- This is a UV radial profile, not a complete visible-light particle model. The
  Solar System Scope ring colour strip retains its separate CC BY 4.0 license.

## Legacy asset records

The following records describe older assets and existing social cards. Entries
marked as removed name files deleted from the repository on 2026-09-07 once nothing
loaded them; the records stay so the licence history of earlier releases is traceable.
They do not override the active versioned observational sources above.

## Planetary surface textures

- Source: [Solar System Scope textures](https://edu.solarsystemscope.com/textures/)
- Author: INOVE / Solar System Scope
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Files: `saturn-ring-2k.webp` (still shipped, with its optional `saturn-ring-2k.ktx2` sibling). Removed 2026-09-07: `moon.jpg`, `mars.jpg`, `jupiter.jpg`, `neptune.jpg`, the 2048×1024 siblings `moon-2k.jpg`, `mars-2k.jpg`, `jupiter-2k.jpg`, their `.ktx2` siblings, and the derived thumbnails in `thumbs/`; the versioned observational maps above replaced them.
- Modifications: Moon and Mars resampled to 4096×2048; Jupiter retained at 4096×2048. The `-2k` siblings are the same maps resampled to 2048×1024 for the safe quality tier; balanced and high retain the larger source maps. Saturn's ring downsampled from the source 8192×500 to 2048×64 as `saturn-ring-2k.webp`: the shader samples a single row of the strip, so the original's height was never read and its width cost 16 MB of GPU memory. The unmodified `saturn.jpg`, `saturn-ring.png` and `star-surface.jpg` were removed once nothing loaded them — Saturn renders from the enhanced map below, and stars are procedural. Runtime treatment adds color-managed lighting, fine-detail recovery, restrained surface response, and slow rotation.
- Downloaded: 2026-08-28

### Interface thumbnails

- Files: `thumbs/moon.webp`, `thumbs/mars.webp`, `thumbs/jupiter.webp`, `thumbs/saturn.webp`, `thumbs/neptune.webp` — removed 2026-09-07, replaced by the versioned `thumbs/<body>-<version>.webp` derivatives above.
- Modifications: Centre square of each source map, resampled to 160×160 and exported as WebP. The object browser previously rendered the full 4096×2048 maps as thumbnails, which cost 8.3 MB to draw seven 64 px circles. `thumbs/saturn.webp` derives from `saturn-atmosphere-v2.webp` so the thumbnail matches what the renderer shows. The former shared `thumbs/star.webp`, cropped from the retired `star-surface.jpg`, was replaced by the procedural star thumbnails below.
- License and attribution follow their sources above.
- Created: 2026-08-30

The source pack is based on NASA elevation and imagery data. Some unmapped
areas are reconstructed by the asset author, and the maps are intended for
visualization rather than scientific analysis.

### Saturn atmosphere enhancement

Attribution ID: `perigee-saturn-art`.

- Source: Original AI-assisted texture generated for Perigee with OpenAI image generation, art-directed from the supplied Cassini-style reference
- Files: `saturn-atmosphere-v2.webp`, `saturn-atmosphere-v2-2k.webp` (the same map at 2048×1024 for the lower quality tiers) and their `.ktx2` siblings — removed 2026-09-07; Saturn renders from the OPAL map above.
- Modifications: Generated as a lighting-neutral 1774×887 equirectangular diffuse map, resampled to 4096×2048, and exported as high-quality WebP. Directional lighting, limb falloff, and highlights remain runtime shader effects rather than baked into the asset.
- Created: 2026-08-29

## Surface normal maps

- Files: `moon-normal.webp`, `mars-normal.webp` and their `.ktx2` siblings — removed 2026-09-07; the physical `terrain-normal.webp`/`terrain-height.png` pairs above replaced them.
- Sources:
  - Moon: [LRO LOLA LDEM, 16 pixels/degree](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/) — NASA / Goddard Space Flight Center / LOLA science team
  - Mars: [MGS MOLA MEGDR, 16 pixels/degree](https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/) — NASA / JPL / MOLA science team
- License: Public domain (NASA data, distributed through the PDS Geosciences Node)
- Modifications: The 5760×2880 elevation grids were rolled from their 0–360°E layout into the −180–180° layout the albedo maps use, resampled to 2048×1024, and converted to tangent-space normal maps by the retired legacy generation script (preserved in Git history). Ground spacing is computed per latitude from each body's radius, so slopes are correct relative to one another; the whole field is then exaggerated by a single factor (Moon 1.8×, Mars 5.2×) because true planetary relief is far too shallow to survive 8-bit encoding. The source elevation files are not kept in this repository.
- Purpose: Perceived surface detail comes from relief that answers to the sun. Deriving it from the albedo instead invents craters in the dark lunar maria and flattens the ones that are really there.
- Downloaded: 2026-08-30

## Viewpoint landscapes

Attribution ID: `perigee-environment-art`.

- Source: Original AI-assisted project artwork, generated for Perigee with OpenAI image generation
- Files: `rooftop-cinematic-4k.webp`, `hilltop-cinematic-4k.webp`, `lakeside-cinematic-4k.webp`
- Modifications: Generated 1586×992 masters were resampled to 3172×1984 and exported as high-quality WebP. Each plate contains a continuous sky, atmospheric horizon, and low foreground with no celestial object or interface content. `thumbs/rooftop.webp`, `thumbs/hilltop.webp` and `thumbs/lakeside.webp` are 320×180 crops of the lower part of each plate, lifted slightly in brightness, for the landscape chooser.
- Purpose: Seamless full-frame environment layers rendered inside the Three.js sky pass. Camera-linked UV motion, overscan, crossfades, and object-aware tinting keep the horizon and celestial render visually coherent.
- Derived variants (2026-09-06): `*-cinematic-2k.webp` (2048×1281) and `*-cinematic-safe.webp` (1280×801), produced by `scripts/environment-variants.sh`. Same crop and grade as the delivered masters. These are resamples, not additional native detail.
- Created: 2026-08-29

### Cabo da Roca viewpoint

Attribution ID: `cabo-da-roca-reference`.

- Source: [Cabo da Roca Lighthouse and coastal cliffs, Portugal — May 2025](https://commons.wikimedia.org/wiki/File:Cabo_da_Roca_Lighthouse_and_coastal_cliffs,_Portugal_-_May_2025.jpg)
- Author: LensaCibi
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Files: `cabo-da-roca-landscape-4k.webp`, `cabo-da-roca-landscape-2k.webp`, `cabo-da-roca-landscape-safe.webp`, `cabo-da-roca-portrait-2k.webp`, `cabo-da-roca-portrait-safe.webp`
- Modifications: The licensed geographic and architectural reference was art-directed through OpenAI image generation into clean nighttime environment plates. Interface elements, stars, and celestial objects were excluded so they remain live runtime layers. Separate landscape and portrait masters preserve the lighthouse, Atlantic horizon, and cliffs without stretching; quality-tier variants were then resized and exported as WebP. `thumbs/cabo-da-roca.webp` is a 320×180 crop of the lower part of the 2K landscape plate for the landscape chooser.
- Created: 2026-08-31

## Procedural project artwork

- Source: Original work created for Perigee. No third-party asset is used.
- Files: `thumbs/betelgeuse-5d4128be14cd.webp`, `thumbs/sirius-334f60b83553.webp`, `thumbs/rigel-bc3abdf6c7af.webp`, `encounters/the-galaxy-hiding-in-our-sky.jpg`. The unhashed `thumbs/betelgeuse.webp`, `thumbs/sirius.webp` and `thumbs/rigel.webp` were removed 2026-09-07.
- Legacy galaxy encounter/social cards still depict the procedural
  renderer, pending manual acceptance and replacement captures for Chunk 1.
  The control-menu thumbnail was replaced with an observational derivative on 2026-09-07.
  The three star thumbnails are generated by `scripts/star-thumbs.py` and remain
  procedural until their owning rendering chunk.
- Created: 2026-09-01

## Rendered social cards

- Source: Frames captured from Perigee's own live renderer. No new third-party asset is introduced.
- Files: `social/perigee.jpg`, `objects/social/moon.jpg`, `objects/social/mars.jpg`, `objects/social/jupiter.jpg`, `objects/social/saturn.jpg`, `objects/social/neptune.jpg`, `objects/social/betelgeuse.jpg`, `objects/social/sirius.jpg`, `objects/social/rigel.jpg`, `objects/social/andromeda.jpg`, `encounters/saturn-at-the-moons-distance.jpg`, `encounters/saturn-at-the-edge-of-the-world.jpg`, `encounters/when-betelgeuse-takes-the-sky.jpg`, `encounters/why-the-moon-grows-so-quickly.jpg`
- Modifications: Each card is a clean frame from the running scene, exported through the app's own capture path and resized to 1200x630 JPEG. The object cards carry Perigee's standard restrained caption; the site-wide card in `social/` carries none.
- Note: These are composites, so they inherit the licences of whatever they show. A card of a rocky or gas-giant body contains the Solar System Scope surface texture (CC BY 4.0, see above) over a viewpoint plate; a card of a star or the galaxy contains only procedural project artwork over a viewpoint plate. The Cabo da Roca plate is CC BY-SA 4.0, which the cards showing it inherit.
- Created: 2026-09-04

## Bright star catalogue

- Source: [Yale Bright Star Catalog, 5th revised edition (BSC5)](http://tdc-www.harvard.edu/catalogs/bsc5.html) — Hoffleit, D. and Warren, W. H. Jr., 1991
- License: Public domain (catalogue data distributed by the Harvard-Smithsonian Center for Astrophysics)
- File: `stars/1abba926ac03/bsc5.bin` (selected by `src/perigee/scenes/skyManifest.json`). The identical unversioned copy was removed on 2026-09-07; regeneration uses an external source cache or this active versioned copy.
- Modifications: `scripts/star-catalogue.py` reads the fixed-column catalogue and packs right ascension, declination, visual magnitude and B−V colour index into an 8-byte record per star, sorted by magnitude. Stars without a magnitude are dropped. 9,096 stars in 73 kB.
- Purpose: The star field's brightness distribution and colours. A generated field has a flat brightness distribution, which is what makes it read as generated; the catalogue carries the real few-bright, many-faint law. Positions retain the J2000 catalogue epoch; the runtime reference sky is registered to the staged target and viewpoint latitude. See `docs/stellar-sky.md`.
- Downloaded: 2026-09-02

## Betelgeuse portrait reference (`perigee-procedural-art`, 2026-09-14)

- File: `objects/betelgeuse-portrait-v1.webp`.
- Source: original OpenAI-generated artwork commissioned by the project owner,
  from the approved `betelgeuse-full-object.png`; no telescope image pixels used.
- Rights: project-provided generated artwork; not an ESO/NASA licensed photograph.
- Conversion: native 1672×941 image encoded as WebP, quality 95.
- Menu preview: `objects/thumbs/betelgeuse-portrait-v1.webp`, a 940×940 crop
  at (358, 0), resized to 160×160 and encoded as WebP at quality 94.
- References informing the art direction: [ESO ALMA](https://www.eso.org/public/images/potw1726a/),
  [ESO SPHERE](https://www.eso.org/public/images/eso2109a/),
  [Chiavassa et al. 2010 convection simulations](https://arxiv.org/abs/1003.1407).
- Rollback/reference: a fixed camera-facing illustration with transparent
  optical glow, distance-dependent angular size and the existing unresolved-star
  transition. It was the production renderer until the 2026-09-29 H6 approval
  and remains selectable through the explicit review override. This is an
  artistic reconstruction, not a measured surface map.

## Betelgeuse H6 approved convection globe (`betelgeuse-convection-art`, 2026-09-29)

- Active file: `objects/betelgeuse-convection-v1.webp`; the original portrait
  remains a fixed comparison and rollback asset.
- Source and rights: newly generated project artwork made with Codex imagegen.
  No ESO, ALMA or NASA image pixels were used. This is a synthetic convection
  illustration, not measured visible-light surface data.
- Processing: generated 1774×887 PNG encoded to WebP with `cwebp -q 94`;
  SHA-256 `5cd2202bbe79894ffd5d9ba8fcc06cdd16ed3eda45306f9b3e60feb1ff8a33d7`.
  Its intrinsic highlights are artwork, not directional illumination. The
  shader blends an alternate longitude near the nonmatching source edges.
- Menu preview: `objects/thumbs/betelgeuse-globe-v1.webp`, 320×320 WebP
  cropped from an actual 8K export of the accepted production globe with the
  rest of the scene hidden. The original portrait preview remains available.
- References: [ALMA 2023 submillimetre surface and atmosphere](https://www.almaobservatory.org/en/audiences/alma-reveals-long-lived-hotspots-on-betelgeuses-bubbling-surface/),
  [ESO SPHERE visible-light change](https://www.eso.org/public/images/eso2109a/)
  and [Hubble's convective-upwelling interpretation](https://science.nasa.gov/missions/hubble/hubble-finds-that-betelgeuses-mysterious-dimming-is-due-to-a-traumatic-outburst/).
  These guide broad asymmetry only; none is a global colour map for this texture.

## Basis Universal transcoder

- Source: [three.js `examples/jsm/libs/basis`](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/libs/basis), built from [Binomial LLC's Basis Universal](https://github.com/BinomialLLC/basis_universal)
- License: Apache License 2.0
- Files: `basis/basis_transcoder.js`, `basis/basis_transcoder.wasm`
- Modifications: None. Byte copies of the files shipped with the pinned three.js release, kept in step by `tests/basis-transcoder.test.ts`.
- Purpose: Decodes the `.ktx2` object maps on the GPU's own compressed format at runtime.

## Ambient music

- Source: Generated with Google Lyria in Google AI Studio
- Author: Aliaksei Mazheika (prompts), Google Lyria (audio)
- License: Google claims no ownership of content generated through the Gemini API (terms effective 2026-03-23). The SynthID watermark in each file is left intact.
- Files: `audio/rooftop-*.mp3`, `audio/hilltop-*.mp3`, `audio/lakeside-*.mp3`, `audio/cabo-da-roca-*.mp3`
- Modifications: `scripts/audio.sh` cuts a loopable section out of each master (skipping the intro and the outro fade), resamples to 44.1 kHz, normalises to −20 LUFS integrated with a −1.5 dBTP ceiling, bakes a four-second crossfade so the file's end runs into its own start, and encodes to 128 kbps MP3. The masters are not kept in the repository.
- Purpose: One piece per viewpoint, looped and crossfaded on a viewpoint change. It replaced a Web Audio soundscape that listeners consistently read as dark rather than calm.
- Generated: 2026-09-04

All four share 58 bpm and F major leaning toward D minor, so a crossfade
between viewpoints does not clash. Each prompt asks for felt piano over a
sustained pad with a cold high synth tone above it, names the place, and
forbids drums, vocals, build-ups and sentimental melody. The full prompts are
in the implementation plan this change was built from.

## Andromeda observations (`andromeda-observations`)

- Preview: `objects/thumbs/andromeda-55825fd3438b.webp`, a 160×160 observational derivative prepared
  by `scripts/andromeda-thumb.py`; inherits the credits and CC BY 4.0 license below.
- Runtime files: `objects/andromeda/<version>/base.webp`, the tiled levels below
  that directory, and `provenance.json`. The active version is recorded in
  `src/perigee/galaxy/andromeda-manifest.json`.
- Complete field: **NASA, ESA, Digitized Sky Survey 2 (Acknowledgement: Davide De Martin)**,
  [heic1502b](https://esahubble.org/images/heic1502b/), 21299×13775 native pixels.
- Detail: **NASA, ESA, B. Williams (University of Washington)**,
  [heic2501a](https://esahubble.org/images/heic2501a/), 42208×9870 native pixels;
  Hubble PHAT/PHAST, 475 nm and 817 nm. The distributed image is a subset of the
  underlying survey, not a complete natural-colour whole-galaxy photograph.
- License: [Creative Commons Attribution 4.0](https://esahubble.org/copyright/).
- Modifications by Perigee: gnomonic registration and major-axis reprojection,
  local linear-light exposure/colour matching, coverage feathering, catalogue
  foreground masking with local annular fill, sky-pedestal subtraction, outer
  taper, inferred transmission in alpha, and bordered WebP tile pyramid.
- Derivatives: 16384×8192 assembled target, 8192/4096/2048 tile levels and a
  1024×512 lossless fallback. Runtime RGB is sRGB; alpha stores linear
  transmission, not transparency. See per-file hashes and byte counts in the
  provenance file and the reproducible recipe `scripts/galaxy-assets.py`.
- The source photographs already contain their exposure stretches; this is
  observational structure with authored photographic rendering, not calibrated
  radiometry. Smaller source coverage/detail is not represented as new data.

## Gaia foreground selection (`gaia-foreground`)

- The preparation script uses Gaia DR3 positions, G magnitudes, parallax
  significance and proper motions from the public Gaia Archive TAP service.
  The catalogue is used for masking, not shipped or drawn as a second star field.
- This work has made use of data from the European Space Agency (ESA) mission
  Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing
  and Analysis Consortium (DPAC, https://www.cosmos.esa.int/web/gaia/dpac/consortium).
  Funding for the DPAC has been provided by national institutions, in particular
  the institutions participating in the Gaia Multilateral Agreement.
- Source query and checksum are recorded in the observational provenance.
  Selection is conservative and not a complete foreground membership classifier;
  faint/unclassified points can remain. No blanket star-removal filter is applied
  to Andromeda's clusters or resolved stellar populations.


## Gaia stellar sky — Chunk 3

- Runtime derivatives: `stars/1abba926ac03/{gaia.bin,integrated-light.bin,bsc5.bin}`.
  The Yale copy retains its original public-domain credit above.
- Gaia catalogue: ESA/Gaia/DPAC, Gaia DR3; Gaia Collaboration et al. (2023),
  A&A 674, A1, https://doi.org/10.1051/0004-6361/202243940.
- G-flux HiPS: T. Boch (CDS), CNRS/Université de Strasbourg; ESA/Gaia/DPAC.
  https://alasky.cds.unistra.fr/ancillary/GaiaDR3/G-flux-map/properties
- License: the Gaia-derived point database and diffuse map are made available
  under Open Database License 1.0: https://opendatacommons.org/licenses/odbl/1-0/.
  The source HiPS metadata explicitly specifies ODbL-1.0. Source data and
  transformations remain available through the linked services and preparation script.
- Uses data from the European Space Agency (ESA) mission Gaia, processed by the
  Gaia Data Processing and Analysis Consortium (DPAC). Funding for DPAC has been
  provided by national institutions, in particular the institutions participating
  in the Gaia Multilateral Agreement.
- Modifications: Yale/Gaia spatial cross-match; drawn-source flux subtraction;
  equal-area reduction; linear scalar equirectangular map; BP-RP display proxy;
  immutable binary packing. No source survey display JPEG or false colour is used.
- All source/output SHA-256 hashes, dimensions, bands, credits, orientation and
  query are in `src/perigee/scenes/skyManifest.json`. Reproduction and limitations:
  `docs/stellar-sky.md`, `scripts/sky-assets.py`.
- Stellar menu previews: original procedural Perigee illustrations from
  `scripts/star-thumbs.py`, using the current inferred stellar material parameters.
  AgX conversion follows Three.js (MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE).
  These previews are not observations or accepted browser captures.

## Sun approved synthetic globe (`sun-synthetic-globe`, 2026-10-01)

- Files: `objects/sun-granulation-review-v1.webp` (4096×2048),
  `objects/sun-poles-review-v1.webp` (2048×1024), adjacent recipe/hash JSON,
  `objects/thumbs/sun-globe-v1.webp` (320×320), and `objects/social/sun.jpg` (1200×630).
- Original Perigee synthetic artwork under the repository MIT license, explicitly
  approved on 2026-10-01. Generated by `scripts/hybrid-review/generate-sun-texture.py`.
  No telescope or portrait pixels are copied. The polar atlas samples the same
  three-dimensional cellular field without an equirectangular pole singularity.
  The thumbnail is rendered from a frozen 8K export of the accepted globe.
  The social card crops the accepted desktop 8K scene export with an authored caption;
  `scripts/hybrid-review/sun-social.py` reproduces it without new surface art.
- [HMI observables research](https://arxiv.org/abs/1606.02368) describes visible
  Fe I 6173.3 Å continuum proxies from full visible-disc measurements, not a global
  colour map. [DKIST first-light granulation](https://nso.edu/telescopes/dkist/first-light-cropped-image/)
  is a local 789 nm near-infrared field, not visible-light global RGB imagery.
  These inform morphology only; no source pixels are reused or redistributed.
- Granule scale, colour, sunspot groups, faculae and optical spill are artistic
  reconstruction, not calibrated photometry, a current solar observation, or a
  claim of observational resolution. No magnetogram colours, ultraviolet corona,
  baked disc, limb, halo or sky are wrapped onto the sphere. Spots are analytical
  shader features; the optical spill is separate and view-facing.
- Bulk solar motion remains disabled. The sourced sidereal differential-feature
  demonstration is bounded and review-only, with separate illustrative evolution.
  Complete wavelength/resolution/coverage/epoch/processing/rights limits and colour
  and motion decisions are in [the Sun handoff](../../docs/sun-hybrid-review.md).

## Sun cinematic portrait rollback (`perigee-sun-portrait`)

- Files: `objects/sun-portrait-v1.webp`, `objects/thumbs/sun-portrait-v1.webp`.
- Created for Perigee with OpenAI image generation, approved by the user as the
  visual reference on 2026-09-15. Original: `perigee-sun-cinematic.png` in Downloads.
  Generated artistic reconstruction; not a telescope photograph, measured map,
  or representation of current solar activity. Project-authored asset under the
  repository MIT license; no third-party photograph is embedded in the texture.
- Visual research: [NASA SDO/HMI](https://svs.gsfc.nasa.gov/3988),
  [NSO DKIST granulation](https://nso.edu/telescopes/dkist/first-light-cropped-image/),
  and [Solar System Scope maps](https://www.solarsystemscope.com/textures/).
  These informed morphology, not a calibrated visible-light colour palette.
- Conversion: `cwebp -lossless` retains all source RGB values at 1254×1254;
  thumbnail uses `cwebp -resize 160 160 -q 94`. No new generative edit.
- Rollback runtime: camera-facing portrait, measured image centre (621,622) and approximate
  photospheric radius 545 px. Black becomes transparent optical glow beyond the
  photosphere; outer 10–15% margin fades smoothly. No second tone map or bloom.
- Physical radius 695,700 km and reference visual magnitude −26.74:
  [NASA Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html).

## Jupiter supplied portrait (`jupiter-supplied-portrait`, 2026-09-15)

Assets: `objects/jupiter-portrait-v1.png`, `objects/thumbs/jupiter-portrait-v1.webp`.
The menu thumbnail is a 160×160 WebP crop of the same illustrated globe.

Source: user-supplied `ChatGPT Image Sep 15, 2026, 10_31_18 AM.png`
from Downloads, supplied for incorporation into Perigee. Original image retained
without recompression or colour changes. AI-generated artistic reference; no
NASA/ESA observational provenance or independent third-party licence asserted.

The renderer samples the illustrated disc and excludes the surrounding starfield.
The fixed face, baked lighting and illustrated silhouette are preserved. It is
composited after tone mapping in both the live scene and saved captures. Apparent
width uses Jupiter's existing diameter and distance calculation; atmospheric
motion, changing phase and physical oblateness are not simulated by this portrait.

## Moon LRO-inspired portrait (`moon-lro-inspired-portrait`, 2026-09-15)

- Files: `objects/moon-portrait-v1.png`, `objects/thumbs/moon-portrait-v1.webp`.
- Source: AI-generated artwork created for Perigee using OpenAI image generation,
  approved by the project owner. The PNG is the unmodified 1254×1254 generated image.
- Visual reference: [The Near Side of the Moon](https://science.nasa.gov/resource/the-near-side-of-the-moon/),
  NASA/GSFC/Arizona State University, photographed by the Lunar Reconnaissance Orbiter.
  The artwork is not a NASA photograph or a measured map; crater positions and relief
  are approximate. The observational reference does not imply NASA endorsement.
- Runtime: one camera-facing portrait preserves the near-side geography, natural gray
  tones, crater rays and fixed sunlight. The measured limb centre is (627,618), with
  an approximate radius of 556 pixels. The source's black background is removed in
  the shader; the actual lunar outline is retained. Composition after tone mapping
  preserves the same appearance in the live scene and saved captures.
- Angular size uses the recorded lunar diameter and selected distance. Rotation,
  changing phase, libration, dynamic terrain shadows and earthshine are not simulated.
- Thumbnail: a 1136×1136 crop at (60,52), resized to 160×160 WebP at quality 94.

## Saturn Cassini-inspired portrait (`saturn-cassini-inspired-portrait`, 2026-09-15)

- Files: `objects/saturn-portrait-v1.png`, `objects/thumbs/saturn-portrait-v2.webp`.
- Source: original artwork generated for this project with OpenAI image generation,
  approved as `saturn-cassini-inspired.png`. The 1672×941 PNG is copied unchanged;
  the menu preview is a 160×160 WebP derivative, with the full image resized
  to 144 pixels wide and centred on black padding so the rings fit a circular crop.
- Visual references: NASA/JPL-Caltech/Space Science Institute Cassini imagery,
  [Staring at Saturn (PIA21047)](https://science.nasa.gov/photojournal/staring-at-saturn/)
  and [Saturn in Color (PIA05389)](https://science.nasa.gov/photojournal/saturn-in-color/).
  These informed the art direction; the runtime image is generated artwork,
  not a NASA photograph or an observational map. No third-party texture is copied.
- Runtime: the fixed globe and rings share one camera-facing portrait, sampled
  without another exposure, bloom or AgX curve, in live and saved rendering.
  Source-derived black-key transparency removes the background and opens ring gaps;
  it approximates opacity in the very darkest ring shadows. Globe centre (839,441)
  and radius 351 pixels anchor calculated apparent size. Illustrated oblateness,
  ring proportions, orientation and shadows are preserved, not physically simulated.
- The older Hubble OPAL surface and Voyager ring data remain in the delivered
  asset library; their existing source records still apply to those files.

## Mars NASA-informed portrait (`mars-nasa-inspired-portrait`, 2026-09-16)

- Files: `objects/mars-portrait-v1.png`, `objects/thumbs/mars-portrait-v1.webp`.
- Source: Original OpenAI-generated artwork commissioned for Perigee; approved
  cinematic revision `mars-cinematic-v2.png`. The 1254×1254 PNG is preserved unchanged.
  The thumbnail is a 160×160 WebP derivative. Project artwork under the repository's MIT license.
- Visual references: [Hubble true-color Mars](https://science.nasa.gov/asset/hubble/true-color-image-of-mars/)
  and [NASA/JPL Viking global color views, PIA00407](https://www.jpl.nasa.gov/images/pia00407-global-color-views-of-mars/).
  These informed the art direction; this asset is not a NASA photograph or measured map.
- Runtime: fixed camera-facing portrait, measured limb centre (616,614), radius
  approximately 570 pixels. Physical diameter and distance set globe scale, excluding
  the image margin. The dark hemisphere stays opaque; a soft radial/luminance mask
  removes the black backdrop and background stars while retaining the thin limb haze.
- The shared post-AgX portrait pass preserves source colour and baked sunlight in
  both the live view and saved stills. No extra surface lighting, rotation, terrain
  displacement or phase simulation is applied. Existing observational maps remain
  archived in the asset pack but are not loaded for this portrait.


## Neptune Voyager-inspired portrait (`neptune-voyager-inspired-portrait`, 2026-09-16)

- Files: `objects/neptune-portrait-v1.png`, `objects/thumbs/neptune-portrait-v1.webp`.
- Source: original OpenAI-generated artwork commissioned and approved for Perigee
  as `neptune-cinematic.png`. The 1254×1254 PNG is preserved unchanged. Project
  artwork under the repository's MIT license; no NASA photograph is redistributed.
- Visual references: [NASA/JPL Voyager 2, PIA00063](https://science.nasa.gov/photojournal/neptune-true-color-of-clouds/)
  and [Oxford's 2024 colour reconstruction](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0).
  The storm recalls Voyager's 1989 appearance; clouds, colour and lighting are
  artistically reconstructed, not a current observation or calibrated measurement.
- Runtime: fixed camera-facing portrait with approximate limb centre (622,622)
  and radius 565 pixels. Physical diameter and distance set globe scale. The dark
  hemisphere remains opaque, while a luminance key removes the black backdrop.
  The shared post-tone-mapping pass preserves authored colour and sunlight in both
  the live view and saved captures, without additional relighting or rotation.
- Thumbnail: 1160×1160 crop at (40,42), resized to 160×160 WebP at quality 94.
- The earlier Hubble OPAL maps remain in the asset library with their existing credits;
  they are not loaded for the portrait. Observational references imply no endorsement.

## Sirius A synthetic globe (`sirius-synthetic-globe`, approved 2026-09-30)

- Files: `objects/sirius-granulation-review-v1.webp`, `objects/thumbs/sirius-globe-v1.webp`.
  The `review-v1` map is the version accepted for production; the filename preserves
  its review provenance. Both assets are original project artwork under the
  repository's MIT license. No third-party photograph or data pixels are embedded.
- Source and processing: `scripts/hybrid-review/generate-sirius-texture.mjs`
  creates a continuous 2048×1024 equirectangular synthetic granulation map from
  three-dimensional noise. The PPM output is encoded as lossless WebP to avoid
  a visible longitude seam. The 320×320 thumbnail is cropped from an actual
  8K export of the accepted production globe with other scene objects hidden.
- Research references: [NASA/ESA Hubble's Sirius A and B image](https://science.nasa.gov/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/)
  resolves the binary but not A's surface; its spikes and rings are optical
  artifacts. [VINCI/VLTI near-infrared interferometry](https://arxiv.org/abs/astro-ph/0306604)
  constrains angular diameter and limb behavior, not surface cells.
  [A-star convection simulations](https://arxiv.org/abs/astro-ph/0509464)
  motivate subtle variation but are neither Sirius-specific observations nor a
  global map. [Optical line-profile analysis](https://arxiv.org/abs/2009.07143)
  does not establish a unique bulk period, pole or direction. No research figure
  is reproduced; the cited media and papers retain their publishers' rights.
- Runtime: the emissive blue-white globe and separate view-facing optical halo
  use the display-referred post-AgX layer. The normal apparent-size calculation
  and resolved-to-point transition are preserved. Bulk spin is disabled; the
  deterministic turntable is confined to review. Surface evolution is separate
  from rotation. Sirius B is not mapped onto the globe or animated.
- Limits: this is an artistic reconstruction, not a resolved photograph,
  measured photospheric map, calibrated radiance model or dated orientation.
  Observational references imply no endorsement.

## Sirius A NASA-informed portrait (`sirius-nasa-inspired-portrait`, 2026-09-16; rollback)

- Files: `objects/sirius-portrait-v1.png`, `objects/thumbs/sirius-portrait-v1.webp`.
- Source: original OpenAI-generated artwork commissioned and approved for Perigee
  as `sirius-realistic.png`. The 1254×1254 PNG is copied unchanged. Project artwork
  under the repository's MIT license; no third-party photograph is embedded.
- Visual references: [NASA/ESA Hubble Sirius A and its companion](https://science.nasa.gov/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/)
  and [NASA/ESA/G. Bacon's Sirius illustration](https://science.nasa.gov/asset/hubble/an-artists-impression-of-sirius-a-and-sirius-b/).
  The blue-white photosphere and fine surface texture are an artistic reconstruction,
  not a resolved telescope image, measured surface map or calibrated radiance model.
  Sirius B is outside the portrait. Observational references imply no endorsement.
- Review rollback: fixed camera-facing portrait, approximate centre (624,608), mean
  photospheric radius 518 pixels. The existing diameter and distance calculation
  sets apparent size. Source brightness supplies the transparent blue optical halo;
  the faint outer margin fades to exclude the image backdrop and distant stars.
- The shared post-AgX portrait pass preserves source colour, exposure and glow in
  review scenes and saved stills. No extra
  lighting, bloom, surface rotation or procedural granulation is applied. At small
  apparent sizes the existing unresolved-star point and atmospheric treatment remain.
- Thumbnail: 1200×1200 crop at (24,8), resized to 160×160 WebP at quality 94.


## Rigel NASA-informed portrait (`rigel-nasa-inspired-portrait`)

Historical portrait retained as an explicit rollback after the approved globe
promotion on 2026-10-01. Its original source and thumbnail remain unchanged.

- Files: `objects/rigel-portrait-v1.png`, `objects/thumbs/rigel-portrait-v1.webp`.
- Original artwork generated with OpenAI image generation for Perigee on 2026-09-16;
  approved by the project owner. Used under the applicable OpenAI output terms.
- References: [NASA APOD, Rigel Wide](https://apod.nasa.gov/apod/ap230407.html)
  and [NASA Cassini, Help from Orion](https://science.nasa.gov/photojournal/help-from-orion/).
  The blue-white photosphere, subtle mottling and optical halo are an artistic
  reconstruction, not a resolved spacecraft photograph or measured surface map.
  Reference sources imply no endorsement; their photographs are not redistributed.
- Runtime: unmodified 1254×1254 source, approximate centre (627,608), mean
  photospheric radius 502 pixels. Physical diameter and distance set apparent size.
  Source brightness supplies halo transparency; the outer margin fades to exclude
  the backdrop. The shared post-AgX portrait pass preserves authored colour,
  exposure and glow in both live rendering and saved stills, matching the other
  approved portraits. No extra relighting, bloom or surface rotation is applied.

## Rigel approved synthetic globe (`rigel-synthetic-globe`, 2026-10-01)

- Files: `objects/rigel-mottling-review-v1.webp` (4096×2048),
  `objects/rigel-poles-review-v1.webp` (2048×1024),
  `objects/rigel-mottling-review-v1.json`, `objects/thumbs/rigel-globe-v1.webp`,
  and `objects/social/rigel.jpg`.
- Original project-authored synthetic mottling, generated by
  `scripts/hybrid-review/generate-rigel-texture.py`; MIT. The globe was explicitly
  approved by the project owner on 2026-10-01. No telescope or portrait pixels,
  baked disc, limb, halo, stars or background enter its surface maps.
- Smooth 3D fields with four spatial bands, modest domain warp and differently
  oriented octave bases supply both equirectangular and orthographic polar maps.
  Lossless WebP and bounded authored sRGB colour preserve the accepted rendering.
  Feature sizes, positions and contrast are invented, not measured cell scales,
  current photospheric patterns, solar granulation or a Betelgeuse convection model.
- Research: [Moravveji et al., MOST photometry and spectroscopy](https://arxiv.org/abs/1201.0843),
  [Chesneau et al., VEGA/CHARA](https://arxiv.org/abs/1007.2095),
  [Chesneau et al., AMBER author dataset](https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/J/A%2BA/566/A125?format=html&tex=true),
  and [de Almeida et al., intensity interferometry](https://arxiv.org/abs/2204.00372).
  Disc-size fits, unresolved spectra/pulsations and spectral-line wind diagnostics
  are not a measured visible global map. Their figures/data are not redistributed.
- Display-linear self-emission composites after AgX, with no directional terminator.
  A separate view-facing optical layer supplies the authored halo. No companion,
  wind structure, current spot pattern or automatic rotation is added.
- Thumbnail: the accepted frozen 8K globe export with the surrounding scene hidden,
  a 1.22-diameter crop including optical spill, resized to 320×320 WebP, quality 94.
  Social card: 1200×630 crop derived from the accepted desktop 8K frame.
- Surface SHA-256: `19a02a5cfea08018ae4eb7ae0d72b430410b5e0b31ed11ac4c07a7e9441b4f2c`.
  Pole SHA-256: `38d5ca2ffa4d37294b96c09bfd672f4f19015145ddbecc84ec5be6c4f5411e50`.
  Full provenance, approval and limitations: `docs/rigel-hybrid-review.md`.
  The existing unresolved-star and atmospheric treatment remains at small sizes.
- Thumbnail: 1204×1204 crop at (25,6), resized to 160×160 WebP at quality 94.

## Andromeda NASA-informed portrait (`andromeda-nasa-inspired-portrait`)

- Files: `objects/andromeda-portrait-v2.png`, `objects/thumbs/andromeda-portrait-v3.webp`.
- Original AI-generated artwork created for Perigee on 2026-09-16, approved by the user; project-authored asset distributed under the repository MIT license. This is an artistic reconstruction, not a telescope observation or a measured three-dimensional volume.
- Visual references: [NASA Hubble PHAT+PHAST mosaic](https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/) and [NASA SVS visible-light Andromeda reference](https://svs.gsfc.nasa.gov/30990) (optical image: NOAO, AURA/NSF). Reference photographs are not redistributed in this portrait.
- The original colors, dust lanes, companions and lighting are preserved through the shared post-tone-mapping portrait compositor in both live views and captures. Angular scaling uses the existing optical diameter and distance presets; the image does not simulate parallax inside the galaxy.

- Andromeda portrait v2: edited with the built-in image generation tool to remove all isolated stars and unrelated galaxies from the surrounding black sky, retaining the main disc and its two diffuse companions. Thumbnail v3 uses this clean source with square padding.


## Saturn H5 original review renderer (historical, superseded)

The review-only oblate globe reuses `planetary-observations` (OPAL Saturn 2024),
`ring-occultation-data` (Voyager UVS) and `solar-system-scope-textures` (ring color).
No source pixels or immutable derivatives were replaced. `SaturnGlobeMaterial`
applies bounded source-space detail recovery and authored cream color/lighting
calibration. `RingMaterial` independently uses measured optical depth and authored
ivory balance for the illustrative CC BY 4.0 color strip; its alpha is not depth.
The native atmosphere is 1800×900 with 17.4748% reconstructed coverage. No observed
Cassini polar vortex or high-resolution global cloud mosaic is claimed.

At this initial review stage, the portrait and its thumbnail remained active.
The later observational revision below was subsequently approved and promoted;
see the accepted asset IDs at the end of this record.
## Saturn H5 observational composite revision (approved 2026-09-16)

This supersedes the OPAL/SSS-only review description above. The user approved
this exact revision for production; the original portrait remains for rollback.

- `objects/saturn-observational-composite-v1.webp` (3600×1801) and its JSON provenance:
  an **authored multi-epoch display reconstruction**, not simultaneous weather or
  neutral albedo. Broad haze uses the existing NASA/ESA/STScI
  [Hubble OPAL 2024-08-22 map](https://archive.stsci.edu/hlsp/opal/opal-saturn-cycle-31).
  Small cloud structure uses the original and enhanced NASA PDS Cassini ISS RGB
  maps of 2011-08-11, from [Wang et al. (2025)](https://doi.org/10.1038/s41597-025-04392-3),
  [PDS archive](https://atmos.nmsu.edu/data_and_services/atmospheres_data/Cassini/sat_global_map.html).
  Native global FITS grids are 3601×1801×3, with about 161 km/pixel source imagery.
  The stored rows are verified north-first against the paper's storm/shadow
  locations; the FITS latitude/display labels are inconsistent with that order.
  After rejecting boundary fringes, 80.6774% of this Cassini grid has coverage;
  that is **not** an observed-coverage claim for the final composite.
- The northern cap uses the left (2013-06-25) panel of
  [NASA PIA21611](https://www.jpl.nasa.gov/images/pia21611-saturns-hexagon-as-summer-solstice-approaches/),
  credit **NASA/JPL-Caltech/Space Science Institute/Hampton University**. It is
  reprojected from the published nominal 25 km/pixel polar stereographic display,
  with approximate scale, authored longitude and a blue-grey display balance
  that preserves the observed chromatic hexagon boundary.
  A 78.5–81°N blend preserves observed polar structure without a sharp cap edge.
  It is not a calibrated 2011 polar observation.
- `objects/saturn-cassini-rings.webp` (8192×8) and its JSON provenance:
  [NASA PIA11142, A Full Sweep of Saturn's Rings](https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/),
  Cassini ISS RGB, 2008-11-26. Credit **NASA/JPL/Space Science Institute**.
  A narrow median scan is registered to ring boundary/gap landmarks; the JSON
  records the approximate pixel/radius anchors. Display brightness is lifted
  before relighting. This is observational color structure, not a calibrated
  visible albedo retrieval. Independent Voyager UVS optical depth still controls
  transparency and shadows; no new optical-depth measurements are asserted.

Reproduction scripts: `scripts/hybrid-review/prepare-saturn-map.py` and
`prepare-saturn-rings.py`. Source/output SHA-256 values, exact transforms and
registration limits live in the adjacent JSON records. Ring-obscured strips and
longitude-edge defects are reconstructed smoothly, not presented as new clouds.
No generated portrait pixels are projected onto the globe. The original portrait,
OPAL, Voyager and Solar System Scope assets remain unchanged. NASA/JPL imagery
is used with credit under its image-use policy; the pre-existing Hubble/OPAL
credits and terms above also apply. No NASA/ESA endorsement is implied.

## Accepted Saturn globe (`saturn-observational-composite`)

Promoted locally following the user's approval on 2026-09-16 of the
`observational-v1` comparison. Files: `objects/saturn-observational-composite-v1.webp`
and `.json`; `objects/thumbs/saturn-globe-v1.webp` is rendered from that approved
3D globe, including the separate rings. All Cassini, Hubble, polar-projection,
interpolation, authored-colour and multi-epoch limitations in the observational
revision above still apply. No additional generated cloud features were added
for promotion. The previous portrait is retained for rollback and comparison.

## Accepted Saturn ring colour (`saturn-cassini-ring-color`)

File: `objects/saturn-cassini-rings.webp`, with its adjacent provenance JSON.
Derived from NASA/JPL/Space Science Institute Cassini PIA11142 as documented above.
Used with independent `ring-occultation-data` Voyager UVS opacity. The approved
thumbnail is also a derivative of this ring colour. Approximate photographic
registration, lighting and indirect-light display choices are not measurements.

## Approved Mars observational globe (`mars-observational-composite`, 2026-09-17)

Approved runtime assets: `objects/planets/mars-observational-v3/mars/`
(2K base and 672 bordered 4K/8K/16K tiles, with per-file provenance).
Preparation intermediates: `mars-hrsc-color-v1.webp`, `mars-viking-lowpass-v1.webp`;
source hashes and processing record: `mars-hrsc-color-v1.json`;
recipes: `scripts/hybrid-review/prepare-mars-map.py` and `prepare-mars-tiles.py`.
The review tree remains local and has not been uploaded to R2. The user approved the display-v6 comparison on 17 September 2026 as meeting the
95% target on both layouts. The globe is the production default; the portrait
and its credit remain available for rollback. `objects/thumbs/mars-globe-v1.webp`
is rendered from the frozen approved globe; it is not generated artwork.

- Color: **ESA / DLR / FU Berlin, HRSC team, G. G. Michael et al.**, Mars Express
  [High-Altitude Mosaic V1.0](https://archives.esac.esa.int/psa/ftp/pub/mirror/Guest-Storage-Facility/Mars_HRSC_High-Altitude-Mosaic_V1.0/),
  red/green/blue scientific bands, each 10669×5334 float32, 2 km/pixel.
  [Michael et al. (2023)](https://doi.org/10.48550/arXiv.2307.14238).
  [ESA permits PSA data download and use](https://open.esa.int/esa-planetary-science-archive/)
  with investigator and PSA acknowledgment. This is scientific data reuse, not
  the separate license for the enhanced-color ESA press illustration.
- Regional brightness: **NASA / JPL / Arizona State University / Philip Christensen
  and the MGS TES team**, [TES bolometric albedo special product](https://tes.mars.asu.edu/products/),
  2880×1440, 8 pixels/degree, 2002-10-25 product, 0.3–2.9 µm broadband Lambert
  albedo; Christensen et al., JGR 106, 23823–23872 (2001). Public NASA scientific
  data. The numerical array is used, without a false-color legend or shaded relief.
- Photographic luminance: **NASA Viking / USGS / Arizona State University**,
  [merged-color mosaic](https://mars.asu.edu/data/mdim_color/), eight 5760-square
  quadrants, assembled as 23040×11520 at 64 pixels/degree. The source was sharpened
  with MDIM 1.0 and contains photographed shadows; smoothing and bounded luminance
  ratios attenuate its inherited enhancement. Its older geometric control and
  multi-epoch lighting remain limitations.
- Polar caps: the existing public-domain NASA Ames / USGS Viking
  mosaic credited above. Terrain: existing NASA MOLA, unchanged physical heights.
- Modifications: north-up east-positive registration; HRSC conversion from linear
  reflectance to sRGB and 4096×2048 resampling; interpolation of 2,045 nodata samples
  confined to its final longitude column; TES broad brightness reference with
  Gaussian suppression of orbit-track artifacts; restrained Viking fine-detail
  ratios; old Viking luminance combined with HRSC chroma; smooth Viking polar blend;
  authored shader display color/contrast. Native-resolution Viking luminance supplies
  the higher tile levels, with a 0.45 bounded-ratio exponent. The v3 pyramid removes
  the earlier additional MDIM high-pass contrast contribution. No generated geographic features, added unsharp mask,
  or exaggerated terrain. Upstream Viking sharpening is not claimed to be absent.
- Limitations: multi-epoch, cross-instrument display reconstruction, not a calibrated
  reflectance retrieval. HRSC's small observational gaps are upstream interpolated
  featureless regions, not identifiable from a nodata mask. TES has gridding and
  seasonal differences; both are excluded from the caps. Photographed shading and
  some atmospheric features remain embedded in the imagery.

## Neptune H4 approved atmospheric reconstruction (`neptune-voyager-reconstruction`, 2026-09-17)

User approved review-v9 on 17 September 2026. The globe is now active;
`objects/thumbs/neptune-globe-v1.webp` is rendered from the approved globe.
The original portrait is retained for reference and rollback.
`objects/neptune-voyager-reconstruction-v4.webp` and the accompanying coverage
mask/JSON reproject the green-channel structure of NASA/JPL Voyager 2
[PIA01492](https://www.jpl.nasa.gov/images/pia01492-neptune-full-disk-view/),
August 1989. The published 2188×2185 JPEG enlarges 800-line detector imagery;
the 2048×1024 runtime map does not supply new observational resolution.
The original green/orange composite's enhanced blue is not treated as calibrated
colour. Natural-colour guidance comes from
[Irwin et al. 2024](https://doi.org/10.1093/mnras/stad3761); the selected pale
blue/cyan palette is an authored display approximation, not that study's
spectrophotometric reconstruction. No pixels from its illustrations are used.

Registration of the public disc is approximate. A robust broad illumination fit
reduces baked lighting but does not eliminate it. A conservative source mask
blends into zonal brightness from the existing June 2025 Hubble OPAL derivative
(`planetary-observations`). Fine bands outside the photographed hemisphere are
an explicitly modelled, deterministic atmospheric reconstruction. They are NOT
observational coverage or current weather. NASA/JPL
[PIA00058](https://science.nasa.gov/resource/neptune-clouds-showing-vertical-relief/),
two hours before the August 1989 closest approach, supplies a bounded close-up
patch at its captioned latitude of 29°N. Its relative longitude and affine
projection are authored approximations, not a registered global mosaic.
Neither the far side nor polar caps are new observations, and the Voyager dark
spot/clouds are dated features. No portrait pixels or new discrete storms are
used. Procedural bands are project-authored reconstruction, not NASA image data.
The adjacent JSON records both support masks, model parameters, dimensions,
source/output hashes and processing. Recipe: `scripts/hybrid-review/prepare-neptune-map.py`.

Credit: NASA/JPL; NASA, ESA, STScI, Amy Simon and the Hubble OPAL team for the
zonal background source. Used with credit under the
[JPL image-use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) and existing
Hubble data terms. Source imagery is not relicensed by this repository; no
endorsement is implied. Original public assets and their credits are preserved.


## Moon LROC/LOLA globe (moon-lroc-lola-globe; approved 2026-09-17)

The user-approved review-v5 globe is the production Moon. It reuses the
unchanged `planets/1b448275b234/moon/` LROC/LOLA maps credited above; no new lunar
imagery is added. [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) December
2025 color is an aesthetic derivative of Hapke-normalized LROC WAC reflectance,
with lower-resolution LOLA reflectance beyond 70° latitude and upstream infill.
The unsigned elevation TIFF decodes as DN × 0.5 − 10000 metres above 1737400 m.
Runtime terrain is resampled to 4096×2048 with physical, unamplified slopes;
color detail has a source-backed 16K ceiling. Interpolation, finite grid detail,
residual photometric artifacts and authored display lighting remain limitations.
No generated or repeated craters, baked morphology-mosaic shadows, or lunar
atmospheric scattering layer are introduced. Source hashes, registration,
licensing context and comparison evidence: [Moon H4 review](../../docs/moon-hybrid-review.md).

Moon review-v5 adds bounded local display contrast from the existing LROC map;
no new surface pixels or terrain features. NASA's original LOLA TIFF was
freshly hash-verified during a normal-resolution study; experimental derivatives
remain local review evidence and were not adopted as runtime assets.

The menu thumbnail `thumbs/moon-globe-v1.webp` is rendered from an actual 8K
capture of the accepted globe. The original `moon-portrait-v1.png` and its
thumbnail remain separately credited reference/rollback artwork.
