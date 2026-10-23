"""Antigravity CLI의 Gemini 4 Argon (High)로 원본/변환 결과를 비교한다."""
import json
import subprocess
from pathlib import Path
p=Path(__file__).resolve().parent
def clean(v):
 if isinstance(v,dict):
  if v.get('type') in ['thinking','redacted_thinking']:return None
  return {k:clean(x) for k,x in v.items() if k not in ['thinking','reasoning','signature','redacted_thinking']}
 if isinstance(v,list):return [x for a in v if (x:=clean(a)) is not None]
 return v
with (p/'review-stderr.log').open('w') as err,(p/'review-events.jsonl').open('w') as out:
 proc=subprocess.Popen(['agy','--model','gemini-4-argon-high','--mode','plan','--output-format','stream-json','--print',(p/'review-request.md').read_text()],stdout=subprocess.PIPE,stderr=err,text=True,cwd=p)
 for line in proc.stdout:
  try:
   e=clean(json.loads(line))
   if e is not None:
    out.write(json.dumps(e,ensure_ascii=False)+'\n');out.flush()
    if e.get('event')=='result':
     r=e['result'];(p/'review-result.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
     report=json.loads(r['response']);(p/'review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
  except json.JSONDecodeError:pass
 code=proc.wait()
print(json.dumps({'exit':code}))
