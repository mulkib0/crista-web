"""원본 PNG의 Argon 문구를 그대로 Relay체 HTML 5장으로 옮긴다."""
import base64
import html
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
KINDS=['overview','target','compounds','docking','admet']

def esc(v):return html.escape(str(v),quote=True)
def words(v):return ''.join(esc(t) if t.isspace() else f'<span class="word">{esc(t)}</span>' for t in re.split(r'(\s+)',str(v)) if t)
def analogy_words(s):
 breaks={'00-overview':'안전성과','02-compounds':'화학 계산기로','03-docking':'어느 아미노산','04-admet-review':'체내 위험을'}
 phrase=breaks.get(s['id']);text=s['analogy']
 if phrase and phrase in text:
  left,right=text.split(phrase,1)
  return words(left)+'<br>'+words(phrase+right)
 return words(text)
def face_logo():return '<div class="brand"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5"/><path d="M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8"/><path d="M22.8 16.8A6 6 0 1 0 22.8 23.2"/></svg><span>CRISTA</span></div>'

def panel(p,kind):
 minimum='20' if kind=='target' else '21' if kind=='docking' else '22'
 copy=f'<h2 class="panel-title" data-copy="title" data-fit-min="{21 if kind=="target" else 24}">{esc(p["title"])}</h2><p class="panel-tool" data-copy="tool" data-fit-min="17">{esc(p["tool"])}</p><p class="panel-body" data-copy="body" data-fit-min="{minimum}">{words(p["body"])}</p>'
 if kind=='docking':copy=f'<div class="panel-copy">{copy}</div>'
 return f'<article class="panel">{copy}<p class="panel-highlight" data-copy="highlight" data-fit-min="{21 if kind=="target" else 24}"><span class="highlight-content">{words(p["highlight"])}</span></p></article>'

def slide(s,n):
 kind=KINDS[n]
 return f'''<section class="slide {kind}" data-slide="{n+1}" aria-label="{esc(s['title'])}">
<img class="art-background" src="./assets/{s['id']}-background.png" alt="" aria-hidden="true">
<header><p class="eyebrow" data-copy="eyebrow" data-fit-min="18">{esc(s['eyebrow'])}</p><h1 class="title" data-copy="title" data-fit-min="{50 if kind=='target' else 58}">{esc(s['title'])}</h1><p class="subtitle" data-copy="subtitle" data-fit-min="{23 if kind=='target' else 25}">{esc(s['subtitle'])}</p></header>
{face_logo()}<div class="{'docking-rows' if kind=='docking' else 'columns'}">{''.join(panel(p,kind) for p in s['panels'])}</div>
<aside class="analogy"><p data-copy="analogy" data-fit-min="{28 if kind=='target' else 30}">{analogy_words(s)}</p></aside><p class="footnote" data-copy="footnote" data-fit-min="14">{esc(s['footnote'])}</p>
{'<span class="axis axis-x">x</span><span class="axis axis-y">y</span><span class="axis axis-z">z</span>' if kind=='target' else ''}
</section>'''

def main():
 data=json.loads((ROOT/'copy.json').read_text());slides=data['slides'];assert len(slides)==5
 css=(ROOT/'slides.css').read_text();fit=(ROOT/'fit.js').read_text();parts=[]
 for i,s in enumerate(slides):
  content=slide(s,i);parts.append(content)
  doc=f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(s["title"])}</title><link rel="stylesheet" href="./slides.css"></head><body class="standalone">{content}<script>{fit}</script></body></html>'
  (ROOT/f'slide-{i+1:02}.html').write_text(doc)
 # 기존 발표 도구의 단축키·목차 문구도 앞서 Argon이 작성한 것을 재사용한다.
 prior=ROOT
 ui=json.loads((ROOT/'ui.json').read_text())
 viewer_css=(prior/'viewer.css').read_text().replace('960px','1920px').replace('540px','1080px').replace('720pt','1920px').replace('405pt','1080px')
 viewer_js=(prior/'viewer.js').read_text().replace('/960','/1920').replace('/540','/1080')
 viewer_js=viewer_js.replace("slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.setAttribute('aria-hidden',String(i!==index));});","slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.setAttribute('aria-hidden',String(i!==index));}); if(window.fitScienceText)window.fitScienceText();")
 viewer_js=viewer_js.replace('Promise.all([document.fonts.ready,','Promise.all([window.scienceReady,document.fonts.ready,')
 # 다섯 장의 최종 문구는 이미지/원고와 완전히 동일한 텍스트다.
 deck={'deckTitle':slides[0]['title'],'ui':ui,'slides':[{'title':s['title'],'notes':s['analogy']+'\n\n'+s['footnote'],'part':s['eyebrow'],'status':''} for s in slides]}
 toc=''.join(f'<button class="toc-button" type="button"><span>{i+1:02}</span><span>{esc(s["title"])}</span></button>' for i,s in enumerate(slides))
 controls=''.join(f'<button type="button" id="{key}" class="{extra}" aria-label="{esc(ui[label])}">{esc(text)}</button>' for key,label,text,extra in [('prev','prev','←',''),('next','next','→',''),('contents','contents',ui['contents'],''),('notes','notes',ui['notes'],''),('fullscreen','fullscreen',ui['fullscreen'],'secondary-control'),('print','print',ui['print'],'secondary-control'),('help','help','?','')])
 for filename in ['Relay-Regular.woff2','Relay-SemiBold.woff2']:
  css=css.replace('./assets/'+filename,'data:font/woff2;base64,'+base64.b64encode((ROOT/'assets'/filename).read_bytes()).decode())
 images={};body=''.join(parts)
 for s in slides:
  path=ROOT/'assets'/(s['id']+'-background.png')
  assert path.exists(),str(path)
  images[s['id']]='data:image/png;base64,'+base64.b64encode(path.read_bytes()).decode()
  body=body.replace(f'src="./assets/{s["id"]}-background.png"',f'data-asset="{s["id"]}"')
 content=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{esc(slides[0]['title'])}</title><style>{css}\n{viewer_css}</style></head><body class="font-loading"><main id="presentation" class="presentation"><div class="frame">{body}</div></main><nav class="toolbar">{controls}<p id="counter" class="count">01 / 5</p></nav><div id="progress" class="progress" aria-hidden="true"></div><aside class="notes-panel"><h2 id="note-title"></h2><p id="note-content"></p></aside><dialog id="toc-dialog" class="slide-dialog"><header class="dialog-header"><h2>{esc(ui['contents'])}</h2><button type="button" data-close="toc-dialog">{esc(ui['close'])}</button></header><div class="toc-grid">{toc}</div></dialog><dialog id="help-dialog" class="slide-dialog"><header class="dialog-header"><h2>{esc(ui['help'])}</h2><button type="button" data-close="help-dialog">{esc(ui['close'])}</button></header><p class="help-copy">{esc(ui['helpBody'])}</p></dialog><p id="announcement" class="sr-only" aria-live="polite"></p><script type="application/json" id="deck-data">{json.dumps(deck,ensure_ascii=False).replace('<',r'\u003c')}</script><script type="application/json" id="image-data">{json.dumps(images)}</script><script>const scienceImages=JSON.parse(document.getElementById('image-data').textContent);document.querySelectorAll('[data-asset]').forEach(e=>e.src=scienceImages[e.dataset.asset]);</script><script>{fit}</script><script>{viewer_js}</script></body></html>'''
 (ROOT/'crista-science-relay.html').write_text(content)
 if (REPO/'design').is_dir():(REPO/'design'/'crista-science-relay.html').write_text(content)
 linked=content.replace(f'<style>{css}\n{viewer_css}</style>',f'<link rel="stylesheet" href="./slides.css"><style>{viewer_css}</style>')
 for s in slides:linked=linked.replace(f'data-asset="{s["id"]}"',f'src="./assets/{s["id"]}-background.png"')
 linked=re.sub(r'<script type="application/json" id="image-data">.*?</script><script>const scienceImages=.*?</script>','',linked,flags=re.S)
 (ROOT/'index.html').write_text(linked)
 print(json.dumps({'slides':5,'html':str(REPO/'design'/'crista-science-relay.html'),'bytes':len(content.encode())},ensure_ascii=False))

if __name__=='__main__':main()
