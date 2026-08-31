import type {
  DiscoveryDefinition,
  EncounterDefinition,
  ScienceSource,
} from '~/types/editorial'

export const scienceSources: ScienceSource[] = [
  {
    id: 'bipm-speed-of-light',
    title: 'SI base unit: metre',
    publisher: 'Bureau International des Poids et Mesures',
    url: 'https://www.bipm.org/en/si-base-units/metre',
    reviewedOn: '2026-08-31',
  },
  {
    id: 'iau-astronomical-unit',
    title: 'IAU 2012 Resolution B2: re-definition of the astronomical unit',
    publisher: 'International Astronomical Union',
    url: 'https://www.iau.org/static/resolutions/IAU2012_English.pdf',
    reviewedOn: '2026-08-31',
  },
  {
    id: 'nasa-saturn-facts',
    title: 'Saturn: Facts',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/saturn/facts/',
    reviewedOn: '2026-08-31',
  },
  {
    id: 'nasa-moon-facts',
    title: 'Moon Facts',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/moon/facts/',
    reviewedOn: '2026-08-31',
  },
  {
    id: 'nasa-betelgeuse',
    title: 'What is Betelgeuse? Inside the Strange, Volatile Star',
    publisher: 'NASA Science',
    url: 'https://science.nasa.gov/universe/what-is-betelgeuse-inside-the-strange-volatile-star/',
    reviewedOn: '2026-08-31',
  },
]

/**
 * Launch-scope editorial records live here rather than in Vue components. The
 * Content is approved only after source, simulation-boundary, and live-scene review.
 */
export const discoveries: DiscoveryDefinition[] = [
  {
    id: 'saturn-moon-widths',
    scope: { objectId: 'saturn', presetId: 'moon-swap' },
    glance: 'Saturn itself spans about {{value}} familiar full Moons across your sky.',
    detail: 'This comparison uses the planet\'s globe, not the wider ring system, and the same angular-size calculation that positions Saturn in the scene.',
    boundary: 'calculated',
    calculation: {
      kind: 'moon-widths',
      objectId: 'saturn',
      presetId: 'moon-swap',
      decimals: 0,
    },
    sourceIds: ['nasa-saturn-facts'],
    reviewState: 'approved',
  },
  {
    id: 'saturn-light-time',
    scope: { objectId: 'saturn', presetId: 'moon-swap' },
    glance: 'At this distance, light would cross the gap in about {{value}} seconds.',
    detail: 'Perigee divides the selected distance by the exact speed of light in vacuum. It does not delay the live rendering by that amount.',
    boundary: 'calculated',
    calculation: {
      kind: 'light-travel-time',
      objectId: 'saturn',
      presetId: 'moon-swap',
      decimals: 1,
    },
    sourceIds: ['bipm-speed-of-light'],
    reviewState: 'approved',
  },
  {
    id: 'betelgeuse-simulation-boundary',
    scope: { objectId: 'betelgeuse', presetId: 'impossible' },
    glance: 'The changing light is rendered; heat, radiation, gravity, and tides are not simulated.',
    detail: 'This encounter visualizes apparent size and an authored environmental treatment. Any physical consequences require separately reviewed source material.',
    boundary: 'rendered',
    sourceIds: ['nasa-betelgeuse'],
    reviewState: 'approved',
  },
  {
    id: 'moon-nonlinear-growth',
    scope: { objectId: 'moon', presetId: 'half' },
    glance: 'At half the distance, the Moon appears almost twice as wide.',
    detail: 'Apparent width follows angular geometry rather than a linear screen-space scale. Perigee calculates it from the Moon\'s diameter and selected distance.',
    boundary: 'calculated',
    sourceIds: ['nasa-moon-facts'],
    reviewState: 'approved',
  },
]

export const encounters: EncounterDefinition[] = [
  {
    id: 'saturn-moon-distance',
    slug: 'saturn-at-the-moons-distance',
    title: 'Saturn at the Moon\'s distance',
    invitation: 'How much of the sky would Saturn fill if it replaced the Moon?',
    estimatedMinutes: 2,
    reviewState: 'approved',
    beats: [
      {
        id: 'saturn-real',
        selection: { objectId: 'saturn', presetId: 'real', viewpointId: 'rooftop' },
        observation: "Saturn is the pale point at the arrow's tip.",
        actionLabel: 'Bring Saturn closer',
        transitionLabel: 'Finding Saturn at its real distance',
        locatorLabel: 'Saturn · real distance',
      },
      {
        id: 'saturn-reveal',
        selection: { objectId: 'saturn', presetId: 'close', viewpointId: 'rooftop' },
        observation: 'Saturn has crossed most of the distance. Its rings are now unmistakable.',
        actionLabel: 'Bring Saturn to the Moon\'s distance',
        transitionLabel: 'Bringing Saturn into view',
      },
      {
        id: 'saturn-stay',
        selection: { objectId: 'saturn', presetId: 'moon-swap', viewpointId: 'rooftop' },
        observation: 'The planet alone spans about 33 familiar Moons. Its rings reach farther still.',
        actionLabel: 'Explore this sky',
        transitionLabel: 'Closing the remaining distance',
        discoveryId: 'saturn-moon-widths',
      },
    ],
  },
  {
    id: 'saturn-edge-of-world',
    slug: 'saturn-at-the-edge-of-the-world',
    title: 'Saturn at the edge of the world',
    invitation: 'What if Saturn rose over the Atlantic at the Moon\'s distance?',
    estimatedMinutes: 2,
    reviewState: 'approved',
    beats: [
      {
        id: 'saturn-cabo-real',
        selection: { objectId: 'saturn', presetId: 'real', viewpointId: 'cabo-da-roca' },
        observation: 'At its real distance, Saturn is a pale point above the Atlantic.',
        actionLabel: 'Bring Saturn closer',
        transitionLabel: 'Finding Saturn beyond the cape',
        locatorLabel: 'Saturn · real distance',
      },
      {
        id: 'saturn-cabo-reveal',
        selection: { objectId: 'saturn', presetId: 'close', viewpointId: 'cabo-da-roca' },
        observation: 'Across most of the distance, the rings become unmistakable above the cape.',
        actionLabel: 'Bring Saturn to the Moon\'s distance',
        transitionLabel: 'Bringing Saturn over the Atlantic',
      },
      {
        id: 'saturn-cabo-stay',
        selection: { objectId: 'saturn', presetId: 'moon-swap', viewpointId: 'cabo-da-roca' },
        observation: 'The planet alone spans about 33 familiar Moons. Its rings reach farther still.',
        actionLabel: 'Explore this sky',
        transitionLabel: 'Closing the remaining distance',
        discoveryId: 'saturn-moon-widths',
      },
    ],
  },
  {
    id: 'betelgeuse-takes-the-sky',
    slug: 'when-betelgeuse-takes-the-sky',
    title: 'When Betelgeuse takes the sky',
    invitation: 'How close must a star come before it stops looking like a point?',
    estimatedMinutes: 3,
    reviewState: 'approved',
    beats: [
      {
        id: 'betelgeuse-real',
        selection: { objectId: 'betelgeuse', presetId: 'real', viewpointId: 'hilltop' },
        observation: 'At its real distance, Betelgeuse is still only a point of light to us.',
        actionLabel: 'Bring Betelgeuse closer',
        transitionLabel: 'Finding Betelgeuse in the night sky',
        locatorLabel: 'Betelgeuse · real distance',
      },
      {
        id: 'betelgeuse-surface',
        selection: { objectId: 'betelgeuse', presetId: 'hundredth-ly', viewpointId: 'hilltop' },
        observation: 'Closer in, a stellar surface begins to replace the point.',
        actionLabel: 'Cross the final distance',
        transitionLabel: 'Crossing the stellar distance',
      },
      {
        id: 'betelgeuse-impossible',
        selection: { objectId: 'betelgeuse', presetId: 'impossible', viewpointId: 'hilltop' },
        observation: 'This final view is visually honest in scale, not a survivable scenario.',
        actionLabel: 'Explore this sky',
        transitionLabel: 'Bringing the stellar surface into view',
        discoveryId: 'betelgeuse-simulation-boundary',
      },
    ],
  },
  {
    id: 'moon-approaches',
    slug: 'why-the-moon-grows-so-quickly',
    title: 'The Moon approaches',
    invitation: 'When distance changes, how quickly does apparent size follow?',
    estimatedMinutes: 2,
    reviewState: 'approved',
    beats: [
      {
        id: 'moon-familiar',
        selection: { objectId: 'moon', presetId: 'real', viewpointId: 'lakeside' },
        observation: 'Start with a familiar Moon and notice how little sky it occupies.',
        actionLabel: 'Move the Moon closer',
        transitionLabel: 'Returning to the familiar Moon',
      },
      {
        id: 'moon-half',
        selection: { objectId: 'moon', presetId: 'half', viewpointId: 'lakeside' },
        observation: 'Halve the distance. The Moon becomes almost twice as wide.',
        actionLabel: 'Bring it closer again',
        transitionLabel: 'Halving the Moon\'s distance',
        discoveryId: 'moon-nonlinear-growth',
      },
      {
        id: 'moon-quarter',
        selection: { objectId: 'moon', presetId: 'quarter', viewpointId: 'lakeside' },
        observation: 'At one quarter of the distance, the familiar disc has become a world.',
        actionLabel: 'Explore this sky',
        transitionLabel: 'Crossing half the distance again',
      },
    ],
  },
]

export const encountersById = Object.fromEntries(
  encounters.map((encounter) => [encounter.id, encounter]),
) as Record<string, EncounterDefinition>

export const encountersBySlug = Object.fromEntries(
  encounters.map((encounter) => [encounter.slug, encounter]),
) as Record<string, EncounterDefinition>

export const discoveriesById = Object.fromEntries(
  discoveries.map((discovery) => [discovery.id, discovery]),
) as Record<string, DiscoveryDefinition>
