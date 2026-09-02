import { describe, expect, it } from 'vitest'
import {
  DISCLOSURE_STAGES,
  STAGE_FALLBACK_MS,
  advanceStage,
  initialStage,
  nextStage,
  stageAtLeast,
  stageForAction,
} from '../app/utils/disclosureStages'

describe('disclosure stages', () => {
  it('orders the four stages from arrival to depth', () => {
    expect(DISCLOSURE_STAGES).toEqual(['arrive', 'orient', 'explore', 'deepen'])
    expect(stageAtLeast('explore', 'orient')).toBe(true)
    expect(stageAtLeast('orient', 'explore')).toBe(false)
    expect(stageAtLeast('deepen', 'deepen')).toBe(true)
  })

  it('only ever climbs', () => {
    expect(advanceStage('arrive', 'explore')).toBe('explore')
    expect(advanceStage('deepen', 'orient')).toBe('deepen')
    expect(nextStage('arrive')).toBe('orient')
    expect(nextStage('deepen')).toBeNull()
  })

  it('gives a passive viewer a fallback at every stage but the last', () => {
    for (const stage of DISCLOSURE_STAGES) {
      if (stage === 'deepen') continue
      expect(STAGE_FALLBACK_MS[stage]).toBeGreaterThan(0)
    }
    expect(STAGE_FALLBACK_MS.arrive).toBeLessThan(STAGE_FALLBACK_MS.orient)
  })

  it('skips orientation for a shared view or a curated encounter', () => {
    expect(initialStage({ sharedView: false, encounter: false })).toBe('arrive')
    expect(initialStage({ sharedView: true, encounter: false })).toBe('explore')
    expect(initialStage({ sharedView: false, encounter: true })).toBe('explore')
  })

  it('maps viewer actions onto the ladder', () => {
    expect(stageForAction('look', 0)).toBe('orient')
    expect(stageForAction('change', 1)).toBe('explore')
    expect(stageForAction('change', 2)).toBe('deepen')
    expect(stageForAction('encounter', 0)).toBe('deepen')
  })
})
