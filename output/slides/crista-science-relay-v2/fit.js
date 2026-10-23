// 원문을 줄이거나 바꾸지 않고 지정된 칸 안에서 글자 크기만 소폭 조정한다.
window.fitScienceText=async()=>{
 await document.fonts.ready;
 const hidden=[];
 for(const s of document.querySelectorAll('.slide'))if(getComputedStyle(s).display==='none'){
  hidden.push([s,s.style.display,s.style.visibility]);s.style.display='block';s.style.visibility='hidden';
 }
 const fits=[];
 for(const el of document.querySelectorAll('[data-fit-min]')){
  const minimum=Number(el.dataset.fitMin);
  let size=parseFloat(getComputedStyle(el).fontSize);
  for(let i=0;i<100&&(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)&&size>minimum;i++){
   size=Math.max(minimum,size-.5);el.style.fontSize=size+'px';
  }
  fits.push({className:el.className,size,minimum,overflow:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1});
 }
 window.scienceTextFit=fits;
 for(const [s,display,visibility] of hidden){s.style.display=display;s.style.visibility=visibility;}
};
window.scienceReady=Promise.all([window.fitScienceText(),...[...document.images].map(i=>i.decode().catch(()=>{}))]);
