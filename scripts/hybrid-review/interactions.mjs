import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: true })
const output = new URL('../../tmp/hybrid-review/', import.meta.url)
const results = []
const errors = []
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce' })
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=globe')
    await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90_000 })
    const swaps = await page.evaluate(async () => {
      const { engine, objects } = window.hybridReview
      const before = engine.getDiagnostics().motion
      for (let round = 0; round < 3; round++) {
        await Promise.allSettled(['moon', 'mars', 'jupiter'].map(id => engine.setObject(id,
          objects.find(object => object.id === id).presets[0].id, true)))
      }
      const pose = engine.celestial.spin.quaternion.toArray()
      await engine.setDistance('real', { duration: 0 })
      const far = engine.getObjectScreenPosition().diameterPixels
      const farPose = engine.celestial.spin.quaternion.toArray()
      await engine.setDistance(objects.find(object => object.id === 'jupiter').presets[0].id, { duration: 0 })
      const near = engine.getObjectScreenPosition().diameterPixels
      const references = engine.getDiagnostics().textures.assets.filter(asset => asset.url.includes('cassini')).map(asset => asset.references)
      return { selection: engine.getSelection(), before, after: engine.getDiagnostics().motion,
        pose, farPose, near, far, references, outgoing: engine.outgoing.size }
    })
    if (swaps.selection.objectId !== 'jupiter' || swaps.outgoing !== 0 || swaps.references.length !== 1 || swaps.references[0] !== 1
      || swaps.far >= swaps.near || JSON.stringify(swaps.pose) !== JSON.stringify(swaps.farPose)
      || JSON.stringify(swaps.before) !== JSON.stringify(swaps.after)) throw new Error(`Swap/distance regression: ${JSON.stringify(swaps)}`)
    const landscapes = []
    for (const viewpoint of ['rooftop', 'hilltop', 'lakeside', 'cabo-da-roca']) {
      await page.evaluate(viewpoint => window.hybridReview.engine.setViewpoint(viewpoint), viewpoint)
      await page.waitForFunction(() => window.hybridReview.engine.sky.ready())
      const data = await page.evaluate(() => window.hybridReview.capture())
      await writeFile(new URL(`${name}-landscape-${viewpoint}.png`, output), Buffer.from(data.split(',')[1], 'base64'))
      landscapes.push(await page.evaluate(() => ({ selection: window.hybridReview.engine.getSelection(), position: window.hybridReview.engine.getObjectScreenPosition() })))
    }
    const beforeDrag = await page.evaluate(() => window.hybridReview.engine.cameraRig.view)
    await page.mouse.move(viewport.width * .45, viewport.height * .4)
    await page.mouse.down()
    await page.mouse.move(viewport.width * .65, viewport.height * .45, { steps: 12 })
    await page.mouse.up()
    await page.waitForFunction(() => window.hybridReview.engine.cameraRig.settled)
    const afterDrag = await page.evaluate(() => window.hybridReview.engine.cameraRig.view)
    if (Math.abs(afterDrag.yaw - beforeDrag.yaw) < .01) throw new Error('Drag failed to move the camera')
    results.push({ name, swaps, landscapes, drag: { beforeDrag, afterDrag } })
    console.log(name, 'rapid swaps, distances, four landscapes, drag: passed')
    await page.close()
  }
} finally {
  await writeFile(new URL('interactions.json', output), JSON.stringify({ errors, results }, null, 2))
  await browser.close()
}
if (errors.length) process.exitCode = 1
