import { describe, expect, it } from 'vitest'
import { encounters } from '../app/data/editorial'
import { EncounterDirector } from '../src/perigee/EncounterDirector'

describe('EncounterDirector', () => {
  it('moves from invitation through completion without wrapping', () => {
    const director = new EncounterDirector()
    const encounter = encounters[0]!
    expect(director.invite(encounter).status).toBe('invited')
    expect(director.start().beatIndex).toBe(0)
    for (let index = 1; index < encounter.beats.length; index += 1) director.next()
    expect(director.next().status).toBe('complete')
    expect(director.snapshot.beatIndex).toBe(encounter.beats.length - 1)
  })

  it('supports pause, resume, previous, replay, and exit', () => {
    const director = new EncounterDirector()
    director.invite(encounters[1]!)
    director.start()
    director.next()
    expect(director.pause().status).toBe('paused')
    expect(director.resume().status).toBe('active')
    expect(director.previous().beatIndex).toBe(0)
    director.next()
    expect(director.replay().beatIndex).toBe(0)
    expect(director.exit()).toEqual({ encounter: null, beatIndex: 0, status: 'idle' })
  })
})
