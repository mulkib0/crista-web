**먼저 지킬 것: 저장소 파일을 만들거나 고치지 마라(읽기 전용). 읽기용 셸(rg · sed · cat)은 써도 된다. 의견서는 최종 답으로만 출력한다.**

# 의뢰서 — crista-web 12대 표적 질환 확장 & 1인 1후보 병렬 실험을 위한 DB 확장 설계 (2026-10-23)

너는 `crista-web`(`/Users/mulkib/Desktop/repo/crista-web`) 및 연동 원본 저장소 `crista`(`/Users/mulkib/Desktop/repo/crista`)의 **설계 공동 고안자**다.
코드를 고치지 말고, 현재 설계서와 두 저장소의 실제 코드를 대조하여 **DB 확장 설계안(바이오 데이터셋 DB + PostgreSQL `web` 스키마 DB)**을 한국어 마크다운으로 답하라.

## 1. 배경 및 사용자 지시

1. `crista-web` 기준 설계서: `/Users/mulkib/Desktop/repo/crista-web/docs/2026-10-23-crista-web-design.md` (꼭 읽어라).
2. 사용자가 방금 확정한 두 가지 핵심 변경:
   - **역할 분담(§6.4)**: 단계별로 사람을 쪼개는 직렬 분담(나머지 3명이 구경하는 문제) 대신, 모든 단계에서 모둠원 3~4명이 **왼쪽 개인 작업대**로 각자 다른 질환 · 스크리닝 컷오프 · 후보 분자 · 작용기 변형체를 동시에 실험하고 **오른쪽 모둠 공유 비교표**에 올려 합치는 **"1인 1후보 병렬 실험 + 비교표 합치기"** 구조.
   - **표적 질병 확장(§6.1.1)**: 기존 4대 질환(알츠하이머 `ache-4ey7` · 비소세포폐암 `egfr-1m17` · 2형 당뇨 `dpp4-1x70` · 류마티스 관절염 `cox2-3ln1`)에서 **4대 질환군 × 3종 = 총 12대 질환 · 12개 결정구조 표적**으로 확장:
     - Ⅰ. 신경계(`cns: true`): ① 알츠하이머병(`MONDO_0004975`, `ache-4ey7`, `ACHE`, PDB `4EY7`, 도네페질) · ② 파킨슨병(`MONDO_0005180`, `maob-2v5z`, `MAOB`, PDB `2V5Z`, 사피나미드) · ③ 주요우울장애(`MONDO_0002009`, `sert-5i6x`, `SLC6A4`, PDB `5I6X`, 에스시탈로프람)
     - Ⅱ. 종양·항암: ④ 비소세포폐암(`MONDO_0005233`, `egfr-1m17`, `EGFR`, PDB `1M17`, 엘로티닙) · ⑤ 만성 골수성 백혈병(`MONDO_0011996`, `abl1-2hyy`, `ABL1`, PDB `2HYY`, 이마티닙) · ⑥ 전이성 흑색종(`MONDO_0005105`, `braf-3og7`, `BRAF`, PDB `3OG7`, 베무라페닙)
     - Ⅲ. 대사·심혈관: ⑦ 2형 당뇨병(`MONDO_0005148`, `dpp4-1x70`, `DPP4`, PDB `1X70`, 시타글립틴) · ⑧ 이상지질혈증(`MONDO_0005359`, `hmgcr-1hw9`, `HMGCR`, PDB `1HW9`, 아토르바스타틴) · ⑨ 혈전색전증·뇌졸중 예방(`MONDO_0005265`, `fxa-2p16`, `F10`, PDB `2P16`, 아픽사반)
     - Ⅳ. 면역·호흡기: ⑩ 류마티스 관절염(`MONDO_0008383`, `cox2-3ln1`, `PTGS2`, PDB `3LN1`, 세레콕시브) · ⑪ 아토피 피부염(`MONDO_0004980`, `jak1-6bvr`, `JAK1`, PDB `6BVR`, 우파다시티닙) · ⑫ 천식·COPD(`MONDO_0004979`, `pde4b-3g45`, `PDE4B`, PDB `3G45`, 로플루밀라스트)

## 2. 확인해야 할 기존 구현 파일

- `crista-web/docs/2026-10-23-crista-web-design.md` (§6.1.1, §6.4, §7)
- `crista-web/packages/shared-types/src/pipeline.ts` (`DISEASE_TO_TARGET`, `TRIAL_OPTIONS`) · `protocol.ts` (`DOCKING_TARGETS`)
- `crista/apps/bio-worker/scripts/prepare_target.py` · `prepare_datasets.py` · `prescreen_library.py` · `redock_check.py`
- `crista/apps/bio-worker/app/datasets.py` · `app/docking/` · `app/properties.py`

## 3. 답해야 할 질문 (4개 절)

1. **바이오 데이터셋 DB 확장(`bio-worker/data/` · `prepare_target.py` · `prepare_datasets.py` · `prescreen_library.py`)**:
   - 제안된 신규 8종 PDB 구조(`2V5Z`, `5I6X`, `2HYY`, `3OG7`, `1HW9`, `2P16`, `6BVR`, `3G45`)가 지금 `prepare_target.py`(단일 사슬 추출 · `remove_ligands_and_waters()`로 모든 보조인자/금속이온 제거 · 비공유결합 리간드 RDKit 템플릿 매칭 · AutoDock Vina 재도킹 RMSD ≤ 2.0 Å)에서 **그대로 통과하는지, 깨지는 표적(예: 다량체 계면 포켓인 HMGCR `1HW9`, 보조인자 FAD가 포켓 벽을 이루는 MAO-B `2V5Z`, 금속 이온 `Zn2+/Mg2+` 의존 포켓인 PDE4B `3G45` 등)이 있는지** 정밀 진단하라.
   - 깨지는 표적이 있다면 ① `prepare_target.py`를 어떻게 고칠지(다중 사슬 유지 옵션 · 필수 보조인자/이온 보존 옵션) 또는 ② 단일 사슬·무보조인자로 깔끔하게 재도킹되는 **대체 PDB ID / 대체 표적**을 구체적으로 제시하라.
   - Stage 2 화합물 라이브러리(`compound_library.json`) 확장 시, 분자 수 `N` × 표적 12종의 사전 도킹(`vinaKcalByTarget`) 연산량 폭발과 데이터 크기를 어떻게 제어할지(시드 분자 구성, 캐시 키, `prescreen_library.py` 병렬화/부분 사전 도킹 전략) 설계하라.

2. **PostgreSQL `web` 스키마 DB 확장(`db/migrations/0001_core.sql` 상세 DDL 설계)**:
   - 12대 질환 · 1인 1후보 병렬 실험 + 모둠 비교표 합치기(§6.4)를 위해 `web` 스키마의 테이블들(`classes`, `members`, `teams`, `programs`, `target_proposals`(또는 `programs` 내부), `screening_runs` / `candidate_claims`, `jobs`, `molecules` / `docking_results`, `patents`, `steps`, `notes`, `ledger`, `board_events`, `valuations`)을 어떻게 정규화·인덱싱할지 구체적인 컬럼 · 제약조건(UNIQUE · FK · CHECK) · 동시성 제어(비관적 잠금 / UPSERT)를 설계하라.
   - 특히 모둠원 4명이 동시에 ① 1.1에서 각자 탐색한 질환·표적을 비교 카드에 올릴 때, ② 1.2에서 히트 후보를 각자 찜(`claimed_by`)할 때, ③ 2.1에서 동시에 도킹·변형체 실험을 돌려 비교표에 쌓을 때, ④ 2.2에서 주력 리드 + 백업 후보를 지정할 때, ⑤ 연구 노트 3칸(`why`, `unknown`, `fallback`)을 동시에 쓸 때 **레이스 컨디션(덮어쓰기)이 절대 안 나는 DB 구조**를 제시하라.

3. **공유 계약(`shared-types` vs `web-contract`) 및 판정(`game-rules`) 연동**:
   - `DISEASE_TO_TARGET` · `DOCKING_TARGETS` · `TRIAL_OPTIONS` · `PropertySignals` · `score.ts`에서 12종 확장 시 반영해야 할 규칙(예: CNS 표적 3종의 BBB 가중치, `brainPopulations`, 경피/흡입 적합성, 간독성/출혈/심장독성 구조 경고와 질환별 임상 실패 사유 연결).

4. **단계별 실행 계획**:
   - 데이터셋/표적 검증 스크립트 실행 → 워커 반영 → `web` 스키마 마이그레이션 작성 순서를 완료 기준과 함께 표로 제시하라.
