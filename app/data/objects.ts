import type { SkyObjectDefinition, SkyObjectId } from '~/types/perigee'

const AU_KM = 149_597_870.7
const LY_KM = 9_460_730_472_580.8
const MOON_DISTANCE_KM = 384_400

const moonPresets = [
  { id: 'real', label: 'Real', metadataLabel: 'Familiar distance', distanceKm: MOON_DISTANCE_KM },
  { id: 'three-quarter', label: '¾ distance', distanceKm: MOON_DISTANCE_KM * 0.75 },
  { id: 'half', label: '½ distance', distanceKm: MOON_DISTANCE_KM * 0.5 },
  { id: 'quarter', label: '¼ distance', distanceKm: MOON_DISTANCE_KM * 0.25 },
  { id: 'close-pass', label: 'Close pass', distanceKm: MOON_DISTANCE_KM * 0.125 },
]

const planetPresets = (realKm: number) => [
  { id: 'real', label: 'Real', distanceKm: realKm },
  { id: 'moon-swap', label: 'Moon swap', distanceKm: MOON_DISTANCE_KM },
  { id: 'close', label: 'Close', distanceKm: AU_KM * 0.01 },
  { id: 'near', label: 'Near', distanceKm: AU_KM * 0.1 },
  { id: 'neighbor', label: 'Neighbor', distanceKm: AU_KM },
]

const starPresets = (realLy: number, closeAu: number) => [
  { id: 'real', label: 'Real', metadataLabel: 'True distance', distanceKm: realLy * LY_KM },
  { id: 'one-ly', label: '1 ly', metadataLabel: 'One-light-year swap', distanceKm: LY_KM },
  { id: 'tenth-ly', label: '0.1 ly', metadataLabel: 'Near stellar pass', distanceKm: LY_KM * 0.1 },
  { id: 'hundredth-ly', label: '0.01 ly', metadataLabel: 'Oort-cloud pass', distanceKm: LY_KM * 0.01 },
  {
    id: 'impossible',
    label: `${closeAu.toLocaleString('en-US')} AU`,
    metadataLabel: 'Impossible close pass',
    distanceKm: AU_KM * closeAu,
    hazardCopy: 'At this distance, Earth would not survive. Enjoy the view.',
  },
]

/**
 * A galaxy has no useful Solar-System step, so its ladder walks the Local Group
 * inward: the true distance, then one million light years, then the halves that
 * bring the two discs to within touching range. The last step is close, not
 * survivable-adjacent; nothing about it endangers Earth, so it carries no
 * hazard copy.
 */
const galaxyPresets = (realLy: number) => [
  { id: 'real', label: 'Real', metadataLabel: 'True distance', distanceKm: realLy * LY_KM },
  { id: 'one-million', label: '1 Mly', metadataLabel: 'One-million-light-year swap', distanceKm: LY_KM * 1_000_000 },
  { id: 'half-million', label: '500 kly', metadataLabel: 'Local Group approach', distanceKm: LY_KM * 500_000 },
  { id: 'quarter-million', label: '250 kly', metadataLabel: 'Halo crossing', distanceKm: LY_KM * 250_000 },
  { id: 'touching', label: '150 kly', metadataLabel: 'Discs nearly touching', distanceKm: LY_KM * 150_000 },
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
    presets: planetPresets(54_600_000),
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
    presets: planetPresets(588_000_000),
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
    presets: planetPresets(1_195_000_000),
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
    presets: planetPresets(4_300_000_000),
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
    presets: starPresets(548, 63),
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
    thumbnail: '/assets/objects/thumbs/star.webp',
    attributionIds: ['solar-system-scope-textures'],
  },
  {
    id: 'sirius',
    label: 'Sirius',
    kind: 'star',
    diameterKm: 2_380_000,
    rotationPeriodHours: 120,
    material: 'stellar',
    presets: starPresets(8.6, 0.25),
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
    thumbnail: '/assets/objects/thumbs/star.webp',
    attributionIds: ['solar-system-scope-textures'],
  },
  {
    id: 'rigel',
    label: 'Rigel',
    kind: 'star',
    diameterKm: 109_000_000,
    rotationPeriodHours: 1_200,
    material: 'stellar',
    presets: starPresets(860, 10),
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
    thumbnail: '/assets/objects/thumbs/star.webp',
    attributionIds: ['solar-system-scope-textures'],
  },
  {
    id: 'andromeda',
    label: 'Andromeda',
    kind: 'galaxy',
    // The D25 optical major axis, about 190 arcmin, taken at NASA's 2.5 Mly
    // distance. Paired that way the scene computes 3.16 degrees, which is the
    // catalogued apparent size and NASA's "six times the full Moon".
    // docs/design/andromeda/README.md records the working.
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
