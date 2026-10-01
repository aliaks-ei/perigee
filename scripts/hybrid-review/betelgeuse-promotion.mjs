// Confirm the approved production globe, portrait rollback and actual Capture/Save.
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h6-betelgeuse/promoted'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = []
const records = []

try {
  for (const [layout, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })

    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=betelgeuse')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const reference = await page.evaluate(() => {
      const engine = window.hybridReview.engine
      return { image: window.hybridReview.capture(), renderer: engine.getDiagnostics().renderer,
        globe: Boolean(engine.celestial.spin), radius: engine.hero.scale.x }
    })
    if (reference.renderer !== 'globe' || !reference.globe) throw new Error('Betelgeuse production globe is inactive')
    await writeFile(`${output}/${layout}-production-reference.png`, Buffer.from(reference.image.split(',')[1], 'base64'))
    delete reference.image

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const motion = await page.evaluate(async () => {
      const engine = window.hybridReview.engine
      const start = engine.celestial.spin.quaternion.clone()
      const pole = engine.celestial.pole.quaternion.clone()
      const sun = engine.sunWorld.clone()
      const before = engine.getDiagnostics().motion
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { spinAngle: start.angleTo(engine.celestial.spin.quaternion),
        stablePole: pole.equals(engine.celestial.pole.quaternion), stableSun: sun.equals(engine.sunWorld),
        elapsed: engine.getDiagnostics().motion.simulatedSeconds - before.simulatedSeconds }
    })
    if (!(motion.spinAngle < 1e-7 && motion.stablePole && motion.stableSun && motion.elapsed > 0)) {
      throw new Error('Betelgeuse gained an unsourced bulk spin or unstable frame')
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => window.hybridReview.engine.getDiagnostics().rotation.paused)

    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=portrait&object=betelgeuse')
    await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
    const rollback = await page.evaluate(() => ({ renderer: window.hybridReview.engine.getDiagnostics().renderer,
      image: window.hybridReview.capture() }))
    if (rollback.renderer !== 'portrait') throw new Error('Betelgeuse portrait rollback is unavailable')
    await writeFile(`${output}/${layout}-portrait-rollback.png`, Buffer.from(rollback.image.split(',')[1], 'base64'))

    for (const object of ['moon', 'mars', 'jupiter', 'saturn', 'neptune']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
      await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
      const image = await page.evaluate(() => window.hybridReview.capture())
      await writeFile(`${output}/${layout}-preserved-${object}.png`, Buffer.from(image.split(',')[1], 'base64'))
    }

    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({
      version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore',
    })))
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/betelgeuse-convection-v1.webp') && response.ok()),
      page.goto('http://127.0.0.1:3011/?object=betelgeuse&distance=impossible&view=rooftop'),
    ])
    await page.locator('[data-more-trigger]').waitFor({ state: 'visible', timeout: 90000 })
    await page.locator('.perigee-shell.scene-ready').waitFor({ state: 'visible', timeout: 90000 })
    await page.waitForTimeout(1800)
    await page.screenshot({ path: `${output}/${layout}-product.png` })
    await page.locator('[data-object-trigger]').click()
    const thumbnail = page.locator('.object-betelgeuse .object-thumbnail img')
    await thumbnail.waitFor({ state: 'visible' })
    if (!(await thumbnail.getAttribute('src'))?.includes('betelgeuse-globe-v1.webp')) throw new Error('New globe thumbnail is inactive')
    if (await thumbnail.evaluate(image => !image.complete || image.naturalWidth !== 320 || getComputedStyle(image).transform !== 'none')) {
      throw new Error('New globe thumbnail failed to load or is cropped')
    }
    await page.screenshot({ path: `${output}/${layout}-object-menu.png` })
    await page.keyboard.press('Escape')
    await page.locator('[data-more-trigger]').click()
    if (await page.getByRole('group', { name: 'Rotation speed', exact: true }).count()) throw new Error('Rotation settings exposed')
    await page.locator('[data-capture-trigger]').click()
    await page.getByRole('button', { name: 'Save image', exact: true }).waitFor({ state: 'visible', timeout: 120000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save image', exact: true }).click()
    await (await download).saveAs(`${output}/${layout}-product-capture.png`)
    const png = await readFile(`${output}/${layout}-product-capture.png`)
    const route = await page.request.get('http://127.0.0.1:3011/o/betelgeuse')
    const html = await route.text()
    if (!route.ok() || html.includes('20,000 hours') || !html.includes('artistic reconstruction')) {
      throw new Error('Betelgeuse public source boundary or period copy is stale')
    }
    records.push({ layout, reference, motion, rollback: rollback.renderer,
      thumbnail: 'loaded and uncropped', rotationSettings: 'absent',
      capture: { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length },
      publicPage: 'approved reconstruction copy; no unsourced rotation period' })
    await page.close()
  }
} finally {
  await writeFile(`${output}/production-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}

if (errors.length) throw new Error(JSON.stringify(errors))
console.log(output)
