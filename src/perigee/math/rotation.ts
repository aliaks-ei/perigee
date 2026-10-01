import { Quaternion, Vector3 } from 'three'

export interface RotationModel {
  periodSeconds: number | null
  direction: 'prograde' | 'retrograde'
  initialPhaseRadians: number
}
const TAU = 2 * Math.PI
const NORTH = new Vector3(0, 1, 0)

/** Right handed +Y pole, positive rotation viewed counterclockwise from north. */
export function rotationPhase(model: RotationModel, simulatedSeconds: number): number {
  if (!Number.isFinite(simulatedSeconds) || !Number.isFinite(model.initialPhaseRadians)) throw new Error('INVALID_ROTATION_TIME')
  if (model.periodSeconds !== null && (!Number.isFinite(model.periodSeconds) || model.periodSeconds <= 0)) throw new Error('INVALID_ROTATION_PERIOD')
  const turns = model.periodSeconds === null ? 0 : simulatedSeconds / model.periodSeconds
  const angle = model.initialPhaseRadians + (model.direction === 'prograde' ? 1 : -1) * TAU * (turns % 1)
  return ((angle % TAU) + TAU) % TAU
}

export function rotationQuaternion(model: RotationModel, simulatedSeconds: number, target = new Quaternion()): Quaternion {
  return target.setFromAxisAngle(NORTH, rotationPhase(model, simulatedSeconds))
}
