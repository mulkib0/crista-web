"""요청된 Antigravity 모델로 읽기 전용 검수를 실행하고 도구 사용 기록을 남긴다."""
import json
import subprocess
import sys
from pathlib import Path

p=Path(__file__).resolve().parent
role=sys.argv[1]
charters={
 'A':'''Pass A: System Contract / Constraint Integrity. 모든 32장의 argon-copy.json과 HTML 구조를 검수하고 실제 PNG는 최소 01,04,05,06,08,09,13,15,16,21,23,25,28,29,31,32를 열어 확인한다. 구현 범위/내용의 사실성, 문구 출처, 팔레트/Relay 글꼴 일관성, 수업용 모델과 실제 과학의 구분, 허위 보장/과장, 기존 원고의 오류가 남았는지 집중적으로 검토한다. checks 키는 System consistency, Color discipline, AI slop tropes, Content discipline 이다.''',
 'B':'''Pass B: Audience Impact / Expressive Readability. 실제 렌더 PNG 32장을 모두 이미지로 열어 슬라이드마다 확인한다. 화면 밖 잘림, 제목·본문·하단 겹침, 한글 어절 중간 잘림, 한 단어만 남는 불균형 줄바꿈, Relay 받침 잘림/깨짐, 내용 밀도와 3~5초 핵심 파악, 강의실에서의 읽기 쉬움, 시각적 중심과 반복 리듬을 검수한다. 처음부터 끝까지 훑기만 하지 말고 모든 PNG를 직접 열어 본다. checks 키는 Composition & hierarchy, Typography & legibility, Korean/CJK word-break integrity, Review Litmus 이다. 문구는 바꾸지 말고 수정이 정말 필요하면 copy_patches로 제안한다. 자동 검사 통과는 참고자료이며 시각적 PASS를 보장하지 않는다.'''
}
prompt=(p/'review-common.md').read_text()+'\n\n# 이번 검수 역할\n'+charters[role]
(p/f'review-{role.lower()}-request.md').write_text(prompt)

def clean(value):
 if isinstance(value,dict):
  if value.get('type') in ['thinking','redacted_thinking']:return None
  return {k:clean(v) for k,v in value.items() if k not in ['thinking','reasoning','signature','redacted_thinking']}
 if isinstance(value,list):return [x for v in value if (x:=clean(v)) is not None]
 return value

with (p/f'review-{role.lower()}-stderr.log').open('w') as err,(p/f'review-{role.lower()}-events.jsonl').open('w') as out:
 proc=subprocess.Popen(['agy','--model','gemini-4-argon-high','--mode','plan','--output-format','stream-json','--print',prompt],stdout=subprocess.PIPE,stderr=err,text=True,cwd=p)
 for line in proc.stdout:
  try:
   event=clean(json.loads(line))
   if event is not None:
    out.write(json.dumps(event,ensure_ascii=False)+'\n');out.flush()
  except json.JSONDecodeError:
   pass
 code=proc.wait()
print(json.dumps({'role':role,'exit':code}))
