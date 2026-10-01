// User-approved production gate; retain the exact accepted artwork and rollback.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h6-rigel/promoted'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const errors = [], records = []
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const ready = page => page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 })
async function frame(page, name) {
  const data = await page.evaluate(() => window.hybridReview.capture())
  await writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
}
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    page.setDefaultNavigationTimeout(90000)
    page.on('pageerror', error => errors.push({ layout, message: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, message: message.text() }) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=rigel&renderer=production')
    await ready(page)
    const production = await page.evaluate(() => ({ renderer: window.hybridReview.engine.getDiagnostics().renderer,
      position: window.hybridReview.engine.getObjectScreenPosition(), globe: Boolean(window.hybridReview.engine.celestial.spin) }))
    assert(production.renderer === 'globe' && production.globe, 'Approved production Rigel globe is inactive')
    await frame(page, `${layout}-rigel`)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const motion = await page.evaluate(async () => {
      const e = window.hybridReview.engine, spin = e.celestial.spin.quaternion.clone(), pole = e.celestial.pole.quaternion.clone()
      const surfaceState = () => e.celestial.stellar.material.uniforms.uTime.value
      const initial = surfaceState(), before = e.getDiagnostics().motion.simulatedSeconds
      await new Promise(resolve => setTimeout(resolve, 350))
      return { spin: spin.angleTo(e.celestial.spin.quaternion), fixedPole: pole.equals(e.celestial.pole.quaternion),
        fixedSurface: initial === surfaceState(), elapsed: e.getDiagnostics().motion.simulatedSeconds - before }
    })
    assert(motion.spin < 1e-7 && motion.fixedPole && motion.fixedSurface && motion.elapsed > 0, 'Production Rigel gained motion')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // Normal-motion camera breathing changes the viewpoint independently of
    // the fixed solar body. Start a fresh reduced-motion reference for framing.
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=rigel&renderer=production')
    await ready(page)
    const transitions = await page.evaluate(async () => {
      const e = window.hybridReview.engine, start = e.getObjectScreenPosition(), radius = e.hero.scale.x
      for (const preset of ['near-25-au', 'near-100-au', 'near-1000-au', 'real', 'impossible']) await e.setDistance(preset, { duration: 0 })
      await e.setObject('sirius', 'impossible', true); await e.setObject('rigel', 'impossible', true)
      return { start, returned: e.getObjectScreenPosition(), radius, returnedRadius: e.hero.scale.x, renderer: e.getDiagnostics().renderer }
    })
    // Require matching fixed-reference framing and physical scale, with only
    // a small numerical tolerance for layout/animation matrix endpoints.
    const framingMatches = ['x', 'y', 'diameterPixels'].every(key =>
      Math.abs(transitions.start[key] - transitions.returned[key]) < (key === 'diameterPixels' ? .05 : .00001))
    assert(framingMatches && Math.abs(transitions.radius - transitions.returnedRadius) < 1e-6 && transitions.renderer === 'globe', `Rigel round trip changed framing: ${JSON.stringify(transitions)}`)
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=rigel&renderer=portrait')
    await ready(page)
    assert(await page.evaluate(() => window.hybridReview.engine.getDiagnostics().renderer === 'portrait'), 'Portrait rollback unavailable')
    await frame(page, `${layout}-portrait-rollback`)
    for (const object of ['moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse', 'sirius', 'sun']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=${object}&renderer=production`)
      await ready(page)
      assert(await page.evaluate(() => window.hybridReview.engine.getDiagnostics().renderer === 'globe'), `Approved ${object} gate changed`)
      await frame(page, `${layout}-${object}`)
    }
    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({ version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore' })))
    const loaded = new Set()
    page.on('response', response => { if (response.ok()) loaded.add(new URL(response.url()).pathname) })
    await page.goto('http://127.0.0.1:3012/?object=rigel&distance=impossible&view=rooftop')
    await page.locator('.perigee-shell.scene-ready').waitFor({ state: 'visible', timeout: 90000 })
    await page.locator('.loading-state').waitFor({ state: 'hidden', timeout: 90000 })
    for (const file of ['rigel-mottling-review-v1.webp', 'rigel-poles-review-v1.webp']) assert(loaded.has(`/assets/objects/${file}`), `${file} inactive in generated app`)
    await page.screenshot({ path: `${output}/${layout}-product.png` })
    await page.locator('[data-object-trigger]').click()
    const thumbnail = page.locator('.object-rigel .object-thumbnail img')
    await thumbnail.waitFor({ state: 'visible' })
    await thumbnail.evaluate(img => img.decode())
    assert((await thumbnail.getAttribute('src'))?.includes('rigel-globe-v1.webp'), 'Promoted thumbnail inactive')
    assert(await thumbnail.evaluate(img => img.complete && img.naturalWidth === 320 && getComputedStyle(img).transform === 'none'), 'Thumbnail failed or is cropped')
    await page.screenshot({ path: `${output}/${layout}-object-menu.png` })
    await page.keyboard.press('Escape'); await page.locator('[data-more-trigger]').click()
    assert(!await page.getByRole('group', { name: /Rotation/ }).count(), 'Public rotation control appeared')
    await page.locator('[data-capture-trigger]').click()
    await page.getByRole('button', { name: 'Save image', exact: true }).waitFor({ state: 'visible', timeout: 180000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save image', exact: true }).click()
    await (await download).saveAs(`${output}/${layout}-product-capture.png`)
    const png = await readFile(`${output}/${layout}-product-capture.png`)
    const route = await page.request.get('http://127.0.0.1:3012/o/rigel'), html = await route.text()
    assert(route.ok() && html.includes('artistic reconstruction') && html.includes('current photospheric pattern') && html.includes('Automatic rotation remains disabled'), 'Public Rigel copy stale')
    const method = await page.request.get('http://127.0.0.1:3012/method')
    assert(method.ok() && (await method.text()).includes('Automatic Rigel motion remains disabled'), 'Method motion boundary missing')
    records.push({ layout, production, motion, transitions, rollback: 'portrait', preservedGlobes: 8,
      thumbnail: '320px loaded and uncropped', rotationControl: 'absent', publicCopy: 'synthetic reconstruction',
      capture: { width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length } })
    await page.close(); console.log(layout, 'production globe, motion, rollback, eight globes, thumbnail, public copy and Capture/Save passed')
  }
} catch (error) {
  errors.push({ failure: error.message }); throw error
} finally {
  await writeFile(`${output}/production-results.json`, JSON.stringify({ errors, records }, null, 2))
  await browser.close()
}
assert(!errors.length, JSON.stringify(errors))
