// 장별 해설은 HTML에 내장된 Argon 원문에서만 불러온다.
(()=>{
 const data=JSON.parse(document.getElementById('science-copy').textContent);
 const ui=data.ui;
 const dialog=document.getElementById('concept-dialog');
 const list=document.getElementById('concept-list');
 const button=document.getElementById('details');
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function openConcepts(slideIndex=window.cristaDeck.index(),conceptIndex=0){
  const slide=data.slides[slideIndex];
  document.getElementById('concept-eyebrow').textContent=slide.eyebrow;
  document.getElementById('concept-title').textContent=slide.title;
  document.getElementById('concept-intro').textContent=slide.footnote;
  list.innerHTML=slide.concepts.map((c,i)=>`<details class="concept-entry" ${i===Math.min(conceptIndex,slide.concepts.length-1)?'open':''}><summary>${escape(c.title)}</summary><dl class="concept-content"><dt>${escape(ui.definition_label)}</dt><dd>${escape(c.definition)}</dd><dt>${escape(ui.analogy_label)}</dt><dd>${escape(c.analogy)}</dd><dt>${escape(ui.caution_label)}</dt><dd>${escape(c.caution)}</dd><dd class="concept-reference">${escape(ui.reference_label)} · ${escape(c.reference)}</dd></dl></details>`).join('');
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;button.setAttribute('aria-expanded','true');
  const entry=list.querySelector('.concept-entry[open]');
  if(entry&&conceptIndex>0)entry.scrollIntoView({block:'nearest'});
 }
 button.addEventListener('click',()=>openConcepts());
 document.querySelectorAll('[data-concept-slide]').forEach(el=>el.addEventListener('click',()=>openConcepts(Number(el.dataset.conceptSlide),Number(el.dataset.conceptIndex))));
 document.getElementById('concept-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>button.setAttribute('aria-expanded','false'));
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
 document.addEventListener('keydown',e=>{if(e.code!=='KeyD'||e.altKey||e.ctrlKey||e.metaKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(document.getElementById('toc-dialog').open||document.getElementById('help-dialog').open)return;e.preventDefault();if(dialog.open)dialog.close();else openConcepts();});
 window.cristaConcepts={open:openConcepts};
})();
