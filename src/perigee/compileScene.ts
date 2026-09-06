import type { Camera, Object3D, Scene, WebGLRenderer } from 'three'

/**
 * Three r185's compileAsync readiness loop, with cancellation and captured
 * program references. Its original loop re-reads disposed/replaced properties
 * after unmount or context restoration and has no cancellation hook.
 */
export function compileScene(renderer: WebGLRenderer, object: Object3D, camera: Camera, scene: Scene, signal: AbortSignal): Promise<void> {
  if (signal.aborted || renderer.getContext().isContextLost()) return Promise.reject(new Error('SHADER_COMPILE_CANCELLED'))
  const materials = renderer.compile(object, camera, scene)
  const programs = [...materials].map((material) => (renderer.properties.get(material) as { currentProgram: { isReady: () => boolean } }).currentProgram)
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = (): void => { clearTimeout(timer); signal.removeEventListener('abort', cancel) }
    const cancel = (): void => { cleanup(); reject(new Error('SHADER_COMPILE_CANCELLED')) }
    const poll = (): void => {
      if (signal.aborted || renderer.getContext().isContextLost()) { cancel(); return }
      try {
        if (programs.every((program) => program.isReady())) { cleanup(); resolve() }
        else timer = setTimeout(poll, 10)
      } catch (error) { cleanup(); reject(error) }
    }
    signal.addEventListener('abort', cancel, { once: true })
    // Without KHR_parallel_shader_compile, defer the driver's first readiness
    // check just as Three does. Never spin or busy-wait for a result.
    timer = setTimeout(poll, 10)
  })
}
