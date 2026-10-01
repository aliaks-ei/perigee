// H7 retain-portrait decision and H8 preservation: one bounded headed inspection.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = 'tmp/hybrid-h7-h8/final'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: false })
const records = [], errors = []
const assert = (ok, message) => { if (!ok) throw new Error(message) }
const ready = async page => {
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 })
  await page.waitForTimeout(180)
}
async function frame(page, name) {
  const data = await page.evaluate(() => window.hybridReview.capture())
  await writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1], 'base64'))
  return await page.evaluate(() => ({ position: window.hybridReview.engine.getObjectScreenPosition(),
    diagnostics: window.hybridReview.engine.getDiagnostics(), camera: window.hybridReview.engine.camera.position.toArray() }))
}
try {
  for (const [layout, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1, acceptDownloads: true })
    const page = await context.newPage()
    page.setDefaultNavigationTimeout(90000)
    page.on('pageerror', error => errors.push({ layout, error: error.message }))
    page.on('console', message => { if (message.type() === 'error') errors.push({ layout, error: message.text() }) })
    for (const object of ['andromeda', 'rigel', 'moon', 'mars', 'jupiter', 'saturn', 'neptune', 'betelgeuse', 'sirius', 'sun']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
      await ready(page)
      records.push({ layout, object, kind: 'preserved', ...await frame(page, `${layout}-preserved-${object}`) })
    }
    for (const renderer of ['production', 'portrait']) {
      await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=andromeda&renderer=${renderer}&controls=1`)
      await ready(page)
      await frame(page, `${layout}-${renderer}-live`)
      await page.evaluate(() => {
        const e = window.hybridReview.engine, prepare = e.celestial.prepareExport.bind(e.celestial)
        window.exportPoses = []
        e.celestial.prepareExport = snapshot => {
          prepare(snapshot)
          window.exportPoses.push(JSON.stringify({ snapshot, camera: e.camera.matrixWorld.toArray(), root: e.hero.matrixWorld.toArray() }))
        }
      })
      for (const [label, longEdge] of [['4K', 3840], ['8K', 7680]]) {
        await page.evaluate(() => { window.exportPoses = [] })
        const download = page.waitForEvent('download', { timeout: 240000 })
        const started = performance.now()
        await page.getByRole('button', { name: `Save ${label} PNG`, exact: true }).click()
        await (await download).saveAs(`${output}/${layout}-${renderer}-${label.toLowerCase()}.png`)
        const bytes = await readFile(`${output}/${layout}-${renderer}-${label.toLowerCase()}.png`)
        const frozen = await page.evaluate(() => ({ samples: window.exportPoses.length, unique: new Set(window.exportPoses).size }))
        assert(frozen.samples > 1 && frozen.unique === 1, 'Export changed its frozen state or camera')
        records.push({ layout, renderer, kind: 'saved', longEdge, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
          downloadMilliseconds: Math.round(performance.now() - started), frozen })
      }
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=andromeda&renderer=production')
    await ready(page)
    const matrix = []
    for (const viewpoint of ['rooftop', 'hilltop', 'lakeside', 'cabo-da-roca']) {
      await page.evaluate(v => window.hybridReview.engine.setViewpoint(v), viewpoint)
      for (const preset of await page.evaluate(() => window.hybridReview.objects.find(o => o.id === 'andromeda').presets.map(p => p.id))) {
        await page.evaluate(p => window.hybridReview.engine.setDistance(p, { duration: 0 }), preset)
        await page.waitForTimeout(180)
        matrix.push({ viewpoint, preset, ...await frame(page, `${layout}-${viewpoint}-${preset}`) })
      }
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=andromeda&renderer=production')
    await ready(page)
    const lifecycle = await page.evaluate(async () => {
      const e = window.hybridReview.engine, start = e.getObjectScreenPosition(), radius = e.hero.scale.x
      await e.setObject('rigel', 'impossible', true)
      await e.setObject('andromeda', 'touching', true)
      await Promise.all([e.setObject('moon', 'real', true), e.setObject('andromeda', 'touching', true)])
      const leases = e.getDiagnostics().textures.assets.filter(a => a.references > 0 && a.url.includes('andromeda'))
      return { start, returned: e.getObjectScreenPosition(), radius, returnedRadius: e.hero.scale.x,
        leases, spin: e.celestial.spin, children: e.hero.children.length }
    })
    assert(Math.abs(lifecycle.radius - lifecycle.returnedRadius) < 1e-6, 'Round trip changed angular scale')
    assert(lifecycle.leases.length === 1 && lifecycle.leases[0].references === 1 && lifecycle.spin === null && lifecycle.children === 1, 'Ownership or motion changed')
    const aim = []
    for (const [name, from, to] of [['negative', [viewport.width / 2, viewport.height / 2], [viewport.width, viewport.height]],
      ['positive', [viewport.width / 2, viewport.height / 2], [0, 0]]]) {
      await page.evaluate(() => { const e = window.hybridReview.engine; e.cameraRig.reset(); e.invalidate() })
      await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(...to, { steps: 6 }); await page.mouse.up()
      await page.waitForTimeout(1400)
      const state = await page.evaluate(() => ({ aim: window.hybridReview.engine.cameraRig.view, position: window.hybridReview.engine.camera.position.toArray() }))
      assert(state.position.every(value => value === 0), 'Look-around translated the observer')
      aim.push({ name, ...state }); await frame(page, `${layout}-aim-${name}`)
    }
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=andromeda&renderer=production')
    await ready(page)
    const reduced = await page.evaluate(async () => {
      const e = window.hybridReview.engine, before = e.getDiagnostics().motion
      await new Promise(resolve => setTimeout(resolve, 250))
      return { before, after: e.getDiagnostics().motion }
    })
    assert(JSON.stringify(reduced.before) === JSON.stringify(reduced.after), 'Reduced clock advanced')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const normal = await page.evaluate(async () => {
      const e = window.hybridReview.engine, q = e.hero.quaternion.clone(), before = e.getDiagnostics().motion
      await new Promise(resolve => setTimeout(resolve, 350))
      return { before, after: e.getDiagnostics().motion, orientationUnchanged: q.equals(e.hero.quaternion), diagnostics: e.getDiagnostics() }
    })
    assert(normal.after.evolutionSeconds > normal.before.evolutionSeconds && normal.orientationUnchanged, 'Portrait gained motion or clock stopped')
    const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront()
    await page.waitForTimeout(200)
    const nativeVisibility = await page.evaluate(() => ({ hidden: document.hidden, paused: window.hybridReview.engine.paused }))
    if (!nativeVisibility.hidden) await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const hidden = await page.evaluate(() => ({ paused: window.hybridReview.engine.paused, clock: window.hybridReview.engine.getDiagnostics().motion }))
    await page.waitForTimeout(250)
    assert(hidden.paused && JSON.stringify(hidden.clock) === JSON.stringify(await page.evaluate(() => window.hybridReview.engine.getDiagnostics().motion)), 'Visibility suspension failed')
    await other.close()
    if (!nativeVisibility.hidden) await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const released = await page.evaluate(() => {
      const e = window.hybridReview.engine; e.dispose(); e.dispose()
      return e.getDiagnostics().textures.assets.filter(a => a.references > 0 && a.url.includes('andromeda'))
    })
    assert(released.length === 0, 'Disposal retained Andromeda leases')
    await page.addInitScript(() => localStorage.setItem('perigee:settings', JSON.stringify({ version: 1, updatedAt: Date.now(), sound: 'off', volume: .5, stage: 'explore' })))
    const loaded = new Set()
    page.on('response', response => { if (response.ok()) loaded.add(new URL(response.url()).pathname) })
    await page.goto('http://127.0.0.1:3012/?object=andromeda&distance=touching&view=rooftop')
    await page.locator('.perigee-shell.scene-ready').waitFor({ state: 'visible', timeout: 90000 })
    await page.locator('.loading-state').waitFor({ state: 'hidden', timeout: 90000 })
    assert(loaded.has('/assets/objects/andromeda-portrait-v2.png'), 'Public portrait unavailable')
    assert(![...loaded].some(url => /\/objects\/andromeda\//.test(url)), 'Inactive galaxy stack loaded publicly')
    await page.screenshot({ path: `${output}/${layout}-product.png` })
    await page.locator('[data-object-trigger]').click()
    const thumbnail = page.locator('.object-andromeda .object-thumbnail img')
    assert((await thumbnail.getAttribute('src'))?.includes('andromeda-portrait-v3.webp'), 'Public thumbnail changed')
    await page.keyboard.press('Escape'); await page.locator('[data-more-trigger]').click()
    await page.locator('[data-capture-trigger]').click()
    await page.getByRole('button', { name: 'Save image', exact: true }).waitFor({ state: 'visible', timeout: 180000 })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save image', exact: true }).click()
    await (await download).saveAs(`${output}/${layout}-product-capture.png`)
    const bytes = await readFile(`${output}/${layout}-product-capture.png`)
    const method = await (await page.request.get('http://127.0.0.1:3012/method')).text()
    assert(method.includes('Cassini PIA11142') && !method.includes('Solar System Scope texture'), 'Corrected public ring credit absent')
    records.push({ layout, kind: 'runtime', matrix, lifecycle, aim, reduced, normal, nativeVisibility,
      visibilityEvidence: nativeVisibility.hidden ? 'native' : 'controlled event; native hidden-tab acceptance unverified',
      hidden, released, productPortrait: true, thumbnail: 'v3 unchanged', capture: { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } })
    await context.close()
    console.log(layout, 'preservation, presets/viewpoints, saved exports, lifecycle and public Capture/Save passed')
  }
} catch (error) { errors.push({ failure: error.message }); throw error }
finally { await writeFile(`${output}/results.json`, JSON.stringify({ records, errors }, null, 2)); await browser.close() }
assert(!errors.length, JSON.stringify(errors))
