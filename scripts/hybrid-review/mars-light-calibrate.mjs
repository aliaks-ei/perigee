import { mkdir, writeFile } from 'node:fs/promises'
const { chromium }=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE??'playwright')
const out='tmp/hybrid-h4-mars/light-calibrate';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:false})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=globe')
 await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000});await page.waitForTimeout(1200)
 for(const pitch of [2,2.6,3.2]) for(const longitude of [.15,.4,.7]){
  const data=await page.evaluate(({pitch,longitude})=>{
   const e=window.hybridReview.engine, c=e.celestial
   c.pole.rotation.set(.4,0,.05)
   const mat=c.planet.surface
   mat.uniforms.uExposure.value=2.9
   mat.uniforms.uMarsContrast.value=pitch
   mat.uniforms.uMarsLambert.value=longitude
   mat.uniforms.uMarsLightPower.value=2.2
   e.resize(1440,900,2)
   return window.hybridReview.capture()
  },{pitch,longitude})
  await writeFile(`${out}/${pitch}-${longitude}.png`,Buffer.from(data.split(',')[1],'base64'))
 }
}finally{await browser.close()}
