# crista 패키지 사본

`shared-types` · `game-rules` 는 crista 저장소(`github.com/mulkib0/crista`)의 같은 이름 패키지를 **그대로 복사한 사본**이다.

| 항목 | 값 |
| --- | --- |
| 원본 | `crista/packages/shared-types` · `crista/packages/game-rules` |
| 원본 커밋 | `345cbdf`(2026-10-25, `feat/disease-multi-targets` — 질환 1 : 표적 N · 도킹 표적 7종) — 복사 시점 작업 트리에 이 두 패키지의 미커밋 변경 없음 |
| 복사 방법 | `rsync -a --exclude node_modules --exclude dist --exclude '*.tsbuildinfo'` · 복사 직후 `diff -rq` 로 원본과 같음을 확인 |

## 규칙

- 이 사본에서 **판정 · 비용 · 표적 값**(효능 E · 안전 S · 물성 신호 · `DOCKING_TARGETS` · `TRIAL_OPTIONS` · 균형안 수치)을 고치지 않는다 — crista 와 같은 값을 쓰는 것이 이 저장소의 전제다. 바꿔야 하면 crista 에서 먼저 고치고 다시 복사한다.
- crista-web 만의 타입 · 규칙은 `packages/web-contract` 등 **다른 패키지**에 둔다.
- 다시 복사할 때는 위 표의 커밋을 갱신하고, 차이를 커밋 메시지에 적는다.
- 월드 · NPC(`game-rules/src/world` · `npc`)는 이 저장소에서 쓰지 않는다. **W1 결정: 지우지 않고 그대로 둔다** — 사본이 원본과 같다는 `diff -rq` 확인을 깨지 않고,
  다시 복사할 때 차이가 생기지 않게. crista-web 코드는 `@crista/game-rules` 의 `./world` 진입점을 가져오지 않는다.

## 확인 기록

| 날짜 | 명령 | 결과 |
| --- | --- | --- |
| 2026-10-25 | `rsync` 재복사(`345cbdf`) · `diff -rq` | 두 패키지 모두 원본과 같음. 차이: `DISEASE_TARGETS`(질환 → 표적 목록) · `DOCKING_TARGETS` 3종(ALK `2XP2` · ERBB2 `3PP0` · GCK `1V4S`) · `TRIAL_OPTIONS` 3종 · `targetsOfDisease()`. `game-rules` 는 바뀌지 않았다 |
| 2026-10-23(W1) | `npm run typecheck`(shared-types · game-rules) | 둘 다 오류 0 |
| 2026-10-23(W1) | `npm run test:rules`(`node --test --experimental-strip-types test/*.test.ts`) | 290건 중 287 통과 · 3 실패 — 셋 다 판정 문제가 아니라 crista 저장소 루트의 `assets/data/macro-events.json` · `assets/atlas/crista-atlas-0.json` 을 `../../../` 로 읽는데 이 저장소에는 그 경로가 없어서(ENOENT). 사본은 고치지 않았다 |
