import { writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PERIGEE_PLAYWRIGHT_MODULE ?? 'playwright')
const output = `tmp/hybrid-h4-neptune/${process.env.PERIGEE_REVIEW_PASS ?? 'review-v2'}`
const browser = await chromium.launch({ headless: false }), errors = [], records = []
const save = (name,data) => writeFile(`${output}/${name}.png`, Buffer.from(data.split(',')[1],'base64'))
try {
  for (const [layout,viewport] of Object.entries({ desktop: {width:1440,height:900}, mobile:{width:390,height:844} })) {
    const p=await browser.newPage({viewport,reducedMotion:'reduce'})
    p.on('pageerror',e=>errors.push(e.message))
    p.on('console',e=>{if(e.type()==='error')errors.push(e.text())})
    for (const longitude of [90,180,270]) {
      await p.goto(`http://127.0.0.1:4318/scripts/hybrid-review/index.html?object=neptune&renderer=globe&longitude=${longitude}`)
      await p.waitForFunction(()=>window.hybridReview?.engine.sky.ready(),undefined,{timeout:90000})
      await save(`${layout}-quarter-${longitude}-4k`,await p.evaluate(()=>window.hybridReview.export()))
    }
    for (const preset of ['moon-swap','two-million','twelve-million','hundred-twenty-million','real']) {
      await p.evaluate(preset=>window.hybridReview.engine.setDistance(preset,{duration:0}),preset)
      await save(`${layout}-preset-${preset}`,await p.evaluate(()=>window.hybridReview.capture()))
    }
    // The comparison is a standalone local review surface, outside public routes.
    await p.goto('http://127.0.0.1:4318/scripts/hybrid-review/neptune.html')
    await p.getByRole('button',{name:layout==='mobile'?'Mobile layout':'Desktop',exact:true}).click()
    for (const pose of ['0','90','180','270','balanced','safe','near','real','pole-north-4k','pole-south-4k']) {
      await p.locator('#pose').selectOption(pose)
      await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))
    }
    await p.locator('#pose').selectOption('0')
    await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0))
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
    if(overflow)throw new Error(`${layout} comparison overflow`)
    await p.screenshot({path:`${output}/${layout}-review-page.png`,fullPage:true})
    records.push({layout,allReviewImagesLoaded:true,overflow:false,quarterExports:3,presets:5})
    await p.close()
  }
} finally {
  await writeFile(`${output}/final-browser-checks.json`,JSON.stringify({errors,records},null,2))
  await browser.close()
}
if(errors.length)throw new Error(JSON.stringify(errors))
