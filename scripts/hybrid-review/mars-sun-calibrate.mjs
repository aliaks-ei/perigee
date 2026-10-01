import { mkdir, writeFile } from 'node:fs/promises'
const { chromium }=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE??'playwright')
const out='tmp/hybrid-h4-mars/sun-calibrate';await mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:false})
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=mars&renderer=globe')
 await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000});await page.waitForTimeout(1200)
 for(const pitch of [-1.15,-1.7,-2.3]) for(const longitude of [.05,.2,.4]){
  const data=await page.evaluate(({pitch,longitude})=>{
   const e=window.hybridReview.engine, c=e.celestial
   c.pole.rotation.set(.4,0,.05)
   const mat=c.planet.surface
   mat.uniforms.uExposure.value=2.9
   mat.uniforms.uMarsContrast.value=1.8
   mat.uniforms.uNormalStrength.value=1.0
   e.sunWorld.set(pitch,.3,1).normalize()
   mat.uniforms.uMarsLambert.value=longitude
   mat.uniforms.uMarsLightPower.value=1.8
   e.resize(1440,900,2)
   return window.hybridReview.capture()
  },{pitch,longitude})
  await writeFile(`${out}/${pitch}-${longitude}.png`,Buffer.from(data.split(',')[1],'base64'))
 }
}finally{await browser.close()}
