# crista 에셋 사본

crista 저장소(`github.com/mulkib0/crista`, 커밋 `e911572`)의 06 픽셀 타이쿤 에셋을 복사했다. 화면 ② 사옥 지구(Phaser 3)에서 쓴다.

| 파일 | 원본 | 비고 |
| --- | --- | --- |
| `atlas/crista-atlas-0.png` · `.json` · `crista-paper-noise.png` | `crista/assets/atlas/` | 자체 생성기(`crista/tools/crista-asset-lib.js`) 산출물 — 사옥 `hq-t1~t3` · 캐릭터 · 타일 등 453종 |
| `manifest.json` | `crista/assets/manifest.json` | 에셋 id · 분류 · 크기 · 메모 |
| `CREDITS.md` | `crista/assets/CREDITS.md` | 출처 · 라이선스 기록(원문 그대로 — 그 안의 경로는 crista 기준) |
| `fonts/galmuri/` | `crista/assets/fonts/galmuri/` | Galmuri 2.40.3 woff2 5종 · SIL OFL 1.1(`OFL.txt`) |

복사 직후 `diff -rq` · `cmp` 로 원본과 같음을 확인했다. 사옥 외관 8종 × 3단계는 이 저장소 `tools/gen-campus-assets.mjs`(W2)가 같은 팔레트 · 규칙으로 새로 만든다 — 이 사본은 고치지 않는다.
