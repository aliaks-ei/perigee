import type { SkyObjectDefinition, SkyObjectId } from '~/types/perigee'

const AU_KM = 149_597_870.7
const LY_KM = 9_460_730_472_580.8
const MOON_DISTANCE_KM = 384_400

const moonPresets = [
  { id: 'close-pass', label: 'Close pass', shortLabel: 'Close', metadataLabel: '48,050 km away', distanceKm: MOON_DISTANCE_KM * 0.125 },
  { id: 'quarter', label: 'Quarter distance', shortLabel: 'Quarter', metadataLabel: '96,100 km away', distanceKm: MOON_DISTANCE_KM * 0.25 },
  { id: 'half', label: 'Half distance', shortLabel: 'Half', metadataLabel: '192,200 km away', distanceKm: MOON_DISTANCE_KM * 0.5 },
  { id: 'three-quarter', label: 'Three-quarter distance', shortLabel: 'Almost', metadataLabel: '288,300 km away', distanceKm: MOON_DISTANCE_KM * 0.75 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '384,400 km away on average', distanceKm: MOON_DISTANCE_KM },
]

const marsPresets = [
  { id: 'close-pass', label: 'Impossible close pass', shortLabel: 'Close', metadataLabel: '32,000 km away', distanceKm: 32_000 },
  { id: 'near-pass', label: 'Near pass', shortLabel: 'Near', metadataLabel: '96,000 km away', distanceKm: 96_000 },
  { id: 'moon-swap', label: 'Moon swap', shortLabel: 'Moon', metadataLabel: '384,400 km away', distanceKm: MOON_DISTANCE_KM },
  { id: 'hundredth-au', label: 'Across near space', shortLabel: 'Space', metadataLabel: '1.5 million km away', distanceKm: AU_KM * 0.01 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '54.6 million km at closest approach', distanceKm: 54_600_000 },
]

const jupiterPresets = [
  { id: 'moon-swap', label: 'Moon swap', shortLabel: 'Moon', metadataLabel: '384,400 km away', distanceKm: MOON_DISTANCE_KM },
  { id: 'two-million', label: 'Close pass', shortLabel: 'Close', metadataLabel: '2 million km away', distanceKm: 2_000_000 },
  { id: 'ten-million', label: 'Near pass', shortLabel: 'Near', metadataLabel: '10 million km away', distanceKm: 10_000_000 },
  { id: 'hundred-million', label: 'Across the system', shortLabel: 'System', metadataLabel: '100 million km away', distanceKm: 100_000_000 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '588 million km at closest approach', distanceKm: 588_000_000 },
]

const saturnPresets = [
  { id: 'moon-swap', label: 'Moon swap', shortLabel: 'Moon', metadataLabel: '384,400 km away', distanceKm: MOON_DISTANCE_KM },
  { id: 'close', label: 'Close pass', shortLabel: 'Close', metadataLabel: '1.5 million km away', distanceKm: AU_KM * 0.01 },
  { id: 'ten-million', label: 'Near pass', shortLabel: 'Near', metadataLabel: '10 million km away', distanceKm: 10_000_000 },
  { id: 'hundred-million', label: 'Across the system', shortLabel: 'System', metadataLabel: '100 million km away', distanceKm: 100_000_000 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '1.2 billion km at closest approach', distanceKm: 1_195_000_000 },
]

const neptunePresets = [
  { id: 'moon-swap', label: 'Moon swap', shortLabel: 'Moon', metadataLabel: '384,400 km away', distanceKm: MOON_DISTANCE_KM },
  { id: 'two-million', label: 'Close pass', shortLabel: 'Close', metadataLabel: '2 million km away', distanceKm: 2_000_000 },
  { id: 'twelve-million', label: 'Near pass', shortLabel: 'Near', metadataLabel: '12 million km away', distanceKm: 12_000_000 },
  { id: 'hundred-twenty-million', label: 'Across the system', shortLabel: 'System', metadataLabel: '120 million km away', distanceKm: 120_000_000 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '4.3 billion km at closest approach', distanceKm: 4_300_000_000 },
]

const hazardCopy = 'At this distance, Earth would not survive. Enjoy the view.'

const betelgeusePresets = [
  { id: 'impossible', label: 'Impossible close pass', shortLabel: 'Close', metadataLabel: '63 AU away', distanceKm: AU_KM * 63, hazardCopy },
  { id: 'near-250-au', label: 'Deep outer system', shortLabel: 'Outer', metadataLabel: '250 AU away', distanceKm: AU_KM * 250 },
  { id: 'near-1000-au', label: 'Far beyond the Sun', shortLabel: 'Far', metadataLabel: '1,000 AU away', distanceKm: AU_KM * 1_000 },
  { id: 'near-10000-au', label: 'Oort Cloud', shortLabel: 'Cloud', metadataLabel: '10,000 AU away', distanceKm: AU_KM * 10_000 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '548 light-years away', distanceKm: LY_KM * 548 },
]

const siriusPresets = [
  { id: 'impossible', label: 'Inside Mercury\'s orbit', shortLabel: 'Close', metadataLabel: '0.25 AU away', distanceKm: AU_KM * 0.25, hazardCopy },
  { id: 'near-1-au', label: 'At the Sun\'s distance', shortLabel: 'Sun', metadataLabel: '1 AU away', distanceKm: AU_KM },
  { id: 'near-5-au', label: 'At Jupiter\'s distance', shortLabel: 'Jupiter', metadataLabel: '5 AU away', distanceKm: AU_KM * 5 },
  { id: 'near-25-au', label: 'Outer-system pass', shortLabel: 'Outer', metadataLabel: '25 AU away', distanceKm: AU_KM * 25 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '8.6 light-years away', distanceKm: LY_KM * 8.6 },
]

const rigelPresets = [
  { id: 'impossible', label: 'At Saturn\'s distance', shortLabel: 'Close', metadataLabel: '10 AU away', distanceKm: AU_KM * 10, hazardCopy },
  { id: 'near-25-au', label: 'Outer-system pass', shortLabel: 'Outer', metadataLabel: '25 AU away', distanceKm: AU_KM * 25 },
  { id: 'near-100-au', label: 'Heliosphere\'s edge', shortLabel: 'Edge', metadataLabel: '100 AU away', distanceKm: AU_KM * 100 },
  { id: 'near-1000-au', label: 'Far beyond the Sun', shortLabel: 'Far', metadataLabel: '1,000 AU away', distanceKm: AU_KM * 1_000 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: '860 light-years away', distanceKm: LY_KM * 860 },
]

/**
 * A galaxy has no useful Solar-System step, so its ladder walks outward through
 * the Local Group: from nearly touching to the true distance. Nothing about
 * the closest step endangers Earth, so it carries no hazard copy.
 */
const galaxyPresets = (realLy: number) => [
  { id: 'touching', label: 'Nearly touching', shortLabel: 'Touching', metadataLabel: '150,000 light-years away', distanceKm: LY_KM * 150_000 },
  { id: 'quarter-million', label: 'Halo crossing', shortLabel: 'Halos', metadataLabel: '250,000 light-years away', distanceKm: LY_KM * 250_000 },
  { id: 'half-million', label: 'Local Group approach', shortLabel: 'Approach', metadataLabel: '500,000 light-years away', distanceKm: LY_KM * 500_000 },
  { id: 'one-million', label: 'Across the Local Group', shortLabel: 'Group', metadataLabel: '1 million light-years away', distanceKm: LY_KM * 1_000_000 },
  { id: 'real', label: 'Real distance', shortLabel: 'Real', metadataLabel: `${realLy / 1_000_000} million light-years away`, distanceKm: realLy * LY_KM },
]

export const skyObjects: SkyObjectDefinition[] = [
  {
    id: 'moon',
    label: 'Moon',
    kind: 'moon',
    diameterKm: 3_474.8,
    rotationPeriodHours: 655.72,
    texture: '/assets/objects/moon.jpg',
    normalMap: '/assets/objects/moon-normal.webp',
    material: 'rocky',
    presets: moonPresets,
    shot: {
      timeOfDay: 0.14,
      exposure: 0.88,
      sunDirection: [0.8, 0.4, 1],
      skyPalette: ['#02050b', '#071325', '#263144'],
      objectYaw: 0.54,
      objectPitch: 0.3,
      accent: '#c7c6c2',
    },
    thumbnail: '/assets/objects/thumbs/moon.webp',
    attributionIds: ['solar-system-scope-textures', 'planetary-elevation-data'],
  },
  {
    id: 'mars',
    label: 'Mars',
    kind: 'planet',
    diameterKm: 6_779,
    flattening: 0.00589,
    rotationPeriodHours: 24.62,
    texture: '/assets/objects/mars.jpg',
    normalMap: '/assets/objects/mars-normal.webp',
    material: 'rocky',
    presets: marsPresets,
    shot: {
      timeOfDay: 0.18,
      exposure: 0.9,
      sunDirection: [-0.65, 0.35, 1],
      skyPalette: ['#03050a', '#081223', '#342521'],
      objectYaw: 0.45,
      objectPitch: 0.27,
      accent: '#c87950',
    },
    thumbnail: '/assets/objects/thumbs/mars.webp',
    attributionIds: ['solar-system-scope-textures', 'planetary-elevation-data'],
  },
  {
    id: 'jupiter',
    label: 'Jupiter',
    kind: 'planet',
    diameterKm: 139_820,
    flattening: 0.06487,
    rotationPeriodHours: 9.93,
    texture: '/assets/objects/jupiter.jpg',
    material: 'gas-giant',
    presets: jupiterPresets,
    shot: {
      timeOfDay: 0.09,
      exposure: 0.82,
      sunDirection: [-0.7, 0.22, 1],
      skyPalette: ['#01040a', '#071326', '#16283e'],
      objectYaw: -0.26,
      objectPitch: 0.24,
      accent: '#d4b89a',
    },
    thumbnail: '/assets/objects/thumbs/jupiter.webp',
    attributionIds: ['solar-system-scope-textures'],
  },
  {
    id: 'saturn',
    label: 'Saturn',
    kind: 'planet',
    diameterKm: 116_460,
    flattening: 0.09796,
    rotationPeriodHours: 10.7,
    texture: '/assets/objects/saturn-atmosphere-v2.webp',
    material: 'gas-giant',
    presets: saturnPresets,
    shot: {
      timeOfDay: 0.16,
      exposure: 0.9,
      sunDirection: [0.75, 0.28, 1],
      skyPalette: ['#01040a', '#061327', '#24314a'],
      objectYaw: 0.38,
      objectPitch: 0.31,
      ringTilt: -0.31,
      accent: '#d8c7a4',
    },
    thumbnail: '/assets/objects/thumbs/saturn.webp',
    attributionIds: ['solar-system-scope-textures'],
  },
  {
    id: 'neptune',
    label: 'Neptune',
    kind: 'planet',
    diameterKm: 49_244,
    flattening: 0.01708,
    rotationPeriodHours: 16.11,
    texture: '/assets/objects/neptune.jpg',
    material: 'ice-giant',
    presets: neptunePresets,
    shot: {
      timeOfDay: 0.06,
      exposure: 0.84,
      sunDirection: [-0.68, 0.4, 1],
      skyPalette: ['#01030a', '#06112a', '#162d52'],
      objectYaw: -0.3,
      objectPitch: 0.29,
      accent: '#6187dc',
    },
    thumbnail: '/assets/objects/thumbs/neptune.webp',
    attributionIds: ['solar-system-scope-textures'],
  },
  {
    id: 'betelgeuse',
    label: 'Betelgeuse',
    kind: 'star',
    diameterKm: 1_050_000_000,
    rotationPeriodHours: 20_000,
    material: 'stellar',
    presets: betelgeusePresets,
    shot: {
      timeOfDay: 0.54,
      exposure: 0.72,
      sunDirection: [0.4, 0.5, 1],
      skyPalette: ['#080202', '#210a08', '#72311d'],
      objectYaw: 0.42,
      objectPitch: 0.32,
      environmentTint: '#ff5d2f',
      accent: '#ed6a38',
    },
    thumbnail: '/assets/objects/thumbs/betelgeuse.webp',
    attributionIds: ['perigee-procedural-art'],
  },
  {
    id: 'sirius',
    label: 'Sirius',
    kind: 'star',
    diameterKm: 2_380_000,
    rotationPeriodHours: 120,
    material: 'stellar',
    presets: siriusPresets,
    shot: {
      timeOfDay: 0.02,
      exposure: 0.72,
      sunDirection: [-0.55, 0.42, 1],
      skyPalette: ['#010207', '#050d1e', '#152b49'],
      objectYaw: -0.34,
      objectPitch: 0.35,
      environmentTint: '#b7d5ff',
      accent: '#b9d6ff',
    },
    thumbnail: '/assets/objects/thumbs/sirius.webp',
    attributionIds: ['perigee-procedural-art'],
  },
  {
    id: 'rigel',
    label: 'Rigel',
    kind: 'star',
    diameterKm: 109_000_000,
    rotationPeriodHours: 1_200,
    material: 'stellar',
    presets: rigelPresets,
    shot: {
      timeOfDay: 0.01,
      exposure: 0.7,
      sunDirection: [0.66, 0.3, 1],
      skyPalette: ['#010207', '#061022', '#1a3050'],
      objectYaw: 0.33,
      objectPitch: 0.35,
      environmentTint: '#a8c8ff',
      accent: '#abcaff',
    },
    thumbnail: '/assets/objects/thumbs/rigel.webp',
    attributionIds: ['perigee-procedural-art'],
  },
  {
    id: 'andromeda',
    label: 'Andromeda',
    kind: 'galaxy',
    // The D25 optical major axis, about 190 arcmin, taken at NASA's 2.5 Mly
    // distance. Paired that way the scene computes 3.16 degrees, which is the
    // catalogued apparent size and NASA's "six times the full Moon".
    diameterKm: 138_000 * LY_KM,
    material: 'galactic',
    // The optical D25 ellipse is the quantity this visible-light rendering
    // needs: its 0.32 minor/major ratio corresponds to about 71.5 degrees.
    // Kinematic work on the inner ring gives 77.5 degrees, but applying that to
    // an infinitely thin visible disc made M31 look like a luminous ring.
    disc: {
      inclinationDegrees: 71.5,
      positionAngleDegrees: 37.7,
      armPitchDegrees: 8,
      palette: ['#e8c89d', '#b9ad9a', '#8799ad', '#b78e89'],
    },
    presets: galaxyPresets(2_500_000),
    shot: {
      timeOfDay: 0.03,
      exposure: 0.78,
      sunDirection: [0.5, 0.45, 1],
      skyPalette: ['#010207', '#050b1c', '#141f38'],
      objectYaw: 0.2,
      objectPitch: 0.3,
      environmentTint: '#9fb8f0',
      accent: '#b7c8ff',
    },
    thumbnail: '/assets/objects/thumbs/andromeda.webp',
    attributionIds: ['perigee-procedural-art'],
  },
]

export const skyObjectsById = Object.fromEntries(
  skyObjects.map((object) => [object.id, object]),
) as Record<SkyObjectId, SkyObjectDefinition>

/**
 * Shared links from the first distance ladders remain useful after the
 * object-specific redesign. Removed presets land on the closest new visual
 * equivalent and `syncUrl()` immediately writes the canonical id back.
 */
const legacyPresetAliases: Partial<Record<SkyObjectId, Record<string, string>>> = {
  mars: { close: 'hundredth-au', near: 'real', neighbor: 'real' },
  jupiter: { close: 'two-million', near: 'ten-million', neighbor: 'hundred-million' },
  saturn: { near: 'ten-million', neighbor: 'hundred-million' },
  neptune: { close: 'two-million', near: 'twelve-million', neighbor: 'hundred-twenty-million' },
  betelgeuse: { 'one-ly': 'near-10000-au', 'tenth-ly': 'near-10000-au', 'hundredth-ly': 'near-1000-au' },
  sirius: { 'one-ly': 'near-25-au', 'tenth-ly': 'near-25-au', 'hundredth-ly': 'near-25-au' },
  rigel: { 'one-ly': 'near-1000-au', 'tenth-ly': 'near-1000-au', 'hundredth-ly': 'near-1000-au' },
}

export function resolveObjectPresetId(object: SkyObjectDefinition, requestedId: string): string | null {
  if (object.presets.some((preset) => preset.id === requestedId)) return requestedId
  const alias = legacyPresetAliases[object.id]?.[requestedId]
  return alias && object.presets.some((preset) => preset.id === alias) ? alias : null
}
