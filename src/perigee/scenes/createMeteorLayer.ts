import {
  AdditiveBlending,
  Color,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
} from 'three'
import { MeteorScheduler } from '../MeteorScheduler'

export interface MeteorLayer {
  mesh: Mesh<PlaneGeometry, ShaderMaterial>
  setAspect: (aspect: number) => void
  update: (time: number) => void
  dispose: () => void
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

/** A single reusable screen-space streak; the scheduler guarantees quiet gaps. */
export function createMeteorLayer(reducedMotion: boolean): MeteorLayer {
  const random = seededRandom(420_911)
  const scheduler = new MeteorScheduler(random, !reducedMotion)
  const material = new ShaderMaterial({
    uniforms: {
      uAspect: { value: 1 },
      uStart: { value: new Vector2(0.2, 0.72) },
      uDirection: { value: new Vector2(0.2, -0.08) },
      uProgress: { value: 0 },
      uTailLength: { value: 0.12 },
      uTrailWidth: { value: 0.0008 },
      uBrightness: { value: 0.8 },
      uTint: { value: new Color('#e8f0ff') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.9999, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uAspect;
      uniform vec2 uStart;
      uniform vec2 uDirection;
      uniform float uProgress;
      uniform float uTailLength;
      uniform float uTrailWidth;
      uniform float uBrightness;
      uniform vec3 uTint;
      varying vec2 vUv;

      void main() {
        float progress = clamp(uProgress, 0.0, 1.0);
        // Atmospheric meteors cross the visible arc at nearly constant speed;
        // their apparent acceleration comes mainly from ignition and burnout.
        float travel = progress;
        vec2 headUv = uStart + uDirection * travel;
        vec2 relative = vec2((vUv.x - headUv.x) * uAspect, vUv.y - headUv.y);
        vec2 direction = normalize(vec2(uDirection.x * uAspect, uDirection.y));
        vec2 perpendicular = vec2(-direction.y, direction.x);
        float behind = -dot(relative, direction);
        float crossTrail = abs(dot(relative, perpendicular));
        float trailProgress = clamp(behind / uTailLength, 0.0, 1.0);
        float taperedWidth = mix(uTrailWidth, uTrailWidth * 0.34, trailProgress);
        float trail = exp(-pow(crossTrail / taperedWidth, 2.0))
          * (1.0 - smoothstep(0.0, uTailLength, behind))
          * step(0.0, behind);
        float head = exp(-pow(length(relative) / (uTrailWidth * 3.2), 2.0));
        float ignition = smoothstep(0.0, 0.055, progress);
        float burnout = 1.0 - smoothstep(0.58, 1.0, progress);
        float ablation = 0.965 + 0.035 * sin(progress * 47.0 + 1.8);
        float life = ignition * burnout * ablation;
        float alpha = (trail * 0.52 + head * 0.92) * life * uBrightness;
        vec3 color = mix(uTint, vec3(1.0, 0.985, 0.94), clamp(head, 0.0, 1.0));
        gl_FragColor = vec4(color * 1.55, alpha);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  })
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  // The environment is -100; every sky point and hero layer is 0 or above.
  // Drawing here, with depth testing, keeps the streak behind opaque bodies,
  // rings, galaxies, stellar points, and their compact glare.
  mesh.renderOrder = -50
  mesh.visible = false

  const placeNextMeteor = (): void => {
    const meteorTints = ['#e8f0ff', '#fff2dc', '#e4f7ec', '#edf2ff', '#fff7e8']
    const fromLeft = random() > 0.5
    const horizontal = 0.1 + random() * 0.045
    const vertical = -(0.035 + random() * 0.065)
    material.uniforms.uStart!.value.set(
      fromLeft ? 0.08 + random() * 0.16 : 0.82 + random() * 0.1,
      0.56 + random() * 0.28,
    )
    material.uniforms.uDirection!.value.set(
      fromLeft ? horizontal : -horizontal,
      vertical,
    )
    material.uniforms.uTailLength!.value = 0.05 + random() * 0.03
    material.uniforms.uTrailWidth!.value = 0.00068 + random() * 0.0002
    material.uniforms.uBrightness!.value = 0.72 + random() * 0.22
    const tint = meteorTints[Math.min(Math.floor(random() * meteorTints.length), meteorTints.length - 1)]!
    material.uniforms.uTint!.value.set(tint)
  }
  placeNextMeteor()
  let wasActive = false

  return {
    mesh,
    setAspect(aspect) {
      material.uniforms.uAspect!.value = Math.max(aspect, 0.1)
    },
    update(time) {
      const state = scheduler.update(time)
      // The next streak is placed during the quiet interval, so starting it
      // only reveals an already-positioned mark and begins its smooth motion.
      if (!state.active && wasActive) placeNextMeteor()
      mesh.visible = state.active
      material.uniforms.uProgress!.value = state.progress
      wasActive = state.active
    },
    dispose() {
      mesh.geometry.dispose()
      material.dispose()
    },
  }
}
