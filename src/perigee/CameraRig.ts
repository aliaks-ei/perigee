import { Euler, MathUtils, PerspectiveCamera, Quaternion } from 'three'

export class CameraRig {
  private readonly canvas: HTMLCanvasElement
  private readonly camera: PerspectiveCamera
  private readonly ambientMotion: boolean
  /**
   * Standing tilt. Pitching slightly up drops the horizon into the lower third
   * so the ground reads as ground and the hero object gets the sky above it.
   */
  private readonly basePitch: number
  private yaw = 0
  private pitch = 0
  private manualYaw = 0
  private manualPitch = 0
  private hoverYaw = 0
  private hoverPitch = 0
  private pointerId: number | null = null
  private lastX = 0
  private lastY = 0
  private readonly euler = new Euler(0, 0, 0, 'YXZ')
  private readonly quaternion = new Quaternion()

  constructor(canvas: HTMLCanvasElement, camera: PerspectiveCamera, basePitch = 0, ambientMotion = true) {
    this.canvas = canvas
    this.camera = camera
    this.basePitch = basePitch
    this.ambientMotion = ambientMotion
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
  }

  get view(): Readonly<{ yaw: number, pitch: number }> {
    return { yaw: this.yaw, pitch: this.pitch }
  }

  update(deltaSeconds: number): void {
    const damping = 1 - Math.exp(-deltaSeconds * 8)
    this.yaw = MathUtils.lerp(this.yaw, this.manualYaw + this.hoverYaw, damping)
    this.pitch = MathUtils.lerp(this.pitch, this.manualPitch + this.hoverPitch, damping)
    this.euler.set(this.basePitch + this.pitch, this.yaw, 0)
    this.quaternion.setFromEuler(this.euler)
    this.camera.quaternion.copy(this.quaternion)
  }

  reset(): void {
    this.yaw = 0
    this.pitch = 0
    this.manualYaw = 0
    this.manualPitch = 0
    this.hoverYaw = 0
    this.hoverPitch = 0
    this.euler.set(this.basePitch, 0, 0)
    this.quaternion.setFromEuler(this.euler)
    this.camera.quaternion.copy(this.quaternion)
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
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
    if (this.ambientMotion && event.pointerType === 'mouse') {
      const rect = this.canvas.getBoundingClientRect()
      const normalizedX = MathUtils.clamp((event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1, -1, 1)
      const normalizedY = MathUtils.clamp((event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1, -1, 1)
      this.hoverYaw = normalizedX * 0.014
      this.hoverPitch = normalizedY * 0.009
    }
    if (event.pointerId !== this.pointerId) return
    const dx = event.clientX - this.lastX
    const dy = event.clientY - this.lastY
    this.lastX = event.clientX
    this.lastY = event.clientY
    this.manualYaw = MathUtils.clamp(this.manualYaw - dx * 0.00125, -0.1, 0.1)
    this.manualPitch = MathUtils.clamp(this.manualPitch - dy * 0.00105, -0.052, 0.062)
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return
    this.pointerId = null
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId)
    }
  }

  private readonly onPointerLeave = (): void => {
    if (this.pointerId !== null) return
    this.hoverYaw = 0
    this.hoverPitch = 0
  }
}
