import {writeFile} from 'node:fs/promises'
const {chromium}=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE??'playwright')
const browser=await chromium.launch({headless:false});const records=[]
try {
 for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})) {
  const page=await browser.newPage({viewport,reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/sun.html')
  await page.locator(`[data-layout="${layout}"]`).click()
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:90000})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  if(overflow||errors.length)throw new Error(JSON.stringify({overflow,errors}))
  await page.screenshot({path:`tmp/hybrid-h6-sun/selected/${layout}-review-page.png`,fullPage:true})
  records.push({layout,imagesLoaded:true,overflow,errors});await page.close()
 }
 await writeFile('tmp/hybrid-h6-sun/selected/page-results.json',JSON.stringify(records,null,2))
}finally{await browser.close()}
