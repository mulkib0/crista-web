const {chromium}=require('/opt/homebrew/lib/node_modules/slides-grab/node_modules/playwright');
const fs=require('fs'),path=require('path');
const dir=__dirname;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>requests.push(r.url()));
 await page.goto('file://'+path.join(dir,'2026-10-24-teacher-training-relay-v2.html'));
 await page.evaluate(()=>window.cristaReady);
 fs.mkdirSync(path.join(dir,'previews'),{recursive:true});
 const results=[];
 const total=await page.evaluate(()=>window.cristaDeck.total);
 const only=process.argv[2]?process.argv[2].split(',').map(Number):Array.from({length:total},(_,i)=>i+1);
 for(const number of only){
  await page.evaluate(n=>{window.cristaDeck.show(n-1);document.body.classList.remove('ui-active');document.querySelector('.toolbar').style.visibility='hidden'},number);
  const layout=await page.evaluate(()=>{
   const slide=document.querySelector('.slide.on');const root=slide.getBoundingClientRect();
   const boxes=[...slide.children].filter(e=>!e.matches('.art,.chapter-art,.foot')).map(e=>{const r=e.getBoundingClientRect();return {class:e.className,top:Math.round(r.top-root.top),bottom:Math.round(r.bottom-root.top),height:Math.round(r.height),width:Math.round(r.width)}});
   const textOverflow=[];
   for(const el of slide.querySelectorAll('h1,h2,h3,p,li,td,th,pre,b,span')){
    if(el.closest('.foot'))continue;
    const parent=el.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(el);
    for(const r of range.getClientRects())if(r.width&&r.height&&(r.right>root.right-70||r.left<root.left+65||r.bottom>root.top+975)){textOverflow.push({tag:el.tagName,text:el.textContent.slice(0,65),bottom:Math.round(r.bottom-root.top),right:Math.round(r.right-root.left)});break}
    if(el.scrollWidth>el.clientWidth+3)textOverflow.push({tag:el.tagName,text:el.textContent.slice(0,65),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth});
   }
   return {index:Number(slide.dataset.index),k:getComputedStyle(slide).getPropertyValue('--k'),boxes,textOverflow};
  });
  results.push(layout);
  await page.screenshot({path:path.join(dir,'previews',`slide-${String(number).padStart(2,'0')}.png`)});
 }
 const fonts=await page.evaluate(()=>({regular:document.fonts.check('400 30px Relay'),semibold:document.fonts.check('600 30px Relay'),count:[...document.fonts].length}));
 fs.writeFileSync(path.join(dir,'layout-check.json'),JSON.stringify({errors,requests,fonts,results},null,2));
 console.log(JSON.stringify({slides:results.length,errors,requests,fonts,overflow:results.filter(r=>r.textOverflow.length||r.boxes.some(b=>b.bottom>977)).map(r=>({index:r.index,boxes:r.boxes.filter(b=>b.bottom>977),text:r.textOverflow.slice(0,5)}))},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
