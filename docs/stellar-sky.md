# Stellar photospheres and reference sky

Chunk 3, 2026-09-07. Code implementation; user browser acceptance pending.
This document records the observational inputs, authored choices and verification
boundary. It does not claim that the staged landscapes are a live planetarium.

## Stellar reconstruction

Following user review on 2026-09-07, stellar surfaces deliberately use stronger
artistic detail than the observational planetary/galaxy treatment. The supplied
references guide appearance rather than being used as photographic surface maps.
Betelgeuse uses broad irregular warm regions at scale 2.1, contrast .88; Sirius
uses pale granulation at scale 9, contrast .8; Rigel uses finer blue-white mottling
at scale 14, contrast .86. Warped smooth noise combines large regions and finer
structure without Voronoi outlines. Separate unit-luminance cool/hot palettes make
variation visible after AgX without adding a separate exposure multiplier.
Screen derivatives filter fine structure; all surface detail fades at small
projected sizes before the optical-point transition. Safe quality retains the
primary pattern while omitting the extra noise octave. These are illustrative
brightness/colour differences, not measured temperature maps.

Reference: [López Ariste et al. 2022](https://arxiv.org/abs/2202.12011), A&A 661,
A91, reconstructs Betelgeuse convection using spectropolarimetry. This motivates
irregular large regions; it is not an RGB texture or a unique reconstruction.
[ALMA 2017](https://www.eso.org/public/images/potw1726a/) observes an extended
submillimetre atmosphere. Its false-colour image is not a visible-light palette.
Sirius and Rigel retain their distinct hot-star continuum proxies; neither is
presented as a resolved photographic surface map. Existing SIMBAD links in object
editorial content remain the source for their identities and physical parameters.

Linear RGB continuum proxies are (1,.56,.29), (.87,.93,1), (.8,.89,1), each
normalized to unit luminance. Linear limb coefficients .58, .38 and .32 are
illustrative broadband approximations, not fitted wavelength-specific measurements.
The limb law is divided by 1-u/3 to preserve projected-disc mean brightness.
Limb angle uses the actual fragment-to-camera direction, including off-axis views.

Noise moves one spatial unit per 900, 300 and 600 seconds respectively. This is
explicitly time-compressed visualization, not a measured convection lifetime.
Stars do not rotate. Reduced motion freezes source time and scintillation.

## Exposure and optical profile

Catalogue magnitudes use flux = 10^(-0.4*(m-2)). Stellar hero magnitudes are
Betelgeuse +.42, Sirius -1.46, Rigel +.13; variable stars use fixed reference values.
Distance changes scale stellar flux by the squared apparent-diameter ratio.
An explicit photographic shoulder, C*8F/(C+8F), uses C=8 for points and
C=8+1.8*projected disc area for stellar heroes. This compresses extreme brightness
ratios and limits large-disc mean radiance; it is not calibrated radiometry.
Planetary source-map exposures retain their Chunk 2 body-specific settings.
Andromeda retains resolved surface brightness, without inverse-square attenuation
per galaxy pixel. The diffuse G map uses a fixed 0.000025 photographic gain.
These cross-family gains are display choices requiring manual acceptance.

The optical profile is a Gaussian with sigma .65 CSS pixels, truncated at four
sigma and normalized by its enclosed integral. Both catalogue points and hero
billboards apply the profile exactly once. Drawing-buffer DPR changes the sampled
footprint, not CSS-area-integrated brightness. Rasterization/AA at subpixel positions
still needs device review. Between 2.2 and 7 CSS pixels, point and disc weights
sum to one and use the same flux budget. The deliberately enhanced photospheric modulation and
point-only scintillation mean instantaneous rendered flux is approximate.
No independent glare quad or object-coloured ground/sky wash adds light. Bloom
is driven by the visible HDR source and gated out below the resolved threshold.
Safe quality omits bloom. Landscape illumination cannot be reconstructed from a
single display photograph without depth/albedo information; no such claim is made.

## Observational sky assets

Runtime version `1abba926ac03` ships 9,096 Yale points, 96,968 additional Gaia
points and a 1024x512 linear scalar diffuse map. Total transfer is 3,333,556 bytes.
Gaia queries contain 482,106 G<10 records; points draw to G<8.5 after a 40 arcsec
Yale cross-match. 9,713 Gaia matches are removed from the independent point list.
Selected stellar targets suppress their Yale point within the catalogue rounding
tolerance. The Gaia source fluxes for both drawn Gaia entries and Yale counterparts
are subtracted from the full G survey before reduction, preventing those sources
from also appearing in the diffuse layer.

Sources and reproducible processing:

- [CDS G-flux HiPS metadata](https://alasky.cds.unistra.fr/ancillary/GaiaDR3/G-flux-map/properties):
  T. Boch / CDS, CNRS / Université de Strasbourg, ESA / Gaia / DPAC; ODbL-1.0;
  equatorial full sky; optical G band 329.402-1030.196 nm; release 2022-06-16.
  Download the twelve `Norder0/Dir0/NpixN.fits` files for N=0..11 from the
  metadata URL's parent into `/private/tmp/perigee-gaia-flux-N.fits`.
- [Gaia TAP](https://gea.esac.esa.int/tap-server/tap/async): CSV query
  `SELECT source_id,ra,dec,phot_g_mean_mag,phot_g_mean_flux,bp_rp FROM gaiadr3.gaia_source WHERE phot_g_mean_mag < 10 ORDER BY source_id`.
  Store the completed CSV as `/private/tmp/perigee-gaia-bright.csv`.
  Preserve full service precision; source serialization can change hashes even
  when query values are unchanged.
- The pipeline reuses `bsc5.bin` from the active versioned sky directory selected
  by `src/perigee/scenes/skyManifest.json`. To rebuild Yale from its original
  catalogue, run `python scripts/star-catalogue.py /private/tmp/bsc5.dat /private/tmp/bsc5.bin`;
  a `bsc5.bin` in the supplied source cache takes precedence. No unversioned
  catalogue is shipped. Use Python with numpy, scipy, astropy and astropy-healpix; run
  `python scripts/sky-assets.py /private/tmp`. Source masters are external and
  `/private/tmp` is ephemeral. Reacquire them if absent.
- `src/perigee/scenes/skyManifest.json` records exact source/output SHA-256 hashes,
  byte counts, query, bands, epoch, license and projection. `sky-assets.py` checks
  FITS WCS ordering against HEALPix in every face. The generic HiPS units metadata
  is insufficient: comparison with isolated catalogue sources gives the empirical
  factor 3/pi. The 10th/50th/90th bright-pixel ratios are .95568/.96096/.98767.
  This is a checked numerical convention for these tiles, not a universal Gaia unit.
- Subtract at nside=512 before equal-area averaging to nside=64. Reproject into
  equirectangular pixel centres, columns increasing RA and first row north.
  The native reduced angular cell scale is about .92 degrees; output pixels do
  not imply new observed detail. Residual light is 66.258% of source integrated
  flux; measured oversubtraction is zero for this source snapshot.
- Store little-endian float32 flux/sr relative to G=2, without sRGB encoding.
  Runtime divides by 4096 for half-float storage and restores this factor when
  sampling. RGB catalogue colours use a documented BP-RP to B-V display proxy;
  diffuse light is neutral G-band continuum. This is not an RGB Milky Way photograph.
- ODbL derivative database and map, full credit and download paths are in
  `public/assets/ATTRIBUTIONS.md` and the method page. Yale retains its own credit.

Limits: cross-match tolerance can merge close multiples; unmatched bright Yale
stars may leave residual survey light, and Gaia completeness/saturation and mixed
G/V photometry are imperfect. G>=8.5 sources remain diffuse even when the selected
landscape hides some individually drawn sources. This models lost contrast, not
redistribution of invisible stars. It does not include interstellar gas emission,
dust-scattered light or proper-motion propagation. Catalogue and survey share the
same coordinate transform and RA seam; foreground detail in the landscape plates
is not source-separated by this chunk.

## Coordinate frame and atmosphere

Equatorial +X is RA=0, +Y north celestial pole, -Z RA=90. Local +X east,
+Y zenith, -Z north makes the rotation proper (determinant +1), avoiding a reflected
sky. Fixed stellar/M31 centres and geocentric JPL Horizons astrometric Solar System
directions use 2016-01-01 00:00 UTC; Horizons target IDs 301,499,599,699,899,
centre 500@399, quantity 1, RA_FORMAT=DEG. Gaia positions use J2016.0; the rounded
Yale bright catalogue retains J2000.0. Reference ephemerides were acquired before
this takeover in `/private/tmp/perigee-ephemeris-ID.txt` and inspected here.

For each target, solve its rising hour angle at latitude 38.78 degrees and its
staged altitude, then yaw into the authored landscape heading. Camera pans leave
this celestial frame fixed; responsive/viewpoint movement re-registers the target.
The sky thus represents a target-specific sidereal time, not one simultaneous night
for every object or the photographed plate's actual acquisition time. Precession,
refraction and parallax are omitted. Latitude and sky conditions are representative,
not measured metadata for each photograph.

Kasten–Young optical airmass, bounded at the horizon, drives red/green/blue
extinction coefficients in ratios .8:1:1.35. Viewpoint extinction magnitudes per
airmass / zenith limiting magnitude: rooftop .28/4.3; hilltop .16/6.4;
lakeside .23/5.8; Cabo da Roca .20/6.1. These are authored conditions. Diffuse
visibility also follows the limit. Planets, rings and galaxy layers apply the
same observer atmosphere per fragment without twinkling, including signed detail
corrections. Their illumination at the body remains separate from light travelling
toward the observer. Stars use centre-altitude transmission and irregular seeded
noise for point scintillation, weaker at high altitude. Large stellar-disc
atmosphere uses its centre altitude, an approximation at the widest presets.

## Composition audit and resources

Inspected installed Three.js and `postprocessing/build/index.js`: input colour
textures are sRGB, data maps have no colour conversion; scene buffers are RGBA16F.
Renderer tone mapping is disabled. Bloom is a separate pass, then vignette, AgX,
film dither/grain, then SMAA. Vignette, tone mapper and FilmEffect share default
attributes, so the stable effect sort preserves that order. The final output pass
performs sRGB encoding; intermediate half-float targets remain linear. Removed the
plate shader's additional vignette and colour/halo grade. One restrained global
vignette remains. Grain is .018 on moving high/balanced frames, zero in safe or
reduced motion; dithering remains. No sharpening filter was added.

The added point geometry uses 32 bytes per entry, approximately 3.24 MiB in total.
The R16F diffuse texture plus mipmaps is about 1.33 MiB. Together these are roughly
4.57 MiB GPU allocations, separate from TextureCache's source-image budget. Peak
CPU includes 3.18 MiB raw transfer plus parsed records, geometry and a 1 MiB
half-float staging buffer; JavaScript record overhead is engine-dependent. Geometry
is rebuilt at most twice on load. Three requests are bounded (Yale plus one paired
Gaia/diffuse load). Failures retain available Yale points; the survey pair commits
together. Disposal aborts all requests and ignores late completion. Context recovery
recreates the sky through the existing engine lifecycle. No KTX2 applies to these
numeric binary assets. These estimates are not GPU measurements or frame budgets.

## Handoff

Menu thumbnails are CPU illustrations from the current material coefficients via
`python scripts/star-thumbs.py` (Pillow), with AgX/sRGB conversion and content-hashed
URLs. They are not browser captures. Social and encounter cards remain historical
until the user supplies/accepts runtime captures; final capture generation is Chunk 4.

Manual review: all three stars at real/intermediate/closest presets; gradual
point/disc transitions at different DPRs; faint sky on all four landscapes; camera
pans and responsive/viewpoint placement; rapid switching, failed requests and
context restoration; moving and reduced-motion frames; representative states for
all nine objects after the shared observer-atmosphere change. Inspect horizon
occlusion against the photographed silhouettes. No browser tests or captures were
performed. Cross-device shader compilation, appearance and timings remain pending.


## Foreground priority revision — 2026-09-07

The user requested that selected objects cover both catalogue stars and shooting
stars. Catalogue points now depth-test against opaque bodies. Transparent drawing
order is diffuse sky (-90), catalogue (-80), meteors (-70), then hero layers.
Andromeda has one normal-alpha background mask (-31), before its additive
populations (-30) and signed detail (-29). Coverage uses base observed luminance,
smoothly rising from .0005 to .012 in linear light; empty carrier pixels remain
transparent. This implements presentation priority, rather than the prior physical
foreground-Milky-Way ordering. Opacity follows object transitions, and coverage is
independent of tile loading. Planet/stars use their surface coverage; Saturn rings
retain transmission through their gaps and partially transparent material.


2026-09-07 point sampling revision: catalogue sprites average the PSF over four
subpixel positions per drawing-buffer pixel. Flux remains normalized in CSS units;
the footprint follows native/adaptive DPR. This reduces single-pixel brightness
changes during movement without enlarging or inventing catalogue stars. Numerical
flux checks include subpixel phases and DPR 0.75–3; browser appearance remains pending.
