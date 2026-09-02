import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QualityManager } from '../src/perigee/QualityManager'

describe('QualityManager', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { deviceMemory: 8, hardwareConcurrency: 8 })
  })

  it('starts on the tier the device reports', () => {
    expect(new QualityManager().current).toBe('high')
  })

  it('uses balanced quality for mid-range devices', () => {
    vi.stubGlobal('navigator', { deviceMemory: 4, hardwareConcurrency: 4 })
    expect(new QualityManager().current).toBe('balanced')
  })

  it('uses safe quality for memory-constrained devices', () => {
    vi.stubGlobal('navigator', { deviceMemory: 2, hardwareConcurrency: 4 })
    expect(new QualityManager().current).toBe('safe')
  })
})
