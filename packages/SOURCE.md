# crista 패키지 사본

`shared-types` · `game-rules` 는 crista 저장소(`github.com/mulkib0/crista`)의 같은 이름 패키지를 **그대로 복사한 사본**이다.

| 항목 | 값 |
| --- | --- |
| 원본 | `crista/packages/shared-types` · `crista/packages/game-rules` |
| 원본 커밋 | `e911572`(2026-10-23, 프로토콜 v11) — 복사 시점 작업 트리에 이 두 패키지의 미커밋 변경 없음 |
| 복사 방법 | `rsync -a --exclude node_modules --exclude dist --exclude '*.tsbuildinfo'` · 복사 직후 `diff -rq` 로 원본과 같음을 확인 |

## 규칙

- 이 사본에서 **판정 · 비용 · 표적 값**(효능 E · 안전 S · 물성 신호 · `DOCKING_TARGETS` · `TRIAL_OPTIONS` · 균형안 수치)을 고치지 않는다 — crista 와 같은 값을 쓰는 것이 이 저장소의 전제다. 바꿔야 하면 crista 에서 먼저 고치고 다시 복사한다.
- crista-web 만의 타입 · 규칙은 `packages/web-contract` 등 **다른 패키지**에 둔다.
- 다시 복사할 때는 위 표의 커밋을 갱신하고, 차이를 커밋 메시지에 적는다.
- 월드 · NPC(`game-rules/src/world` · `npc`)는 이 저장소에서 쓰지 않는다. 정리는 W1 에서 결정한다(설계 문서 §1.2).
