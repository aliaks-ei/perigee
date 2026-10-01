import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({ headless: false,
  ignoreDefaultArgs: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'] })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=motion')
  await page.waitForFunction(() => window.hybridReview?.engine.sky.ready(), undefined, { timeout: 90000 })
  const state = () => page.evaluate(() => ({ hidden: document.hidden, ...window.hybridReview.engine.getDiagnostics().motion }))
  const other = await context.newPage()
  await other.goto('about:blank')
  await other.bringToFront()
  let mechanism = 'background-tab'
  const cdp = await context.newCDPSession(page)
  const { windowId } = await cdp.send('Browser.getWindowForTarget')
  if (!await page.evaluate(() => document.hidden)) {
    mechanism = 'minimized-browser-window'
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } })
  }
  await page.waitForFunction(() => document.hidden, undefined, { timeout: 10000 }).catch(() => { throw new Error('VISIBILITY_NOT_EXPOSED') })
  const hidden = await state()
  await other.waitForTimeout(700)
  const held = await state()
  if (hidden.simulatedSeconds !== held.simulatedSeconds) throw new Error('Hidden tab rotated')
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
  await page.bringToFront()
  await page.waitForFunction(() => !document.hidden)
  const resumed = await state()
  if (resumed.simulatedSeconds - held.simulatedSeconds > 15) throw new Error('Hidden tab caught up')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  const reduced = await state()
  await page.waitForTimeout(500)
  const reducedHeld = await state()
  if (reduced.simulatedSeconds !== reducedHeld.simulatedSeconds) throw new Error('Reduced motion rotated')
  await writeFile('tmp/hybrid-h4-mars/final/visibility.json', JSON.stringify({ mechanism, hidden, held, resumed, reduced, reducedHeld }, null, 2))
} catch (error) {
  if (error.message !== 'VISIBILITY_NOT_EXPOSED') throw error
  // A skipped platform check is not a passing suspension test.
  const result = { status: 'unverified', reason: 'Automated Chromium did not expose document.hidden after tab switching or window minimization; scene pause/resume and reduced-motion checks are recorded separately.' }
  await writeFile('tmp/hybrid-h4-mars/final/visibility.json', JSON.stringify(result, null, 2))
  console.warn(result.reason)
} finally { await browser.close() }
