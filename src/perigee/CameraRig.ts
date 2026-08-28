import { Euler, MathUtils, PerspectiveCamera, Quaternion } from 'three'

export class CameraRig {
  private readonly canvas: HTMLCanvasElement
  private readonly camera: PerspectiveCamera
  /**
   * Standing tilt. Pitching slightly up drops the horizon into the lower third
   * so the ground reads as ground and the hero object gets the sky above it.
   */
  private readonly basePitch: number
  private yaw = 0
  private pitch = 0
  private targetYaw = 0
  private targetPitch = 0
  private pointerId: number | null = null
  private lastX = 0
  private lastY = 0
  private readonly euler = new Euler(0, 0, 0, 'YXZ')
  private readonly quaternion = new Quaternion()

  constructor(canvas: HTMLCanvasElement, camera: PerspectiveCamera, basePitch = 0) {
    this.canvas = canvas
    this.camera = camera
    this.basePitch = basePitch
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
  }

  update(deltaSeconds: number): void {
    const damping = 1 - Math.exp(-deltaSeconds * 8)
    this.yaw = MathUtils.lerp(this.yaw, this.targetYaw, damping)
    this.pitch = MathUtils.lerp(this.pitch, this.targetPitch, damping)
    this.euler.set(this.basePitch + this.pitch, this.yaw, 0)
    this.quaternion.setFromEuler(this.euler)
    this.camera.quaternion.copy(this.quaternion)
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    this.pointerId = event.pointerId
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.canvas.setPointerCapture(event.pointerId)
    this.canvas.dataset.dragged = 'true'
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return
    const dx = event.clientX - this.lastX
    const dy = event.clientY - this.lastY
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.targetYaw = MathUtils.clamp(this.targetYaw - dx * 0.0022, -0.44, 0.44)
    this.targetPitch = MathUtils.clamp(this.targetPitch - dy * 0.0018, -0.12, 0.18)
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return
    this.pointerId = null
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId)
    }
  }
}
