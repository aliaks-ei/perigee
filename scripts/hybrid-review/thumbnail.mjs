// Render the accepted reference globe itself, with the other scene objects hidden.
import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const object = process.env.PERIGEE_OBJECT ?? 'jupiter'
if (!['moon', 'jupiter', 'saturn', 'mars', 'neptune', 'betelgeuse', 'sirius', 'sun', 'rigel'].includes(object)) throw new Error('Unsupported thumbnail object')
const browser = await chromium.launch({ headless: false })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=${object}&renderer=${['betelgeuse', 'sirius', 'sun', 'rigel'].includes(object) ? 'production' : 'globe'}`)
  await page.waitForFunction(() => Boolean(window.hybridReview), undefined, { timeout: 90_000 })
  await page.waitForFunction(() => window.hybridReview.engine.sky.ready())
  const data = await page.evaluate(async object => {
    const engine = window.hybridReview.engine
    engine.renderer.setClearColor(0, 1)
    engine.sky.scene.background = null
    for (const child of engine.sky.scene.children) child.visible = child === engine.hero
    const frame = engine.captureFrame()
    // Neptune's small live disc would otherwise be enlarged into a jagged icon.
    // Render the accepted globe at export resolution before taking the same crop.
    const source = object === 'neptune' || object === 'moon' || object === 'betelgeuse' || object === 'sirius' || object === 'sun' || object === 'rigel'
      ? await createImageBitmap(await engine.exportStill({ longEdge: object === 'moon' || object === 'betelgeuse' || object === 'sirius' || object === 'sun' || object === 'rigel' ? 7680 : 3840 })) : frame
    const position = engine.getObjectScreenPosition()
    const size = position.diameterPixels * source.width / frame.width * (object === 'saturn' ? 2.55 : 1.22)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 320
    const context = canvas.getContext('2d')
    context.fillStyle = '#000'
    context.fillRect(0, 0, 320, 320)
    context.drawImage(source, position.x * source.width - size / 2, position.y * source.height - size / 2,
      size, size, 0, 0, 320, 320)
    if (source !== frame) source.close()
    return canvas.toDataURL('image/webp', .94)
  }, object)
  await writeFile(new URL(`../../public/assets/objects/thumbs/${object}-globe-v1.webp`, import.meta.url), Buffer.from(data.split(',')[1], 'base64'))
} finally { await browser.close() }
