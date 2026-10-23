"""기존 검수와 겹치지 않는 남은 증거와 한 줄 교정을 확인한다."""
import json
import subprocess
import sys
from pathlib import Path
p=Path(__file__).resolve().parent
role=sys.argv[1].lower()
previous=json.loads((p/f'review-{role}-final-result.json').read_text())
numbers=[5,6,7,15,19,20,22,23,25,27] if role=='a' else [27]
prompt=f'''최종 기록 보완을 위한 짧은 추가 검수다. 너는 이미 수정본을 PASS로 판정했다. 전체 조사를 다시 하지 마라. 코드를 수정하지 마라.
경로: /Users/mulkib/Desktop/repo/crista-web/output/slides/teacher-training-relay
27번은 네 시각 검수의 선택적 Minor 제안 그대로 소제목을 '3단 문항·노트와 가동 연구비'로 바꾸고 새로 렌더했다. 다른 31장은 직전 PASS 판정 때와 같은 원본이다.
이번에 아래 PNG만 read_file로 실제 열어 추가 확인한다: {', '.join('.slides-grab/gate-preview/slide-'+str(n).zfill(2)+'.png' for n in numbers)}.
역할 {role.upper()}의 기존 검수 기준으로 문제 유무를 판단하라. A는 이전 수정본 검수에서 확인한23장에 더해 누락9장과27번 한 줄 교정을 확인하는 것이다. B는 기존32장 중 바뀐27번만 확인한다. 새로운 Critical/Major/Minor가 없으면 PASS와 findings빈배열로 반환한다. 과거에 해결된문제를 반복하지 마라.
최종은 JSON만: {{"role":"{role.upper()}","verdict":"PASS|REVISE|FAIL","confidence":"High|Medium|Low","image_viewing_method":"실제 사용 방법","inspected_images":[...],"checks":{{"Supplemental verification":"PASS|REVISE|FAIL"}},"findings":[],"copy_patches":[],"summary":"짧은 한국어 결론"}}.'''
(p/f'review-{role}-supplement-request.md').write_text(prompt)
def clean(v):
 if isinstance(v,dict):
  if v.get('type') in ['thinking','redacted_thinking']:return None
  return {k:clean(x) for k,x in v.items() if k not in ['thinking','reasoning','signature','redacted_thinking']}
 if isinstance(v,list):return [x for a in v if (x:=clean(a)) is not None]
 return v
with (p/f'review-{role}-supplement-stderr.log').open('w') as err,(p/f'review-{role}-supplement-events.jsonl').open('w') as out:
 proc=subprocess.Popen(['agy','--model','gemini-4-argon-high','--conversation',previous['conversation_id'],'--mode','plan','--output-format','stream-json','--print',prompt],stdout=subprocess.PIPE,stderr=err,text=True,cwd=p)
 for line in proc.stdout:
  try:
   e=clean(json.loads(line))
   if e is not None:
    out.write(json.dumps(e,ensure_ascii=False)+'\n');out.flush()
    if e.get('event')=='result':
     r=e['result'];(p/f'review-{role}-supplement-result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
     v=json.loads(r['response']);(p/f'review-{role}-supplement.json').write_text(json.dumps(v,ensure_ascii=False,indent=2))
  except json.JSONDecodeError:pass
 code=proc.wait()
print(json.dumps({'role':role,'exit':code}))
