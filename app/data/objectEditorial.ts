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
      'real': 'This is the Moon exactly as it appears tonight, at the distance the sky actually puts it.',
      'three-quarter': 'A quarter of the way in, the disc is noticeably broader but still reads as the Moon.',
      'half': 'Halving the distance doubles the apparent width. The familiar face no longer fits the space your eye expects.',
      'quarter': 'This close, the Moon dominates the sky rather than sitting in it.',
      'close-pass': 'Surface relief that is normally a smudge resolves into terrain.',
    },
    sourceIds: ['nasa-moon-facts'],
    reviewState: 'approved',
  },
  {
    objectId: 'mars',
    headline: 'Mars at closer distances',
    subject: 'Mars',
    summary:
      'Mars is the planet closest to Earth in size and the one people most often imagine standing on. In the real sky it never grows past a bright point. The distance ladder shows what it would take for the rust-coloured surface to become something you could actually read.',
    boundary: 'calculated',
    questions: {
      'real': 'How big does Mars actually look from Earth?',
      'moon-swap': 'How big would Mars look if it replaced the Moon?',
      'close': 'How big would Mars look from a hundredth of an astronomical unit?',
      'near': 'How big would Mars look from a tenth of an astronomical unit?',
      'neighbor': 'How big would Mars look at one astronomical unit?',
    },
    whatYouSee: {
      'real': 'At its closest real approach Mars is still a point of light. No unaided eye resolves a disc.',
      'moon-swap': 'Put Mars where the Moon is and it is the wider of the two, because it is nearly twice the diameter.',
      'close': 'The disc is unmistakable and the polar cap is visible.',
      'near': 'Closer than Mars ever comes to Earth in the real Solar System.',
      'neighbor': 'Mars at the distance the Sun sits from Earth.',
    },
    sourceIds: ['nasa-mars-facts', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'jupiter',
    headline: 'Jupiter at closer distances',
    subject: 'Jupiter',
    summary:
      'Jupiter is the largest planet in the Solar System and the most dramatic object to move inward, because its diameter is many times the Moon\'s. The moment it reaches the Moon\'s distance it stops being an object in the sky and becomes the sky.',
    boundary: 'calculated',
    questions: {
      'real': 'How big does Jupiter actually look from Earth?',
      'moon-swap': 'How big would Jupiter look if it replaced the Moon?',
      'close': 'How big would Jupiter look from a hundredth of an astronomical unit?',
      'near': 'How big would Jupiter look from a tenth of an astronomical unit?',
      'neighbor': 'How big would Jupiter look at one astronomical unit?',
    },
    whatYouSee: {
      'real': 'Jupiter is among the brightest points in the scene, and still only a point.',
      'moon-swap': 'At the Moon\'s distance Jupiter fills a large part of the visible sky, and the belts are plainly banded.',
      'close': 'The banding and the storm systems separate clearly.',
      'near': 'Closer than Venus ever comes to Earth.',
      'neighbor': 'Jupiter at Earth\'s own distance from the Sun.',
    },
    sourceIds: ['nasa-jupiter-facts', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'saturn',
    headline: 'Saturn at closer distances',
    subject: 'Saturn',
    summary:
      'Saturn is the object most people picture when they imagine a planet replacing the Moon, and the comparison holds up: the globe alone spans tens of full Moons at that distance, and the ring system reaches considerably further. Perigee renders the globe at its calculated angular size, and draws the rings to the same geometry.',
    boundary: 'calculated',
    questions: {
      'real': 'How big does Saturn actually look from Earth?',
      'moon-swap': 'How big would Saturn look if it replaced the Moon?',
      'close': 'How big would Saturn look from a hundredth of an astronomical unit?',
      'near': 'How big would Saturn look from a tenth of an astronomical unit?',
      'neighbor': 'How big would Saturn look at one astronomical unit?',
    },
    whatYouSee: {
      'real': 'Saturn is a pale point. Its rings are far below what an unaided eye resolves.',
      'moon-swap': 'The signature view: Saturn at the Moon\'s distance, rings reaching well past the globe.',
      'close': 'The ring plane and the gap dividing it are unmistakable.',
      'near': 'Closer to Earth than Mercury orbits the Sun.',
      'neighbor': 'Saturn where Earth sits.',
    },
    sourceIds: ['nasa-saturn-facts', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'neptune',
    headline: 'Neptune at closer distances',
    subject: 'Neptune',
    summary:
      'Neptune is the most distant planet in the Solar System and has never been seen as anything but a point without a telescope. It is also the deepest blue object Perigee renders. Moving it inward is the clearest demonstration that distance, not size, is what keeps most of the Solar System invisible.',
    boundary: 'calculated',
    questions: {
      'real': 'How big does Neptune actually look from Earth?',
      'moon-swap': 'How big would Neptune look if it replaced the Moon?',
      'close': 'How big would Neptune look from a hundredth of an astronomical unit?',
      'near': 'How big would Neptune look from a tenth of an astronomical unit?',
      'neighbor': 'How big would Neptune look at one astronomical unit?',
    },
    whatYouSee: {
      'real': 'At its real distance Neptune is not visible to an unaided eye at all.',
      'moon-swap': 'At the Moon\'s distance Neptune is far the wider of the two, and a deep, even blue.',
      'close': 'The faint banding in the atmosphere becomes readable.',
      'near': 'Neptune brought closer than Earth ever is to the Sun.',
      'neighbor': 'Neptune where Earth sits.',
    },
    sourceIds: ['nasa-neptune-facts', 'iau-astronomical-unit'],
    reviewState: 'approved',
  },
  {
    objectId: 'betelgeuse',
    headline: 'Betelgeuse at closer distances',
    subject: 'Betelgeuse',
    summary:
      'Betelgeuse is a red supergiant large enough that, placed at the centre of the Solar System, its surface would reach out past the inner planets. It is the clearest answer to the question of how close a star has to come before it stops looking like a point. The answer is: much closer than you would guess, because stars are extraordinarily far away.',
    boundary: 'rendered',
    questions: {
      'real': 'How big does Betelgeuse actually look from Earth?',
      'one-ly': 'How big would Betelgeuse look from one light year away?',
      'tenth-ly': 'How big would Betelgeuse look from a tenth of a light year?',
      'hundredth-ly': 'How big would Betelgeuse look from a hundredth of a light year?',
      'impossible': 'What would Betelgeuse look like inside the Solar System?',
    },
    whatYouSee: {
      'real': 'At its true distance Betelgeuse is one of the brightest stars in Orion, and still a point.',
      'one-ly': 'Closer than any star actually is to the Sun, and still barely a disc.',
      'tenth-ly': 'The point finally opens into something with a measurable width.',
      'hundredth-ly': 'Comparable to a pass through the Oort cloud.',
      'impossible': 'Perigee renders the apparent size and the light. It does not simulate what this would do to Earth.',
    },
    sourceIds: ['nasa-betelgeuse'],
    reviewState: 'approved',
  },
  {
    objectId: 'sirius',
    headline: 'Sirius at closer distances',
    subject: 'Sirius',
    summary:
      'Sirius is the brightest star in the night sky, and it earns that mostly by being close rather than by being large. Walking it inward shows how much of a star\'s brightness is proximity and how little of it is size.',
    boundary: 'rendered',
    questions: {
      'real': 'How big does Sirius actually look from Earth?',
      'one-ly': 'How big would Sirius look from one light year away?',
      'tenth-ly': 'How big would Sirius look from a tenth of a light year?',
      'hundredth-ly': 'How big would Sirius look from a hundredth of a light year?',
      'impossible': 'What would Sirius look like inside the Solar System?',
    },
    whatYouSee: {
      'real': 'The brightest star in the sky, at the distance that makes it so. Still a point.',
      'one-ly': 'Brighter, but geometrically still a point of light.',
      'tenth-ly': 'The glare grows long before the disc does.',
      'hundredth-ly': 'Roughly an Oort-cloud pass.',
      'impossible': 'Well inside the orbit of Mercury. Apparent size is calculated; the consequences are not simulated.',
    },
    sourceIds: ['simbad-sirius'],
    reviewState: 'approved',
  },
  {
    objectId: 'rigel',
    headline: 'Rigel at closer distances',
    subject: 'Rigel',
    summary:
      'Rigel is a blue supergiant in Orion, far larger and far more luminous than Sirius, and far more distant. Comparing the two at the same distance separates the two things that make a star look bright from Earth: how big it is, and how near it is.',
    boundary: 'rendered',
    questions: {
      'real': 'How big does Rigel actually look from Earth?',
      'one-ly': 'How big would Rigel look from one light year away?',
      'tenth-ly': 'How big would Rigel look from a tenth of a light year?',
      'hundredth-ly': 'How big would Rigel look from a hundredth of a light year?',
      'impossible': 'What would Rigel look like inside the Solar System?',
    },
    whatYouSee: {
      'real': 'At its true distance Rigel is among the most luminous stars an unaided eye can see.',
      'one-ly': 'Closer than any real star, and beginning to show width.',
      'tenth-ly': 'The disc is now measurable rather than implied.',
      'hundredth-ly': 'Roughly an Oort-cloud pass.',
      'impossible': 'The scene renders the light and the size. Nothing about the physical consequences is modelled.',
    },
    sourceIds: ['simbad-rigel'],
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
      'real': 'The real sky, at the real distance. The disc is already several full Moons wide, and almost nobody has seen it that way.',
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
