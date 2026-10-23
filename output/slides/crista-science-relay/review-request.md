# PNG 5장 → Relay체 HTML 변환 검수

사용자가 지정한 기존 PNG 5장의 디자인과 문구를 유지하며 Relay체 HTML로 옮기는 작업이다. 앞서 만든 32장 교사 연수 자료와는 다른 파일이다. 이번 검수 범위는 아래 5장뿐이다. 검수 모델은 사용자가 지정한 Gemini 4 Argon (High), 실행은 Antigravity CLI다.

루트: /Users/mulkib/Desktop/repo/crista-web/output/slides/crista-science-relay
원본 PNG 경로: /Users/mulkib/Desktop/repo/crista-web/output/slides/crista-science
원본 5장: 00-overview.png, 01-target.png, 02-compounds.png, 03-docking.png, 04-admet-review.png
새 렌더: 루트의 previews/slide-01.png ~ slide-05.png
문구 원본: copy.json (앞서 Gemini 4 Argon High가 작성한 105개 텍스트 조각)
HTML: slide-01.html ~ slide-05.html, slides.css, fit.js, crista-science-relay.html
자동 검증: verification.json

읽기 전용 검수다. 각 원본 PNG와 새 렌더 PNG 총 10장을 read_file 등 이미지 읽기 도구로 실제 열어 비교하라. 파일을 직접 수정하지 마라. 기존 문구를 새로 요약하거나 현재 플랫폼 기능을 조사하는 작업이 아니다. 이미 확정한 원문의 105개 조각을 그대로 유지해야 한다. 과학 내용의 새 작성이나 문구 수정은 하지 않는다.

Pass A: 원본 디자인/내용 보존 — 5장 대응, 무지개빛 유리 그림·아이보리 바탕·구성, 4칸/도킹 좌우 배치, 제목·본문·비유·각주 누락 여부, 실제 글자가 Relay HTML인지, 남은 원본 글자와 새 글자가 겹치는지.
Pass B: 실제 렌더 가독성 — Relay 글꼴, 잘림·겹침, 조사/단위/수식 띄어쓰기, 줄 균형, 그림과 글자의 간섭. 16:9 1920×1080을 원본 기반 프레임으로 사용한다. 32장 덱이나 720pt 템플릿 기준으로 재설계하라고 하지 마라. 원본 PNG와 동등한 밀도를 유지한 변환이다.

특히 4번(도킹) 강조문구의 띄어쓰기와 구분선 위치, 1/3/4/5번 하단 비유 줄바꿈을 확인하라. 단위/기호는 copy.json 그대로다. 원본도 사용자가 제공한 확정 자료이며 이번 범위는 폰트와 HTML 변환이다.

필요하면 CSS 배치나 글자 크기, 줄바꿈만 제안한다. 승인된 문구 자체를 수정하지 않는다. 실제 이미지 열람이 불가능하면 PASS하지 말고 알려라.

최종 JSON 하나만 반환:
{"reviewer":"Gemini 4 Argon (High)","verdict":"PASS|REVISE|FAIL","inspected_images":["원본/신규 파일명..."],"pass_a":{"verdict":"PASS|REVISE|FAIL","summary":"..."},"pass_b":{"verdict":"PASS|REVISE|FAIL","summary":"..."},"findings":[{"slide":1,"severity":"Critical|Major|Minor|Note","issue":"...","fix":"..."}],"summary":"짧은 한국어 결론"}
