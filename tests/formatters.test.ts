import { describe, expect, it } from 'vitest'
import { formatAngularDiameter, formatDistance } from '../app/utils/formatters'

describe('display formatters', () => {
  it('formats kilometres with grouped digits', () => {
    expect(formatDistance(384_400)).toBe('384,400 km')
  })

  it('formats astronomical units and light-years at useful precision', () => {
    expect(formatDistance(63 * 149_597_870.7)).toBe('63 AU')
    expect(formatDistance(0.1 * 9_460_730_472_580.8)).toBe('0.1 ly')
  })

  it('formats apparent diameter as UI copy', () => {
    expect(formatAngularDiameter(20.618)).toBe('20.6° across your sky')
    expect(formatAngularDiameter(0.051)).toBe('3.1′ across your sky')
    expect(formatAngularDiameter(0.001)).toBe('3.6″ across your sky')
    expect(formatAngularDiameter(0.0000116)).toBe('42 mas across your sky')
  })
})
