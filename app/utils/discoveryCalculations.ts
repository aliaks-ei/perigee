import { skyObjectsById } from '../data/objects'
import type {
  DiscoveryCalculation,
  DiscoveryDefinition,
  ResolvedDiscovery,
} from '../types/editorial'
import { angularDiameterDegrees } from '../../src/perigee/math/angularSize'

const SPEED_OF_LIGHT_KM_PER_SECOND = 299_792.458
const MOON_REFERENCE_DISTANCE_KM = 384_400
const VALUE_TOKEN = '{{value}}'

function presetDistance(calculation: DiscoveryCalculation): number {
  const object = skyObjectsById[calculation.objectId]
  const preset = object.presets.find((candidate) => candidate.id === calculation.presetId)
  if (!preset) {
    throw new RangeError(`Unknown preset ${calculation.presetId} for ${object.id}`)
  }
  return preset.distanceKm
}

export function lightTravelTimeSeconds(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new RangeError('Distance must be a positive finite number')
  }
  return distanceKm / SPEED_OF_LIGHT_KM_PER_SECOND
}

export function moonWidthComparison(
  diameterKm: number,
  distanceKm: number,
  moonDistanceKm = MOON_REFERENCE_DISTANCE_KM,
): number {
  const objectAngle = angularDiameterDegrees(diameterKm, distanceKm)
  const moonAngle = angularDiameterDegrees(skyObjectsById.moon.diameterKm, moonDistanceKm)
  return objectAngle / moonAngle
}

export function calculateDiscoveryValue(calculation: DiscoveryCalculation): number {
  const object = skyObjectsById[calculation.objectId]
  const distanceKm = presetDistance(calculation)
  if (calculation.kind === 'light-travel-time') {
    return lightTravelTimeSeconds(distanceKm)
  }
  return moonWidthComparison(object.diameterKm, distanceKm)
}

export function resolveDiscovery(discovery: DiscoveryDefinition): ResolvedDiscovery {
  if (!discovery.calculation) {
    if (discovery.glance.includes(VALUE_TOKEN)) {
      throw new Error(`Discovery ${discovery.id} has a value token without a calculation`)
    }
    return discovery
  }

  const tokenCount = discovery.glance.split(VALUE_TOKEN).length - 1
  if (tokenCount !== 1) {
    throw new Error(`Discovery ${discovery.id} must contain exactly one value token`)
  }

  const calculatedValue = calculateDiscoveryValue(discovery.calculation)
  const value = calculatedValue.toLocaleString('en-US', {
    minimumFractionDigits: discovery.calculation.decimals,
    maximumFractionDigits: discovery.calculation.decimals,
  })

  const { calculation: _calculation, ...resolved } = discovery
  return {
    ...resolved,
    glance: discovery.glance.replace(VALUE_TOKEN, value),
    calculatedValue,
  }
}
