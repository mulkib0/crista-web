const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/opt/homebrew/lib/node_modules/slides-grab/node_modules/playwright');
const root=__dirname,data=JSON.parse(fs.readFileSync(path.join(root,'copy.json'),'utf8'));
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('file://'+path.join(root,'crista-science-relay-v2.html'));await page.evaluate(()=>window.cristaReady);
 const results=[];
 for(let i=0;i<5;i++){
  await page.evaluate(i=>window.cristaDeck.show(i),i);await page.evaluate(()=>window.fitScienceText());
  await page.keyboard.press('KeyD');if(!(await page.locator('#concept-dialog').evaluate(e=>e.open)))throw Error('D 해설 열기 실패');
  const actual=await page.locator('.concept-entry').evaluateAll(es=>es.map(e=>({title:e.querySelector('summary').textContent,definition:e.querySelectorAll('dd')[0].textContent,analogy:e.querySelectorAll('dd')[1].textContent,caution:e.querySelectorAll('dd')[2].textContent,reference:e.querySelectorAll('dd')[3].textContent})));
  if(actual.length!==data.slides[i].concepts.length)throw Error('개념 개수 불일치');
  for(let j=0;j<actual.length;j++)for(const k of ['title','definition','analogy','caution'])if(actual[j][k]!==data.slides[i].concepts[j][k])throw Error('개념 원문 불일치 '+i+'/'+j+'/'+k);
  await page.keyboard.press('ArrowRight');if(await page.evaluate(()=>window.cristaDeck.index())!==i)throw Error('해설 중 장이 바뀜');
  await page.screenshot({path:path.join(root,'previews',`concept-${i+1}.png`)});
  await page.keyboard.press('Escape');if(await page.locator('#concept-dialog').evaluate(e=>e.open))throw Error('해설 닫기 실패');
  await page.locator('.slide.active .learn-link').nth(2).click();
  const opened=await page.locator('.concept-entry').evaluateAll(es=>es.findIndex(e=>e.open));
  if(opened!==Math.min(2,actual.length-1))throw Error('카드 연결 실패');
  await page.locator('#concept-close').click();
  results.push({slide:i+1,concepts:actual.length,sourceMatch:true,keyboard:true,cardLink:true});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.cristaDeck.fit());await page.keyboard.press('KeyD');
 const mobile=await page.locator('#concept-dialog').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollHeight>=e.clientHeight});
 await page.screenshot({path:path.join(root,'concept-mobile.png')});
 if(!mobile||errors.length)throw Error('모바일 해설/스크립트 오류');
 const result={concepts:results.reduce((n,r)=>n+r.concepts,0),slides:results,mobileFits:true,pageErrors:errors};
 fs.writeFileSync(path.join(root,'concept-verification.json'),JSON.stringify(result,null,2));console.log(result);await b.close();
})().catch(e=>{console.error(e);process.exitCode=1});
