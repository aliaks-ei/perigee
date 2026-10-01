import {mkdir,writeFile} from 'node:fs/promises'
const {chromium}=await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output=`tmp/hybrid-h4-moon/${process.env.PERIGEE_REVIEW_PASS ?? 'review-v5'}`
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:false}), errors=[], records=[]
const save=(name,data)=>writeFile(`${output}/${name}.png`,Buffer.from(data.split(',')[1],'base64'))
try {
 for(const [layout,viewport] of Object.entries({desktop:{width:1440,height:900},mobile:{width:390,height:844}})){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'})
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
  for(const angle of [90,180,270]){
   await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=globe&longitude=${angle}`)
   await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
   await save(`${layout}-quarter-${angle}-4k`,await page.evaluate(()=>window.hybridReview.export()))
  }
  // Exercise genuine production film grain, with identical frozen film time.
  for(const renderer of ['portrait','globe']){
   await page.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=${renderer}`)
   await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
   await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(200)
   const data=await page.evaluate(()=>{const e=window.hybridReview.engine;e.pause();e.film.elapsed=10;return window.hybridReview.capture()})
   await save(`${layout}-${renderer}-film`,data)
  }
  await page.emulateMedia({reducedMotion:'no-preference'})
  await page.goto('http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=moon&renderer=globe')
  await page.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
  const transition=await page.evaluate(async()=>{
   const e=window.hybridReview.engine, moon=e.celestial
   const before={sun:moon.planet.surface.uniforms.uSunDirection.value.toArray(),pole:moon.pole.quaternion.toArray(),spin:moon.spin.quaternion.toArray()}
   const done=e.setObject('jupiter','close-pass')
   await new Promise(r=>setTimeout(r,350));e.captureFrame()
   const during={sun:moon.planet.surface.uniforms.uSunDirection.value.toArray(),pole:moon.pole.quaternion.toArray(),spin:moon.spin.quaternion.toArray()}
   await done
   return {before,during}
  })
  if(JSON.stringify(transition.before)!==JSON.stringify(transition.during))throw new Error('Moon relit or rotated while outgoing')
  records.push({layout,transition})
  await page.close()
 }
} finally{await browser.close();await writeFile(`${output}/final-checks.json`,JSON.stringify({errors,records},null,2))}
if(errors.length)throw new Error(JSON.stringify(errors))
