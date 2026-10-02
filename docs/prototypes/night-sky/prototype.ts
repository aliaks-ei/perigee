import './style.css'
import { WebGLRenderer, PerspectiveCamera, ShaderMaterial, Mesh, Vector2, Vector3, HalfFloatType } from 'three'
import { EffectComposer, RenderPass, EffectPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing'
import { createSkyScene } from './baselineSkyScene'
import { CameraRig } from '../../../src/perigee/CameraRig'
import type { ViewpointId } from '../../../app/types/perigee'

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T
const canvas = element<HTMLCanvasElement>('sky')
const stage = element('stage')
const status = element('status')
const replay = element<HTMLButtonElement>('replay')
const reducedPreference = matchMedia('(prefers-reduced-motion: reduce)')
let reduced = reducedPreference.matches
let paused = reduced
let comparing = false
let study = 1
let sceneTime = 0
let lastFrame = performance.now()
let nextMeteor = 30 + Math.random() * 30
let ready = false
let event: { start: number, duration: number, from: Vector3, to: Vector3, tail: number, width: number, bright: number } | null = null
let randomSeed = 42619
const random = (): number => { randomSeed = (1664525 * randomSeed + 1013904223) >>> 0; return randomSeed / 4294967296 }
const camera = new PerspectiveCamera(48, 1, .1, 2000)
const descriptions = [
  { name: 'Current implementation', text: 'The existing light profile, twinkle and meteor shader.', behavior: 'Current: fixed 0.65px Gaussian. Meteor 1.15–1.65s; same short tail at ignition. Screen-space motion.' },
  { name: 'The naked eye', text: 'Fine pinpoints. Uneven, quiet twinkle. A brief silver streak.', behavior: 'Study: concentrated core and faint optical wings; horizon-weighted irregular twinkle. Meteor 0.45–0.85s, variable angle, growing tail, no lingering train.' },
  { name: 'Through a night lens', text: 'A little light around the brightest stars. A luminous, tapering trail.', behavior: 'Study: broader optical wings around brighter catalogue sources. Meteor 0.7–1.2s, white core and warm burnout. Photographic display treatment, not naked-eye calibration.' },
  { name: 'A rare fireball', text: 'A quick flare, then a delicate train that slowly leaves the sky.', behavior: 'Study: ordinary star field, one stronger ablation flare; stationary train fades over 2.2s. Every manually triggered event is a fireball for review; a shipping version should make this rare.' },
]

try {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false })
  renderer.autoClear = false
  const sky = createSkyScene('high', true)
  sky.setTarget('saturn', new Vector3(86, 118, -500))
  const rig = new CameraRig(canvas, camera, .055, false)
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType })
  composer.addPass(new RenderPass(sky.scene, camera))
  composer.addPass(new EffectPass(camera, new VignetteEffect({ darkness: .38, offset: .26 }), new ToneMappingEffect({ mode: ToneMappingMode.AGX })))

  const points = sky.stars.material as ShaderMaterial
  // The existing geometry, photometry, horizon and target suppression remain.
  // Only the prototype optical kernel and scintillation gain are replaced.
  points.uniforms.uStudy = { value: study }
  points.vertexShader = points.vertexShader.replace('void main() {', 'uniform float uStudy; varying float vExtent; void main() {')
    .replace('gl_PointSize = 5.20000000 * uPixelRatio;', `
      vExtent = uStudy < .5 ? 2.6 : mix(3.0, 7.0, 1.0-smoothstep(0.0,4.0,aMagnitude));
      gl_PointSize = 2.0*vExtent*uPixelRatio;
      if (uStudy > .5) vTwinkle = 1.0+(vTwinkle-1.0)*(uStudy < 1.5 ? 1.55 : 1.25);
    `)
  points.fragmentShader = points.fragmentShader.replace('void main() {', 'uniform float uStudy; varying float vExtent; void main() {')
    .replace('gl_FragColor = vec4(vColor*skyTransmission(vAltitude,uExtinction)*vTwinkle*profile, visible);', `
      if (uStudy > .5) {
        vec2 p = point*vExtent;
        float bright = 1.0-smoothstep(0.0,4.0,vMagnitude);
        float sigma = mix(.46,.66,bright);
        float wingScale = uStudy > 1.5 && uStudy < 2.5 ? 1.85 : 1.35;
        float wingWeight = uStudy > 1.5 && uStudy < 2.5 ? .22*bright : .09*bright;
        float gaussian = exp(-dot(p,p)/(2.0*sigma*sigma))/(6.2831853*sigma*sigma);
        float wing = 1.5/(3.14159265*wingScale*wingScale)*pow(1.0+dot(p,p)/(wingScale*wingScale),-2.5);
        profile = mix(gaussian,wing,wingWeight);
      }
      gl_FragColor = vec4(vColor*skyTransmission(vAltitude,uExtinction)*vTwinkle*profile, visible);
    `)
  points.needsUpdate = true

  const meteor = sky.scene.children.find((child) => child.renderOrder === -70) as Mesh
  const originalMeteor = meteor.material as ShaderMaterial
  const upgradedMeteor = originalMeteor.clone()
  upgradedMeteor.uniforms.uAge = { value: 0 }
  upgradedMeteor.uniforms.uDuration = { value: .7 }
  upgradedMeteor.uniforms.uTrain = { value: 0 }
  upgradedMeteor.uniforms.uStart = { value: new Vector2() }
  upgradedMeteor.uniforms.uDirection = { value: new Vector2() }
  upgradedMeteor.fragmentShader = `
    uniform float uAspect, uProgress, uTailLength, uTrailWidth, uBrightness, uAge, uDuration, uTrain;
    uniform vec2 uStart, uDirection;
    varying vec2 vUv;
    float gaussian(float d, float width) { return exp(-d*d/(width*width)); }
    void main() {
      vec2 travel = vec2(uDirection.x*uAspect,uDirection.y);
      float total = max(length(travel),.00001);
      vec2 axis = travel/total;
      vec2 p = vec2((vUv.x-uStart.x)*uAspect,vUv.y-uStart.y);
      float along = dot(p,axis);
      float across = dot(p,vec2(-axis.y,axis.x));
      float headAt = clamp(uProgress,0.0,1.0)*total;
      float behind = headAt-along;
      float tailLength = max(.00001,min(uTailLength,headAt));
      float taper = clamp(behind/tailLength,0.0,1.0);
      float width = uTrailWidth*mix(1.0,.18,taper);
      float trail = gaussian(across,width)*(1.0-smoothstep(0.0,tailLength,behind))
        *step(0.0,behind)*step(behind,tailLength)*step(0.0,along);
      float head = gaussian(length(vec2(along-headAt,across)),uTrailWidth*2.0);
      float ignite = smoothstep(0.0,.065,uProgress);
      float burn = 1.0-smoothstep(.64,1.0,uProgress);
      float flare = 1.0+uTrain*.65*exp(-pow((uProgress-.66)/.09,2.0));
      float life = ignite*burn*flare*(.96+.04*sin(uProgress*71.0));
      if (uAge >= uDuration) life = 0.0;
      vec3 color = mix(vec3(.86,.93,1.0),vec3(1.0,.86,.65),smoothstep(.65,1.0,uProgress));
      color = mix(color,vec3(1.0,.99,.95),head);
      float radiance = (trail*.62+head*1.35)*life;
      // Each segment ages from the instant the meteor passed it. The train
      // stays on the path after the luminous head has gone.
      float segmentAge = uAge-clamp(along/total,0.0,1.0)*uDuration;
      float wind = sin(along*55.0+segmentAge*.5)*.0006*max(segmentAge,0.0);
      float train = gaussian(across-wind,uTrailWidth*(2.0+max(segmentAge,0.0)*2.0))
        *step(0.0,segmentAge)*step(0.0,along)*step(along,total)
        *smoothstep(0.0,.04,along)*smoothstep(0.0,.04,total-along)
        *(1.0-smoothstep(.04,2.2,segmentAge))*uTrain*.045;
      gl_FragColor = vec4(color*radiance*uBrightness+vec3(.8,.92,1.0)*train*uBrightness,1.0);
    }
  `
  upgradedMeteor.needsUpdate = true

  const backdrop = sky.scene.children.find((child) => child.renderOrder === -100) as Mesh
  const environment = backdrop.material as ShaderMaterial
  environment.uniforms.uIsolate = { value: 1 }
  // Existing plates contain illustrated stars. A deliberately disclosed
  // low-frequency filter lets us judge the catalogue shader independently.
  environment.fragmentShader = environment.fragmentShader
    .replace('void main() {', `
      uniform float uIsolate;
      vec3 softenSky(sampler2D tex, vec2 uv) {
        vec3 sum = vec3(0.0);
        for (int x=-2; x<=2; x++) for (int y=-2; y<=2; y++) {
          sum += texture2D(tex,uv+vec2(float(x),float(y))*.008).rgb;
        }
        return sum/25.0;
      }
      void main() {
    `)
    .replace('gl_FragColor = vec4(color, 1.0);', `
      vec3 softened = softenSky(uCurrent,currentUv);
      if (uMix > 0.0) softened = mix(softened,softenSky(uNext,environmentUv(vUv,uNextImageAspect)),smoothstep(0.0,1.0,uMix));
      // Leave the photographed hills and horizon untouched. This filter is
      // intentionally restricted to upper sky, not a geographic alpha matte.
      color = mix(color,softened,uIsolate*smoothstep(.24,.4,vUv.y));
      gl_FragColor = vec4(color, 1.0);
    `)
  environment.needsUpdate = true

  function resize(): void {
    const width = stage.clientWidth, height = stage.clientHeight
    const ratio = Math.min(devicePixelRatio, 2, Math.sqrt(5_000_000/(width*height)))
    renderer.setPixelRatio(ratio)
    renderer.setSize(width,height,false)
    composer.setSize(width,height)
    camera.aspect = width/height
    camera.updateProjectionMatrix()
    sky.setPixelRatio(ratio)
    sky.setView(rig.view.yaw,rig.view.pitch,camera.fov,camera.aspect)
  }
  new ResizeObserver(resize).observe(stage)

  function sync(): void {
    const mode = comparing ? 0 : study
    points.uniforms.uStudy!.value = mode
    environment.uniforms.uIsolate!.value = !comparing && element<HTMLInputElement>('isolate').checked ? 1 : 0
    meteor.material = mode === 0 ? originalMeteor : upgradedMeteor
    element('name').textContent = descriptions[mode]!.name
    element('description').textContent = descriptions[mode]!.text
    element('behavior').textContent = descriptions[mode]!.behavior
    element('baseline').setAttribute('aria-pressed',String(comparing))
    element('baseline').textContent = comparing ? 'Return to study' : 'Compare current'
    element('pause').setAttribute('aria-pressed',String(paused))
    element('pause').textContent = paused ? 'Resume' : 'Pause'
    replay.textContent = ready ? (reduced || paused ? 'Show meteor frame' : 'Replay meteor') : 'Loading sky…'
  }

  function startEvent(repeat = false): void {
    if (!ready) return
    if (repeat) randomSeed = 42619
    const mode = comparing ? 0 : study
    const fromLeft = random() > .5
    const startX = fromLeft ? .14+random()*.18 : .72+random()*.14
    const startY = .65+random()*.2
    const dx = (fromLeft ? 1 : -1)*(.14+random()*.16)
    const dy = -(.06+random()*.13)
    camera.updateMatrixWorld()
    const unproject = (x: number,y: number): Vector3 => new Vector3(x*2-1,y*2-1,.5).unproject(camera).normalize().multiplyScalar(750)
    const duration = mode === 0 ? 1.15+random()*.5 : mode === 1 ? .45+random()*.4 : .7+random()*.5
    event = { start: sceneTime, duration, from: unproject(startX,startY), to: unproject(startX+dx,startY+dy), tail: .04+random()*.035, width: mode === 3 ? 1.15 : mode === 2 ? .8 : .5, bright: mode === 3 ? 3.8 : mode === 2 ? 2.6 : 2.0 }
    if (paused || reduced) event.start -= duration*.52
    originalMeteor.uniforms.uStart!.value.set(startX,startY)
    originalMeteor.uniforms.uDirection!.value.set(fromLeft ? .12 : -.12,-.065)
    originalMeteor.uniforms.uTailLength!.value = .065
    originalMeteor.uniforms.uTrailWidth!.value = .00078
    originalMeteor.uniforms.uBrightness!.value = .85
    nextMeteor = sceneTime+duration+30+random()*30
    status.textContent = paused || reduced ? 'Static meteor frame · motion is paused' : 'Review event · natural cadence is 30–60 seconds'
  }

  document.querySelectorAll<HTMLButtonElement>('[data-study]').forEach((button) => {
    button.addEventListener('click',() => {
      study = Number(button.dataset.study)
      comparing = false
      document.querySelectorAll('[data-study]').forEach((other) => other.setAttribute('aria-pressed',String(other === button)))
      sync()
      startEvent(true)
    })
  })
  element('baseline').addEventListener('click',() => { comparing = !comparing; sync(); startEvent(true) })
  replay.addEventListener('click',() => startEvent(true))
  element('pause').addEventListener('click',() => { paused = !paused; if (!paused) reduced = false; sync(); status.textContent = paused ? 'Motion paused · replay shows a static meteor frame' : 'Motion resumed' })
  element('isolate').addEventListener('change',sync)
  element<HTMLSelectElement>('landscape').addEventListener('change',async (e) => {
    const select = e.target as HTMLSelectElement
    select.disabled = true
    event = null
    status.textContent = 'Changing landscape…'
    try { await sky.setViewpoint(select.value as ViewpointId,true); status.textContent = 'Same stars, different atmospheric visibility' }
    catch { status.textContent = 'Landscape could not load. Try another landscape.' }
    finally { select.disabled = false }
  })
  element('layout').addEventListener('click',() => {
    document.body.classList.toggle('phone')
    const phone = document.body.classList.contains('phone')
    element('layout').setAttribute('aria-pressed',String(phone))
    element('layout').textContent = phone ? 'Desktop frame' : 'Phone frame'
    resize()
  })
  reducedPreference.addEventListener('change',() => { reduced = reducedPreference.matches; paused = reduced; event = null; sync() })
  document.addEventListener('visibilitychange',() => { lastFrame = performance.now() })
  window.addEventListener('pagehide',() => { rig.dispose(); sky.dispose(); upgradedMeteor.dispose(); composer.dispose(); renderer.dispose() }, {once:true})

  const fromProjected = new Vector3(), toProjected = new Vector3()
  const draw = (now: number): void => {
    requestAnimationFrame(draw)
    const dt = Math.min((now-lastFrame)/1000,.05)
    lastFrame = now
    if (document.hidden) return
    if (!paused) sceneTime += dt
    rig.update(dt)
    sky.setView(rig.view.yaw,rig.view.pitch,camera.fov,camera.aspect)
    sky.update(0) // Scheduler disabled; preview owns event/replay time.
    points.uniforms.uTime!.value = sceneTime
    if (!ready && sky.ready()) {
      ready = sky.stars.geometry.getAttribute('position').count > 0
      if (ready) { replay.disabled = false; status.textContent = reduced ? 'Reduced motion · use Show meteor frame to inspect' : 'Ready · replay a meteor, or let the sky settle'; sync() }
      else { status.textContent = 'Catalogue could not load. Reload to try again.' }
    }
    if (ready && !paused && element<HTMLInputElement>('automatic').checked && sceneTime > nextMeteor) startEvent()
    if (event) {
      const age = sceneTime-event.start
      const mode = comparing ? 0 : study
      const material = meteor.material as ShaderMaterial
      const trainDuration = mode === 3 ? 2.2 : 0
      meteor.visible = age <= event.duration+trainDuration
      if (mode !== 0) {
        camera.updateMatrixWorld()
        fromProjected.copy(event.from).project(camera)
        toProjected.copy(event.to).project(camera)
        material.uniforms.uStart!.value.set((fromProjected.x+1)/2,(fromProjected.y+1)/2)
        material.uniforms.uDirection!.value.set((toProjected.x-fromProjected.x)/2,(toProjected.y-fromProjected.y)/2)
        material.uniforms.uAge!.value = age
        material.uniforms.uDuration!.value = event.duration
        material.uniforms.uTrain!.value = mode === 3 ? 1 : 0
        material.uniforms.uTailLength!.value = event.tail
        material.uniforms.uTrailWidth!.value = event.width/stage.clientHeight
        material.uniforms.uBrightness!.value = event.bright
      }
      material.uniforms.uAspect!.value = camera.aspect
      material.uniforms.uProgress!.value = Math.min(age/event.duration,1)
      if (age > event.duration+trainDuration) { event = null; status.textContent = 'Quiet sky · replay whenever you like' }
    }
    composer.render(dt)
  }
  await sky.setViewpoint('hilltop',true)
  resize()
  sync()
  requestAnimationFrame(draw)
} catch (error) {
  const failure = element('failure')
  failure.hidden = false
  failure.textContent = `The preview could not start. It needs WebGL 2 and the local sky assets. ${error instanceof Error ? error.message : ''}`
}
