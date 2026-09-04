import type { EncounterDefinition } from '../../app/types/editorial'

export type EncounterStatus = 'idle' | 'invited' | 'active' | 'complete'

export interface EncounterSnapshot {
  encounter: EncounterDefinition | null
  beatIndex: number
  status: EncounterStatus
}

export class EncounterDirector {
  private state: EncounterSnapshot = { encounter: null, beatIndex: 0, status: 'idle' }

  get snapshot(): EncounterSnapshot {
    return { ...this.state }
  }

  invite(encounter: EncounterDefinition): EncounterSnapshot {
    this.state = { encounter, beatIndex: 0, status: 'invited' }
    return this.snapshot
  }

  start(): EncounterSnapshot {
    if (!this.state.encounter) return this.snapshot
    this.state = { ...this.state, beatIndex: 0, status: 'active' }
    return this.snapshot
  }

  next(): EncounterSnapshot {
    const encounter = this.state.encounter
    if (!encounter || this.state.status !== 'active') return this.snapshot
    if (this.state.beatIndex >= encounter.beats.length - 1) {
      this.state = { ...this.state, status: 'complete' }
    } else {
      this.state = { ...this.state, beatIndex: this.state.beatIndex + 1, status: 'active' }
    }
    return this.snapshot
  }

  previous(): EncounterSnapshot {
    if (!this.state.encounter || this.state.status === 'idle') return this.snapshot
    this.state = {
      ...this.state,
      beatIndex: Math.max(0, this.state.beatIndex - 1),
      status: 'active',
    }
    return this.snapshot
  }

  replay(): EncounterSnapshot {
    return this.start()
  }

  exit(): EncounterSnapshot {
    this.state = { encounter: null, beatIndex: 0, status: 'idle' }
    return this.snapshot
  }
}
