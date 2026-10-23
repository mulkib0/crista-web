"""원본을 보존하고 별도 파일에 전체 연수 자료를 조판한다."""
from pathlib import Path
import base64, hashlib, html, json, re, sys
P = Path(__file__).resolve().parent
ROOT = P.parents[2]
sys.path.insert(0, str(P / '.deps'))
from bs4 import BeautifulSoup

source = (P / 'source-reference.html').read_text()
soup = BeautifulSoup(source, 'html.parser')
sections = soup.select('.slide')
total=len(sections)
assert total == 106
edited = json.loads((P / 'copy.json').read_text()) if (P / 'copy.json').exists() else {}
copy = {x['index']: x for x in edited.get('slides', [])}
fallback = json.loads((P.parent/'crista-science-relay-v2/ui.json').read_text())
ui = {**fallback, **edited.get('ui', {})}
glossary_source = json.loads((P / 'glossary-source.json').read_text())
gui = glossary_source['ui']
ui.setdefault('toc', fallback['contents'])
ui.setdefault('glossary', gui['details'])
ui.setdefault('question', gui['question_label'])
ui.setdefault('sourceNote', '2026-10-24 · 교사 연수')
ui.setdefault('searchPlaceholder', fallback['contents'])
ui.setdefault('title', 'AI 신약개발 탐구 수업 · 교사 연수')
ui.setdefault('noResults', '0')

art_slides = {10:'protein',11:'protein',12:'molecules',13:'molecules',17:'docking',18:'docking',19:'molecules',20:'review',21:'review',24:'molecules',27:'molecules',32:'protein',33:'protein',37:'docking',39:'review',41:'molecules',43:'review',45:'review',49:'review'}
index_map=json.loads((P/'index-map.json').read_text())
art_slides={index_map[str(i)]:kind for i,kind in art_slides.items()}
chapter = 0
manifest = []
patch_log = []
for idx, s in enumerate(sections, 1):
    original_title = s.select_one('.title').get_text(' ',strip=True)
    original_sub = s.select_one('.sub').get_text(' ',strip=True) if s.select_one('.sub') else ''
    for p in [x for x in edited.get('replacements', []) if x['index'] == idx]:
        matches = [t for t in s.find_all(string=True) if str(t).strip() == p['old']]
        if len(matches) == 1:
            matches[0].replace_with(p['new'])
            if idx in copy:
                for field in ['title','subtitle']:
                    if copy[idx].get(field)==p['old']:copy[idx][field]=p['new']
            patch_log.append({**p, 'applied': True})
        else:
            patch_log.append({**p, 'applied': False, 'matches':len(matches)})
    if 'divider' in s.get('class', []):
        chapter += 1
        next_divider=next((j for j in range(idx+1,total+1) if 'divider' in sections[j-1].get('class',[])),total+1)
        pno=s.select_one('.pno')
        if pno:
            for t in pno.find_all(string=True):
                if '장' in str(t):t.replace_with(re.sub(r'\d+(?=장)',str(next_divider-idx-1),str(t)))
        rg=s.select_one('.range')
        if rg:rg.string=f'SLIDES {idx+1:02} — {next_divider-1:02}'
    s['data-index'] = str(idx)
    s['data-chapter'] = str(chapter)
    s['id'] = f'slide-{idx:02}'
    s['aria-label'] = f'{idx} / {total}'
    s['aria-hidden'] = 'true'
    if idx in copy:
        title=s.select_one('.title')
        small=title.select_one('small')
        if small: small.extract()
        title.clear()
        if idx == 1:
            title.append('교실 속 바이오 스타트업,')
            title.append(soup.new_tag('br'))
            title.append('AI 신약개발 탐구 수업')
        else:
            heading=re.sub(r'^(?:PART\s+\d+|STEP\s+\d+\.\d+(?:\s*\(\d+/\d+\))?|오픈소스 설치\s*\(\d+/\d+\))\s*·\s*','',copy[idx]['title'])
            title.append(heading)
        if small: title.append(small)
        sub=s.select_one('.sub')
        if not sub:
            sub=soup.new_tag('p',attrs={'class':'sub'})
            title.insert_after(sub)
        sub.clear(); sub.append(copy[idx]['subtitle'])
    classes=s.get('class',[])
    if idx in art_slides and not s.select_one('.items.n4'):
        classes.append('with-art')
        art=soup.new_tag('div',attrs={'class':f'art art-{art_slides[idx]}','aria-hidden':'true'})
        s.append(art)
    if s.select_one('.cols'): classes.append('installation')
    if 'cover' in classes or 'divider' in classes:
        for old in s.select('.ribbon,.scrim,.orb'): old.decompose()
        kind='protein' if idx==1 else ['protein','docking','molecules','docking','review','molecules'][chapter-1]
        art=soup.new_tag('div',attrs={'class':f'chapter-art art-{kind}','aria-hidden':'true'})
        s.insert(0,art)
    s['class']=classes
    flow=s.select_one('.items.flow')
    if flow:
        for li,kind in zip(flow.select(':scope > li'),['protein','molecules','docking','review']):
            art=soup.new_tag('div',attrs={'class':f'flow-art art-{kind}','aria-hidden':'true'})
            li.insert(0,art)
    foot=soup.new_tag('footer',attrs={'class':'foot'})
    foot.append(BeautifulSoup(f'<b>CRISTA</b><span>교사 연수</span><span class="chapter-label">{"PART "+str(chapter).zfill(2) if chapter else "RELAY EDITION"}</span><span class="pg"><b>{idx:02}</b> / {total}</span>','html.parser'))
    s.append(foot)
    manifest.append({'index':idx,'source_no':s.get('data-no'),'chapter':chapter,'title':s.select_one('.title').get_text(' ',strip=True),'original_title':original_title,'original_subtitle':original_sub,'notes':copy.get(idx,{}).get('notes',''),'question':copy.get(idx,{}).get('question',''),'text':s.get_text(' ',strip=True),'layout':' '.join(classes)})

original_css=soup.find('style').get_text().split('/* 진행 띠')[0]
style=original_css+'\n'+(P/'theme.css').read_text()
asset_css='@font-face{font-family:Relay;src:url("assets/Relay-Regular.woff2") format("woff2");font-weight:400;font-display:block}@font-face{font-family:Relay;src:url("assets/Relay-SemiBold.woff2") format("woff2");font-weight:500 900;font-display:block}\n'+''.join(f'.art-{k}{{background-image:url("assets/glass-{k}.png")}}' for k in ['protein','molecules','docking','review'])+'\n'
glossary=[]
reference_map={x['source_no']:x['index'] for x in manifest if x['source_no']}
for group in glossary_source['slides']:
    for c in group['concepts']:
        refs=[reference_map[n] for n in re.findall(r'\b\d{2}\b',c['reference']) if n in reference_map]
        corrected_reference=re.sub(r'\b\d{2}\b',lambda m:str(reference_map.get(m.group(),int(m.group()))).zfill(2),c['reference'])
        glossary.append({**c,'source_reference':c['reference'],'reference':corrected_reference,'refs':refs,'group':group['nav']})
payload=json.dumps({'ui':ui,'slides':manifest,'glossary':glossary,'glossaryUI':gui},ensure_ascii=False).replace('</','<\\/')
svg=soup.select_one('svg[style]')
short_labels={'toc':fallback['contents'],'notes':fallback['notes'],'glossary':gui['details'],'fullscreen':fallback['fullscreen'],'print':fallback['print']}
toolbar=''.join(f'<button type="button" data-action="{action}" title="{html.escape(ui[label])}">{html.escape(short_labels[label])}<kbd>{key}</kbd></button>' for action,label,key in [('toc','toc','M'),('notes','notes','N'),('glossary','glossary','G'),('fullscreen','fullscreen','F'),('print','print','P')])
body=f'''<div class="progress" aria-hidden="true"></div><div class="viewport"><main class="deck" id="deck">{''.join(map(str,sections))}</main></div>{str(svg) if svg else ''}
<nav class="toolbar" aria-label="{html.escape(ui['title'])}"><button data-action="prev" aria-label="{ui['prev']}">←</button><output id="position" aria-live="polite"></output><button data-action="next" aria-label="{ui['next']}">→</button><span class="separator"></span>{toolbar}<button data-action="help" aria-label="{ui['help']}">?</button></nav>
<dialog id="panel"><header class="panel-head"><h2 id="panel-title"></h2><button id="panel-close">{ui['close']} <kbd>Esc</kbd></button></header><div id="panel-body"></div></dialog>
<script id="deck-data" type="application/json">{payload}</script><script>{(P/'viewer.js').read_text()}</script>'''
doc=f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{ui["title"]}</title><style>{style+asset_css}</style></head><body>{body}</body></html>'
(P/'index.html').write_text(doc)
for a in (P/'assets').iterdir():
    if a.suffix not in ['.png','.woff2']: continue
    mime='image/png' if a.suffix=='.png' else 'font/woff2'
    doc=doc.replace('assets/'+a.name,'data:'+mime+';base64,'+base64.b64encode(a.read_bytes()).decode())
target=ROOT/'docs/slides/2026-10-24-teacher-training-relay-v2.html'
target.write_text(doc)
(P/'2026-10-24-teacher-training-relay-v2.html').write_text(doc)
(P/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(P/'patch-log.json').write_text(json.dumps(patch_log,ensure_ascii=False,indent=2))
(P/'speaker-notes.md').write_text('# '+ui['title']+'\n\n'+ui['sourceNote']+'\n\n'+'\n\n'.join(f'## {x["index"]:02} · {x["title"]}\n\n{x["notes"]}\n\n**{ui["question"]}** {x["question"]}' for x in manifest))
print(json.dumps({'target':str(target),'slides':len(sections),'glossary':len(glossary),'patches':len(patch_log),'unmatched':[x for x in patch_log if not x['applied']],'bytes':len(doc.encode())},ensure_ascii=False))
