(() => {
  const data=JSON.parse(document.querySelector('#deck-data').textContent);
  const {ui}=data, slides=[...document.querySelectorAll('.slide')], deck=document.querySelector('#deck');
  const dialog=document.querySelector('#panel'), body=document.querySelector('#panel-body');
  const text=(tag,content,cls)=>{const e=document.createElement(tag);e.textContent=content;if(cls)e.className=cls;return e};
  let index=0, idle, touchX=null;
  const wake=()=>{document.body.classList.add('ui-active');clearTimeout(idle);idle=setTimeout(()=>document.body.classList.remove('ui-active'),3200)};
  const fit=()=>{deck.style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1920,innerHeight/1080)})`};
  const alignArt=s=>{const art=s.querySelector('.art'),items=s.querySelector(':scope > .items');if(art&&items){art.style.top=items.offsetTop+'px';art.style.height=Math.min(items.offsetHeight,540)+'px'}};
  const fitConcept=s=>{if(!s.classList.contains('concept'))return;let k=1;const foot=s.querySelector('.cfoot');s.style.setProperty('--k','1');while(foot&&foot.offsetTop+foot.offsetHeight>966&&k>.84){k=Math.round((k-.02)*100)/100;s.style.setProperty('--k',k)}};
  const show=(n,hash=true)=>{
    index=Math.max(0,Math.min(slides.length-1,Number.isFinite(n)?n:0));
    slides.forEach((s,i)=>{s.classList.toggle('on',i===index);s.setAttribute('aria-hidden',String(i!==index));s.inert=i!==index});
    alignArt(slides[index]);
    document.querySelector('#position').textContent=`${index+1} / ${slides.length}`;
    document.querySelector('.progress').style.width=`${100*(index+1)/slides.length}%`;
    document.querySelector('[data-action="prev"]').disabled=index===0;
    document.querySelector('[data-action="next"]').disabled=index===slides.length-1;
    if(hash&&location.hash!==`#${index+1}`)history.replaceState(null,'',`#${index+1}`);
  };
  const close=()=>dialog.close();
  const open=(kind)=>{
    document.querySelector('#panel-title').textContent=ui[kind];body.replaceChildren();dialog.dataset.kind=kind;
    if(kind==='toc'){
      const input=document.createElement('input');input.className='search';input.placeholder=ui.searchPlaceholder;input.setAttribute('aria-label',ui.searchPlaceholder);
      const list=text('div','','toc-list');
      const fill=()=>{list.replaceChildren();const q=input.value.toLowerCase().trim();data.slides.filter(s=>!q||s.text.toLowerCase().includes(q)).forEach(s=>{
        const b=text('button','',`toc-item${s.index===index+1?' current':''}${s.layout.includes('divider')?' chapter':''}`);b.append(text('span',String(s.index).padStart(2,'0'),'num'),text('span',s.title));b.onclick=()=>{show(s.index-1);close()};list.append(b);
      });if(!list.children.length)list.append(text('p',ui.noResults));};
      input.oninput=fill;body.append(input,list);fill();
    }else if(kind==='notes'){
      const s=data.slides[index];body.append(text('h3',`${String(s.index).padStart(2,'0')} · ${s.title}`,'note-title'),text('p',s.notes,'note-copy'));
      const q=text('div','','note-question');q.append(text('b',ui.question),text('span',s.question));body.append(q);
    }else if(kind==='glossary'){
      const input=document.createElement('input');input.className='search';input.placeholder=ui.searchPlaceholder;input.setAttribute('aria-label',ui.searchPlaceholder);
      const list=text('div','');const g=data.glossaryUI;
      const fill=()=>{list.replaceChildren();const q=input.value.toLowerCase().trim();data.glossary.filter(c=>!q||JSON.stringify(c).toLowerCase().includes(q)).forEach(c=>{
        const d=text('details','','concept-entry'),summary=text('summary',c.title);summary.append(text('small',c.group));d.append(summary);
        const inner=text('div','','concept-body');[['definition',g.definition_label],['analogy',g.analogy_label],['caution',g.caution_label],['reference',g.reference_label]].forEach(([key,label])=>{const p=text('p','',key);p.append(text('b',label),text('span',c[key]));inner.append(p)});
        const refs=text('div','','panel-links');for(const n of c.refs){const b=text('button',`${String(n).padStart(2,'0')} · ${data.slides[n-1].title}`);b.onclick=()=>{show(n-1);close()};refs.append(b)}inner.append(refs);d.append(inner);list.append(d);
      });if(!list.children.length)list.append(text('p',ui.noResults));};input.oninput=fill;body.append(input,list);fill();
    }else{body.append(text('p',ui.helpBody));}
    body.append(text('p',ui.sourceNote,'panel-source'));
    if(kind==='glossary'){
      const links=text('div','','panel-links');[['Open Targets','https://github.com/opentargets/platform-docs/blob/main/associations.md'],['AutoDock Vina','https://vina.scripps.edu/manual/'],['ChEMBL','https://chembl.gitbook.io/chembl-interface-documentation/frequently-asked-questions/drug-and-compound-questions']].forEach(([label,url])=>{const a=text('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a)});body.append(links);
    }
    dialog.showModal();body.scrollTop=0;
  };
  const fullscreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}};
  const action=(name)=>{wake();if(name==='next')show(index+1);else if(name==='prev')show(index-1);else if(name==='fullscreen')fullscreen();else if(name==='print')print();else open(name)};
  document.querySelector('.toolbar').addEventListener('click',e=>{const b=e.target.closest('button');if(b)action(b.dataset.action)});
  document.querySelector('#panel-close').onclick=close;
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
  addEventListener('keydown',e=>{
    if(e.metaKey||e.ctrlKey||e.altKey||dialog.open||e.target.closest('input,textarea,summary'))return;
    if(e.target.closest('button,a')&&[' ','Enter'].includes(e.key))return;
    let a=null;if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key))a='next';if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key))a='prev';
    const shortcuts={t:'toc',m:'toc',n:'notes',d:'glossary',g:'glossary',f:'fullscreen',p:'print','?':'help'};a=a||shortcuts[e.key.toLowerCase()];
    if(a){e.preventDefault();action(a)}else if(e.key==='Home'){e.preventDefault();show(0)}else if(e.key==='End'){e.preventDefault();show(slides.length-1)}
  });
  addEventListener('pointermove',wake,{passive:true});addEventListener('resize',fit);addEventListener('hashchange',()=>show(Number(location.hash.slice(1))-1));
  deck.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX},{passive:true});deck.addEventListener('touchend',e=>{if(touchX!==null){const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)show(index+(dx<0?1:-1));touchX=null}},{passive:true});
  window.cristaDeck={show,fit,open,close,get index(){return index},total:slides.length};
  fit();show(Number(location.hash.slice(1))-1);wake();
  window.cristaReady=Promise.all([document.fonts.ready,...['protein','molecules','docking','review'].map(k=>new Promise(resolve=>{const i=new Image();i.onload=()=>resolve({art:k,width:i.naturalWidth});i.onerror=()=>resolve({art:k,width:0});i.src=getComputedStyle(document.querySelector('.art-'+k)).backgroundImage.trim().slice(4,-1).replace(/^['"]|['"]$/g,'')}))]).then(results=>{fit();slides.forEach((s,i)=>{s.classList.add('on');fitConcept(s);alignArt(s);s.classList.toggle('on',i===index)});show(index);window.cristaAssets=results.slice(1);return true});
})();
