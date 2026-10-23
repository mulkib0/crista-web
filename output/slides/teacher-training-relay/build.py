"""Argon 문구를 변경하지 않고 Relay체 HTML로 조판한다."""
from __future__ import annotations

import base64
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def words(value: object) -> str:
    """괄호·가운뎃점 뒤에서 한국어 조사만 떨어지지 않도록 어절을 보존한다."""
    return ''.join(esc(t) if t.isspace() else f'<span class="word">{esc(t)}</span>' for t in re.split(r'(\s+)',str(value)) if t)


def art(name: str, extra: str = "") -> str:
    if name not in {"protein", "molecules", "docking", "review"}:
        return ""
    return f'<img class="art art-{name} {extra}" src="./assets/glass-{name}.png" alt="" aria-hidden="true">'


def item_markup(item: dict, index: int, numbered=False, value_first=False, show_value=False) -> str:
    label = f'<h3 class="item-label">{words(item["label"])}</h3>'
    body = f'<p class="item-body">{words(item["body"])}</p>'
    value = f'<p class="item-value">{words(item["value"])}</p>' if show_value else ''
    number = f'<p class="item-index" aria-hidden="true">{index+1:02}</p>' if numbered else ""
    return f'<article class="item">{number}{value+label+body if value_first else label+body+value}</article>'


def slide_markup(s: dict, total: int, date: str) -> str:
    layout = s["layout"]
    items = s["items"]
    num = s["id"]
    illustration = s["art"]
    corner = layout in {"science", "split", "status", "compare", "rules", "disease"} and illustration != "none"
    classes = f'slide layout-{layout}' + (' with-corner' if corner else '')
    footer = f'<footer class="slide-footer"><p class="footer-brand">CRISTA</p><div class="footer-right"><p>{esc(date)}</p><p class="footer-status">{esc(s["status"])}</p><p class="page-number">{num:02} / {total}</p></div></footer>'
    eyebrow = f'<p class="eyebrow">{esc(s["eyebrow"])}</p>'
    if layout in {"cover", "closing"}:
        content = ''.join(f'<article class="item"><h3 class="item-label">{esc(it["label"])}</h3><p class="item-value">{esc(it["value"])}</p></article>' for it in items)
        main = f'<header class="slide-header">{eyebrow}</header><div class="slide-main"><div class="cover-grid"><div><h1>{esc(s["title"])}</h1><p class="subtitle">{esc(s["subtitle"])}</p></div>{art(illustration if illustration != "none" else "protein")}</div><div class="cover-items">{content}</div></div>'
    else:
        main = f'<header class="slide-header">{eyebrow}<h2 class="title">{esc(s["title"])}</h2><p class="subtitle">{esc(s["subtitle"])}</p></header>'
        if corner:
            main = f'<div class="illustrated-header">{main}{art(illustration, "corner-art")}</div>'
        numbered = layout in {"roadmap", "flow", "steps", "contrast", "collaboration", "ethics"}
        content = ''.join(item_markup(it, i, numbered, layout == 'schedule', layout in {'formula','schedule'} or (num == 8 and i == 2)) for i, it in enumerate(items))
        if layout == 'science':
            four = ' is-four' if len(items) == 4 else ''
            main += f'<div class="slide-main science-main{four}">{art(illustration) if len(items) != 4 else ""}<div class="items-rows">{content}</div></div>'
        elif layout == 'workspace':
            main += f'<div class="slide-main"><div class="workspace-map">{content}</div></div>'
        elif layout == 'disease':
            main += f'<div class="slide-main"><div class="items-rows">{content}</div></div>'
        elif layout == 'split' and len(items) == 3:
            main += f'<div class="slide-main"><div class="items-grid">{content}</div></div>'
        elif layout in {'split', 'status', 'rules', 'checklist'} or (layout == 'compare' and len(items) == 4):
            main += f'<div class="slide-main"><div class="items-matrix">{content}</div></div>'
        else:
            four = ' four' if len(items) == 4 else ''
            main += f'<div class="slide-main"><div class="items-grid{four}">{content}</div></div>'
    return f'<section class="{classes}" data-slide="{num}" data-count="{len(items)}" aria-label="{esc(s["title"])}">{main}<p class="takeaway">{esc(s["takeaway"])}</p>{footer}</section>'


def embed_css(css: str) -> str:
    for file in ["Relay-Regular.woff2", "Relay-SemiBold.woff2", "glass-atlas.png", "ribbon-paper.png"]:
        path = ROOT / "assets" / file
        if f"./assets/{file}" in css:
            mime = 'font/woff2' if file.endswith('woff2') else 'image/png'
            data = base64.b64encode(path.read_bytes()).decode()
            css = css.replace(f"./assets/{file}", f"data:{mime};base64,{data}")
    return css


def main():
    response_path = ROOT / "argon-response.json"
    copy_path = ROOT / "argon-copy.json"
    if not copy_path.exists():
        envelope = json.loads(response_path.read_text())
        assert envelope.get("status") == "SUCCESS", envelope.get("status")
        payload = envelope["response"].strip()
        if payload.startswith('```'):
            payload = '\n'.join(payload.splitlines()[1:-1])
        data = json.loads(payload)
        copy_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        data = json.loads(copy_path.read_text())
    slides = data['slides']
    assert [s['id'] for s in slides] == list(range(1, len(slides) + 1))
    assert data['author'] == 'Gemini 4 Argon (High)'
    ui = data['ui']
    css = (ROOT/'slides.css').read_text()
    date = data['dateLabel']
    content = [slide_markup(s, len(slides), date) for s in slides]
    for s, markup in zip(slides, content):
        page = f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(s["title"])}</title><link rel="stylesheet" href="./slides.css"></head><body class="standalone">{markup}</body></html>'
        (ROOT/f'slide-{s["id"]:02}.html').write_text(page)
    toc = ''.join(f'<button type="button" class="toc-button" aria-current="false"><span>{s["id"]:02}</span><span>{esc(s["title"])}<small>{esc(s["part"])} · {esc(s["status"])}</small></span></button>' for s in slides)
    controls = ''.join(f'<button type="button" id="{key}" class="{extra}" aria-label="{esc(ui[label])}" title="{esc(ui[label])}"{pressed}>{esc(text)}</button>' for key,label,text,extra,pressed in [
        ('prev','prev','←','', ''),('next','next','→','', ''),
        ('contents','contents',ui['contents'],'',''),('notes','notes',ui['notes'],'',' aria-pressed="false"'),
        ('fullscreen','fullscreen',ui['fullscreen'],'secondary-control',' aria-pressed="false"'),('print','print',ui['print'],'secondary-control',''),
        ('help','help','?','','')])
    combined_css = embed_css(css.replace("--atlas:url('./assets/glass-atlas.png')", "--atlas:none")) + '\n' + (ROOT/'viewer.css').read_text()
    safe_data = json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    script = (ROOT/'viewer.js').read_text()
    combined_content = ''.join(content)
    image_data = {}
    for name in ['protein','molecules','docking','review']:
        asset = ROOT/'assets'/f'glass-{name}.png'
        if asset.exists():
            encoded = base64.b64encode(asset.read_bytes()).decode()
            image_data[name] = f'data:image/png;base64,{encoded}'
            combined_content = combined_content.replace(f'src="./assets/glass-{name}.png"',f'data-asset="{name}"')
    assets_json = json.dumps(image_data,separators=(',',':'))
    document = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="author" content="Gemini 4 Argon (High) · Codex"><title>{esc(data['deckTitle'])}</title><style>{combined_css}</style></head>
<body class="font-loading">
<main id="presentation" class="presentation" aria-label="{esc(data['deckTitle'])}"><div class="frame">{combined_content}</div></main>
<nav class="toolbar" aria-label="{esc(ui['contents'])}">{controls}<p id="counter" class="count">01 / {len(slides)}</p></nav>
<div id="progress" class="progress" aria-hidden="true"></div>
<aside class="notes-panel" aria-label="{esc(ui['notes'])}"><h2 id="note-title"></h2><p id="note-content"></p></aside>
<dialog id="toc-dialog" class="slide-dialog"><header class="dialog-header"><h2>{esc(ui['contents'])}</h2><button type="button" data-close="toc-dialog">{esc(ui['close'])}</button></header><div class="toc-grid">{toc}</div></dialog>
<dialog id="help-dialog" class="slide-dialog"><header class="dialog-header"><h2>{esc(ui['help'])}</h2><button type="button" data-close="help-dialog">{esc(ui['close'])}</button></header><p class="help-copy">{esc(ui.get('helpBody',ui['help']))}</p></dialog>
<p id="announcement" class="sr-only" aria-live="polite"></p>
<script type="application/json" id="deck-data">{safe_data}</script><script type="application/json" id="image-data">{assets_json}</script><script>const cristaImages=JSON.parse(document.getElementById('image-data').textContent);document.querySelectorAll('[data-asset]').forEach(el=>el.src=cristaImages[el.dataset.asset]);</script><script>{script}</script>
</body></html>'''
    target = REPO/'design'/'teacher-training-relay.html'
    target.write_text(document)
    (ROOT/'teacher-training-relay.html').write_text(document)
    outline = ['---','style: ./DESIGN.slides.md','---','# CRISTA 교사 연수 — 구성', '', f'문구: {data["author"]}', '']
    notes = [f'# {data["deckTitle"]} — 발표자 노트', '', f'작성: {data["author"]}', '']
    for s in slides:
        outline.extend([f'## {s["id"]:02}. {s["title"]}',f'- 구성: {s["layout"]} / {s["status"]}',f'- 핵심: {s["takeaway"]}',''])
        notes.extend([f'## {s["id"]:02}. {s["title"]}',s['notes'],''])
    (ROOT/'slide-outline.md').write_text('\n'.join(outline))
    (ROOT/'speaker-notes.md').write_text('\n'.join(notes))
    manifest = {'문구': data['author'], '글꼴':'Relay체 Regular / SemiBold', '슬라이드':len(slides),'HTML':str(target),'원본 SHA256':hashlib.sha256(copy_path.read_bytes()).hexdigest(),'외부 요청':False}
    (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    print(json.dumps({'slides':len(slides),'html':str(target),'bytes':target.stat().st_size},ensure_ascii=False))


if __name__ == '__main__':
    main()
