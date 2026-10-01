import type { ObjectEditorialDefinition } from '~/types/editorial'

/**
 * Prose for the object pages under `/o/`.
 *
 * These records exist only so each object has an indexable page that answers,
 * in words, the question its distance ladder answers in the scene. Nothing here
 * may carry a number: every figure on an object page is computed at render time
 * from `app/data/objects.ts` through `app/utils/discoveryCalculations.ts`, the
 * same way the live scene derives it. A number typed into copy here would drift
 * away from the sky the moment a preset changed.
 *
 * `questions` are the page's `h2` headings. They are written out rather than
 * built from preset labels because they are the search queries themselves, and
 * "How big would Moon look at familiar distance?" is not a sentence anybody
 * types.
 *
 * The review process is the one in `docs/editorial-content.md`. A record only
 * reaches `/o/` and the sitemap once it is `approved`; a `draft` record is
 * skipped by `indexableRoutes` and 404s on the route, so unreviewed copy cannot
 * ship.
 */
export const objectEditorial: ObjectEditorialDefinition[] = [
  {
    objectId: 'moon',
    headline: 'The Moon at closer distances',
    subject: 'the Moon',
    summary:
      'The Moon is the one object in Perigee already at a distance you have seen with your own eyes. That makes it the ruler for everything else: every other comparison on this site is measured in full Moons. Bringing it closer shows how quickly apparent size grows once a familiar object starts moving in.',
    boundary: 'calculated',
    questions: {
      'real': 'How big does the Moon actually look from Earth?',
      'three-quarter': 'How big would the Moon look a quarter closer?',
      'half': 'How big would the Moon look at half its distance?',
      'quarter': 'How big would the Moon look at a quarter of its distance?',
      'close-pass': 'How big would the Moon look on a close pass?',
    },
    whatYouSee: {
      'real': 'The Moon at its average distance, shown as an Earth-facing globe with fixed sunlight.',
      'three-quarter': 'A quarter of the way in, the disc is noticeably broader but still reads as the Moon.',
      'half': 'Halving the distance doubles the apparent width. The familiar face no longer fits the space your eye expects.',
      'quarter': 'This close, the Moon dominates the sky rather than sitting in it.',
      'close-pass': 'Dark plains, bright highlands and crater rays become easier to distinguish in LROC imagery and LOLA terrain.',
    },
    sourceIds: ['nasa-moon-facts', 'nasa-cgi-moon', 'nasa-moon-tidal-locking'],
    reviewState: 'approved',
  },
  {
    objectId: 'mars',
    headline: 'Mars at closer distances',
    subject: 'Mars',
    summary:
      'Mars’s rust-coloured plains, dark markings and polar ice become readable as it moves closer. Its apparent size is calculated. A rotating globe combines Viking, Mars Express and Mars Global Surveyor observations with measured terrain. Automatic time-lapse reveals new longitudes; the reconstructed colour and haze do not represent simultaneous weather.',
    boundary: 'rendered',
    questions: {
      'close-pass': 'How big would Mars look on an impossibly close pass?',
      'near-pass': 'How big would Mars look from ninety-six thousand kilometres?',
      'moon-swap': 'How big would Mars look if it replaced the Moon?',
      'hundredth-au': 'How big would Mars look from a hundredth of an astronomical unit?',
      'real': 'How big does Mars look at its closest real approach?',
    },
    whatYouSee: {
      'close-pass': 'Mars becomes a world overhead; broad surface markings hold together across the disc.',
      'near-pass': 'The rust-coloured surface and polar cap read without magnification.',
      'moon-swap': 'Put Mars where the Moon is and it is the wider of the two, because it is nearly twice the diameter.',
      'hundredth-au': 'The disc is unmistakable, but it has receded into the surrounding sky.',
      'real': 'At its closest real approach Mars is still a point of light. No unaided eye resolves a disc.',
    },
    sourceIds: ['nasa-mars-facts', 'iau-astronomical-unit', 'mars-hrsc-mosaic', 'mars-viking-color', 'mars-tes-albedo', 'mars-mola-elevation'],
    reviewState: 'approved',
  },
  {
    objectId: 'jupiter',
    headline: 'Jupiter at closer distances',
    subject: 'Jupiter',
    summary:
      'Jupiter is the largest planet in the Solar System and the most dramatic object to move inward, because its diameter is many times the Moon\'s. Its apparent size is calculated. A rotating oblate globe carries Cassini\'s observed cloud bands and Great Red Spot through fixed sunlight. Automatic time-lapse rotation reveals different longitudes.',
    boundary: 'rendered',
    questions: {
      'moon-swap': 'How big would Jupiter look if it replaced the Moon?',
      'two-million': 'How big would Jupiter look from two million kilometres?',
      'ten-million': 'How big would Jupiter look from ten million kilometres?',
      'hundred-million': 'How big would Jupiter look from one hundred million kilometres?',
      'real': 'How big does Jupiter look at its closest real approach?',
    },
    whatYouSee: {
      'moon-swap': 'At the Moon\'s distance Jupiter fills a large part of the visible sky, and the belts are plainly banded.',
      'two-million': 'The banding and storm systems separate clearly across a commanding disc.',
      'ten-million': 'The planet still has obvious width, with its strongest belts readable.',
      'hundred-million': 'Jupiter has receded to a small, steady disc rather than a painted sphere.',
      'real': 'Jupiter is among the brightest points in the scene, and still only a point to an unaided eye.',
    },
    sourceIds: ['nasa-jupiter-facts', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'saturn',
    headline: 'Saturn at closer distances',
    subject: 'Saturn',
    summary:
      'Saturn is the object most people picture when they imagine a planet replacing the Moon, and the comparison holds up: the globe alone spans tens of full Moons at that distance, and the ring system reaches considerably further. Its apparent globe size is calculated. An oblate globe carries a reconstruction from Cassini and Hubble observations beneath separate equatorial rings, with mutual shadows and automatic time-lapse rotation.',
    boundary: 'rendered',
    questions: {
      'moon-swap': 'How big would Saturn look if it replaced the Moon?',
      'close': 'How big would Saturn look from a hundredth of an astronomical unit?',
      'ten-million': 'How big would Saturn look from ten million kilometres?',
      'hundred-million': 'How big would Saturn look from one hundred million kilometres?',
      'real': 'How big does Saturn look at its closest real approach?',
    },
    whatYouSee: {
      'moon-swap': 'The signature view: Saturn at the Moon\'s distance, rings reaching well past the globe.',
      'close': 'The ring plane and the gap dividing it are unmistakable.',
      'ten-million': 'The planet recedes, but the rings still make its silhouette unmistakable.',
      'hundred-million': 'The rings compress toward a fine line around a small globe.',
      'real': 'Saturn is a pale point. Its rings are far below what an unaided eye resolves.',
    },
    sourceIds: ['nasa-saturn-facts', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'neptune',
    headline: 'Neptune at closer distances',
    subject: 'Neptune',
    summary:
      'Neptune is the most distant planet in the Solar System. Perigee combines dated Voyager clouds with reconstructed atmospheric bands and haze in a pale blue globe. Moving it inward reveals how distance hides the scale of this ice giant.',
    boundary: 'calculated',
    questions: {
      'moon-swap': 'How big would Neptune look if it replaced the Moon?',
      'two-million': 'How big would Neptune look from two million kilometres?',
      'twelve-million': 'How big would Neptune look from twelve million kilometres?',
      'hundred-twenty-million': 'How big would Neptune look from one hundred and twenty million kilometres?',
      'real': 'How big does Neptune look at its closest real approach?',
    },
    whatYouSee: {
      'moon-swap': 'At the Moon\'s distance Neptune spans a broad blue disc, with dated Voyager clouds and reconstructed bands.',
      'two-million': 'The faint banding in the atmosphere becomes readable.',
      'twelve-million': 'The planet is still a definite blue disc against the star field.',
      'hundred-twenty-million': 'Neptune contracts toward a tiny blue point.',
      'real': 'At its real distance Neptune is not visible to an unaided eye at all.',
    },
    sourceIds: ['nasa-neptune-facts', 'voyager-neptune-clouds', 'neptune-natural-colour', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'sun',
    headline: 'The Sun at closer distances',
    subject: 'the Sun',
    summary: 'Our nearest star opens into a luminous globe as the distance shrinks. Its granulation and sunspot groups are artistic reconstruction informed by photospheric research, not a measured global map or current solar activity. Apparent size is calculated; warm colour and optical glow are authored choices.',
    boundary: 'rendered',
    questions: {
      'impossible': 'What would the Sun look like on an impossible close pass?',
      'near-10-million': 'How would the Sun look above its surface?',
      'near-25-million': 'How big would the Sun look inside Mercury’s orbit?',
      'mercury': 'How big would the Sun look from Mercury?',
      'real': 'How big does the Sun look from Earth?',
    },
    whatYouSee: {
      'impossible': 'The luminous disc fills the sky, with dark sunspot groups and fine granulation. The landscape is staged; heat, radiation and daylight illumination are not simulated.',
      'near-10-million': 'The globe contracts with distance, retaining its fine surface texture and restrained optical glow.',
      'near-25-million': 'Sunspot groups grow smaller as the apparent disc narrows.',
      'mercury': 'The disc remains wider than it appears from Earth, using Mercury’s mean orbital distance.',
      'real': 'The familiar apparent size, shown with compressed photographic exposure against a staged landscape rather than a daylight simulation.',
    },
    sourceIds: ['nasa-sun-facts', 'hmi-observables', 'dkist-first-light', 'iau-au-resolution-2012'],
    reviewState: 'approved',
  },
  {
    objectId: 'betelgeuse',
    headline: 'Betelgeuse at closer distances',
    subject: 'Betelgeuse',
    summary:
      'Betelgeuse is a red supergiant large enough that, placed at the centre of the Solar System, its surface would reach out past the inner planets. Its calculated apparent size opens into a globe of imagined convection as it comes closer. The colours and cells are artistic reconstruction, not a measured surface map or a claim about its rotation.',
    boundary: 'rendered',
    questions: {
      'impossible': 'What would Betelgeuse look like inside the Solar System?',
      'near-250-au': 'How big would Betelgeuse look from two hundred and fifty astronomical units?',
      'near-1000-au': 'How big would Betelgeuse look from one thousand astronomical units?',
      'near-10000-au': 'How big would Betelgeuse look from ten thousand astronomical units?',
      'real': 'How big does Betelgeuse actually look from Earth?',
    },
    whatYouSee: {
      'impossible': 'Perigee renders the apparent size and the light. It does not simulate what this would do to Earth.',
      'near-250-au': 'The globe now has the scale of a small Moon, with broad, stylized convection regions across it.',
      'near-1000-au': 'The point opens into a measurable red-orange disc.',
      'near-10000-au': 'Still unresolved to an unaided eye, but vastly brighter than the real star.',
      'real': 'At its true distance Betelgeuse is one of the brightest stars in Orion, and still a point.',
    },
    sourceIds: ['nasa-betelgeuse', 'alma-betelgeuse-hotspots', 'eso-betelgeuse-sphere'],
    reviewState: 'approved',
  },
  {
    objectId: 'sirius',
    headline: 'Sirius A at closer distances',
    subject: 'Sirius A',
    summary:
      'Sirius A is the bright star we see in the Sirius system. Moving it inward reveals its calculated apparent size as a pale blue-white globe. The granulation is an artistic reconstruction, not an observed surface map; no bulk spin is animated.',
    boundary: 'rendered',
    questions: {
      'impossible': 'What would Sirius look like inside the Solar System?',
      'near-1-au': 'How big would Sirius look from one astronomical unit?',
      'near-5-au': 'How big would Sirius look from five astronomical units?',
      'near-25-au': 'How big would Sirius look from twenty-five astronomical units?',
      'real': 'How big does Sirius actually look from Earth?',
    },
    whatYouSee: {
      'impossible': 'Well inside the orbit of Mercury. Apparent size is calculated; the consequences are not simulated.',
      'near-1-au': 'A luminous blue-white globe with synthetic pale granulation, not a photographic surface map.',
      'near-5-au': 'The star is crossing from resolved surface to compact point source.',
      'near-25-au': 'Sirius reads as an intense point with a tight optical fringe.',
      'real': 'The brightest star in the sky, at the distance that makes it so. Still a point.',
    },
    sourceIds: ['simbad-sirius', 'hubble-sirius-binary', 'vlti-sirius-diameter', 'astar-convection-model'],
    reviewState: 'approved',
  },
  {
    objectId: 'rigel',
    headline: 'Rigel at closer distances',
    subject: 'Rigel',
    summary:
      'Rigel is a blue supergiant in Orion, far larger and more luminous than Sirius. Its blue-white globe uses original synthetic mottling: an artistic reconstruction, not a measured global surface map or current photospheric pattern. Interferometry constrains the disc and spectral-line regions; it does not supply the visible surface geography shown here. Automatic rotation remains disabled.',
    boundary: 'rendered',
    questions: {
      'impossible': 'What would Rigel look like inside the Solar System?',
      'near-25-au': 'How big would Rigel look from twenty-five astronomical units?',
      'near-100-au': 'How big would Rigel look from one hundred astronomical units?',
      'near-1000-au': 'How big would Rigel look from one thousand astronomical units?',
      'real': 'How big does Rigel actually look from Earth?',
    },
    whatYouSee: {
      'impossible': 'The scene renders the light and the size. Nothing about the physical consequences is modelled.',
      'near-25-au': 'Rigel spans a blue-white disc with invented surface mottling and a separate authored optical halo.',
      'near-100-au': 'The disc remains measurable rather than implied.',
      'near-1000-au': 'Rigel is crossing into an unresolved point source.',
      'real': 'At its true distance Rigel is among the most luminous stars an unaided eye can see.',
    },
    sourceIds: ['simbad-rigel', 'rigel-most-spectroscopy', 'rigel-vega-interferometry', 'rigel-intensity-interferometry'],
    reviewState: 'approved',
  },
  {
    objectId: 'andromeda',
    headline: 'The Andromeda Galaxy at closer distances',
    subject: 'the Andromeda Galaxy',
    summary:
      'Andromeda is the surprise on this site. At its true distance it already spans several times the width of the full Moon — it is simply too faint for most eyes to separate from the sky around it. Every step of its ladder moves it through the Local Group rather than the Solar System, because a galaxy has no useful planetary distance.',
    boundary: 'described-not-simulated',
    questions: {
      'real': 'How big does the Andromeda Galaxy actually look from Earth?',
      'one-million': 'How big would Andromeda look from one million light years?',
      'half-million': 'How big would Andromeda look on a Local Group approach?',
      'quarter-million': 'How big would Andromeda look from inside its halo?',
      'touching': 'How big would Andromeda look with the two discs nearly touching?',
    },
    whatYouSee: {
      'real': 'At the real distance, with a photographic exposure revealing more of the disc than unaided eyes normally see.',
      'one-million': 'The spiral structure separates from the bulge.',
      'half-million': 'A Local Group approach.',
      'quarter-million': 'Crossing the outer halo.',
      'touching': 'The two discs nearly meet. Nothing here endangers Earth.',
    },
    sourceIds: ['nasa-andromeda'],
    reviewState: 'approved',
  },
]

export const objectEditorialById = Object.fromEntries(
  objectEditorial.map((record) => [record.objectId, record]),
) as Record<string, ObjectEditorialDefinition>
