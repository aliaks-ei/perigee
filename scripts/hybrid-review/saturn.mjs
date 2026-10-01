// Review-only evidence. Uses existing Playwright; adds no runtime dependency.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h5/${process.env.PERIGEE_REVIEW_PASS ?? 'pass1'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = [], records = []
const assert = (ok, message) => { if (!ok) throw new Error(message) }
async function ready(page) {
  await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90000 })
  await page.waitForFunction(() => window.hybridReview.engine.sky.ready(), undefined, { timeout: 30000 })
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
async function save(page, name, full = false) {
  const data = await page.evaluate(full => full ? window.hybridReview.export() : window.hybridReview.capture(), full)
  await writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
  console.log('saved', name)
}
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }).filter(([layout]) => !process.env.PERIGEE_LAYOUT || process.env.PERIGEE_LAYOUT === layout)) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    const base = 'http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=saturn'
    for (const renderer of ['portrait', 'globe']) {
      for (const longitude of renderer === 'globe' ? [0, 90, 180, 270] : [0]) {
        await page.goto(`${base}&renderer=${renderer}&longitude=${longitude}`)
        await ready(page)
        await save(page, `${layout}-${renderer}-${longitude}`)
        if (longitude !== 0) continue
        records.push({ layout, renderer, diagnostics: await page.evaluate(() => window.hybridReview.engine.getDiagnostics()) })
        await save(page, `${layout}-${renderer}-4k`, true)
        for (const tier of ['balanced', 'safe']) {
          await page.evaluate(tier => window.hybridReview.engine.setQuality(tier), tier)
          await ready(page)
          await save(page, `${layout}-${renderer}-${tier}`)
        }
        await page.evaluate(() => window.hybridReview.engine.setQuality('high'))
        await page.evaluate(() => window.hybridReview.engine.setDistance('real', { duration: 0 }))
        await ready(page)
        await save(page, `${layout}-${renderer}-real`)
      }
    }
    await page.goto(`${base}&renderer=motion`)
    await ready(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const motion = await page.evaluate(async () => {
      const engine = window.hybridReview.engine
      const state = () => ({ motion: engine.getDiagnostics().motion, spin: engine.celestial.spin.quaternion.toArray(),
        rings: engine.hero.getObjectByName('equatorial-rings').matrixWorld.toArray(), sun: engine.sunWorld.toArray() })
      const start = state()
      await new Promise(resolve => setTimeout(resolve, 1100))
      const end = state()
      engine.setRotation(true, 'cinematic')
      const paused = state()
      await new Promise(resolve => setTimeout(resolve, 300))
      const pauseEnd = state()
      engine.setRotation(false, 'real')
      const real = state()
      await new Promise(resolve => setTimeout(resolve, 600))
      const realEnd = state()
      engine.pause()
      const hidden = state()
      await new Promise(resolve => setTimeout(resolve, 300))
      engine.resume()
      return { start, end, paused, pauseEnd, real, realEnd, hidden, resumed: state() }
    })
    assert(motion.end.motion.simulatedSeconds - motion.start.motion.simulatedSeconds > 100, 'spin failed')
    assert(JSON.stringify(motion.start.rings) === JSON.stringify(motion.end.rings), 'ring plane moved')
    assert(JSON.stringify(motion.start.sun) === JSON.stringify(motion.end.sun), 'Sun moved')
    assert(motion.paused.motion.simulatedSeconds === motion.pauseEnd.motion.simulatedSeconds, 'pause failed')
    assert(motion.realEnd.motion.simulatedSeconds - motion.real.motion.simulatedSeconds < 1, 'real rate failed')
    assert(motion.resumed.motion.simulatedSeconds - motion.hidden.motion.simulatedSeconds < .1, 'hidden catch-up')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForTimeout(200)
    const capture = await page.evaluate(async () => {
      const engine = window.hybridReview.engine
      const times = []
      const prepare = engine.celestial.prepareExport
      engine.celestial.prepareExport = snapshot => { times.push(snapshot.simulatedSeconds); prepare(snapshot) }
      const before = engine.getDiagnostics().motion
      try {
        const data = await window.hybridReview.export()
        const controller = new AbortController()
        let cancelled = false
        try { await engine.exportStill({ longEdge: 3840, signal: controller.signal, onProgress: () => controller.abort() }) }
        catch (error) { cancelled = error.name === 'AbortError' }
        return { data, before, after: engine.getDiagnostics().motion, count: times.length, unique: [...new Set(times)], cancelled, exporting: engine.getDiagnostics().exporting }
      } finally { engine.celestial.prepareExport = prepare }
    })
    await writeFile(`${output}/${layout}-frozen-4k.png`, Buffer.from(capture.data.split(',')[1], 'base64'))
    delete capture.data
    assert(capture.unique.length === 1 && capture.count > 4 && capture.cancelled && !capture.exporting, 'frozen export/cancel failed')
    assert(JSON.stringify(capture.before) === JSON.stringify(capture.after), 'capture caught up')
    // Actual transition order at partial opacity, then rapid cancelled selections.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.evaluate(() => {
      window.hybridReview.engine.setRotation(true, 'cinematic')
      window.hybridReview.engine.celestial.setOpacity(.45)
    })
    await save(page, `${layout}-fade`)
    await page.evaluate(async () => {
      const engine = window.hybridReview.engine
      engine.celestial.setOpacity(1)
      for (let i = 0; i < 3; i++) await Promise.allSettled([
        engine.setObject('saturn', 'moon-swap'), engine.setObject('moon', 'moon-swap'), engine.setObject('jupiter', 'moon-swap'), engine.setObject('saturn', 'moon-swap'),
      ])
    })
    await ready(page)
    await page.waitForTimeout(1600)
    await save(page, `${layout}-returned`)
    const transitions = await page.evaluate(() => ({ current: window.hybridReview.engine.currentObjectId,
      outgoing: window.hybridReview.engine.outgoing.size, diagnostics: window.hybridReview.engine.getDiagnostics() }))
    assert(transitions.current === 'saturn' && transitions.outgoing === 0, 'transition retirement failed')
    const hardware = await page.evaluate(() => {
      const gl = window.hybridReview.engine.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info')
      return { userAgent: navigator.userAgent, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown' }
    })
    records.push({ layout, motion, capture, transitions, hardware })
    await page.close()
  }
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
console.log('Browser errors:', errors.length)
if (errors.length) process.exitCode = 1
