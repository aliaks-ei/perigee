// Check the approved production globe, portrait rollback, no bulk spin and product Capture/Save.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h6-sirius/promoted'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = [], records = []

try {
  for (const [layout, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 },
  })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=sirius')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const production = await page.evaluate(() => {
      const engine = window.hybridReview.engine
      return { renderer: engine.getDiagnostics().renderer, globe: Boolean(engine.celestial.spin),
        position: engine.getObjectScreenPosition(), image: window.hybridReview.capture() }
    })
    if (production.renderer !== 'globe' || !production.globe) throw new Error('Sirius production globe is inactive')
    await writeFile(`${output}/${layout}-production-reference.png`, Buffer.from(production.image.split(',')[1], 'base64'))
    delete production.image
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const motion = await page.evaluate(async () => {
      const engine = window.hybridReview.engine
      const spin = engine.celestial.spin.quaternion.clone(), pole = engine.celestial.pole.quaternion.clone()
      const before = engine.getDiagnostics().motion
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { spinAngle: spin.angleTo(engine.celestial.spin.quaternion), stablePole: pole.equals(engine.celestial.pole.quaternion),
        elapsed: engine.getDiagnostics().motion.simulatedSeconds - before.simulatedSeconds }
    })
    if (!(motion.spinAngle < 1e-7 && motion.stablePole && motion.elapsed > 0)) throw new Error('Sirius gained bulk spin or lost its stable pole')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=portrait&object=sirius')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const rollback = await page.evaluate(() => ({ renderer: window.hybridReview.engine.getDiagnostics().renderer,
      image: window.hybridReview.capture() }))
    if (rollback.renderer !== 'portrait') throw new Error('Sirius portrait rollback is unavailable')
    await writeFile(`${output}/${layout}-portrait-rollback.png`, Buffer.from(rollback.image.split(',')[1], 'base64'))

    const preserved = {}
    for (const object of ['moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
      await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
      preserved[object] = await page.evaluate(() => window.hybridReview.engine.getDiagnostics().renderer)
      if (preserved[object] !== 'globe') throw new Error(`Approved ${object} production renderer changed`)
    }

    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({
      version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore',
    })))
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/sirius-granulation-review-v1.webp') && response.ok()),
      page.goto('http://localhost:3011/?object=sirius&distance=impossible&view=rooftop'),
    ])
    await page.locator('.perigee-shell.scene-ready').waitFor({ state: 'visible', timeout: 90000 })
    await page.locator('.loading-state').waitFor({ state: 'hidden', timeout: 90000 })
    await page.screenshot({ path: `${output}/${layout}-product.png` })
    await page.locator('[data-object-trigger]').click()
    const thumbnail = page.locator('.object-sirius .object-thumbnail img')
    await thumbnail.waitFor({ state: 'visible' })
    if (!(await thumbnail.getAttribute('src'))?.includes('sirius-globe-v1.webp')) throw new Error('Approved Sirius thumbnail is inactive')
    if (await thumbnail.evaluate(image => !image.complete || image.naturalWidth !== 320 || getComputedStyle(image).transform !== 'none')) {
      throw new Error('Approved Sirius thumbnail failed to load or is cropped')
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${output}/${layout}-object-menu.png` })
    await page.keyboard.press('Escape')
    await page.locator('[data-more-trigger]').click()
    if (await page.getByRole('group', { name: 'Rotation speed', exact: true }).count()) throw new Error('Rotation setting exposed for Sirius')
    await page.locator('[data-capture-trigger]').click()
    await page.getByRole('button', { name: 'Save image', exact: true }).waitFor({ state: 'visible', timeout: 120000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save image', exact: true }).click()
    await (await download).saveAs(`${output}/${layout}-product-capture.png`)
    const png = await readFile(`${output}/${layout}-product-capture.png`)
    const route = await page.request.get('http://localhost:3011/o/sirius')
    const html = await route.text()
    if (!route.ok() || html.includes('120 hours') || !html.includes('artistic reconstruction')) {
      throw new Error('Sirius public source boundary or rotation copy is stale')
    }
    records.push({ layout, production, motion, rollback: rollback.renderer, preserved,
      thumbnail: 'loaded and uncropped', rotationSettings: 'absent',
      capture: { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length },
      publicPage: 'artistic reconstruction; no unsupported period' })
    await page.close()
    console.log(layout, 'production Sirius globe, rollback, motion, thumbnail, copy and Capture/Save passed')
  }
} finally {
  await writeFile(`${output}/production-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
if (errors.length) throw new Error(JSON.stringify(errors))
