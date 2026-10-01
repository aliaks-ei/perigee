import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false })
const output = `tmp/hybrid-h4-neptune/${process.env.PERIGEE_REVIEW_PASS ?? 'review-v7'}`
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=neptune&renderer=motion')
  await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
  await page.bringToFront()
  await page.waitForTimeout(300)
  const snapshot = () => page.evaluate(() => ({ hidden: document.hidden, motion: window.hybridReview.engine.getDiagnostics().motion }))
  const before = await snapshot()
  const other = await context.newPage()
  await other.goto('about:blank')
  await other.bringToFront()
  await page.waitForTimeout(300)
  const hiddenStart = await snapshot()
  await page.waitForTimeout(650)
  const hiddenEnd = await snapshot()
  await page.bringToFront()
  const resumed = await snapshot()
  await page.waitForTimeout(350)
  const active = await snapshot()
  const result = { errors, before, hiddenStart, hiddenEnd, resumed, active,
    nativeVisibilityDelivered: hiddenStart.hidden && hiddenEnd.hidden && !resumed.hidden }
  await writeFile(`${output}/native-visibility.json`, JSON.stringify(result, null, 2))
  if (!result.nativeVisibilityDelivered) throw new Error('Chromium did not deliver native hidden-tab visibility; record as unverified')
  if (hiddenStart.motion.simulatedSeconds !== hiddenEnd.motion.simulatedSeconds) throw new Error('Hidden tab advanced rotation')
  if (resumed.motion.simulatedSeconds - hiddenEnd.motion.simulatedSeconds > 12) throw new Error('Hidden tab caught up on resume')
  if (active.motion.simulatedSeconds <= resumed.motion.simulatedSeconds) throw new Error('Visible tab did not resume')
  console.log('Native tab hiding suspends rotation; visible resume advances without hidden-time catch-up')
} finally { await browser.close() }
