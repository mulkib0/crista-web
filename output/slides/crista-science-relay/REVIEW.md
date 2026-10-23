# CRISTA 과학 원리 PNG 5장 → Relay HTML 검수

- 원본: 사용자가 지정한 `crista-science-slides.zip`의 PNG 5장과 Argon 문구.
- 문구 105개: 원본과 HTML이 모두 일치.
- 글자: Relay체 Regular / SemiBold HTML 텍스트. 배경에는 그림만 남김.
- 글꼴·그림을 내장한 단일 발표 HTML과 수정용 개별 HTML 제공.
- 자동 확인: 글자 넘침·겹침·화면 밖 잘림 0, 이미지 누락 0, 외부 네트워크 요청 0.
- 방향키·목차·비유/각주 보기·전체 화면·모바일 맞춤·5쪽 인쇄 표시 확인.

## Gemini 4 Argon (High) 검수

Antigravity CLI(`agy --model gemini-4-argon-high`)에서 원본 PNG 5장과 신규 렌더 5장을 실제 열어 비교했습니다.

- 디자인·내용 보존: PASS
- 렌더 가독성: PASS

권고 사항인 y축 글자와 화살촉 사이 간격을 조정하고, 도킹 첫 강조문은 원본처럼 한 줄로 맞췄습니다. 이후 5장을 다시 렌더링해 원문 일치와 넘침·겹침 없음까지 재확인했습니다.
