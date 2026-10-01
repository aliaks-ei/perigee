import { PerigeeScene } from '../../src/perigee/PerigeeScene'
import { skyObjects } from '../../app/data/objects'
import type { SkyObjectId, QualityTier } from '../../app/types/perigee'

const parameters = new URLSearchParams(location.search)
const baseline = parameters.get('baseline') === 'true'
const preMars = parameters.get('snapshot') === 'pre-mars'
const h7Baseline = parameters.get('h7Baseline') === 'true'
// Baseline is an ignored local archive, never part of the application bundle.
const baselineModule = h7Baseline ? '/tmp/hybrid-h7-h8/source/src/perigee/PerigeeScene.ts'
  : preMars ? '/tmp/hybrid-h4-mars/starting-source/src/perigee/PerigeeScene.ts'
  : '/tmp/hybrid-h0/source/src/perigee/PerigeeScene.ts'
const Engine = baseline || preMars || h7Baseline
  ? (await import(/* @vite-ignore */ baselineModule)).PerigeeScene
  : PerigeeScene
const engine: PerigeeScene = new Engine(parameters.get('renderer') === 'production' ? {} : {
  sun: parameters.get('renderer') === 'differential' ? 'globe-differential'
    : parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  solarDays: Number(parameters.get('solarDays') ?? 0),
  solarEvolutionDays: Number(parameters.get('solarEvolutionDays') ?? 0),
  moon: parameters.get('renderer') === 'globe' || parameters.get('renderer') === 'motion' ? 'globe-pilot' : 'portrait',
  jupiter: parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  saturn: parameters.get('renderer') === 'motion' ? 'globe-motion'
    : parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  mars: parameters.get('renderer') === 'motion' ? 'globe-motion'
    : parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  neptune: parameters.get('renderer') === 'motion' ? 'globe-motion'
    : parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  betelgeuse: parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  sirius: parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  rigel: parameters.get('renderer') === 'globe' ? 'globe-pilot' : 'portrait',
  longitudeDegrees: Number(parameters.get('longitude') ?? 0),
})
const canvas = document.querySelector('canvas')!
const objectId = (parameters.get('object') ?? 'jupiter') as SkyObjectId
const definition = skyObjects.find((object) => object.id === objectId)!
await engine.initialize(canvas, { selection: {
  objectId, presetId: parameters.get('distance') ?? definition.presets[0]!.id, viewpointId: 'rooftop',
} })
engine.setQuality((parameters.get('quality') ?? 'high') as QualityTier)
engine.resize(innerWidth, innerHeight, 1)
const reviewSky = engine as unknown as { sky: { ready(): boolean } }
await new Promise<void>((resolve) => {
  const ready = () => {
    if (reviewSky.sky.ready()) requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    else requestAnimationFrame(ready)
  }
  ready()
})
const pole = parameters.get('pole')
const reviewEngine = engine as unknown as { celestial?: { pole: { rotation: { x: number } } | null }, invalidate(): void }
if ((pole === 'north' || pole === 'south') && reviewEngine.celestial?.pole) {
  reviewEngine.celestial.pole.rotation.x = pole === 'north' ? 1.25 : -1.25
  reviewEngine.invalidate()
}
// Match the product's PerigeeShell visibility lifecycle in the standalone review.
document.addEventListener('visibilitychange', () => document.hidden ? engine.pause() : engine.resume())
const api = {
  engine,
  objects: skyObjects,
  capture() { return engine.captureFrame()!.toDataURL('image/png') },
  async export() {
    const blob = await engine.exportStill({ longEdge: 3840 })
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  },
}
Object.assign(window, { hybridReview: api })
if (parameters.get('controls') === '1') {
  const controls = document.createElement('div')
  controls.style.cssText = 'position:fixed;top:12px;left:12px;z-index:10;display:flex;gap:8px'
  const exportButtons: HTMLButtonElement[] = []
  const live = document.createElement('button')
  live.textContent = 'Save live PNG'
  live.onclick = () => {
    const anchor = document.createElement('a')
    anchor.href = api.capture()
    anchor.download = `${objectId}-final-${parameters.get('renderer')}-${innerWidth}x${innerHeight}`
      + `-${parameters.get('longitude') ?? '0'}-${parameters.get('quality') ?? 'high'}`
      + `-${parameters.get('distance') ?? definition.presets[0]!.id}-${pole ?? 'equator'}.png`
    anchor.click()
  }
  controls.append(live)
  for (const longEdge of [3840, 7680] as const) {
    const button = document.createElement('button')
    button.textContent = `Save ${longEdge === 3840 ? '4K' : '8K'} PNG`
    button.onclick = async () => {
      exportButtons.forEach(item => { item.disabled = true })
      try {
        const blob = await engine.exportStill({ longEdge })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${objectId}-${parameters.get('renderer')}-${longEdge}.png`
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 30_000)
      } finally { exportButtons.forEach(item => { item.disabled = false }) }
    }
    exportButtons.push(button)
    controls.append(button)
  }
  document.body.append(controls)
}
document.body.dataset.ready = 'true'
const diagnostics = engine.getDiagnostics()
const screen = engine.getObjectScreenPosition()
document.body.dataset.renderer = diagnostics.renderer
document.body.dataset.diameter = String(screen?.diameterPixels ?? 0)
document.body.dataset.center = `${screen?.x ?? 0},${screen?.y ?? 0}`
document.body.dataset.simulatedSeconds = String(diagnostics.motion.simulatedSeconds)
