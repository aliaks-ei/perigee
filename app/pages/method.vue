<script setup lang="ts">
import { creatorSchema } from '~/data/creator'
import { scienceSources } from '~/data/editorial'
import { absoluteUrl, citationsForSourceIds, SITE_NAME } from '~/utils/seo'

/**
 * How Perigee arrives at the numbers it shows.
 *
 * This is the page every other content page leans on. A figure is only worth
 * quoting if the method behind it is stated, so the formula, the constants and
 * the reviewed sources all live here in readable HTML rather than in code
 * comments.
 */
const config = useRuntimeConfig()
const siteUrl = String(config.public.siteUrl ?? '')
const canonical = absoluteUrl(siteUrl, '/method')

const title = 'How Perigee calculates apparent size'
const description =
  'Perigee derives every apparent size from the object\'s real diameter and the chosen '
  + 'distance. The formula, the exact constants and the reviewed sources behind them.'

const sources = scienceSources

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonical,
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            '@id': `${canonical}#article`,
            url: canonical,
            headline: title,
            description,
            inLanguage: 'en',
            isAccessibleForFree: true,
            author: creatorSchema,
            publisher: { '@type': 'Organization', name: SITE_NAME },
            citation: citationsForSourceIds(sources.map((source) => source.id)),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl(siteUrl, '/') },
              { '@type': 'ListItem', position: 2, name: title, item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<template>
  <main class="prerender-shell prerender-landing">
    <h1>{{ title }}</h1>

    <p class="prerender-lede">
      Nothing in Perigee is scaled by eye. Every object in the scene is placed at a
      fixed render distance and drawn at whatever radius reproduces its calculated
      angular diameter, so the size you see is a consequence of the geometry rather
      than a decision anybody made.
    </p>

    <h2>How is apparent size calculated?</h2>
    <p>
      Apparent size is the angle an object subtends at the eye. For an object of
      diameter <em>d</em> at distance <em>r</em>, the angular diameter <em>θ</em> is:
    </p>
    <p class="prerender-formula">θ = 2 · arctan( d / 2r )</p>
    <p>
      That is the whole calculation. It is applied identically to the Moon, to
      Saturn and to the Andromeda Galaxy, and it is the only thing that decides how
      much sky an object fills. If the fixed render distance in the scene ever
      changes, the rendered radius follows automatically — no object is ever scaled
      by hand to compensate.
    </p>

    <h2>How does Perigee compare sizes to the full Moon?</h2>
    <p>
      A figure in degrees is hard to picture, so Perigee restates it in full Moons:
      the object's angular diameter divided by the Moon's angular diameter at its
      familiar distance of 384,400 km. Saying something spans thirty-three Moons is
      the same statement as giving its angle, in units an eye can hold.
    </p>

    <h2>How does Perigee calculate light travel time?</h2>
    <p>
      The selected distance divided by the exact speed of light in vacuum. It is a
      statement about the distance, not about the rendering: the scene is not
      delayed by that amount.
    </p>

    <h2>Which constants does Perigee use?</h2>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Speed of light</span>
        <span>299,792.458 km/s, exactly, by definition of the metre</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Astronomical unit</span>
        <span>149,597,870.7 km, exactly, per IAU 2012 Resolution B2</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Moon reference</span>
        <span>384,400 km, the familiar Earth–Moon distance</span>
      </li>
    </ul>

    <h2>What does Perigee simulate, and what does it only draw?</h2>
    <p>
      Perigee labels every claim it makes with one of three boundaries, and shows
      that label in plain language beside the claim.
    </p>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Calculated</span>
        <span>A deterministic value from the same object and distance data as the scene.</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Rendered</span>
        <span>An authored visual treatment produced by the scene, not a physical result.</span>
      </li>
      <li class="flex items-baseline gap-2.5 py-1">
        <span class="prerender-meta">Described</span>
        <span>A sourced physical effect that Perigee states but does not model.</span>
      </li>
    </ul>

    <h2>How are motion and surface detail presented?</h2>
    <p>
      The Moon, stars and Andromeda keep a fixed visible face.
      The catalogue sky stays fixed while the camera pans. Motion pauses while the tab is
      hidden, and reduced motion freezes ambient animation.
    </p>
    <p>
      Jupiter rotates around its own axis using an approximate 9.9-hour period;
      Saturn uses the Cassini ring-seismology estimate of 10h 33m 38s.
      Mars uses a 24.6229-hour sidereal period; Neptune uses the approximate
      16.11-hour Voyager magnetic-coordinate period. At automatic 120× time-lapse,
      Jupiter and Saturn take about five minutes per turn, Mars about 12.3 minutes,
      and Neptune about 8.1 minutes.
      This speed changes only planetary rotation;
      the sky, weather and observer's landscape do not advance with it. Captures
      freeze one pose across every tile, and reduced motion pauses the rotation.
    </p>
    <p>
      The Moon rotates once per orbit, keeping substantially the same hemisphere
      toward Earth. Its sidereal rotation takes about 27.32 days; the roughly
      29.53-day phase cycle is different. Perigee holds an Earth-facing view with
      fixed sunlight, without automatic spin, orbital motion or libration.
      Terrain shading uses measured elevation; earthshine is approximate.
    </p>

    <h2 id="planetary-imagery">Planetary imagery and reconstruction</h2>
    <p>
      The Moon uses a globe with LROC reflectance imagery and LOLA elevation from
      NASA's CGI Moon Kit. Dark maria, pale highlands and rays come from the map;
      measured slopes provide terrain lighting at their source resolution.
      Colour and contrast are adjusted for display. Polar reflectance is coarser,
      and the source grids include interpolation and small filled gaps.
      The nearly full phase and near-side orientation are fixed. Apparent size
      follows the calculated diameter and distance. There is no atmospheric glow.
    </p>
    <p>
      Mars uses an oblate, rotating 3D globe. Mars Express HRSC colour is combined
      with Viking imagery and Mars Global Surveyor TES brightness; MOLA elevations
      supply measured terrain. The dated mosaics retain some photographed shadows
      and interpolated gaps. Polar caps use Viking imagery. Colour balance,
      reference orientation and a thin atmospheric haze are authored; the sources
      do not describe simultaneous weather. No geographic features are generated,
      and terrain heights are not exaggerated. Apparent size remains calculated.
    </p>
    <p>
      Jupiter uses an oblate 3D globe with
      <a href="https://www.jpl.nasa.gov/images/pia07782-cassinis-best-maps-of-jupiter-cylindrical-map/" target="_blank" rel="noopener noreferrer">Cassini's December 2000 global cloud map</a>
      (NASA/JPL/Space Science Institute). The near-infrared/blue composite approximates
      natural colour; its polar regions are hazy and less resolved. Contrast, sunlight
      and pole orientation are authored choices, while apparent size follows the
      calculated diameter and distance. The map rotates as one surface; this is
      neither current weather nor a simulation of differential cloud motion.
    </p>
    <p>
      Neptune uses an oblate globe combining NASA/JPL Voyager cloud structure from
      August 1989 with explicitly modelled fine bands and atmospheric haze.
      Full-disc PIA01492 and a small PIA00058 close-up provide dated cloud morphology;
      their registration and lighting removal are approximate. Unobserved regions,
      polar caps and fine band continuity are reconstruction, not observations.
      The pale palette is informed by the 2024 natural-colour study; the source's
      enhanced blue is not treated as calibrated colour. Sunlight, haze and pole
      orientation are authored, while apparent size remains calculated. One rotating
      map cannot reproduce differential winds or evolving weather.
    </p>
    <p>
      Saturn uses an oblate globe with a multi-epoch reconstruction from
      <a href="https://atmos.nmsu.edu/data_and_services/atmospheres_data/Cassini/sat_global_map.html" target="_blank" rel="noopener noreferrer">Cassini's observed cloud structure</a>,
      Hubble's broader haze bands and a Cassini polar view. Missing coverage is
      interpolated; colour and lighting are authored, not calibrated measurements.
      Separate equatorial rings combine Cassini colour with Voyager optical depth,
      including the main divisions and mutual planet/ring shadows. The globe spins
      beneath a stable ring plane. Indirect light is approximate, and weak perspective
      preserves the approved full-ring framing. This is a cinematic reconstruction,
      not simultaneous weather or a current spacecraft view. Scene and saved captures
      use the same frozen pose and material.
    </p>
    <p>
      Sources and credits:
      <a href="https://science.nasa.gov/resource/the-near-side-of-the-moon/" target="_blank" rel="noopener noreferrer">NASA/GSFC/Arizona State University, the near side of the Moon</a>;
      <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noopener noreferrer">NASA's Scientific Visualization Studio, LROC and LOLA teams</a>;
      <a href="https://archives.esac.esa.int/psa/ftp/pub/mirror/Guest-Storage-Facility/Mars_HRSC_High-Altitude-Mosaic_V1.0/" target="_blank" rel="noopener noreferrer">ESA/DLR/FU Berlin, G. G. Michael and the HRSC team</a>;
      <a href="https://mars.asu.edu/data/mdim_color/" target="_blank" rel="noopener noreferrer">NASA/USGS/ASU Viking merged colour</a>;
      <a href="https://tes.mars.asu.edu/products/" target="_blank" rel="noopener noreferrer">NASA/JPL/ASU, Philip Christensen and the TES team</a>;
      <a href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noopener noreferrer">NASA MOLA and the PDS Geosciences Node</a>;
      <a href="https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m" target="_blank" rel="noopener noreferrer">USGS Astrogeology and NASA Ames</a>;
      <a href="https://archive.stsci.edu/hlsp/opal" target="_blank" rel="noopener noreferrer">NASA, ESA, Amy Simon and the Hubble OPAL team</a>;
      <a href="https://pds-rings.seti.org/voyager/uvs/profiles.html" target="_blank" rel="noopener noreferrer">NASA Voyager UVS and the PDS Ring-Moon Systems Node</a>;
      <a href="https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0" target="_blank" rel="noopener noreferrer">Irwin and colleagues, 2024</a>.
      Ring colour comes from
      <a href="https://science.nasa.gov/photojournal/a-full-sweep-of-saturns-rings/" target="_blank" rel="noopener noreferrer">Cassini PIA11142, NASA/JPL/Space Science Institute</a>.
      Map processing, hashes and reconstruction limits are recorded
      in the repository's asset provenance.
    </p>

    <h2 id="andromeda-imagery">Andromeda imagery and reconstruction</h2>
    <p>
      Andromeda uses an AI-generated artistic portrait informed by NASA Hubble
      PHAT/PHAST and visible-light references. Its core, dust lanes and companions
      are interpreted artwork, not telescope measurements or calibrated naked-eye colour.
      The same colour-preserving compositor used for the planetary and stellar
      portraits retains its original lighting in the live scene and captures.
    </p>
    <p>
      Distance changes scale the optical major axis. The image retains its authored
      inclination and orientation; it does not reconstruct internal parallax,
      stellar orbits, a collision or a freely explorable galaxy volume.
      Small points within the portrait are part of the artwork; the surrounding
      sky is rendered separately from catalogue stars.
    </p>
    <p>
      Visual references:
      <a href="https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/" rel="noopener">NASA Hubble PHAT+PHAST mosaic</a>
      and <a href="https://svs.gsfc.nasa.gov/30990" rel="noopener">NASA SVS optical view (NOAO, AURA/NSF)</a>.
      The portrait is original Perigee artwork; these reference photographs are not redistributed in it.
    </p>
    <p>
      The background sky uses data from the European Space Agency (ESA) mission
      <a href="https://www.cosmos.esa.int/gaia" rel="noopener">Gaia</a>, processed by the
      <a href="https://www.cosmos.esa.int/web/gaia/dpac/consortium" rel="noopener">Gaia Data Processing and Analysis Consortium (DPAC)</a>.
      Funding for DPAC has been provided by national institutions, in particular
      the institutions participating in the Gaia Multilateral Agreement.
    </p>

    <h2 id="stellar-sky">Stars, sky and exposure</h2>
    <p>
      Stellar surfaces are stylized interpretations, not photographic maps. Betelgeuse
      uses broad orange regions and bright patches informed by convection research;
      Sirius has pale granulation and Rigel has finer blue-white mottling. Surface
      contrast and colour differences are deliberately enhanced for visual detail.
      Radio and infrared false colours are not treated as visible surface colours.
      Betelgeuse, Sirius A and Rigel use approved synthetic globes with no claimed bulk rotation
      period or measured surface geography. Rigel's original blue-white mottling is artistic
      reconstruction; it is not solar granulation, a Betelgeuse convection model or a current
      photospheric pattern. Spectra and interferometric wind diagnostics do not provide a visible
      global surface map. Automatic Rigel motion remains disabled.
      The Sun uses synthetic photospheric granulation and invented spot groups,
      informed by visible-light HMI research and near-infrared DKIST granulation.
      Neither magnetic-field colours nor ultraviolet corona imagery are surface texture.
      Its warm ivory colour and optical glow are authored choices, and its spot pattern
      does not represent current solar activity. Automatic solar motion remains disabled.
    </p>
    <p>
      The Yale bright-star catalogue and Gaia DR3 supply positions and colours.
      Diffuse Milky Way light comes from the CDS Gaia G-flux survey, with the Gaia
      counterparts of drawn points subtracted before downsampling. It is a neutral
      broad-band reconstruction, not a colour photograph. The selected star replaces
      its catalogue point. Gaia positions refer to J2016.0; Yale retains J2000.0.
    </p>
    <p>
      Solar System reference directions use 1 January 2016 at 00:00 UTC. The local
      sky is rotated to the selected target at a representative latitude of 38.78° N;
      the landscape heading and time of night are staged. This is not a live sky
      chart. Horizon extinction and irregular point-star scintillation share one
      model, with stronger faint-light suppression above the city. Resolved bodies
      receive atmospheric attenuation without point-star twinkling.
    </p>
    <p>
      Stars share a normalized optical point profile and a continuous point-to-disc
      flux budget. Extreme brightness ratios are deliberately compressed for display.
      One AgX transform follows linear-light composition; photographic landscapes
      receive no extra object-coloured wash. These exposure choices do not reproduce
      unaided-eye visibility or physically illuminate the photographed ground.
    </p>
    <p>
      Sky survey: <a href="https://alasky.cds.unistra.fr/ancillary/GaiaDR3/G-flux-map/properties" rel="noopener">T. Boch / CDS, CNRS / Université de Strasbourg, ESA / Gaia / DPAC</a>.
      The Gaia-derived catalogue and diffuse map are available under the
      <a href="https://opendatacommons.org/licenses/odbl/1-0/" rel="noopener">Open Database License 1.0</a>.
      Stellar reconstruction reference: <a href="https://arxiv.org/abs/2202.12011" rel="noopener">López Ariste et al. (2022)</a>.
    </p>

    <h2 id="capture-quality">Rendering and capture quality</h2>
    <p>
      Rendering automatically requests native display detail within device limits
      and adapts if it becomes slow.
      Capture automatically chooses a resolution suited to your device. High-resolution
      PNGs render the sky afresh, preserving the current frame's aspect ratio without
      interface text or captions. At 16:9, 4K and 8K captures are 3840 × 2160 and
      7680 × 4320 pixels.
    </p>
    <p>
      A larger export can reveal more available source detail, but cannot create
      observations beyond the original maps. Broad optical bloom retains the
      full-frame response of the live view. Export freezes motion, combines four
      samples per pixel and omits animated grain. Devices with limited memory may
      automatically use a smaller export or the current rendered resolution.
    </p>

    <h2>What Perigee is not</h2>
    <p>
      Perigee is not a planetarium catalogue and not a physics simulator. It does
      not model heat, radiation, gravity or tides, it does not place objects on real
      orbits, and it does not claim that any of these skies could occur. Surface
      lighting, atmospheric treatment and the impossible-proximity effects are
      authored visualizations sitting on top of geometry that is exact.
    </p>

    <h2>Sources</h2>
    <p>
      Every figure on this site traces to one of these, each opened and dated at
      review.
    </p>
    <ul class="prerender-list mb-3.5 list-none p-0">
      <li v-for="source in sources" :key="source.id" class="flex items-baseline gap-2.5 py-1">
        <a :href="source.url" rel="noopener">{{ source.title }}</a>
        <span class="prerender-meta">{{ source.publisher }} · {{ source.reviewedOn }}</span>
      </li>
    </ul>

    <p>
      <NuxtLink to="/">Explore the full Perigee sky</NuxtLink>
    </p>

    <PerigeeCreatorLinks placement="footer" />
  </main>
</template>
