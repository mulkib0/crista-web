# 1.1 에서 고를 수 있는 표적 늘리기 — 질환 1 : 표적 N (2026-10-25)

## 왜

1.1 에서 질환을 고른 뒤 '표적 고르기'에서 실제로 올릴 수 있는 표적이 질환마다 **하나**였다.
열지도에 8줄이 보여도 '✓ 도킹 준비됨' 은 한 줄뿐이고, 서버도 질환 1 : 표적 1(`DISEASE_TO_TARGET`)로 못 박혀 있었다.

## 무엇을 열었나

crista `feat/more-docking-targets`(워커 커밋 `9210429`)가 표적 11종을 기존 4종과 같은 꼴로 준비해 두었고,
**재도킹 검증(결정 리간드 1위 포즈 중원자 RMSD ≤ 2 Å)을 통과한 3종만** 수업에 열었다.

| 표적 | 질환 | PDB(`CCD`) | 기준 리간드 | ΔG | RMSD |
| --- | --- | --- | --- | --- | --- |
| `alk-2xp2` | 비소세포폐암 | `2XP2`(`VGH`) | 크리조티닙 | −9.12 | **1.16 Å** |
| `erbb2-3pp0` | 비소세포폐암 | `3PP0`(`03Q`) | TAK-285 | −11.32 | **0.73 Å** |
| `gck-1v4s` | 2형 당뇨병 | `1V4S`(`MRK`) | RO-28-1675 | −8.73 | **0.67 Å** |

떨어진 8종은 그대로 닫아 둔다 — MET 2.41 · KRAS 2.03 · RET 2.76 · JAK1 3.42 · ROS1 3.5 · TNF 5.06 · PPARG 7.01 · TYK2 7.17 Å.
문턱을 풀지 않았다. 실험 포즈를 재현하지 못하는 수용체로 낸 ΔG 는 학생에게 줄 근거가 못 된다.

**질환 4 · 표적 7** — 알츠하이머 `ACHE` · 비소세포폐암 `EGFR` · `ALK` · `ERBB2` · 2형 당뇨 `DPP4` · `GCK` · 류마티스 `PTGS2`.

## 고친 곳

### crista (워크트리 `../crista-targets`, 브랜치 `feat/more-docking-targets` · 커밋 `5513a2e`)
- `shared-types/protocol.ts` — `DOCKING_TARGETS` 에 3종(값은 `target.json` 의 실측 `referenceKcal` · `referenceRmsd`).
- `shared-types/pipeline.ts` — `DISEASE_TARGETS`(질환 → 표적 목록, 첫 값 = 기본)를 사실의 출처로. `DISEASE_TO_TARGET` 은 기본 표적으로 남기고 `TargetId` · `TARGET_TO_DISEASE` 는 새 표에서 뽑는다. `targetsOfDisease()` 추가. `TRIAL_OPTIONS` 3종.
- `game-server` 선언 검사 — 그 질환의 표적이면 무엇이든 받는다(다른 질환 표적만 막는다).
- `bio-worker` — `DOCKING_TARGET_BY_GENE` · `REFERENCE_SMILES_BY_TARGET` 에 3종, `--offline` 재계산이 ① 빠진 표적의 Tanimoto 를 RDKit 로 채우고 ② `disease_targets.json` 의 `dockingTargetId` 를 다시 찍는다(네트워크 없이). `prescreen_library.py` 는 검증 통과 표적만 돌리고 표적 id 인자를 받는다.

### crista-web
- `packages/shared-types` · `game-rules` 재복사(SOURCE.md 갱신).
- 서버 `DISEASES` 가 '질환 × 표적' 줄(7줄). `targetOption()` · `optionsOfDisease()` 추가. `pickTarget` · `setTarget` 이 `targetId` 를 그 질환의 열린 표적 안에서만 받는다. 전광판 표적 이름을 고른 표적으로.
- `targetShortlist` — 그 질환의 열린 표적은 8줄 안에 반드시 남긴다(점수가 가장 낮은 '준비 안 됨' 줄을 밀어낸다).
- `PRECLINICAL_MODELS` · `DISEASE_TRIAL_PROFILES` · `TARGET_REDOCK` 3종 추가.
- 1.1 화면 — 질환 타일에 '고를 수 있는 표적 EGFR · ALK · ERBB2', 열지도 머리에 '고를 수 있는 표적 3개', 관계망에서 준비 표적 자리를 벌려 겹치지 않게, 카드 뒤집기는 '찾은 도킹 표적 n/m', 추천 서랍은 보고 있는 그 표적을 올린다, 모둠 카드 · 확정도 그 표적으로.

## 확인

- `npm test`(web-contract 200건 · server) · `npm run typecheck` · `npm run build:web` 통과.
  - 전임상 보장 시험(`MRSD 이하 용량이면 S ≥ 35`)이 표적 7종 전 조합(94,500)으로 자동 확장돼 통과.
- `WEB_PORT=3395 BIO_WORKER_URL=http://127.0.0.1:8795 npm run e2e:target` — 12/12 통과.
  새로 넣은 것: 질환 4 · 표적 7 · 그 질환의 열린 표적이 8줄 안에 모두 · draft 표적(`met-2wgj`) 400 · **ALK 로 올리고 확정 → `program.targetId` 가 바뀌고 표적 버전이 올라감**.
- 브라우저(1440) — `1440-1-map.png`(타일) · `1440-2-nsclc-heat.png`(비소세포폐암 ✓ 3줄) · `1440-3-alk-drawer.png`(ALK 서랍) · `1440-4-alk-confirmed.png`(모둠 표적 = ALK · PDB 2XP2 · 대조군 크리조티닙 ΔG −9.12).

## 사전 도킹(1.2 표적 점수) — 멈춰 둠

화합물 220종 × 새 표적 3 = 658건 가운데 **337건까지 계산하고 멈췄다**(머신 부하 — 다른 세션의 Next 개발 서버 5개가 코어를 다 쓰고 있었다, load 129).
기록은 `../crista-targets/apps/bio-worker/data/cache/vina_prescreen.jsonl` 에 줄 단위로 쌓여 있어 이어서 할 수 있다.

```
cd ../crista-targets/apps/bio-worker
../../crista/apps/bio-worker/.venv/bin/python scripts/prescreen_library.py --jobs 5 --cpu 2 alk-2xp2 erbb2-3pp0 gck-1v4s
../../crista/apps/bio-worker/.venv/bin/python scripts/prepare_datasets.py --offline     # Tanimoto · screenScore · 매니페스트
../../crista/apps/bio-worker/.venv/bin/python -m pytest tests -q
```

끝나기 전까지 새 표적의 1.2 는 `screenScoreByTarget` 이 비어 있어 진열대가 chemblId 순으로 나온다(확인함).
그래서 매니페스트의 `prescreenedTargets` 는 **실제로 값이 든 표적만** 세도록 고쳤다(지금은 기존 4종).
`tests/test_datasets.py` 의 화합물 라이브러리 표적 집합도 4종으로 두고, 계산이 끝나면 `VALIDATED_TARGETS` 로 올리라고 주석에 적었다.

## 남은 자리

- **1.2 미션** — 화합물 220종 라이브러리는 기존 4표적 시드로 모은 것이라 새 표적 3종에는 '아는 약 계열'과 `SCREEN_MISSIONS`(미션 이야기 · 브리핑 정답 · 심사관 카드 8장)가 없다. 화면은 "이 표적의 미션 글은 아직 없어요" 로 넘어가고 깔때기 · 순위는 실제 Vina 값으로 돈다(`enrichment` 만 0).
  - 채우려면: ChEMBL 에서 표적별 시드(승인약 · 활성 화합물 · 유도체)를 더 모아 라이브러리를 넓히고 7표적 전부 사전 도킹을 다시 돌린 뒤 미션 3종을 같은 틀로 쓴다.
- **배포** — crista 쪽 커밋을 main 에 올리고 bio-worker 를 다시 배포해야 호스팅에서도 새 표적이 보인다(워커가 `disease_targets.json` · 수용체 파일을 들고 있다).
