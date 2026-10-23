/* PNG 원문 105개와 HTML 텍스트를 대조하고 렌더·발표 조작을 검증한다. */
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('/opt/homebrew/lib/node_modules/slides-grab/node_modules/playwright');
const root=__dirname,source=JSON.parse(fs.readFileSync(path.join(root,'copy.json'),'utf8'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const previews=path.join(root,'previews');fs.mkdirSync(previews,{recursive:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const results=[];let checked=0;
 for(let i=0;i<5;i++){
  await page.goto(pathToFileURL(path.join(root,`slide-${String(i+1).padStart(2,'0')}.html`)).href);
  await page.evaluate(()=>window.scienceReady);
  const r=await page.evaluate(()=>{
   const vals={};for(const k of ['eyebrow','title','subtitle'])vals[k]=document.querySelector('header [data-copy="'+k+'"]').textContent;
   for(const k of ['analogy','footnote'])vals[k]=document.querySelector('[data-copy="'+k+'"]').textContent;
   vals.panels=[...document.querySelectorAll('.panel')].map(p=>Object.fromEntries(['title','tool','body','highlight'].map(k=>[k,p.querySelector('[data-copy="'+k+'"]').textContent])));
   const overflow=(window.scienceTextFit||[]).filter(e=>e.overflow);
   const outside=[...document.querySelectorAll('[data-copy]')].filter(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>1921||r.top<0||r.bottom>1081;}).map(e=>e.textContent);
   const overlap=[];
   for(const p of document.querySelectorAll('.panel')){
    const els=[...p.querySelectorAll('[data-copy]')];
    for(let a=0;a<els.length;a++)for(let b=a+1;b<els.length;b++){
     const x=els[a].getBoundingClientRect(),y=els[b].getBoundingClientRect();
     if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)overlap.push([els[a].dataset.copy,els[b].dataset.copy]);
    }
   }
   return {vals,overflow,outside,overlap,fonts:[...document.querySelectorAll('[data-copy]')].map(e=>({part:e.dataset.copy,size:parseFloat(getComputedStyle(e).fontSize),family:getComputedStyle(e).fontFamily})),fontLoaded:document.fonts.check('600 30px "Relay체"','한글'),images:[...document.images].every(i=>i.complete&&i.naturalWidth>0)};
  });
  const mismatch=[];const s=source.slides[i];
  for(const k of ['eyebrow','title','subtitle','analogy','footnote']){checked++;if(r.vals[k]!==s[k])mismatch.push(k);}
  s.panels.forEach((p,j)=>{for(const k of ['title','tool','body','highlight']){checked++;if(r.vals.panels[j][k]!==p[k])mismatch.push(`panel${j}.${k}`);}});
  await page.screenshot({path:path.join(previews,`slide-${String(i+1).padStart(2,'0')}.png`)});
  delete r.vals;results.push({slide:i+1,mismatch,...r});
 }
 const net=[];page.on('request',r=>{if(/^https?:/.test(r.url()))net.push(r.url());});
 await page.setViewportSize({width:1440,height:900});
 await page.goto(pathToFileURL(path.join(root,'crista-science-relay.html')).href+'#1');await page.evaluate(()=>window.cristaReady);
 await page.keyboard.press('End');await page.evaluate(()=>window.fitScienceText());
 if(await page.evaluate(()=>window.cristaDeck.index())!==4)throw Error('마지막 장 이동 실패');
 await page.keyboard.press('KeyT');await page.locator('.toc-button').nth(1).click();await page.evaluate(()=>window.fitScienceText());
 if(await page.evaluate(()=>window.cristaDeck.index())!==1)throw Error('목차 이동 실패');
 await page.keyboard.press('KeyN');if(!(await page.locator('body').evaluate(e=>e.classList.contains('show-notes'))))throw Error('노트 실패');await page.keyboard.press('KeyN');
 await page.keyboard.press('KeyF');await page.waitForFunction(()=>!!document.fullscreenElement);await page.keyboard.press('KeyF');await page.waitForFunction(()=>!document.fullscreenElement);
 await page.keyboard.press('Home');await page.evaluate(()=>window.fitScienceText());await page.screenshot({path:path.join(root,'viewer-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.cristaDeck.fit());
 const mobile=await page.evaluate(()=>{const r=document.querySelector('.frame').getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1});
 await page.screenshot({path:path.join(root,'viewer-mobile.png')});
 await page.emulateMedia({media:'print'});const printSlides=await page.locator('.frame>.slide:visible').count();
 const summary={slides:5,copyFragments:checked,copyMismatch:results.flatMap(r=>r.mismatch).length,overflow:results.flatMap(r=>r.overflow),outside:results.flatMap(r=>r.outside),overlap:results.flatMap(r=>r.overlap),relayLoaded:results.every(r=>r.fontLoaded),imagesLoaded:results.every(r=>r.images),pageErrors:errors,networkRequests:net,keyboard:true,contents:true,notes:true,fullscreen:true,mobileFits:mobile,printSlides};
 fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify({summary,slides:results},null,2));console.log(JSON.stringify(summary,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
