import { describe, expect, it } from 'vitest'
import {
  angularDiameterDegrees,
  angularDiameterRadians,
  renderRadiusForAngularDiameter,
} from '../src/perigee/math/angularSize'

describe('angular size', () => {
  it('matches the Moon reference case', () => {
    expect(angularDiameterDegrees(3_474.8, 384_400)).toBeCloseTo(0.5179, 3)
  })

  it('keeps Jupiter scientifically correct at Moon distance', () => {
    expect(angularDiameterDegrees(139_820, 384_400)).toBeCloseTo(20.62, 1)
  })

  it('matches the hazardous Betelgeuse composition at 63 AU', () => {
    const distanceKm = 63 * 149_597_870.7
    expect(angularDiameterDegrees(1_050_000_000, distanceKm)).toBeCloseTo(6.37, 1)
  })

  it('converts angular diameter to the correct fixed-distance radius', () => {
    const theta = angularDiameterRadians(3_474.8, 384_400)
    const radius = renderRadiusForAngularDiameter(theta, 500)
    expect(radius).toBeCloseTo(2.26, 1)
  })

  it('rejects invalid source values', () => {
    expect(() => angularDiameterRadians(0, 10)).toThrow(RangeError)
    expect(() => angularDiameterRadians(10, Number.NaN)).toThrow(RangeError)
    expect(() => renderRadiusForAngularDiameter(Math.PI, 500)).toThrow(RangeError)
  })
})
