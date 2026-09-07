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
      Planet rotation uses the recorded rotation periods at 60 times real time.
      The Moon keeps its Earth-facing presentation; stars and Andromeda do not spin.
      The catalogue sky stays fixed while the camera pans. Motion pauses while the tab is
      hidden, and reduced motion freezes ambient animation.
    </p>
    <p>
      Moon and Mars use measured elevations at their actual vertical scale. Fine
      normals affect lighting; sufficiently large views also displace the surface
      and sample terrain toward the Sun for approximate crater shadows. The safe
      quality tier uses normal shading only. Lunar earthshine follows an explicit
      Earth phase and distance model; other night sides receive no ambient lift.
    </p>

    <h2 id="planetary-imagery">Planetary imagery and reconstruction</h2>
    <p>
      The Moon uses NASA's December 2025 CGI Moon Kit, with LROC colour and LOLA
      elevation. Mars uses the USGS/NASA Ames colourized Viking mosaic and MOLA
      elevation. Their source detail supports 16K colour tiles, streamed within
      a device budget. Mars's mosaic contains residual photographed terrain
      shading and artistically assigned colour; it is not a lighting-neutral
      spectrophotometric albedo map.
    </p>
    <p>
      Jupiter and Saturn use November and August 2024 Hubble OPAL maps; Neptune
      uses June 2025 observations. These maps have finite observational resolution,
      despite their resampled global projections. Missing polar coverage and
      Saturn's ring-obscured band are interpolated, without generated storms.
      Narrow-filter colours receive a restrained display balance. Neptune's pale
      blue-green appearance is guided by the 2024 colour study; the selected RGB
      balance is an approximation, not a new calibrated measurement.
    </p>
    <p>
      Saturn's rings use a Voyager 2 ultraviolet occultation profile for radial
      optical depth, separate from their colour texture. A single-scattering slab
      approximates lit and unlit sides; finite-Sun shadows connect the planet and
      rings. Dense regions saturate in the data, and one radial cut does not
      describe all azimuths, particle sizes, or visible-wavelength scattering.
    </p>
    <p>
      Sources and credits:
      <a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noopener noreferrer">NASA's Scientific Visualization Studio, LROC and LOLA teams</a>;
      <a href="https://astrogeology.usgs.gov/search/map/mars_viking_colorized_global_mosaic_232m" target="_blank" rel="noopener noreferrer">USGS Astrogeology and NASA Ames</a>;
      <a href="https://archive.stsci.edu/hlsp/opal" target="_blank" rel="noopener noreferrer">NASA, ESA, Amy Simon and the Hubble OPAL team</a>;
      <a href="https://pds-rings.seti.org/voyager/uvs/profiles.html" target="_blank" rel="noopener noreferrer">NASA Voyager UVS and the PDS Ring-Moon Systems Node</a>;
      <a href="https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0" target="_blank" rel="noopener noreferrer">Irwin and colleagues, 2024</a>.
      Ring colour remains derived from the
      <a href="https://edu.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope texture</a>
      under CC BY 4.0. Map processing, hashes and reconstruction limits are recorded
      in the repository's asset provenance.
    </p>

    <h2 id="andromeda-imagery">Andromeda imagery and reconstruction</h2>
    <p>
      Andromeda combines a complete Digitized Sky Survey image with Hubble
      PHAT/PHAST detail, registered in celestial coordinates. It uses an enhanced
      photographic exposure. Hubble's two-filter colours are matched to the wider
      image; this is not calibrated naked-eye colour or a measurement of surface brightness.
      Catalogue-selected Milky Way stars are masked before the image is enlarged.
      Faint unclassified points can remain, and the surrounding sky is a separate star field.
    </p>
    <p>
      The close views reconstruct an inclined disc, a finite-thickness bulge and
      companion depths from one viewing direction. Dust transmission and depth are
      inferred. The major-axis correction preserves the optical-size convention;
      the faint halo extends beyond that boundary. The model does not simulate
      stellar orbits, a collision or a freely explorable galaxy volume.
    </p>
    <p>
      Hubble image: <a href="https://esahubble.org/images/heic2501a/" rel="noopener">NASA, ESA, B. Williams (University of Washington)</a>.
      Complete field: <a href="https://esahubble.org/images/heic1502b/" rel="noopener">NASA, ESA, Digitized Sky Survey 2 (Acknowledgement: Davide De Martin)</a>.
      Both are used under <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>.
      Reprojection, foreground masking, colour matching, dust estimation and tiling by Perigee.
    </p>
    <p>
      Foreground masking and the background sky use data from the European Space Agency (ESA) mission
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
      Surface evolution is deliberately compressed to minutes, rather than presented
      as a measured timescale. Reduced motion freezes it.
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
