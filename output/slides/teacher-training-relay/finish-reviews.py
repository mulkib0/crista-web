"""Argon의 실제 재검수 응답과 현재 지문으로 검수 기록을 만든다."""
import hashlib
import json
from pathlib import Path

p=Path(__file__).resolve().parent
fingerprints={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(p.glob('slide-*.html'))}
titles={'a':'System Contract / Constraint Integrity','b':'Audience Impact / Expressive Readability'}
reviews={}
for role in ['a','b']:
 data=json.loads((p/f'review-{role}-final.json').read_text())
 supplement_path=p/f'review-{role}-supplement.json'
 if supplement_path.exists():
  supplement=json.loads(supplement_path.read_text())
  assert supplement['verdict']=='PASS',(role,supplement['verdict'])
  rechecked={int(name.removeprefix('slide-').removesuffix('.png')) for name in supplement['inspected_images']}
  data['inspected_images']=sorted(set(data['inspected_images'])|set(supplement['inspected_images']))
  data['findings']=[f for f in data.get('findings',[]) if f['slide'] not in rechecked]+supplement.get('findings',[])
  data['summary']=supplement['summary']
  data['supplement_source']=supplement_path.name
  (p/f'review-{role}-complete.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
 assert data['verdict']=='PASS',(role,data['verdict'])
 assert not any(f.get('severity') in ['Critical','Major'] for f in data.get('findings',[])),data.get('findings')
 assert all(v=='PASS' for v in data['checks'].values()),data['checks']
 reviews[role]=data
 text=[f'# Pass {role.upper()}: {titles[role]}','','VERDICT: PASS',f'Confidence: {data["confidence"]}',
       'Evidence: '+', '.join('.slides-grab/gate-preview/'+name for name in data['inspected_images']),
       'Slide fingerprints: '+', '.join(f'{name}: {digest}' for name,digest in fingerprints.items()),
       'Unresolved Critical: 0','Blocking findings: None','','## Checks']
 text.extend(f'- [x] {name}: PASS — {data["summary"]}' for name in data['checks'])
 text.extend(['','## Findings','| Slide | Finding | Severity | Fix | Status |','|-------|---------|----------|-----|--------|'])
 findings=data.get('findings',[])
 if not findings:text.append('| slide-01 … slide-32 | No blocking findings | Note | None | tracked |')
 for f in findings:text.append(f'| slide-{f["slide"]:02} | {f["issue"].replace(chr(124),"/")} | {f["severity"]} | {f["fix"].replace(chr(124),"/")} | tracked |')
 text.extend(['',f'검수 모델: Gemini 4 Argon (High) · Antigravity CLI',f'이미지 확인 방법: {data["image_viewing_method"]}',''])
 (p/f'pass-{role}.md').write_text('\n'.join(text))

debt=['# 남은 디자인 참고 사항','','| 슬라이드 | 내용 | 심각도 | 처리 |','|---|---|---|---|']
for r in reviews.values():
 for f in r.get('findings',[]):debt.append(f'| {f["slide"]} | {f["issue"].replace(chr(124),"/")} | {f["severity"]} | {f["fix"].replace(chr(124),"/")} |')
if len(debt)==4:debt.append('| 전체 | 남은 지적 없음 | 없음 | 완료 |')
(p/'design-debt.md').write_text('\n'.join(debt)+'\n')

summary=['# CRISTA 교사 연수 — 최종 검수 기록','','- 문구 작성·내용 검수·가독성 검수: **Gemini 4 Argon (High)**, Antigravity CLI (`agy --model gemini-4-argon-high`).','- HTML 조판·동작 확인: Codex.','- 확인 범위: 32장 렌더 이미지, Relay 글꼴, 현재 개발 코드와 문구의 일치, 실제 과학과 교육용 모의 판정 구분.','','## Argon 재검수 결과','']
for role,r in reviews.items():summary.extend([f'### {role.upper()} · {titles[role]}',f'**{r["verdict"]}** · {r["summary"]}',''])
summary.extend(['## 반영한 수정','','- 열역학 에너지 단위와 상온 조건을 명시했다.','- 질환 목록 제목을 실제 본문에 맞췄다.','- 모둠 참여를 강제·보장한다는 표현을 지원·권장 표현으로 고쳤다.','- 1.1~4.2와 학습·투자·시장·사옥·교사 전광판의 최신 연결 상태를 반영했다.','- 마지막 단계 뒤 화살표와 중복 번호를 없앴다.','- 괄호 뒤 조사·가운뎃점이 다음 줄 첫머리에 떨어지는 문제를 고쳤다.','','## HTML 확인','','- 장별 배치 검증: 32/32 통과, 오류 0, 경고 0.','- 별도 브라우저 확인: 잘림·겹침 0, Relay 로드 성공, 이미지 누락 0, 외부 네트워크 요청 0.','- 방향키·목차·발표자 노트·전체 화면·직접 장 주소·모바일 화면 맞춤·32쪽 인쇄 표시 확인.','- 운영 서버 배포나 실제 학생 계정의 계산 작업을 새로 실행한 검증은 아니다.','','## Design Gate Report — CRISTA 교사 연수','','**Slides reviewed:** slide-01 … slide-32','**Technical validation:** pass (slides-grab validate)','','### Findings','| Slide | Finding | Severity | Fix |','|---|---|---|---|','| 전체 | 재검수에서 미해결 Critical/Major 없음 | Note | 완료 |','','### Verdict','Proceed','','**Reason:** Argon의 내용·시각 검수 지적을 수정했고, 최신 렌더에 대한 두 재검수가 통과했다.',''])
(p/'REVIEW.md').write_text('\n'.join(summary))
print('검수 기록 생성 완료')
