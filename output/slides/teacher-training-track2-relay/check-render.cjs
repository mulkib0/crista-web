/* 장별 PNG와 실제 브라우저 배치 정보를 함께 기록한다. */
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('/opt/homebrew/lib/node_modules/slides-grab/node_modules/playwright');
const root=__dirname;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:2});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const output=path.join(root,'.slides-grab/gate-preview');fs.mkdirSync(output,{recursive:true});
 const rows=[];
 const total=JSON.parse(fs.readFileSync(path.join(root,'argon-copy.json'),'utf8')).slides.length;
 for(let n=1;n<=total;n++){
  const name=`slide-${String(n).padStart(2,'0')}`;
  await page.goto(pathToFileURL(path.join(root,name+'.html')).href);
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  const checks=await page.evaluate(()=>{
   const frame=document.querySelector('.slide').getBoundingClientRect();
   const main=document.querySelector('.slide-main').getBoundingClientRect();
   const takeaway=document.querySelector('.takeaway').getBoundingClientRect();
   const texts=[...document.querySelectorAll('.slide h1,.slide h2,.slide h3,.slide p')];
   const outside=texts.filter(e=>{const r=e.getBoundingClientRect();return r.bottom>frame.bottom-8||r.right>frame.right-8||r.left<frame.left+8;}).map(e=>e.textContent);
   const crossing=[...document.querySelectorAll('.slide-main .item,.slide-main h1,.slide-main .subtitle')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>takeaway.top-3||r.top<main.top-2;}).map(e=>e.textContent);
   const clipped=[...document.querySelectorAll('.slide *')].filter(e=>{const s=getComputedStyle(e);return /hidden|clip/.test(s.overflow+s.overflowX+s.overflowY)&&(e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2);}).map(e=>({tag:e.className,h:e.clientHeight,scroll:e.scrollHeight}));
   const font=getComputedStyle(document.querySelector('.title')||document.querySelector('h1')).fontFamily;
   const images=[...document.images].map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0}));
   return {outside,crossing,clipped,font,fontReady:document.fonts.check('600 32px "Relay체"','한글'),images};
  });
  await page.screenshot({path:path.join(output,name+'.png')});
  rows.push({slide:n,...checks});
 }
 // 단일 파일 발표본의 목차·노트·이동·직접 주소·모바일 배치를 확인한다.
 const deck=path.resolve(root,'../../../design/teacher-training-track2-relay.html');
 await page.setViewportSize({width:1440,height:900});
 const requests=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(pathToFileURL(deck).href+'#1');await page.evaluate(()=>window.cristaReady);
 await page.keyboard.press('ArrowRight');
 if(await page.evaluate(()=>window.cristaDeck.index())!==1)throw Error('다음 이동 실패');
 await page.keyboard.press('End');
 if(await page.evaluate(()=>window.cristaDeck.index())!==total-1)throw Error('마지막 장 이동 실패');
 await page.keyboard.press('KeyT');
 if(!(await page.locator('#toc-dialog').evaluate(e=>e.open)))throw Error('목차 열기 실패');
 await page.locator('.toc-button').nth(5).click();
 if(await page.evaluate(()=>window.cristaDeck.index())!==5)throw Error('목차 선택 실패');
 await page.keyboard.press('KeyN');
 if(!(await page.locator('body').evaluate(e=>e.classList.contains('show-notes'))))throw Error('발표자 노트 실패');
 await page.screenshot({path:path.join(root,'viewer-notes.png')});
 await page.keyboard.press('KeyN');await page.keyboard.press('Home');
 await page.screenshot({path:path.join(root,'viewer-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.cristaDeck.fit());
 await page.screenshot({path:path.join(root,'viewer-mobile.png')});
 const touchFit=await page.evaluate(()=>{const r=document.querySelector('.frame').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;});
 await page.emulateMedia({media:'print'});
 const printed=await page.locator('.frame>.slide:visible').count();
 const summary={slides:rows.length,layoutIssues:rows.filter(r=>r.outside.length||r.crossing.length||r.clipped.length||!r.fontReady||r.images.some(i=>!i.ok)),pageErrors:errors,remoteRequests:requests,keyboard:true,contents:true,notes:true,mobileFits:touchFit,printSlides:printed};
 fs.writeFileSync(path.join(root,'render-check.json'),JSON.stringify({summary,slides:rows},null,2));
 console.log(JSON.stringify(summary,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
