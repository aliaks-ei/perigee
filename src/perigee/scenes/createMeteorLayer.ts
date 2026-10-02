import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Mesh, PerspectiveCamera,
  ShaderMaterial, Vector3,
} from 'three'
import { FIREBALL_TRAIN_SECONDS, MeteorScheduler } from '../MeteorScheduler'

export interface MeteorLayer {
  mesh: Mesh<BufferGeometry, ShaderMaterial>
  setReducedMotion: (reduced: boolean) => void
  setPaused: (paused: boolean) => void
  setObserver: (camera: PerspectiveCamera, cssHeight: number) => void
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

/** One fixed sky ribbon, reused for short meteors and very occasional fireballs. */
export function createMeteorLayer(reducedMotion: boolean, random = seededRandom(420_911)): MeteorLayer {
  let clock = 0, lastTime = 0, paused = false
  let scheduler = new MeteorScheduler(random, !reducedMotion)
  let camera = new PerspectiveCamera(48, 16 / 9, .1, 2000)
  let cssHeight = 720
  const geometry = new BufferGeometry()
  const positions = new BufferAttribute(new Float32Array(12), 3)
  geometry.setAttribute('position', positions)
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2))
  geometry.setIndex([0, 1, 2, 2, 1, 3])
  const material = new ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 }, uAge: { value: 0 }, uDuration: { value: .65 },
      uFireball: { value: 0 }, uLength: { value: 1 }, uRibbonLength: { value: 1 },
      uPadding: { value: 0 }, uHalfWidth: { value: 1 }, uCoreWidth: { value: .05 },
      uTailLength: { value: .2 }, uBrightness: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress, uAge, uDuration, uFireball, uLength, uRibbonLength;
      uniform float uPadding, uHalfWidth, uCoreWidth, uTailLength, uBrightness;
      varying vec2 vUv;
      float gaussian(float distance, float width) { return exp(-distance*distance/(width*width)); }
      void main() {
        float along = vUv.x*uRibbonLength-uPadding;
        float across = (vUv.y-.5)*2.0*uHalfWidth;
        float headAt = uProgress*uLength;
        float behind = headAt-along;
        // No luminous tail ahead of the distance actually traversed.
        float tailLength = max(.00001,min(uTailLength,headAt));
        float taper = clamp(behind/tailLength,0.0,1.0);
        float width = max(uCoreWidth*mix(1.0,.18,taper),fwidth(across)*.35);
        float trail = gaussian(across,width)*(1.0-smoothstep(0.0,tailLength,behind))
          *step(0.0,behind)*step(behind,tailLength)*step(0.0,along);
        float head = gaussian(length(vec2(along-headAt,across)),max(uCoreWidth*2.0,fwidth(across)*.5));
        float ignition = smoothstep(0.0,.065,uProgress);
        float burnout = 1.0-smoothstep(.64,1.0,uProgress);
        float flare = 1.0+uFireball*.65*exp(-pow((uProgress-.66)/.09,2.0));
        float life = ignition*burnout*flare*(.96+.04*sin(uProgress*71.0));
        if (uAge >= uDuration) life = 0.0;
        vec3 color = mix(vec3(.86,.93,1.0),vec3(1.0,.86,.65),smoothstep(.65,1.0,uProgress));
        color = mix(color,vec3(1.0,.99,.95),head);
        float radiance = (trail*.62+head*1.35)*life;
        // Train segments age from their own passage time and stay on the
        // traversed sky path after the head disappears. Drift is illustrative.
        float age = uAge-clamp(along/uLength,0.0,1.0)*uDuration;
        float wind = sin(along/uLength*8.0+age*.5)*uCoreWidth*.6*max(age,0.0);
        float train = gaussian(across-wind,uCoreWidth*(2.0+max(age,0.0)*2.0))
          *step(0.0,age)*step(0.0,along)*step(along,uLength)
          *smoothstep(0.0,uLength*.08,along)*smoothstep(0.0,uLength*.08,uLength-along)
          *(1.0-smoothstep(.04,${FIREBALL_TRAIN_SECONDS.toFixed(1)},age))*uFireball*.045;
        gl_FragColor = vec4((color*radiance+vec3(.8,.92,1.0)*train)*uBrightness,1.0);
      }
    `,
    transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: true,
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = -70
  mesh.visible = false
  const from = new Vector3(), to = new Vector3(), axis = new Vector3(), side = new Vector3()
  const forward = new Vector3(), vertex = new Vector3()

  function place(fireball: boolean): void {
    camera.updateMatrixWorld()
    const left = random() > .5
    const x = left ? .12+random()*.2 : .68+random()*.2
    const y = .65+random()*.2
    const dx = (left ? 1 : -1)*(.14+random()*.14)
    const dy = -(.06+random()*.12)
    const distance = 750
    from.set(x*2-1,y*2-1,.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(distance).add(camera.position)
    to.set((x+dx)*2-1,(y+dy)*2-1,.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(distance).add(camera.position)
    axis.subVectors(to,from)
    const length = axis.length()
    axis.normalize()
    camera.getWorldDirection(forward)
    side.crossVectors(axis,forward).normalize()
    const worldPerCssPixel = 2*distance*Math.tan(camera.fov*Math.PI/360)/Math.max(cssHeight,1)
    const core = (fireball ? .95+random()*.25 : .4+random()*.25)*worldPerCssPixel
    const padding = core*12, halfWidth = core*12
    for (let index=0; index<4; index++) {
      vertex.copy(from).addScaledVector(axis,index%2 === 0 ? -padding : length+padding)
        .addScaledVector(side,index<2 ? -halfWidth : halfWidth)
      positions.setXYZ(index,vertex.x,vertex.y,vertex.z)
    }
    positions.needsUpdate = true
    material.uniforms.uLength!.value = length
    material.uniforms.uRibbonLength!.value = length+2*padding
    material.uniforms.uPadding!.value = padding
    material.uniforms.uHalfWidth!.value = halfWidth
    material.uniforms.uCoreWidth!.value = core
    material.uniforms.uTailLength!.value = length*(.2+random()*.18)
    material.uniforms.uBrightness!.value = fireball ? 3.2+random()*.6 : 1.35+random()*.65
  }

  return {
    mesh,
    setObserver(value,height) { camera = value; cssHeight = Math.max(height,1) },
    setPaused(value) { paused = value },
    setReducedMotion(reduced) {
      reducedMotion = reduced
      scheduler = new MeteorScheduler(random,!reduced,clock)
      mesh.visible = false
    },
    update(time) {
      const delta = Math.max(0,time-lastTime)
      lastTime = time
      if (paused) return
      clock += delta
      const state = scheduler.update(clock)
      if (state.started) place(state.fireball)
      mesh.visible = state.active && !reducedMotion
      material.uniforms.uProgress!.value = state.progress
      material.uniforms.uAge!.value = state.age
      material.uniforms.uDuration!.value = state.duration
      material.uniforms.uFireball!.value = state.fireball ? 1 : 0
    },
    dispose() { geometry.dispose(); material.dispose() },
  }
}
