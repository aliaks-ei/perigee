import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const object = process.env.PERIGEE_OBJECT ?? 'jupiter'
const label = object[0].toUpperCase() + object.slice(1)
const output = process.env.PERIGEE_OUTPUT ?? 'tmp/hybrid-review'
await mkdir(output, { recursive: true })
const results = []
const errors = []
const base = `http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`
const assert = (ok, message) => { if (!ok) throw new Error(message) }
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto(base)
  await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90000 })
  await page.waitForFunction(() => window.hybridReview.engine.sky.ready())
  const state = () => page.evaluate(() => {
    const engine = window.hybridReview.engine
    return {
      time: engine.getDiagnostics().motion.simulatedSeconds,
      evolution: engine.getDiagnostics().motion.evolutionSeconds,
      q: engine.celestial.spin.quaternion.toArray(),
      pole: engine.celestial.pole.quaternion.toArray(),
      light: engine.sunWorld.toArray(),
      rotation: engine.getDiagnostics().rotation,
      rings: engine.hero.getObjectByName('equatorial-rings')?.matrixWorld.toArray() ?? null,
    }
  })
  const start = await state()
  await page.waitForTimeout(1200)
  const spun = await state()
  assert(spun.time - start.time > 100, 'default spin did not advance')
  assert(JSON.stringify(start.q) !== JSON.stringify(spun.q), 'texture did not rotate')
  assert(JSON.stringify(start.pole) === JSON.stringify(spun.pole), 'pole precessed')
  assert(JSON.stringify(start.rings) === JSON.stringify(spun.rings), 'ring plane moved')
  assert(JSON.stringify(start.light) === JSON.stringify(spun.light), 'sun moved')
  await page.evaluate(() => window.hybridReview.engine.setRotation(true, 'cinematic'))
  const stopped = await state()
  await page.waitForTimeout(600)
  const paused = await state()
  assert(paused.time === stopped.time, 'pause advanced spin')
  assert(paused.evolution > stopped.evolution, 'pause incorrectly froze ambient evolution')
  await page.evaluate(() => window.hybridReview.engine.setRotation(false, 'real'))
  const real = await state()
  await page.waitForTimeout(700)
  const realEnd = await state()
  assert(realEnd.time - real.time > .4 && realEnd.time - real.time < 1.2, 'real rate incorrect')
  await page.evaluate(() => window.hybridReview.engine.pause())
  const hidden = await state()
  await page.waitForTimeout(650)
  await page.evaluate(() => window.hybridReview.engine.resume())
  const resumed = await state()
  assert(resumed.time - hidden.time < .1, 'hidden catch-up')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  const reduced = await state()
  await page.waitForTimeout(500)
  assert((await state()).time === reduced.time, 'reduced motion advanced')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.hybridReview.engine.setRotation(false, 'cinematic'))
  const capture = await page.evaluate(async () => {
    const engine = window.hybridReview.engine
    const seen = []
    const prepare = engine.celestial.prepareExport
    engine.celestial.prepareExport = snapshot => {
      seen.push(snapshot.simulatedSeconds)
      prepare(snapshot)
    }
    const before = engine.getDiagnostics().motion
    try {
      const data = await window.hybridReview.export()
      return { data, before, after: engine.getDiagnostics().motion, samples: seen.length,
        unique: [...new Set(seen)], exporting: engine.getDiagnostics().exporting }
    } finally { engine.celestial.prepareExport = prepare }
  })
  assert(capture.unique.length === 1 && capture.samples > 4, 'capture mixed poses')
  assert(JSON.stringify(capture.before) === JSON.stringify(capture.after), 'capture caught up')
  assert(!capture.exporting, 'capture stayed locked')
  await writeFile(`${output}/automatic-spinning-capture-4k.png`, Buffer.from(capture.data.split(',')[1], 'base64'))
  delete capture.data
  results.push({ start, spun, paused, real, realEnd, reduced, capture })
  await page.close()
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const p = await browser.newPage({ viewport, reducedMotion: 'no-preference' })
    p.on('pageerror', e => errors.push(e.message))
    await p.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({ version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore' })))
    await p.goto(`http://127.0.0.1:3010/?object=${object}&distance=moon-swap&view=rooftop`)
    await p.locator('[data-more-trigger]').waitFor({ state: 'visible', timeout: 90000 })
    await p.locator('[data-more-trigger]').click()
    assert(await p.getByRole('button', { name: `${label} rotation`, exact: true }).count() === 0, 'rotation toggle still exposed')
    assert(await p.getByRole('group', { name: 'Rotation speed', exact: true }).count() === 0, 'rotation rates still exposed')
    await p.locator('[data-capture-trigger]').waitFor()
    await p.screenshot({ path: `${output}/automatic-${name}-menu.png` })
    await p.emulateMedia({ reducedMotion: 'reduce' })
    await p.waitForTimeout(150)
    assert(await p.getByRole('button', { name: `${label} rotation`, exact: true }).count() === 0, 'reduced-motion menu exposed rotation')
    results.push({ layout: name, rotationSettings: 'absent', capture: 'available' })
    await p.close()
  }
} finally {
  await writeFile(`${output}/automatic-rotation-results.json`, JSON.stringify({ errors, results }, null, 2))
  await browser.close()
}
console.log(JSON.stringify({ errors, checks: results.length }))
if (errors.length) process.exitCode = 1
