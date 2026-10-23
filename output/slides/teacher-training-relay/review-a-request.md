# Gemini 4 Argon (High) 최종 검수 요청

사용자가 "Gemini 4 Argon (High)로 슬라이드 검수도 해 (terminal에서 antigravity cli 켜서)"라고 명시했다. 너는 편집자와 독립된 읽기 전용 검수자다. 실제 PNG 이미지를 이미지 읽기 도구로 열어 보아야 한다. HTML이나 파일 이름만 확인하고 이미지를 봤다고 말하지 마라. 이미지 열람이 불가능하면 검수 미완료라고 보고하라.

작업 디렉터리: /Users/mulkib/Desktop/repo/crista-web/output/slides/teacher-training-relay
발표 HTML: /Users/mulkib/Desktop/repo/crista-web/design/teacher-training-relay.html
렌더 PNG: 작업 디렉터리의 `.slides-grab/gate-preview/slide-01.png`부터 `slide-32.png`
문구 원본: `argon-copy.json` (너와 같은 Gemini 4 Argon High가 작성, 필요하면 정확한 교정 문구를 제안)
디자인 규격: `DESIGN.slides.md`
문구 작성 근거: `implementation-snapshot.json` (읽은 소스 파일 목록) 및 `argon-revision-request.md` (최신 구현 확인 내용). `implementation-evidence.md`는 최초 조사여서 옛 상태이며 최신 수정 요청보다 후순위.
장별 HTML: `slide-01.html` ... `slide-32.html` / 공통 스타일: `slides.css`
검증 결과: `validation.json`, `render-check.json`
장별 HTML의 현재 지문: `slide-fingerprints.json`

기본 요구: 아이보리 #f1f1e9, 검정 #080b09, Relay체, 투명한 무지개빛 유리 과학 이미지, 16:9. 주요 본문은 14pt 이상, 작은 라벨/각주는 10pt 이상. HTML의 모든 문구가 이미지 픽셀이 아니라 Relay 글꼴 텍스트로 조판돼야 한다. 외부 네트워크 없이 열리는 단일 파일 발표본이며 장별 개별 HTML도 있다.

현재 코드 기준 주의:
- 최신 s12는 회의·투표·실행·쇼핑, s31/s32/s33은 실제 전체 화면, s41/s42도 실제 연결된 새 화면이다.
- 여전히 학습 연구비·Series A/B·시가총액 순위·경쟁사 서랍·성과 뉴스·사옥 성장 연동은 미완료 안내 자리일 수 있다. 교사 화면은 학급·코드·명단/모둠 배정이 중심이다. 변경사항이 보이면 실제 소스를 읽어 확인하되 소스는 수정하지 마라.
- 로컬 화면 코드 존재와 운영 서버 배포/워커 E2E 성공을 구분해야 한다.
- 전임상·임상·허가는 교육용 모의 판정이며 실제 의학적 판단이나 사람·동물 실험이 아니다.
- Vina 점수는 실측 ΔG나 실제 약효 배수가 아니다. ADMET과 구조 경고는 확정 독성이 아니다. Ro5와 QED는 다른 지표다.
- 임상 모듈에는 AI 모의 결과 설명/생성도 있어 'AI는 전체 플랫폼에서 서류심사만 한다'는 단정은 틀리다.
- 슬라이드 16의 제목과 실제 목록 내용의 일치, 슬라이드 8 열역학 수치의 단위, 모둠 협업을 강제 보장처럼 표현했는지도 확인하라.

파일·코드·문구를 직접 수정하지 마라. 비밀값(.env 등)을 열거나 외부 서비스 변경을 하지 마라. 필요한 읽기·이미지 열람·검증만 한다. 브라우저를 직접 조작할 필요는 없다. PNG를 직접 읽는다.

최종 답은 코드펜스 없는 JSON 객체:
{"role":"A 또는 B","verdict":"PASS|REVISE|FAIL","confidence":"High|Medium|Low","image_viewing_method":"실제 사용한 이미지 읽기 방법","inspected_images":["slide-01.png",...],"checks":{"각 역할의 검사명":"PASS|REVISE|FAIL"},"findings":[{"slide":16,"severity":"Critical|Major|Minor|Note","issue":"문제","fix":"구체적 수정"}],"copy_patches":[{"id":16,"title":"권장 교정 문구"}],"summary":"짧은 한국어 결론"}
필요한 copy_patches는 title/subtitle/takeaway/notes 또는 items(전체 배열)를 포함할 수 있다. 문구 문제는 네가 완성된 수정안까지 제공한다. 시각적 수정은 위치/간격/크기를 구체적으로 제안한다. 근거 없이 PASS하지 마라.


# 이번 검수 역할
Pass A: System Contract / Constraint Integrity. 모든 32장의 argon-copy.json과 HTML 구조를 검수하고 실제 PNG는 최소 01,04,05,06,08,09,13,15,16,21,23,25,28,29,31,32를 열어 확인한다. 구현 범위/내용의 사실성, 문구 출처, 팔레트/Relay 글꼴 일관성, 수업용 모델과 실제 과학의 구분, 허위 보장/과장, 기존 원고의 오류가 남았는지 집중적으로 검토한다. checks 키는 System consistency, Color discipline, AI slop tropes, Content discipline 이다.