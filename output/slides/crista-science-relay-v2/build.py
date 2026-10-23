"""기존 파일을 읽기만 하고 별도 v2 HTML을 만든다."""
import base64
import html
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
OUTPUT='crista-science-relay-v2.html'
IDS=['00-overview','01-target','02-compounds','03-docking','04-admet-review']
KINDS=['overview','target','compounds','docking','admet']

def esc(v):return html.escape(str(v),quote=True)
def words(v):return ''.join(esc(t) if t.isspace() else f'<span class="word">{esc(t)}</span>' for t in re.split(r'(\s+)',str(v)) if t)
def logo():return '<div class="brand"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M31.5 7.5A15.5 15.5 0 1 0 31.5 32.5"/><path d="M27.2 12.2A10.7 10.7 0 1 0 27.2 27.8"/><path d="M22.8 16.8A6 6 0 1 0 22.8 23.2"/></svg><span>CRISTA</span></div><span class="deck-version">v2</span>'

def panel(p,kind,page,index):
 minimum=23 if kind=='target' else 23 if kind=='docking' else 26
 title=f'<h2 class="panel-title" data-copy="title" data-fit-min="{23 if kind=="target" else 27}">{esc(p["title"])}</h2>'
 meta=f'<div class="panel-meta"><span class="panel-kind" data-copy="kind">{esc(p["kind"])}</span><p class="panel-tool" data-copy="tool" data-fit-min="15">{esc(p["tool"])}</p></div>'
 body=f'<p class="panel-body" data-copy="body" data-fit-min="{minimum}">{words(p["body"])}</p>'
 copy=title+meta+body
 if kind=='docking':copy=f'<div class="panel-copy">{copy}</div>'
 link=f'<button type="button" class="panel-highlight learn-link" data-copy="highlight" data-fit-min="{22 if kind=="target" else 24}" data-concept-slide="{page}" data-concept-index="{index}"><span class="highlight-content">{words(p["highlight"])}</span></button>'
 return f'<article class="panel">{copy}{link}</article>'

def slide(s,i,ui):
 kind=KINDS[i]
 return f'''<section class="slide {kind}" data-slide="{i+1}" aria-label="{esc(s['title'])}">
<img class="art-background" src="./assets/{s['id']}-background.png" alt="" aria-hidden="true">
<header><p class="eyebrow" data-copy="eyebrow" data-fit-min="18">{esc(s['eyebrow'])}</p><h1 class="title" data-copy="title" data-fit-min="{50 if kind=='target' else 58}">{esc(s['title'])}</h1><p class="subtitle" data-copy="subtitle" data-fit-min="{23 if kind=='target' else 25}">{esc(s['subtitle'])}</p></header>
{logo()}<div class="{'docking-rows' if kind=='docking' else 'columns'}">{''.join(panel(p,kind,i,j) for j,p in enumerate(s['panels']))}</div>
<aside class="question-box"><p class="question-label">{esc(ui['question_label'])}</p><p class="question-copy" data-copy="question" data-fit-min="28">{words(s['question'])}</p></aside>
<p class="footnote" data-copy="footnote" data-fit-min="14">{esc(s['footnote'])}</p>
{'<span class="axis axis-x" aria-hidden="true">x</span><span class="axis axis-y" aria-hidden="true">y</span><span class="axis axis-z" aria-hidden="true">z</span>' if kind=='target' else ''}</section>'''

def read_copy():
 path=ROOT/'copy.json'
 if not path.exists():
  response=json.loads((ROOT/'argon-response.json').read_text());assert response['status']=='SUCCESS'
  text=response['response'].strip()
  if text.startswith('```'):text='\n'.join(text.splitlines()[1:-1])
  data=json.loads(text);path.write_text(json.dumps(data,ensure_ascii=False,indent=2))
 return json.loads(path.read_text())

def main():
 data=read_copy();assert data['author']=='Gemini 4 Argon (High)'
 slides=data['slides'];assert [s['id'] for s in slides]==IDS
 assert all(len(s['panels'])==4 for s in slides)
 ui=json.loads((ROOT/'ui.json').read_text());ui.update(data['ui'])
 css=(ROOT/'slides.css').read_text();fit=(ROOT/'fit.js').read_text();concept_css=(ROOT/'concepts.css').read_text();concept_js=(ROOT/'concepts.js').read_text()
 viewer_css=(ROOT/'viewer.css').read_text().replace('960px','1920px').replace('540px','1080px').replace('720pt','1920px').replace('405pt','1080px')
 viewer_js=(ROOT/'viewer.js').read_text().replace('/960','/1920').replace('/540','/1080')
 viewer_js=viewer_js.replace("slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.setAttribute('aria-hidden',String(i!==index));});","slides.forEach((s,i)=>{s.classList.toggle('active',i===index);s.setAttribute('aria-hidden',String(i!==index));}); if(window.fitScienceText)window.fitScienceText();")
 viewer_js=viewer_js.replace('Promise.all([document.fonts.ready,','Promise.all([window.scienceReady,document.fonts.ready,')
 viewer_js=viewer_js.replace('if(toc.open||help.open||','if(toc.open||help.open||document.getElementById("concept-dialog")?.open||')
 data_json=json.dumps(data,ensure_ascii=False).replace('<','\\u003c')
 modal=f'''<dialog id="concept-dialog" class="concept-dialog" aria-labelledby="concept-title"><header class="concept-head"><div><p id="concept-eyebrow" class="eyebrow-small"></p><h2 id="concept-title"></h2></div><button type="button" id="concept-close">{esc(ui['close'])}</button></header><p id="concept-intro" class="concept-intro"></p><div id="concept-list" class="concept-list"></div><p class="concept-hint">{esc(ui['details_hint'])}</p></dialog>'''
 parts=[]
 for i,s in enumerate(slides):
  markup=slide(s,i,ui);parts.append(markup)
  # 개별 장도 해설을 열 수 있으며, 다른 장으로 이동하는 발표 도구만 생략한다.
  single=f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{esc(s["title"])}</title><link rel="stylesheet" href="./slides.css"><link rel="stylesheet" href="./concepts.css"></head><body class="standalone">{markup}<button id="details" hidden></button><dialog id="toc-dialog"></dialog><dialog id="help-dialog"></dialog>{modal}<script type="application/json" id="science-copy">{data_json}</script><script>{fit}</script><script>window.cristaDeck={{index:()=>{i}}};</script><script>{concept_js}</script></body></html>'
  (ROOT/f'slide-{i+1:02}.html').write_text(single)
 deck={'deckTitle':data['deck_title'],'ui':ui,'slides':[{'title':s['title'],'notes':s['notes'],'part':s['eyebrow'],'status':''} for s in slides]}
 toc=''.join(f'<button class="toc-button" type="button"><span>{i+1:02}</span><span>{esc(s["nav"])}<small>{esc(s["title"])}</small></span></button>' for i,s in enumerate(slides))
 controls=''.join(f'<button type="button" id="{key}" class="{extra}" aria-label="{esc(ui[label])}">{esc(text)}</button>' for key,label,text,extra in [('prev','prev','←',''),('next','next','→',''),('contents','contents',ui['contents'],''),('details','details',ui['details'],''),('notes','notes',ui['notes'],'secondary-control'),('fullscreen','fullscreen',ui['fullscreen'],'secondary-control'),('print','print',ui['print'],'secondary-control'),('help','help','?','')])
 body=''.join(parts)
 shell=lambda style,body,assets: f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{esc(data['deck_title'])}</title>{style}</head><body class="font-loading"><main id="presentation" class="presentation"><div class="frame">{body}</div></main><nav class="toolbar">{controls}<p id="counter" class="count">01 / 5</p></nav><div id="progress" class="progress" aria-hidden="true"></div><aside class="notes-panel"><h2 id="note-title"></h2><p id="note-content"></p></aside><dialog id="toc-dialog" class="slide-dialog"><header class="dialog-header"><h2>{esc(ui['contents'])}</h2><button type="button" data-close="toc-dialog">{esc(ui['close'])}</button></header><div class="toc-grid">{toc}</div></dialog><dialog id="help-dialog" class="slide-dialog"><header class="dialog-header"><h2>{esc(ui['help'])}</h2><button type="button" data-close="help-dialog">{esc(ui['close'])}</button></header><p class="help-copy">{esc(ui['helpBody'])}</p></dialog>{modal}<p id="announcement" class="sr-only" aria-live="polite"></p><script type="application/json" id="deck-data">{json.dumps(deck,ensure_ascii=False).replace('<',r'\u003c')}</script><script type="application/json" id="science-copy">{data_json}</script>{assets}<script>{fit}</script><script>{viewer_js}</script><script>{concept_js}</script></body></html>'''
 (ROOT/'index.html').write_text(shell(f'<link rel="stylesheet" href="./slides.css"><link rel="stylesheet" href="./concepts.css"><style>{viewer_css}</style>',body,''))
 # 배포와 관계없는 로컬 단일 파일: 폰트와 그림도 포함한다.
 for filename in ['Relay-Regular.woff2','Relay-SemiBold.woff2']:
  css=css.replace('./assets/'+filename,'data:font/woff2;base64,'+base64.b64encode((ROOT/'assets'/filename).read_bytes()).decode())
 images={}
 for s in slides:
  images[s['id']]='data:image/png;base64,'+base64.b64encode((ROOT/'assets'/(s['id']+'-background.png')).read_bytes()).decode()
  body=body.replace(f'src="./assets/{s["id"]}-background.png"',f'data-asset="{s["id"]}"')
 assets=f'<script type="application/json" id="image-data">{json.dumps(images)}</script><script>const scienceImages=JSON.parse(document.getElementById("image-data").textContent);document.querySelectorAll("[data-asset]").forEach(e=>e.src=scienceImages[e.dataset.asset]);</script>'
 content=shell(f'<style>{css}\n{viewer_css}\n{concept_css}</style>',body,assets)
 (ROOT/OUTPUT).write_text(content)
 if (REPO/'design').is_dir():(REPO/'design'/OUTPUT).write_text(content)
 (ROOT/'speaker-notes.md').write_text('# '+data['deck_title']+'\n\n'+'\n\n'.join(f'## {i+1:02}. {s["title"]}\n\n{s["notes"]}' for i,s in enumerate(slides)))
 print(json.dumps({'html':str(REPO/'design'/OUTPUT),'slides':5,'concepts':sum(len(s['concepts']) for s in slides),'bytes':len(content.encode())},ensure_ascii=False))

if __name__=='__main__':main()
