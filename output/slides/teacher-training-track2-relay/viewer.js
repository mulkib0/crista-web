// 로컬 파일에서도 작동하도록 외부 요청 없이 발표 상태만 관리한다.
(()=>{
 const slides=[...document.querySelectorAll('.frame>.slide')];
 const total=slides.length;
 const byId=id=>document.getElementById(id);
 const toc=byId('toc-dialog');
 const help=byId('help-dialog');
 const data=JSON.parse(byId('deck-data').textContent);
 let index=0;
 function fit(){
   const box=byId('presentation').getBoundingClientRect();
   document.documentElement.style.setProperty('--scale',Math.max(.05,Math.min((box.width-24)/960,(box.height-24)/540)));
 }
 function hashIndex(){const n=Number(location.hash.slice(1));return Number.isFinite(n)&&n>=1&&n<=total?Math.floor(n)-1:0;}
 function show(n,updateHash=true){
   index=Math.max(0,Math.min(total-1,n));
   slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.setAttribute('aria-hidden',String(i!==index));});
   byId('counter').textContent=`${String(index+1).padStart(2,'0')} / ${total}`;
   byId('prev').disabled=index===0;byId('next').disabled=index===total-1;
   byId('progress').style.width=`${(index+1)/total*100}%`;
   byId('note-title').textContent=data.slides[index].title;
   byId('note-content').textContent=data.slides[index].notes;
   byId('announcement').textContent=`${index+1} / ${total}. ${data.slides[index].title}`;
   document.querySelectorAll('.toc-button').forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
   document.title=`${data.slides[index].title} · CRISTA`;
   if(updateHash&&location.hash!==`#${index+1}`)history.replaceState(null,'',`#${index+1}`);
   fit();
 }
 function modal(d){if(d.open)d.close();else d.showModal();}
 function toggleNotes(){const on=document.body.classList.toggle('show-notes');byId('notes').setAttribute('aria-pressed',String(on));fit();}
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}}
 byId('prev').addEventListener('click',()=>show(index-1));byId('next').addEventListener('click',()=>show(index+1));
 byId('contents').addEventListener('click',()=>modal(toc));byId('notes').addEventListener('click',toggleNotes);
 byId('fullscreen').addEventListener('click',fullscreen);byId('print').addEventListener('click',()=>window.print());
 byId('help').addEventListener('click',()=>modal(help));
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>byId(b.dataset.close).close()));
 document.querySelectorAll('.toc-button').forEach((b,i)=>b.addEventListener('click',()=>{show(i);toc.close();}));
 for(const d of [toc,help])d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
 document.addEventListener('keydown',e=>{
   if(toc.open||help.open||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
   const handled=['ArrowRight','ArrowDown','Space','PageDown','ArrowLeft','ArrowUp','PageUp','Home','End','KeyT','KeyN','KeyF','KeyP','Slash'];
   if(!handled.includes(e.code))return;e.preventDefault();
   if(['ArrowRight','ArrowDown','Space','PageDown'].includes(e.code))show(index+1);
   if(['ArrowLeft','ArrowUp','PageUp'].includes(e.code))show(index-1);
   if(e.code==='Home')show(0);if(e.code==='End')show(total-1);
   if(e.code==='KeyT')modal(toc);if(e.code==='KeyN')toggleNotes();if(e.code==='KeyF')fullscreen();
   if(e.code==='KeyP')window.print();if(e.code==='Slash')modal(help);
 });
 let start=null;
 byId('presentation').addEventListener('touchstart',e=>{if(e.touches.length===1)start=[e.touches[0].clientX,e.touches[0].clientY];},{passive:true});
 byId('presentation').addEventListener('touchend',e=>{if(!start||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-start[0],dy=e.changedTouches[0].clientY-start[1];if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(index+(dx<0?1:-1));start=null;},{passive:true});
 window.addEventListener('resize',fit);window.addEventListener('hashchange',()=>show(hashIndex(),false));
 document.addEventListener('fullscreenchange',()=>{byId('fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));fit();});
 show(hashIndex(),false);
 window.cristaReady=Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]).then(()=>{document.body.classList.remove('font-loading');fit();});
 window.cristaDeck={show,index:()=>index,total,fit};
})();
