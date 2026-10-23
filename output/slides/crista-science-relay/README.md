# CRISTA 과학 원리 5장 — Relay체 HTML

- `index.html`: 5장을 넘겨 보는 발표용 화면.
- `slide-01.html` ~ `slide-05.html`: 각 장을 따로 여는 HTML.
- `copy.json`: Gemini 4 Argon (High)가 작성한 원문.
- `slides.css`: 글꼴·배치·크기.
- `assets/`: 글자를 제거한 배경과 Relay 글꼴.

압축을 풀고 폴더 구조를 유지한 채 `index.html`을 열면 됩니다. 방향키로 이동하고 T로 목차, N으로 비유·각주, F로 전체 화면, P로 인쇄합니다.

단일 파일 발표본은 `design/crista-science-relay.html`에도 저장했습니다. 이 파일은 글꼴과 그림이 내장되어 별도 파일이 필요 없습니다.

문구를 바꾸려면 `copy.json`을 수정한 뒤 `python3 build.py`를 실행합니다. 기본 Python만 사용하며 추가 라이브러리는 필요 없습니다.
