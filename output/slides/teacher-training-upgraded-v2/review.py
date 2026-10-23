"""최종 렌더를 Antigravity CLI의 Argon High로 검수한다."""
from pathlib import Path
import json,subprocess,sys
P=Path(__file__).resolve().parent
start,end=map(int,sys.argv[1:3]);name=f'review-{start:02}-{end:02}'
images=[str(P/'previews'/f'slide-{i:02}.png') for i in range(start,end+1)]
manifest=json.loads((P/'manifest.json').read_text())
request=f'''너는 Gemini 4 Argon (High) 슬라이드 검수자다. 전체 교사 연수106화면을 원본순서 그대로 Relay체+유리이미지테마로 업그레이드했다. 네 책임은 {start}~{end}번의 실제 렌더 이미지 전부를 직접 읽어 검수하는 것이다. 아래 PNG 파일을 read_file 등 이미지 열람 도구로 반드시 전부 열어라. 텍스트목록만 읽고 시각검수했다고 하지 마라. 파일 수정/삭제, 터미널 명령, 네트워크 접속은 하지 마라. 읽기만.
검수: (1) 글자 겹침/잘림/그림에 글자가 가려짐 (2) 글자 크기와 대비, 과도한 밀도 (3) 제목과 본문 핵심 일치 (4) 추정/AI예측/교육용모의와 실제 약효·안전·허가의 혼동 (5) 연수자가 설명하고 토론을 이끌기에 필요한 내용의 누락. 디자인은 아이보리·Relay·무지개빛 유리과학그림, 그림은 장식적 개념도이다. 실제 과학구조의 실측도라는 주장은 없다. 기존 본문은 대체로 유지하면서 단정적 표현만 언어교정했다. 106화면 물리적번호를 쓴다. 설치명령은 실행하지 않는다. 현재 코드/실배포 검증작업은 범위 밖이고 기준문서의 내용을 옮긴 것이다. 범위 밖 이슈는 failure로 삼지 말 것.
보고서 JSON만 최종반환: {{"reviewer":"Gemini 4 Argon (High)","status":"PASS|REVISE", "checked_images":[실제 연 PNG 절대경로 모두],"issues":[{{"slide":숫자,"severity":"major|minor","issue":"구체적문제","fix":"권장수정, 새 문구가 필요하면 네가 정확히 작성"}}],"summary":"한국어 2문장"}}. 개인취향으로 모두 재설계 요구하지 말고 실제 사용에 영향을 주는 문제를 보고. 문제없으면issues빈배열.
이미지목록:
'''+ '\n'.join(images)+'\n\n해당화면 텍스트와 발표노트:\n'+json.dumps(manifest[start-1:end],ensure_ascii=False)
(P/(name+'-request.md')).write_text(request)
def clean(v):
 if isinstance(v,dict):
  if v.get('type') in ['thinking','redacted_thinking']:return None
  return {k:clean(x) for k,x in v.items() if k not in ['thinking','reasoning','signature','redacted_thinking']}
 if isinstance(v,list):return [x for a in v if (x:=clean(a)) is not None]
 return v
with (P/(name+'-stderr.log')).open('w') as err,(P/(name+'-events.jsonl')).open('w') as out:
 proc=subprocess.Popen(['/Users/mulkib/.local/bin/agy','--model','gemini-4-argon-high','--mode','plan','--output-format','stream-json','--print',request],stdout=subprocess.PIPE,stderr=err,text=True,cwd=P)
 for line in proc.stdout:
  try:
   e=clean(json.loads(line))
   if e is not None:
    out.write(json.dumps(e,ensure_ascii=False)+'\n');out.flush()
    if e.get('event')=='result':
     result=e['result'];(P/(name+'-result.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
     raw=result['response'].strip()
     if raw.startswith('```'):raw=raw.split('\n',1)[1].rsplit('```',1)[0]
     (P/(name+'.json')).write_text(json.dumps(json.loads(raw),ensure_ascii=False,indent=2))
  except json.JSONDecodeError:pass
 code=proc.wait()
print(json.dumps({'review':name,'exit':code}))
