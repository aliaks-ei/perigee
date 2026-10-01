// Bounded pole/seam/streaming inspection and approved-body regressions.
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-mars/${process.env.PERIGEE_REVIEW_PASS ?? 'final'}`
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const records = [], errors = []
const save = (name, data) => writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    for (const object of ['jupiter', 'saturn']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=${object}&renderer=production`)
      await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
      await save(`${layout}-preserved-${object}`, await page.evaluate(() => window.hybridReview.capture()))
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=motion')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    for (const pole of ['north', 'south']) {
      const image = await page.evaluate(async pole => {
        const e = window.hybridReview.engine
        const previous = e.celestial.pole.quaternion.clone()
        const observer = e.hero.position.clone().negate().normalize()
        if (pole === 'south') observer.negate()
        e.celestial.pole.quaternion.setFromUnitVectors(e.sunWorld.clone().set(0, 1, 0), observer)
        try { return await window.hybridReview.export() }
        finally { e.celestial.pole.quaternion.copy(previous) }
      }, pole)
      await save(`${layout}-pole-${pole}-4k`, image)
    }
    // Simulated high-DPI viewport keeps the same camera, scale and framing.
    // It specifically exercises tiles while longitude changes, not phone speed.
    const stream = await page.evaluate(async viewport => {
      const e = window.hybridReview.engine
      const original = e.celestial.applyMotion
      let seconds = 0
      e.celestial.applyMotion = snapshot => original({ ...snapshot, simulatedSeconds: seconds })
      e.resize(viewport.width, viewport.height, 4)
      const records = []
      try {
        for (const longitude of [0, 90, 180, 270, 360]) {
          seconds = longitude / 360 * 88642.44
          e.invalidate()
          await new Promise(resolve => setTimeout(resolve, 500))
          const deadline = performance.now() + 20000
          const tiles = e.hero.userData.planetTiles
          while (!tiles.ready() && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
          const state = tiles.diagnostics()
          if (!tiles.ready() || state.failures || state.resident > 64) throw new Error('Mars tile stream failed')
          records.push({ longitude, ...state, displacement: e.heroPlanet.surface.uniforms.uDisplacement.value })
        }
        return { records, dpr: e.renderer.getPixelRatio() }
      } finally { e.celestial.applyMotion = original; e.resize(viewport.width, viewport.height, 1) }
    }, viewport)
    // Export from a moving pose; snapshot must be immutable for every tile.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.waitForTimeout(600)
    const moving = await page.evaluate(async () => {
      const e = window.hybridReview.engine, times = [], tiles = []
      const prepare = e.celestial.prepareExport
      e.celestial.prepareExport = snapshot => { times.push(snapshot.simulatedSeconds); prepare(snapshot) }
      const before = e.getDiagnostics().motion
      try {
        const blob = await e.exportStill({ longEdge: 7680, onProgress: () => tiles.push(e.hero.userData.planetTiles.diagnostics()) })
        // Record at transaction completion. FileReader runs after the engine
        // legitimately resumes live rendering and must not be inside this check.
        const after = e.getDiagnostics().motion
        const data = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob) })
        return { data, before, after, times: [...new Set(times)], applications: times.length, tiles }
      } finally { e.celestial.prepareExport = prepare }
    })
    await save(`${layout}-moving-8k`, moving.data)
    delete moving.data
    records.push({ layout, stream, moving })
    if (moving.times.length !== 1 || JSON.stringify(moving.before) !== JSON.stringify(moving.after)) throw new Error(`Moving export mismatch: ${JSON.stringify({ before: moving.before, after: moving.after, times: moving.times })}`)
    await page.close()
  }
} finally {
  await writeFile(`${output}/detail-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
