import { describe, expect, it } from 'vitest'
import { ARRIVAL_APPROACH_SECONDS, arrivalFrames, pickArrival } from '../app/data/arrivals'
import { skyObjectsById } from '../app/data/objects'
import { viewpoints } from '../app/data/viewpoints'

describe('arrival frames', () => {
  it('only lands on real objects, presets and landscapes', () => {
    const viewpointIds = new Set(viewpoints.map((viewpoint) => viewpoint.id))
    expect(arrivalFrames.length).toBeGreaterThanOrEqual(4)
    for (const frame of arrivalFrames) {
      const object = skyObjectsById[frame.objectId]
      expect(object).toBeDefined()
      const preset = object.presets.find((candidate) => candidate.id === frame.presetId)
      expect(preset).toBeDefined()
      // The approach runs from the real distance, so landing there shows nothing.
      expect(frame.presetId).not.toBe('real')
      expect(preset?.hazardCopy).toBeUndefined()
      expect(viewpointIds.has(frame.viewpointId)).toBe(true)
    }
  })

  it('picks every frame and clamps a bad random source', () => {
    expect(pickArrival(() => 0)).toEqual(arrivalFrames[0])
    expect(pickArrival(() => 0.999)).toEqual(arrivalFrames.at(-1))
    expect(pickArrival(() => 1)).toEqual(arrivalFrames.at(-1))
    expect(pickArrival(() => -1)).toEqual(arrivalFrames[0])
    expect(ARRIVAL_APPROACH_SECONDS).toBeGreaterThan(2)
  })
})
