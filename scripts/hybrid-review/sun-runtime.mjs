import { writeFile } from 'node:fs/promises'
const {chromium}=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE??'playwright')
const output='tmp/hybrid-h6-sun/selected'
const browser=await chromium.launch({headless:false})
const errors=[],records=[]
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)}
const ready=async page=>{await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:90000})}
try {
 for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})) {
  const context=await browser.newContext({viewport,reducedMotion:'reduce',deviceScaleFactor:1,acceptDownloads:true})
  const page=await context.newPage()
  page.setDefaultNavigationTimeout(90000)
  page.on('pageerror',e=>errors.push({layout,error:e.message}))
  page.on('console',m=>{if(m.type()==='error')errors.push({layout,error:m.text()})})
  if(layout==='mobile') {
   for(const object of ['saturn','neptune','betelgeuse','sirius']) {
    await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?renderer=production&object=${object}`)
    await ready(page)
    const image=await page.evaluate(()=>window.hybridReview.capture())
    await writeFile(`${output}/${layout}-preserved-${object}.png`,Buffer.from(image.split(',')[1],'base64'))
   }
  }
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=sun&renderer=globe')
  await ready(page)
  const stable=await page.evaluate(async()=>{
   const e=window.hybridReview.engine, spin=e.celestial.spin.quaternion.clone(),pole=e.celestial.pole.quaternion.clone()
   const radius=e.hero.scale.x,screen=e.getObjectScreenPosition(),clock=e.getDiagnostics().motion
   await new Promise(r=>setTimeout(r,250))
   const reduced=e.getDiagnostics().motion
   for(const preset of ['near-10-million','near-25-million','mercury','real','impossible'])await e.setDistance(preset,{duration:0})
   await e.setObject('sirius','impossible',true);await e.setObject('sun','impossible',true)
   return {radius,returnedRadius:e.hero.scale.x,screen,returned:e.getObjectScreenPosition(),
    spin:spin.angleTo(e.celestial.spin.quaternion),pole:pole.angleTo(e.celestial.pole.quaternion),clock,reduced,renderer:e.getDiagnostics().renderer}
  })
  assert(stable.spin<1e-7&&stable.pole<1e-7&&stable.renderer==='globe','turntable, pole or transition failed')
  assert(Math.abs(stable.radius-stable.returnedRadius)<1e-6,'distance round trip changed radius')
  assert(JSON.stringify(stable.clock)===JSON.stringify(stable.reduced),'reduced motion clock advanced')
  for(const [label,pitch] of [['north',Math.PI/2],['south',-Math.PI/2]]) {
   await page.evaluate(p=>{const e=window.hybridReview.engine;e.celestial.pole.rotation.x=p;e.invalidate()},pitch)
   await page.waitForTimeout(150)
   const image=await page.evaluate(()=>window.hybridReview.capture())
   await writeFile(`${output}/${layout}-exact-pole-${label}.png`,Buffer.from(image.split(',')[1],'base64'))
  }
  await page.evaluate(()=>{const e=window.hybridReview.engine;e.celestial.pole.rotation.x=0;e.invalidate()})
  await page.emulateMedia({reducedMotion:'no-preference'})
  const normal=await page.evaluate(async()=>{
   const e=window.hybridReview.engine,pose=e.celestial.spin.quaternion.clone(),before=e.getDiagnostics().motion
   await new Promise(r=>setTimeout(r,250));return {before,after:e.getDiagnostics().motion,spin:pose.angleTo(e.celestial.spin.quaternion),grain:e.film.uniforms.get('uGrain').value}
  })
  assert(normal.after.evolutionSeconds>normal.before.evolutionSeconds&&normal.spin<1e-7,'static globe gained spin or clock failed')
  await page.screenshot({path:`${output}/${layout}-production-film.png`})
  assert(normal.grain===.018,'production film setting changed')
  const tab=await page.context().newPage();await tab.goto('about:blank');await tab.bringToFront()
  await page.waitForTimeout(200)
  const nativeVisibility=await page.evaluate(()=>({hidden:document.hidden,paused:window.hybridReview.engine.paused}))
  // This host may put automated targets in separate native windows. If no
  // hidden transition is observed, test the actual handler with a controlled
  // event and label native-tab acceptance unverified instead of asserting it.
  if(nativeVisibility.hidden) assert(nativeVisibility.paused,'hidden document did not suspend scene')
  else await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>true})
   document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden=await page.evaluate(()=>({hidden:document.hidden,paused:window.hybridReview.engine.paused,time:window.hybridReview.engine.getDiagnostics().motion}))
  assert(hidden.hidden&&hidden.paused,'visibility handler failed to suspend scene')
  await page.waitForTimeout(250)
  const held=await page.evaluate(()=>window.hybridReview.engine.getDiagnostics().motion)
  assert(JSON.stringify(hidden.time)===JSON.stringify(held),'hidden tab advanced clock')
  await page.bringToFront();await tab.close()
  if(!nativeVisibility.hidden) await page.evaluate(()=>{
   delete document.hidden
   document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.emulateMedia({reducedMotion:'reduce'})
  // Deterministic nonzero differential pose; actual still exporter reapplies one snapshot per tile/sample.
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=sun&renderer=differential&solarDays=4&solarEvolutionDays=3')
  await ready(page)
  const frozen=await page.evaluate(async()=>{
   const e=window.hybridReview.engine,poses=[],prepare=e.celestial.prepareExport
   e.celestial.prepareExport=s=>{prepare(s);poses.push(JSON.stringify({s,spots:e.celestial.stellar.material.uniforms.uSpots.value.map(v=>v.toArray())}))}
   try {const blob=await e.exportStill({longEdge:3840});return {samples:poses.length,unique:new Set(poses).size,bytes:blob.size}}
   finally{e.celestial.prepareExport=prepare}
  })
  assert(frozen.samples>1&&frozen.unique===1,'differential export changed between tiles/samples')
  // Generated product: active portrait and public capture on both layouts.
  await page.addInitScript(()=>localStorage.setItem('perigee:settings',JSON.stringify({version:1,updatedAt:Date.now(),sound:'off',volume:.5,stage:'explore'})))
  const assets=[];page.on('response',r=>{if(r.url().includes('sun-portrait-v1.webp')&&r.ok())assets.push(r.url())})
  await page.goto('http://127.0.0.1:3012/?object=sun&distance=impossible&view=rooftop')
  await page.locator('.perigee-shell.scene-ready').waitFor({state:'visible',timeout:90000})
  await page.locator('.loading-state').waitFor({state:'hidden',timeout:90000})
  assert(assets.length>0,'generated product did not load Sun portrait')
  await page.screenshot({path:`${output}/${layout}-product.png`})
  await page.locator('[data-object-trigger]').click()
  const thumbnail=page.locator('.object-sun .object-thumbnail img')
  assert((await thumbnail.getAttribute('src'))?.includes('sun-portrait-v1.webp'),'public thumbnail changed')
  await page.keyboard.press('Escape');await page.locator('[data-more-trigger]').click()
  assert(!await page.getByRole('group',{name:'Rotation speed',exact:true}).count(),'public solar rotation control added')
  await page.locator('[data-capture-trigger]').click()
  await page.getByRole('button',{name:'Save image',exact:true}).waitFor({state:'visible',timeout:180000})
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click()
  await(await download).saveAs(`${output}/${layout}-product-capture.png`)
  records.push({layout,stable,normal,nativeVisibility,visibilityEvidence:nativeVisibility.hidden?'native tab':'controlled visibility event; native tab unverified',hidden,held,frozen,productPortrait:true,thumbnail:'unchanged',publicSpin:'absent'})
  await context.close();console.log(layout,'motion, visibility handler, frozen differential export and generated product passed')
 }
}catch(error){
 errors.push({failure:error.message})
 throw error
}finally{
 await writeFile(`${output}/runtime-results.json`,JSON.stringify({errors,records},null,2))
 await browser.close()
}
if(errors.length)throw new Error(JSON.stringify(errors))
