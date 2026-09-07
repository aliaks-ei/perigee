# Asset Attributions

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

The following records describe retained older assets and existing social cards.
They do not override the active versioned observational sources above.

## Planetary surface textures

- Source: [Solar System Scope textures](https://edu.solarsystemscope.com/textures/)
- Author: INOVE / Solar System Scope
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Files: `moon.jpg`, `mars.jpg`, `jupiter.jpg`, `neptune.jpg`, `saturn-ring-2k.webp`, the 2048×1024 siblings `moon-2k.jpg`, `mars-2k.jpg`, `jupiter-2k.jpg`, and the derived thumbnails in `thumbs/`
- Modifications: Moon and Mars resampled to 4096×2048; Jupiter retained at 4096×2048. The `-2k` siblings are the same maps resampled to 2048×1024 for the safe quality tier; balanced and high retain the larger source maps. Saturn's ring downsampled from the source 8192×500 to 2048×64 as `saturn-ring-2k.webp`: the shader samples a single row of the strip, so the original's height was never read and its width cost 16 MB of GPU memory. The unmodified `saturn.jpg`, `saturn-ring.png` and `star-surface.jpg` were removed once nothing loaded them — Saturn renders from the enhanced map below, and stars are procedural. Runtime treatment adds color-managed lighting, fine-detail recovery, restrained surface response, and slow rotation.
- Downloaded: 2026-08-28

### Interface thumbnails

- Files: `thumbs/moon.webp`, `thumbs/mars.webp`, `thumbs/jupiter.webp`, `thumbs/saturn.webp`, `thumbs/neptune.webp`
- Modifications: Centre square of each source map, resampled to 160×160 and exported as WebP. The object browser previously rendered the full 4096×2048 maps as thumbnails, which cost 8.3 MB to draw seven 64 px circles. `thumbs/saturn.webp` derives from `saturn-atmosphere-v2.webp` so the thumbnail matches what the renderer shows. The former shared `thumbs/star.webp`, cropped from the retired `star-surface.jpg`, was replaced by the procedural star thumbnails below.
- License and attribution follow their sources above.
- Created: 2026-08-30

The source pack is based on NASA elevation and imagery data. Some unmapped
areas are reconstructed by the asset author, and the maps are intended for
visualization rather than scientific analysis.

### Saturn atmosphere enhancement

Attribution ID: `perigee-saturn-art`.

- Source: Original AI-assisted texture generated for Perigee with OpenAI image generation, art-directed from the supplied Cassini-style reference
- Files: `saturn-atmosphere-v2.webp`, and `saturn-atmosphere-v2-2k.webp` (the same map at 2048×1024 for the lower quality tiers)
- Modifications: Generated as a lighting-neutral 1774×887 equirectangular diffuse map, resampled to 4096×2048, and exported as high-quality WebP. Directional lighting, limb falloff, and highlights remain runtime shader effects rather than baked into the asset.
- Created: 2026-08-29

## Surface normal maps

- Files: `moon-normal.webp`, `mars-normal.webp`
- Sources:
  - Moon: [LRO LOLA LDEM, 16 pixels/degree](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/) — NASA / Goddard Space Flight Center / LOLA science team
  - Mars: [MGS MOLA MEGDR, 16 pixels/degree](https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/) — NASA / JPL / MOLA science team
- License: Public domain (NASA data, distributed through the PDS Geosciences Node)
- Modifications: The 5760×2880 elevation grids were rolled from their 0–360°E layout into the −180–180° layout the albedo maps use, resampled to 2048×1024, and converted to tangent-space normal maps by `scripts/normal-maps.py`. Ground spacing is computed per latitude from each body's radius, so slopes are correct relative to one another; the whole field is then exaggerated by a single factor (Moon 1.8×, Mars 5.2×) because true planetary relief is far too shallow to survive 8-bit encoding. The source elevation files are not kept in this repository.
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
- Files: `thumbs/betelgeuse.webp`, `thumbs/sirius.webp`, `thumbs/rigel.webp`, `encounters/the-galaxy-hiding-in-our-sky.jpg`
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
- File: `stars/bsc5.bin`
- Modifications: `scripts/star-catalogue.py` reads the fixed-column catalogue and packs right ascension, declination, visual magnitude and B−V colour index into an 8-byte record per star, sorted by magnitude. Stars without a magnitude are dropped. 9,096 stars in 73 kB.
- Purpose: The star field's brightness distribution and colours. A generated field has a flat brightness distribution, which is what makes it read as generated; the catalogue carries the real few-bright, many-faint law. Positions retain the J2000 catalogue epoch; the runtime reference sky is registered to the staged target and viewpoint latitude. See `docs/stellar-sky.md`.
- Downloaded: 2026-09-02

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
