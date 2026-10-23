**권고안은 “버전이 고정된 바이오 카탈로그 + 개인별 실험 기록 + 모둠의 최종 선택”을 분리하는 구조입니다.** 12종 확장은 가능하지만, 현재 제안에는 PDB·기준 약물·질환 ID의 연결 오류가 있어 먼저 바로잡아야 합니다.

저장소 파일과 DB는 변경하지 않았습니다. 기준 설계서와 지정된 구현 파일을 읽고, 두 저장소의 공유 패키지가 같은 것도 확인했습니다. **신규 8종의 Vina 재도킹은 실행하지 않았으므로, 아래에서 구조적 적합성과 실제 RMSD 통과 여부를 구분합니다.**

## 1. 바이오 데이터셋 DB 확장

### 1.1. 먼저 수정해야 할 카탈로그 연결

[기준 설계서 §6.1.1](/Users/mulkib/Desktop/repo/crista-web/docs/2026-10-23-crista-web-design.md:228)의 다음 연결은 그대로 데이터셋에 넣으면 안 됩니다.

| 현재 제안 | 확인된 문제 | 권고 |
|---|---|---|
| `5I6X` — 에스시탈로프람 | 실제 공결정 리간드는 **파록세틴** | 구조를 유지하면 기준 리간드를 파록세틴으로 변경. 에스시탈로프람을 유지하려면 **`5I71`** 검토 |
| `1HW9` — 아토르바스타틴 | 실제 리간드는 **심바스타틴 산형** | 아토르바스타틴을 유지하려면 **`1HWK`** 검토 |
| `6BVR` — JAK1·우파다시티닙 | **세균의 3-hydroxyanthranilate dioxygenase 변이체**로, JAK1이 아님 | **`6BBU` — 인간 JAK1·D7D/PF-04965842**를 우선 검토. 우파다시티닙은 별도 비교 약물로 보존 |
| `3G45` — 로플루밀라스트 | 실제 리간드는 **D155988, CCD `988`** | 로플루밀라스트를 유지하려면 **`1XMU`** 검토 |

근거: RCSB의 [5I6X](https://www.rcsb.org/structure/5I6X)·[5I71](https://www.rcsb.org/structure/5I71), [1HW9](https://www.rcsb.org/structure/1HW9)·[1HWK](https://www.rcsb.org/structure/1HWK), [6BVR](https://www.rcsb.org/structure/6BVR)·[6BBU](https://www.rcsb.org/structure/6BBU), [3G45](https://www.rcsb.org/structure/3G45)·[1XMU](https://www.rcsb.org/structure/1XMU).

질환 식별자도 수정이 필요합니다.

| 항목 | 확인 결과 | DB에 반영할 방식 |
|---|---|---|
| 이상지질혈증 `MONDO_0005359` | **약물 유발 간손상** ID | 그대로 사용 금지. 수업 범위를 고지혈증으로 정하면 `MONDO_0021187`이 대안 |
| 혈전색전증 `MONDO_0005265` | **염증성 장질환** ID | 정맥혈전색전증은 `MONDO_0005399`을 검토. 뇌졸중 예방 적응증은 별도 연결 |
| 천식·COPD `MONDO_0004979` | 이 ID는 **천식**만 의미 | COPD `MONDO_0005002`를 별도 질환 행으로 연결 |
| 전이성 흑색종 `MONDO_0005105` | 흑색종 일반 ID | 전이 여부와 BRAF 변이는 환자군·바이오마커로 별도 저장 |

근거: [NCBI 간손상](https://www.ncbi.nlm.nih.gov/medgen/163652), [ClinGen 염증성 장질환](https://search.clinicalgenome.org/kb/conditions/MONDO%3A0005265/groups), [NCBI 고지혈증](https://www.ncbi.nlm.nih.gov/medgen/5692), [MONDO 정맥혈전색전증](https://bioportal.bioontology.org/ontologies/MONDO?conceptid=MONDO%3A0005399&p=classes), [천식](https://www.ncbi.nlm.nih.gov/medgen/2109)·[COPD](https://bioportal.bioontology.org/ontologies/MONDO?conceptid=MONDO%3A0005002&p=classes), [흑색종](https://bioportal.bioontology.org/ontologies/MONDO?conceptid=MONDO%3A0005105&p=classes).

따라서 **화면의 12개 질환·표적 카드와 외부 질환 온톨로지 ID를 같은 개수로 강제하지 않는 설계**가 적합합니다. 카드 12개와 결정구조 12개는 유지하면서, 천식·COPD처럼 한 카드에 속하는 질환은 각각 정확한 ID를 가집니다.

또한 기존 `3LN1`은 **생쥐 COX-2 구조**입니다. 설계서의 “12종 모두 인간 공결정”이라는 설명은 수정하고, 인간 유전자와 다른 종의 구조를 대응시켰다는 사실을 기록해야 합니다. [RCSB 3LN1](https://www.rcsb.org/structure/3LN1)

### 1.2. 신규 8종의 현재 파이프라인 적합성

엄밀히 말하면 현재 `prepare_target.py`와 `redock_check.py`는 표적 목록을 기존 4종으로 고정하므로 **신규 8종은 모두 등록 단계부터 지원하지 않습니다.** 아래는 목록에 추가한 뒤 기존 준비 알고리즘을 적용했을 때의 판단입니다.

| 제안 표적 | 현재 방식의 진단 | 구체적인 수정·대체안 |
|---|---|---|
| **MAO-B `2V5Z`** | 사피나미드는 비공유결합 리간드라 템플릿 방식에 맞는다. 하지만 **FAD 제거는 포켓 환경을 손상**시킨다. 파일 생성에 성공하더라도 정상 모델로 승인할 수 없다 | `SAG`를 기준 리간드로 선택하고, 해당 단백질 사슬의 **FAD와 단백질–FAD 연결을 보존**. 단일 사슬은 포켓 접촉 확인 후 사용 가능. FAD 없는 MAO-B 구조로 교체하는 해결책은 권하지 않음 |
| **SERT `5I6X`** | 에스시탈로프람 템플릿을 파록세틴 좌표에 대입하면 불일치. 수송체·항체 복합체이며 이온도 있어 무조건적인 이종 원자 삭제가 부적절 | **`5I71` + CCD `68P`** 권고. SERT 사슬 A를 선택하고 기록된 Na⁺ 보존. 항체·세제 제거는 포켓 영향 검토 후 결정. 구조에 없는 Cl⁻를 임의로 추가하지 않음 |
| **ABL1 `2HYY`** | 이마티닙 공결정이며, 선택한 키나아제 사슬의 포켓을 사용하는 기존 방식에 **상대적으로 적합** | `STI` 인스턴스를 명시. 누락 잔기·양성자화·유연한 이마티닙의 탐색 충분성을 검증. **RMSD 통과는 미확인** |
| **BRAF `3OG7`** | 베무라페닙 공결정이며 단일 사슬 포켓 준비에 **상대적으로 적합** | `032` 인스턴스 지정. **V600E 및 실제 구조체 변이 정보**를 기록. 야생형 BRAF 일반 효능으로 설명하지 않음. **RMSD 통과는 미확인** |
| **HMGCR `1HW9`** | 아토르바스타틴 템플릿 불일치와 **다량체 계면 포켓 절단**이라는 두 문제가 있음 | **`1HWK` + CCD `117`** 권고. 처음에는 A–D 사슬을 보존한 구조로 검증하고, 이후 포켓을 구성하는 사슬 쌍으로 축소 가능. `1HWK`로 바꿔도 다중 사슬 처리는 필요 |
| **FXa `2P16`** | 아픽사반 `GG2`는 맞음. 촉매 사슬 A, 경쇄 `auth L`, Ca²⁺가 존재. PDE4처럼 금속 촉매 포켓이라고 단정할 수는 없지만 일괄 삭제는 근거 부족 | 초기 기준 모델은 **A+L 및 구조적 Ca²⁺를 보존**. A만 사용한 단순 모델과 재도킹·포켓 접촉을 비교해 축소 여부 결정 |
| **JAK1 `6BVR`** | **잘못된 단백질이므로 사용 불가** | **`jak1-6bbu`**로 교체 검토. `6BBU`는 인간 JAK1 단량체와 `D7D`를 포함. 다만 인산화 잔기 `PTR` 처리도 검증해야 하므로 무수정 통과를 보장할 수 없음 |
| **PDE4B `3G45`** | 로플루밀라스트 템플릿 불일치. **Zn²⁺·Mg²⁺ 제거**, 활성부위를 덮는 조절 도메인 처리도 문제 | **`pde4b-1xmu` + `ROF`** 권고. 촉매 도메인으로 단순화되지만 **Zn²⁺·Mg²⁺와 필요한 배위 물 보존은 여전히 필요** |

구조적 근거는 [MAO-B/FAD 원논문](https://pubmed.ncbi.nlm.nih.gov/9614088/), [SERT 구조 원논문](https://pubmed.ncbi.nlm.nih.gov/27049939/), [2HYY](https://www.rcsb.org/structure/2HYY), [3OG7](https://www.rcsb.org/structure/3OG7), [HMGCR 구조 원논문](https://pubmed.ncbi.nlm.nih.gov/11349148/), [2P16](https://www.rcsb.org/structure/2P16), [6BBU](https://www.rcsb.org/structure/6BBU), [PDE4 조절 도메인 연구](https://www.rcsb.org/structure/3G45), [PDE4 억제제 구조 연구](https://bl831.als.lbl.gov/~mcfuser/publications/Card_Structure.pdf)에 근거합니다.

**MAO-B·HMGCR·PDE4B를 유지하면서 모두 “단일 사슬·무보조인자”로 맞추는 것은 권하지 않습니다.** 대체 PDB는 잘못된 약물 연결이나 복잡한 구조체를 개선할 수 있지만, 표적 고유의 보조인자·다량체 요구까지 없애지는 못합니다.

### 1.3. 준비 스크립트와 검증 규격

[현재 준비 코드](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/prepare_target.py:132)는 단일 `chain`, 첫 번째 같은 이름의 리간드, 일괄 이종 분자 삭제를 사용합니다. 다음 항목을 표적별 준비 명세로 바꿔야 합니다.

| 명세 | 필요한 내용 |
|---|---|
| 구조 식별 | PDB ID·원본 SHA-256·구조 버전·생물종·UniProt·구조체 변이 |
| 사슬 선택 | `assemblyId`, `receptorChains[]`, 필요하면 대칭 변환 식별자 |
| 기준 리간드 선택 | 모델·`auth_asym_id`·잔기 번호·삽입 코드·CCD ID·대체 배좌 |
| 보존 대상 | `keepCofactors[]`, `keepIons[]`, `keepWaters[]`, 공유결합 연결 목록 |
| 화학 상태 | 리간드 입체화학·전하·양성자화 상태·변형 잔기 처리 정책 |
| 계산 조건 | 상자 중심·크기, Vina/도구 버전, seed, exhaustiveness, scoring function |
| 검증 결과 | 원시 RMSD·기준 점수·검증 상태·검증 대상 파일 해시 |

구체적인 변경은 다음과 같습니다.

1. **`remove_ligands_and_waters()`를 선택적 제거로 교체합니다.** 기준 리간드는 수용체에서 제거하되, 허용 목록에 있는 FAD·이온·물은 유지합니다. “모든 HETATM 유지”도 주변 약물·세제까지 남기므로 부적절합니다.
2. **단백질 사슬 선택과 리간드 선택을 분리합니다.** 리간드가 같은 이름으로 여러 개 있어도 정확한 인스턴스를 선택해야 합니다.
3. **입체화학을 포함해 템플릿을 대조합니다.** 현재 준비 코드의 최종 비교와 런타임 기준 리간드 판별은 입체정보를 뺀 구조에 의존합니다. 에스시탈로프람처럼 입체화학이 중요한 기준 물질은 이 방식으로 동일성을 판정하면 안 됩니다.
4. **보조인자 보존 뒤에도 원자형·결합·전하를 검증합니다.** 특히 FAD–Cys 연결, 금속 배위, `PTR` 같은 변형 잔기를 단순 문자열 합치기로 처리하지 않습니다.
5. **PLIP 결과 형식도 확장합니다.** 현재 [분석 코드](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/app/docking/analysis.py:23)는 금속 배위·물 매개 결합을 반환하지 않습니다. 해당 상호작용을 추가하거나 “현재 분석에서 제외”라고 표시해야 합니다. 여러 사슬의 잔기는 사슬 ID까지 포함해 식별합니다.

금속을 남기는 것만으로 Vina의 금속 배위 정확성이 확보되지는 않습니다. 공식 문서도 Zn 배위용 별도 **AutoDock4Zn** 절차를 제공합니다. 이를 채택한다면 현재 Vina 점수와 같은 계산으로 취급하지 말고 엔진·기준 점수·캐시를 분리해야 하며, Zn용 방법을 Mg까지 자동으로 검증한 것으로 간주해서도 안 됩니다. [AutoDock Vina 금속 도킹 문서](https://autodock-vina.readthedocs.io/en/latest/docking_zinc.html)

**재도킹 합격 판정에는 현재 코드의 결함도 있습니다.** [redock_check.py](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/redock_check.py:88)는 RMSD가 2Å를 넘어도 문구만 출력하며, 일반 실행의 실패 종료로 연결하지 않습니다. `--check`도 기존 기록과 같은지만 비교합니다. 따라서 다음을 모두 만족해야 성공 종료하도록 바꿔야 합니다.

- 결정 리간드의 원자·결합·입체화학 일치.
- **반올림 전 1위 포즈의 중원자 RMSD ≤ 2.0Å**.
- 수용체·리간드·상자·준비 명세·엔진 설정 해시 일치.
- 기준 점수와 RMSD가 유한한 수.
- 현재 수업에서 사용하는 계산 설정으로 재현.
- 필수 보조인자와 포켓 구성 사슬의 존재 확인.

현재의 “같은 좌표계에서 정렬 없이 대칭을 고려하는 RMSD” 계산은 유지할 만합니다. 다만 재도킹 통과는 기준 포즈 재현의 근거이지, 모든 후보의 순위나 임상 효능을 검증하는 것은 아닙니다.

### 1.4. 데이터셋 구조와 사전 도킹 규모

바이오 데이터는 새 온라인 DB 서비스를 만들기보다 **버전이 고정된 배포 데이터셋**으로 유지하는 편이 현재 워커에 맞습니다.

| 논리 데이터 | 기본 키·주요 내용 |
|---|---|
| `lesson_tracks` | 카드 ID, 질환군, 기본 표적, 설명 |
| `diseases` / `track_indications` | 정확한 MONDO ID / 카드와 질환의 연결 |
| `disease_target_evidence` | `(release, disease_id, ensembl_id)`, 원래 연관 점수·순위·출처 |
| `target_revisions` | `(target_id, preparation_hash)`, 수용체·보조인자·기준 리간드·재도킹 결과 |
| `compounds` | 입체정보 포함 정규 구조, 원자료 ID, 물성·계산 버전 |
| `compound_target_evidence` | 분자–표적 활성 자료, 실험 종류·단위·문헌·신뢰도 |
| `prescreen_results` | 계산 키, 표적 버전, 분자, 점수 또는 실패·미계산 상태 |
| `manifest` | 위 자료의 릴리스·해시·건수·계산 범위 |

질환당 120개씩이면 **최대 1,440개의 질환–유전자 연결**입니다. 서로 다른 유전자가 반드시 1,440개라는 뜻은 아닙니다.

현재 데이터 수집기에는 확장 전에 제거할 문제가 있습니다.

- 대표 표적이 조회 결과에 없으면 **고정 점수와 잘못된 Ensembl ID를 넣는 보강 경로**가 있습니다. 없는 근거는 `null`로 두고 `curatedForLesson`으로 구분해야 합니다.
- ChEMBL에서 받은 분자를 조건에 따라 `ZINC 소형`으로 이름 붙입니다. **원자료 출처와 교육용 분류를 분리**해야 합니다.
- 최초 생성 과정에는 계산하지 않은 `vsScoreKcal`가 만들어집니다. 새 배포 규격에서는 이를 금지합니다.
- `flatSmiles`로 중복 제거하면 입체이성질체가 합쳐집니다. **실험용 분자 동일성은 입체정보 포함 구조**, 특허 동일성은 기존 규칙의 평면 구조로 분리합니다.

근거: [Open Targets 보강 경로](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/prepare_datasets.py:219), [화합물 수집·중복 제거](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/prepare_datasets.py:637).

**연산량 관리 권고**

현재 자료는 220종이며 사전 도킹 기록은 `220 × 4 = 880건`, 성공은 876건입니다. 신규 600종 전체를 12표적에 계산하면 **7,200건**입니다. 점수 7,200개 자체보다 도킹 시간과 포즈 파일이 주요 비용입니다.

| 방식 | 계산 건수 | 권고 |
|---|---:|---|
| 600종 전체 × 12표적 | 7,200 | 최종 완전 교차 스크리닝이 필요할 때 |
| 표적별 교육용 50종 | 약 600 | 첫 배포의 최소 범위 |
| 표적별 50종 + 공통 다양성 분자 30종 | 최대 약 960 | **첫 배포 권고안** |
| 이후 추가 후보 | 새 분자–표적 쌍만 | 배치로 증분 계산 |

표적별 50종은 결정 리간드·임상 비교 약물, 활성 근거가 있는 화합물, 변형체, 구조·물성 비교 대조군을 섞습니다. 단순 유사체나 계산 대조군을 실험적으로 확인된 활성·비활성 물질로 표시하지 않습니다. 중복 제거 뒤 실제 분자 수는 600보다 작을 수 있습니다.

[prescreen_library.py](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/prescreen_library.py:85)는 이미 `--jobs`·`--cpu` 병렬화를 지원합니다. 확장할 부분은 다음입니다.

- `--targets`, 분자 목록, 작업 분할, 실패 재시도 옵션.
- `jobs × cpu`가 할당 CPU를 넘지 않는 제한.
- 대량 작업을 한꺼번에 생성하지 않는 제한된 작업 큐.
- JSONL 단일 기록자 또는 SQLite 진행 DB의 고유 키로 중복 실행 방지.
- 리간드 준비 결과를 분자·준비 버전별로 재사용.
- 사전 스크리닝에는 점수·상태만 보관하고 PLIP·전체 포즈는 필요할 때 계산.
- 수업용 실시간 대기열과 오프라인 사전 도킹의 자원 분리.

캐시 키는 다음 요소를 포함해야 합니다.

```text
SHA256(
  입체정보 포함 정규 SMILES + 전하/양성자화 상태
  + 리간드 준비 버전
  + 표적 준비 명세 해시 + 수용체 해시
  + 상자 중심/크기
  + 엔진/버전/점수함수
  + exhaustiveness/seed/numModes/energyRange
)
```

현재 사전 도킹은 주로 `targetId|SMILES`와 수용체 해시만 확인하고, [데이터셋 합성 단계](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/scripts/prepare_datasets.py:808)는 그 수용체 해시조차 대조하지 않고 결과를 가져옵니다. 설정이 달라진 결과의 재사용을 막아야 합니다.

부분 사전 도킹에서는 반드시 다음을 구분합니다.

```text
completed / not_scheduled / pending / failed
```

**미계산을 0점이나 약한 결합으로 처리하면 안 됩니다.** 현재 `potency(None) → 0`을 그대로 사용하면 계산하지 않은 분자가 불리해집니다. 3D 순위는 같은 표적·버전으로 계산된 집합 안에서만 제공하고, 미계산 후보는 물성·2D 유사성 결과로 따로 표시합니다. 컷오프 변경은 기존 자료 필터링이므로 재도킹 사유가 아닙니다.

## 2. PostgreSQL `web` 스키마 확장 설계

### 2.1. `0001_core.sql`은 유지하고 후속 마이그레이션으로 확장

현재 [0001_core.sql](/Users/mulkib/Desktop/repo/crista-web/db/migrations/0001_core.sql:4)에는 `classes`, `teams`, `members`, `sessions`만 있습니다. 실험 테이블은 아직 구현되지 않았습니다.

실제 적용 이력은 이번에 조회하지 않았지만, 실행기가 적용 파일의 체크섬 변경을 금지하므로 **기존 `0001`을 고쳐 재사용하는 방식은 피해야 합니다.** 아래 설계를 후속 파일로 나누는 것이 적절합니다.

- `0002_catalog.sql`: 데이터 릴리스·질환·표적 버전.
- `0003_parallel_lab.sql`: 프로그램·후보·실험·노트.
- `0004_pipeline_economy.sql`: 특허·심사·원장·공개 이벤트.

모든 새 테이블·함수·인덱스는 `web`에 둡니다. 새 외래 키는 기존 `web.accounts`를 사용하고 `auth.users` 직접 연결을 늘리지 않습니다.

### 2.2. 공통 설계 원칙

**프로그램과 프로그램의 표적 버전을 나눕니다.**

```text
모둠
 └─ 프로그램
     ├─ 표적 버전 1: EGFR → 후보·실험·노트·선택 기록
     └─ 표적 버전 2: MAO-B → 새 후보·실험·노트·선택 기록
```

표적 변경은 기존 행의 `target_id`를 덮어쓰는 작업이 아닙니다. 새 `program_revision`을 만들고 현재 버전 포인터를 변경합니다. 옛 작업이 늦게 끝나도 옛 버전에만 붙으므로 새 표적 근거가 오염되지 않습니다.

각 실험 관련 행에는 공통으로 다음 범위를 둡니다.

```text
class_id uuid NOT NULL
team_id uuid NOT NULL
program_revision_id uuid NOT NULL
```

그리고 **복합 외래 키**로 같은 학급·모둠·프로그램 버전인지 보장합니다. `candidate_id` 하나만 외래 키로 연결하면 다른 모둠 후보를 참조하는 실수를 막기 어렵습니다.

프로그램의 설정 버전, 노트의 편집 버전, 작업의 상태 버전은 따로 둡니다. 다른 사람이 노트를 썼다는 이유로 내 도킹 요청이 충돌해서는 안 됩니다.

### 2.3. 테이블·컬럼·제약

아래에서 `PK`는 기본 키, `UQ`는 유일성 제약입니다. 식별자는 별도 표기가 없으면 `uuid`, 시각은 `timestamptz`입니다.

**기본 조직·카탈로그·프로그램**

| 테이블 | 주요 컬럼 | 필수 제약·인덱스 |
|---|---|---|
| `classes` | 기존 컬럼 + `catalog_release_id`, `rules_version text`, `clock_anchor_at`, `clock_anchor_day numeric`, `clock_rate numeric`, `paused boolean`, `version bigint` | 배율·게임 일 범위 검사. 학급 기본 버전을 바꿔도 진행 중 프로그램의 버전은 변경하지 않음 |
| `members` | 현재 구조 유지 | `(class_id,user_id)` PK와 현재 모둠 FK 유지. 직책은 권한 잠금으로 사용하지 않음 |
| `team_memberships` | `id`, `class_id`, `team_id`, `user_id`, `joined_at`, `left_at` | 열린 소속은 학급·사용자별 하나. 과거 실험의 작성자 소속은 이 이력에 연결 |
| `teams` | 기존 컬럼 + `version bigint` | 기존 이름·티커·부지 제약 유지 |
| `catalog_releases` | `id text`, `manifest_sha256`, `schema_version`, `published_at` | 배포 후 불변. 실제 매니페스트와 일치 |
| `catalog_targets` | `release_id`, `target_id text`, `target_revision text`, `gene`, `pdb_id`, `organism_taxid`, `reference_kcal`, `reference_rmsd`, `validation_status` | 복합 PK. 검증 완료 상태만 새 프로그램에서 선택 가능 |
| `catalog_indications` | `release_id`, `track_id`, `disease_id`, `target_id`, `target_revision` | 허용된 질환–표적 조합의 복합 UQ·FK |
| `programs` | `id`, `class_id`, `team_id`, `code_name`, `active`, `current_revision_id`, `version` | 모둠당 활성 프로그램 하나. 코드명은 학급 안 유일. 현재 버전이 자기 프로그램 소속임을 복합 FK로 검사 |
| `program_revisions` | `id`, `program_id`, 조직 범위, `revision_no int`, `catalog_release_id`, `rules_version`, `disease_id`, `target_id`, `target_revision`, `state`, `version` | `UQ(program_id,revision_no)`. 탐색 중에는 표적 값이 함께 NULL, 확정 뒤에는 모두 필수. 확정 표적은 불변 |
| `target_proposals` | `id`, 프로그램 범위, `created_by`, `membership_id`, 제안 질환·표적·릴리스, `rationale text`, `evidence jsonb`, `request_id`, `supersedes_id`, `created_at` | 개인별 제안은 별도 행. 재전송 UQ. 수정은 새 제안으로 이전 행을 연결 |

모둠 이동 때 과거 실험의 FK가 깨지지 않도록, **실험 작성자의 과거 소속을 현재 `members.team_id`에 직접 묶지 않습니다.** 현재 소속 검증은 제출 트랜잭션에서 하고, 제출 당시 소속 이력을 남깁니다.

**후보·실험·공유 비교표**

| 테이블 | 주요 컬럼 | 필수 제약·인덱스 |
|---|---|---|
| `screening_runs` | `id`, 프로그램 범위, `created_by`, `kind`, `cutoffs jsonb`, `dataset_release_id`, `ranking_version`, `job_id`, `created_at` | `kind ∈ preview,published_paid`. 유료 실행만 과금 작업과 연결. 제출된 조건은 불변 |
| `screening_hits` | `run_id`, 조직·프로그램 범위, `molecule_id`, `rank int`, `score numeric`, `docking_status` | `PK(run_id,molecule_id)`, `UQ(run_id,rank)`. 미계산 점수는 NULL |
| `molecules` | `id`, `class_id`, `team_id`, `canonical_smiles text`, `flat_smiles text`, `normalization_version`, `created_at` | `UQ(team_id,normalization_version,canonical_smiles)`. 구조는 생성 후 불변 |
| `molecule_properties` | `molecule_id`, `calculator_version`, `properties jsonb`, `computed_at` | 복합 PK. 재계산하면 새 버전 추가 |
| `candidates` | `id`, 프로그램 범위, `molecule_id`, `origin_kind`, `created_by`, `created_at` | `UQ(program_revision_id,molecule_id)`. 같은 분자가 여러 스크리닝에서 나와도 후보는 하나 |
| `candidate_origins` | `candidate_id`, `screening_run_id` 또는 `parent_candidate_id`, `job_id`, `transform_spec jsonb` | 후보 출처·변형 경로를 별도 보존. 한 분자에 여러 유래가 있어도 잃지 않음 |
| `candidate_claims` | `id`, 프로그램 범위, `candidate_id`, `claimed_by`, `membership_id`, `slot smallint`, `claimed_at`, `released_at` | 활성 후보별 한 명. 활성 사용자별 슬롯 1·2만 허용 |
| `jobs` | `id`, 프로그램 범위, `created_by`, `operation_id`, `worker_job_id`, `kind`, `molecule_id`, `parent_job_id`, 입력·버전 스냅숏, `state`, `progress`, `lease_until`, `attempt`, `created_at`, `finished_at` | 워커 ID UQ. 부모 작업·분자·표적은 같은 범위. 진행률 0~100. 완료 결과를 다른 입력으로 변경 금지 |
| `docking_results` | `job_id`, 프로그램 범위, `molecule_id`, `target_revision`, `affinity_kcal`, `reference_kcal`, `source`, `provenance jsonb`, `interactions jsonb`, 포즈·결과 해시 | 작업당 결과 하나. 입력 분자·표적과 복합 FK. 비교표 인덱스 `(program_revision_id,created_at,id)` |
| `admet_results` | `job_id`, 프로그램 범위, `molecule_id`, `model_version`, `predictions jsonb`, `provenance` | 작업당 결과 하나. 분자·모델 버전 보존 |
| `lead_selections` | `program_revision_id`, 조직 범위, `lead_candidate_id`, `backup_candidate_id`, `version`, `updated_by`, `updated_at` | 버전당 현재 선택 한 행. 두 후보는 서로 다름. 두 값은 함께 설정 |
| `selection_decisions` | `id`, 프로그램 범위, `selection_version`, 주력·백업 및 각각의 도킹·ADMET 근거 ID, `decided_by`, `created_at` | 선택 이력은 불변. `UQ(program_revision_id,selection_version)` |

공유 비교표는 `candidates + jobs + docking_results + admet_results + candidate_claims`의 조회 결과입니다. **모둠 비교표 전체를 JSON 배열 하나로 저장하지 않습니다.**

`molecules`의 안전한 UPSERT는 기존 구조를 찾아 재사용하는 목적에만 씁니다. 담당자·부모 분자·실험 결과를 UPSERT로 덮어쓰지 않습니다.

**노트·규제·예산·전광판**

| 테이블 | 주요 컬럼 | 필수 제약·인덱스 |
|---|---|---|
| `notes` | 프로그램 범위, `step_id`, `section`, `body text`, `version bigint`, `updated_by`, `updated_at` | `PK(program_revision_id,step_id,section)`. `section ∈ why,unknown,fallback` |
| `note_revisions` | 노트 키, `version`, `base_version`, `body`, `author_id`, `request_id`, `created_at` | 성공한 수정 이력 불변. 충돌 초안도 별도 제출 기록으로 보존 가능 |
| `patents` | `id`, 조직·프로그램 범위, `candidate_id`, `flat_smiles`, `canonical_smiles`, 근거 결과 ID, 물성·규칙 스냅숏, `status`, `filed_by`, `filed_at` | **활성 특허의 `(class_id,flat_smiles)` 유일성**. 표적이 달라도 같은 물질 선점 규칙 유지 |
| `protocol_versions` | `id`, 프로그램 범위, `selection_decision_id`, `patent_id`, `formulation`, `dose`, `dose_unit`, `population_id`, `endpoint_id`, `rules_version` | 제출된 프로토콜 불변. 용량·제형 변경은 새 행 |
| `steps` | `id`, 프로그램 범위, `protocol_version_id`, `kind`, `attempt`, `status`, `started_game_day`, `due_game_day`, `judgement jsonb`, `supersedes_id` | `(program_revision_id,protocol_version_id,kind,attempt)` UQ. 프로그램당 진행 중 심사·임상 하나. 정정은 원본 보존 |
| `operations` | `id`, `team_id`, `request_id`, `action`, `payload_hash`, `response jsonb` | `UQ(team_id,request_id)`. 같은 키로 다른 입력을 보내면 거절 |
| `team_balances` | `team_id PK`, `balance_cents bigint`, `version` | `CHECK(balance_cents >= 0)` |
| `ledger` | `id`, `team_id`, `operation_id`, `kind`, `amount_cents bigint`, `refund_of`, `created_at` | `(operation_id,kind)` UQ. 원장은 추가만. 환급은 원지출 FK 및 금액 상한 검증 |
| `board_events` | `id`, `class_id`, `team_id`, 원인 작업·단계 ID, `event_kind`, `class_seq`, 공개 본문, `corrects_event_id`, `created_at` | 원인별 이벤트 UQ. `(class_id,class_seq)` UQ. 공개 허용 필드만 저장 |
| `valuations` | `team_id`, `board_event_id`, `seq`, `price numeric`, `shares bigint`, `created_at` | `(team_id,board_event_id)` UQ, `(team_id,seq)` UQ. 같은 소식으로 가치 두 번 변경 금지 |
| `outbox_events` | `id`, 채널 범위, `stream_seq`, `event_type`, `payload`, `published_at`, 재시도 정보 | 데이터 변경과 같은 트랜잭션에 추가. 미전송 행 부분 인덱스 |

8개 화면 단계의 `ready/running/done/review`는 근거에서 계산하는 조회 모델로 두고, `steps`는 IND·임상·허가의 실제 시도 기록에 사용합니다. 둘을 같은 상태 컬럼으로 합치지 않습니다.

### 2.4. 동시성의 핵심 DDL

위 컬럼 정의를 전제로 한 핵심 제약 예시입니다. 전체 마이그레이션 파일을 대신하는 SQL은 아닙니다.

```sql
-- 다른 모둠·학급의 프로그램 버전을 참조하지 못하게 한다.
alter table web.program_revisions
  add constraint program_revisions_scope_uq
  unique (id, team_id, class_id);

alter table web.candidates
  add constraint candidates_scope_fk
  foreign key (program_revision_id, team_id, class_id)
  references web.program_revisions (id, team_id, class_id);

alter table web.candidates
  add constraint candidates_scope_uq
  unique (id, program_revision_id, team_id, class_id);

alter table web.candidate_claims
  add constraint candidate_claims_candidate_fk
  foreign key (
    candidate_id, program_revision_id, team_id, class_id
  )
  references web.candidates (
    id, program_revision_id, team_id, class_id
  ),
  add constraint candidate_claims_slot_check
  check (slot in (1, 2)),
  add constraint candidate_claims_time_check
  check (released_at is null or released_at >= claimed_at);

-- 같은 후보를 동시에 두 명이 찜할 수 없다.
create unique index candidate_claims_one_owner
  on web.candidate_claims (program_revision_id, candidate_id)
  where released_at is null;

-- 한 사람의 담당 후보는 최대 두 개다.
create unique index candidate_claims_two_slots
  on web.candidate_claims (program_revision_id, claimed_by, slot)
  where released_at is null;

alter table web.lead_selections
  add constraint lead_selection_pair_check
  check (
    (lead_candidate_id is null) = (backup_candidate_id is null)
    and (
      lead_candidate_id is null
      or lead_candidate_id <> backup_candidate_id
    )
  );

create unique index patents_one_active_substance
  on web.patents (class_id, flat_smiles)
  where status = 'active';

create index jobs_dispatchable
  on web.jobs (created_at, id)
  where state = 'queued';

create index jobs_leased
  on web.jobs (lease_until)
  where state in ('dispatching', 'running');

create index outbox_unpublished
  on web.outbox_events (created_at, id)
  where published_at is null;
```

주력·백업의 FK도 각각 `(candidate_id, program_revision_id, team_id, class_id)`로 연결합니다. “도킹 성공”, “ADMET 근거 존재”, “현재 표적과 일치” 같은 **다른 행의 상태까지 보는 조건은 단순 CHECK로 처리하지 않습니다.** 선택 확정 함수·트리거 안에서 관련 행을 잠그고 검증해야 합니다. [PostgreSQL 제약조건 문서](https://www.postgresql.org/docs/current/ddl-constraints.html)

외래 키의 조회측 인덱스는 별도로 추가합니다. 큰 JSON 결과 전체에 GIN 인덱스를 먼저 만들기보다 모둠·프로그램·분자·작업 ID와 시각 인덱스를 우선합니다.

### 2.5. 요청한 다섯 상황에서 덮어쓰기를 막는 방법

| 상황 | 트랜잭션 처리 | 동시에 실행했을 때 |
|---|---|---|
| **① 표적 비교 카드 4개 제출** | 각 요청은 자기 `target_proposals` 행을 INSERT. 요청 ID로 중복 방지 | 네 카드가 모두 남음. 한 배열을 읽고 다시 쓰지 않음 |
| **② 같은 후보 찜** | 슬롯과 후보의 부분 UNIQUE를 이용해 INSERT. 충돌 시 기존 담당자를 반환 | 한 명만 성공. 다른 후보를 찜한 사람은 정상 성공 |
| **③ 병렬 도킹·변형체 실험** | 각 요청에 별도 job·분자·부모 관계. 완료는 `job_id`별 한 결과 INSERT | 결과 네 건이 각각 쌓임. 완료 순서가 달라도 서로의 행을 교체하지 않음 |
| **④ 주력·백업 지정** | 선택 행 잠금 + `expectedVersion` 확인. 두 후보·근거·선택 이력을 한 트랜잭션으로 저장 | 먼저 확정한 한 쌍만 현재 선택. 오래된 화면의 두 번째 확정은 409 |
| **⑤ 연구 노트 동시 작성** | 단계·칸별 행 + 칸별 `version` 조건부 UPDATE | 다른 칸은 모두 저장. 같은 칸의 오래된 요청은 409로 거절하고 초안 보존 |

노트는 프로그램 버전 생성 때 8단계 × 3칸을 빈 문자열·버전 0으로 만들어 두면 최초 저장 경쟁까지 단순해집니다.

```sql
update web.notes
set body       = $1,
    version    = version + 1,
    updated_by = $2,
    updated_at = now()
where program_revision_id = $3
  and step_id = $4
  and section = $5
  and version = $6
returning version, body, updated_by, updated_at;
```

반환 행이 없으면 “다른 사람이 먼저 수정함”입니다. 클라이언트에 현재 내용·버전과 본인의 초안을 함께 돌려줍니다. **새 버전을 받아 자동 재시도하며 본문을 덮어쓰면 이 보호가 무효화됩니다.**

주력·백업 선택도 같은 방식으로 한 UPDATE에서 두 값을 변경합니다. 표적 확정·변경은 별도의 프로그램 설정 버전을 확인합니다. 이것이 “동시 접근이 전혀 없다”는 뜻은 아닙니다. **경합은 명시적인 충돌 응답으로 처리하고, 조용한 덮어쓰기가 일어나지 않게 하는 보장**입니다.

이 보장은 교사 정정·배치 처리까지 포함한 모든 쓰기 경로에 적용해야 합니다. DB 수준에서 우회를 막으려면 기존 소유자 역할과 실행 역할을 나누고, 실행 역할에는 지정 변경 함수의 실행 권한만 주는 구성이 가장 확실합니다.

### 2.6. 과금·워커·실시간 중계도 같은 일관성으로 묶기

유료 작업 접수는 다음을 **한 트랜잭션**에서 처리합니다.

1. `(team_id, request_id)`로 요청 중복 및 입력 해시 확인.
2. 현재 소속·프로그램 버전·선행 근거 확인.
3. 모둠 잔액 행을 `FOR UPDATE`로 잠금.
4. 잔액 차감·원장·`queued` 작업·전송 대기 이벤트 추가.
5. 커밋.

**워커 HTTP 호출은 커밋 뒤에 합니다.** 도킹이 끝날 때까지 DB 잠금을 잡으면 다른 모둠원의 작업까지 멈춥니다.

워커 전송자는 `FOR UPDATE SKIP LOCKED`로 짧게 작업을 확보하고 임대 시각을 기록합니다. 전송 실패·서버 재시작 후에도 같은 `web-<uuid>`를 사용합니다. 워커가 재시작해 작업을 잃었다면 저장된 동일 입력을 재전송하고, 다시 과금하지 않습니다.

완료 처리에서는 결과·작업 상태·단계 근거·이벤트를 함께 저장합니다. 중복 완료와 중복 환급은 UNIQUE로 막고, 취소된 작업의 늦은 응답은 진행 중 상태로 되돌리지 않습니다. 환급 합계가 원지출을 넘지 않는지는 원지출·잔액 잠금 안에서 검사합니다.

WebSocket에는 다음을 보냅니다.

```text
eventId, requestId, teamId, programRevisionId,
entityId, entityVersion, streamSeq
```

칸·후보·작업 단위로 적용하며 전체 프로그램을 덮어쓰지 않습니다. 재연결 시에는 이벤트 재생 또는 현재 스냅숏을 제공합니다. 이벤트 순번을 재생 커서로 쓸 경우, 단순 전역 sequence의 발급 순서를 커밋 순서로 가정하지 말고 **채널별 순번을 같은 트랜잭션의 잠금으로 확정**해야 합니다. PostgreSQL sequence 값은 롤백되지 않습니다. [트랜잭션 격리 문서](https://www.postgresql.org/docs/current/transaction-iso.html)

마지막으로, 현재 워커 캐시는 [명시적으로 `public.simulation_cache`에 접근](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/app/docking/cache.py:187)합니다. **`web:` 접두는 논리적 구분이지 스키마 격리가 아닙니다.** 이번 요구의 엄격한 `web` 경계를 지키려면 웹 요청은 다음 중 하나로 분기해야 합니다.

- 우선 메모리 캐시만 사용.
- 전용 연결로 `web.simulation_cache` 사용.

게임 요청의 기존 캐시 경로는 그대로 두고, 웹 요청에 대해 `public` 캐시를 읽거나 쓰지 않도록 워커의 캐시 선택을 분리합니다.

## 3. 공유 계약·`web-contract`·판정 규칙 연동

### 3.1. 변경 책임의 경계

| 영역 | 둘 곳 | 변경 내용 |
|---|---|---|
| 표적·질환·기준 리간드·검증값 | **crista 원본 `shared-types`와 표적 카탈로그** | 오류를 정정한 12표적, 준비 버전, 실제 기준 점수 |
| 물성·위험 신호·효능·안전 판정 | **crista 원본 `game-rules`** | CNS·환자군·투여 경로·위험 설명 확장 |
| 카드·찜·주력/백업·노트 버전·충돌 응답 | **crista-web `web-contract`** | 병렬 협업 API와 이벤트 |
| 유료 요청·과금·상태 전이 | **crista-web 서버** | 현재 웹 단계 순서와 트랜잭션 |
| 데이터 준비·계산·예측 | **crista bio-worker** | 표적 준비·캐시·출처·검증 |

[packages/SOURCE.md](/Users/mulkib/Desktop/repo/crista-web/packages/SOURCE.md)의 규칙대로, 웹 사본의 판정·비용·표적 값을 먼저 수정하면 안 됩니다. 원본 변경·검증 후 다시 복사합니다.

공유 타입 변경 시에는 다음도 함께 확인해야 합니다.

- Python의 `TARGETS`, `TARGET_IDS`, `DISEASE_SPECS`, `DOCKING_TARGET_BY_GENE`, `REFERENCE_SMILES_BY_TARGET`.
- `DISEASE_LABEL`, `DOCKING_PRESETS`, 입력 검증과 fixture.
- `tests/test_targets.py`의 **상자 크기 22Å 고정 가정**.
- 데이터셋 릴리스·워커 지원 버전과 서버의 호환성 검사.

현재 `TARGET_TO_DISEASE`는 1:1 역매핑입니다. 천식·COPD처럼 같은 표적에 복수 질환을 연결하면 덮어써지므로 **`TARGET_TO_DISEASES` 배열 매핑**으로 바꾸고, `DISEASE_TO_TARGET`은 기본 선택용 매핑으로 남기는 편이 안전합니다.

### 3.2. CNS와 표적별 기준 점수

현재 [score.ts](/Users/mulkib/Desktop/repo/crista-web/packages/game-rules/src/pipeline/score.ts:224)는 이미 다음 구조를 지원합니다.

```text
뇌 노출 필요 = 표적의 cns
             또는 선택 환자군이 brainPopulations에 포함됨
```

따라서 다음처럼 확장합니다.

- **ACHE·MAOB·SLC6A4:** `cns: true`.
- **EGFR·BRAF:** 기본 `false`, 뇌전이 환자군은 뇌 노출 필요.
- **F10:** 뇌졸중 예방이라는 이유로 `cns: true`로 만들지 않음.
- 환자군 문구를 문자열로 비교하는 현재 방식은 안정적인 `populationId`로 교체.

현행 BBB 계수 `high=1.0`, `moderate=0.7`, `low=0.35`는 CNS 3종에 공통 적용할 수 있습니다. **질환이 늘었다는 이유만으로 계수를 임의 변경할 필요는 없습니다.**

결합력 정규화도 기존 식을 유지합니다.

```text
p = clamp((referenceKcal + 4.5 − affinityKcal) / 5, 0, 1)
```

새 표적의 `referenceKcal`는 실측한 같은 준비 버전의 값만 사용합니다. 준비가 안 된 표적을 기본값 `−11.5`로 조용히 대체하지 않습니다. 결과·선택·특허·임상 입력에는 기준 점수와 규칙 버전을 함께 고정합니다.

### 3.3. 경피·국소 도포·비강·흡입은 분리해야 함

현재 `Formulation`은 `oral | iv | transdermal`이며, 경피와 비강을 같은 범주로 설명합니다. 여기에 천식·COPD의 흡입을 넣으면 약물 전달 경로를 잘못 가르치게 됩니다.

권고 계약은 다음과 같습니다.

```ts
type AdministrationRoute =
  | 'oral'
  | 'iv'
  | 'transdermal'
  | 'topical'
  | 'intranasal'
  | 'inhaled';

type EvidenceLevel =
  | 'computed'
  | 'predicted'
  | 'heuristic'
  | 'not_assessed';
```

- `transdermal`: 피부를 통과해 전신으로 전달하는 패치.
- `topical`: 피부 병변의 국소 치료.
- `intranasal`: 비강 전달.
- `inhaled`: 폐 전달.

기존 `PropertySignals.transdermal`의 MW·cLogP 규칙을 흡입 적합성에 복사하면 안 됩니다. 흡입에는 입자·제형·국소 자극 등 현재 RDKit 입력에 없는 정보가 필요하므로, **평가하지 않은 항목은 `not_assessed`**로 둡니다.

새 경로를 실제 판정 선택지로 열려면 `absorptionFactor`, 제형 피크, 용량 단위, 포장, 허가 배율까지 원본 규칙을 함께 확장해야 합니다. 숫자가 정해지지 않은 경로를 UI에서만 선택 가능하게 만드는 것은 피합니다. 현재 10/50/100mg도 질환별 실제 처방량이 아닌 교육용 모의 용량임을 분명히 해야 합니다.

### 3.4. 독성 신호와 질환별 실패 사유

현재 [properties.py](/Users/mulkib/Desktop/repo/crista/apps/bio-worker/app/properties.py:19)의 구조 경고는 방향족 아민·방향족 니트로 두 종류입니다. [PropertySignals](/Users/mulkib/Desktop/repo/crista-web/packages/shared-types/src/pipeline.ts:175)는 hERG·간독성 등의 간단한 추정 신호이며 **출혈 위험 신호는 없습니다.**

다음 세 층을 분리하는 것이 맞습니다.

| 층 | 예 | 사용 방식 |
|---|---|---|
| 구조·물성 신호 | 염기성 아민, cLogP, 반응성 구조 경고 | 지금처럼 계산 가능한 근거 |
| 표적·치료 맥락 | F10 억제와 출혈, CNS 치료와 뇌 노출 요구 | 별도 `ClinicalRiskContext` |
| 교육용 판정 | 효능 부족·안전성 부족·둘 다 | 버전이 있는 규칙으로 결정 |

권고하는 질환별 설명 연결은 다음과 같습니다.

| 표적군 | 연결할 설명 |
|---|---|
| ACHE·MAOB·SERT | BBB가 낮고 효능이 부족한 경우 뇌 노출 부족을 근거로 설명 |
| EGFR·BRAF 뇌전이군 | 동일 후보도 환자군 변경에 따라 뇌 노출 요구가 달라짐 |
| HMGCR 및 기타 표적 | 간독성 구조 경고가 존재할 때 해당 계산 근거를 설명. 질환 이름만으로 간독성을 부여하지 않음 |
| F10 | 출혈은 약리작용과 관련된 맥락 위험. **임의 SMARTS 하나로 예측하지 않음** |
| COX-2 | 심혈관·위장관 맥락 위험을 hERG와 구별 |
| JAK1 | 표적 관련 안전성 검토 항목을 별도 제공. 구조 경고가 없다고 안전성이 검증된 것은 아님 |
| PDE4B·흡입 후보 | 현재 계산하지 않는 국소 전달·내약성 한계를 명시 |

첫 확장에서는 기존 `failure = efficacy | safety | both`를 유지하고, `reasonCodes[]`와 계산 근거를 구조화하는 방식을 권합니다. 출혈 등 새 위험을 **실제 합격·불합격 수식에 넣으려면** 원본 `game-rules`에서 입력·계수·근거·검증 사례를 함께 정의해야 합니다.

ADMET-AI는 현 설계대로 비교 자료로 유지합니다. 이를 몰래 점수에 섞거나, 안전 점수가 낮다는 사실을 “간손상·출혈이 실제 발생했다”로 바꾸어 서술하면 안 됩니다.

`TRIAL_OPTIONS`도 환자군·평가지표를 안정적인 ID로 관리하고 조합을 검증합니다. 특히 BRAF 변이군, BCR-ABL1 양성 CML, 정맥혈전색전증과 다른 뇌졸중 예방 적응증, 천식과 COPD는 같은 문구 묶음으로 취급하지 않습니다.

## 4. 단계별 실행 계획과 완료 기준

다음은 **후속 구현 단계의 실행 계획**입니다. 이번 검토에서는 준비 스크립트·테스트·마이그레이션을 실행하지 않았습니다.

| 순서 | 작업 | 실행·확인 방법 | 완료 기준 |
|---|---|---|---|
| **1. 카탈로그 정정** | PDB·리간드·MONDO·생물종·환자군 연결 수정 | RCSB/CCD·MONDO·Open Targets ID 대조 | 잘못된 연결 0건. 12개 카드와 실제 질환 ID 관계 명확. 결정 리간드와 임상 비교 약물 분리 |
| **2. 준비·검증 스크립트 확장** | 다중 사슬·보조인자·이온·물 선택, 입체화학 검사, 실패 종료 수정 | 준비 명세 검증과 알려진 실패 입력 검사 | 잘못된 리간드·사슬·RMSD 초과가 성공으로 기록되지 않음 |
| **3. 표적 준비·재도킹** | 수정된 신규 표적과 기존 4종 검증 | `prepare_target.py <id>` → `redock_check.py <id>` → `--check` | 공개할 12표적 모두 동일한 승인 설정에서 1위 RMSD ≤ 2.0Å. 필수 원자·해시·기준값 일치 |
| **4. 질환·화합물 수집** | 근거 자료와 표적별 교육용 분자 구성 | 수정된 `prepare_datasets.py` | 가짜 점수·출처 오표기 없음. 분자 검증 통과. 표적별 후보 다양성과 수업용 후보 수 확보 |
| **5. 부분 사전 도킹** | 약 960쌍부터 계산, 실패 재시도·중단 재개 | 확장된 `prescreen_library.py` → `prepare_datasets.py --offline` | 미계산·실패·완료가 구분됨. 오래된 설정 결과 미사용. manifest와 실제 계산 범위 일치 |
| **6. 워커 반영** | 새 카탈로그·결과 출처·캐시 경계·PLIP 형식 | `test_targets`, `test_datasets`, `test_cache`, `test_properties`, compute 검증 | 12표적 조회·실제 계산 가능. 모르는 표적은 명시 거절. 웹 요청의 `public` 캐시 접근 없음 |
| **7. 원본 계약·판정 반영** | CNS 3종, 환자군, 표적 기준값, 경로·위험 설명 | crista 타입 검사·규칙 회귀 검사 | 기존 4종의 의도하지 않은 판정 변화 없음. 새 표적은 잘못된 기본 기준값으로 계산되지 않음 |
| **8. 웹 사본 동기화** | 원본 패키지 재복사·웹 협업 계약 추가 | 사본 차이 확인·타입 검사 | 원본과 사본 일치. 모든 요청·이벤트에 요청 ID·대상 ID·버전 포함 |
| **9. 후속 마이그레이션 작성** | `0002` 이후 DDL·변경 함수·인덱스 | SQL 검토·자체 실행기 dry-run | 기존 `0001` 체크섬 유지. 모든 새 객체·참조가 `web` 범위. 적용 순서·복구 절차 명시 |
| **10. 로컬 동시성 검증** | 같은 모둠 4명과 다른 모둠의 병렬 작업 | 실제 PostgreSQL 연결 여러 개로 동시 요청 | 카드 4개 보존, 같은 후보 찜 1명 성공, 도킹 결과 4개 보존, 선택 쌍 원자성, 노트 충돌 감지 |
| **11. 장애·재전송 검증** | 서버 중단·워커 재시작·중복 완료·표적 변경 | 과금 직후·전송 직후·완료 저장 직후 장애 주입 | 중복 과금·환급·특허·가치 반영 0건. 옛 표적 결과가 새 단계 근거가 되지 않음 |
| **12. 호스팅 적용** | 검증된 SQL과 워커·서버 버전 적용 | dry-run 결과 제시 후 기존 승인 절차 | 별도 사용자 확인 뒤 진행. 게임 스키마·프로젝트 설정 변경 없음 |

3단계에서 특정 표적이 실패하면 임계값을 완화하거나 기준 점수를 임의로 넣지 않고, 그 표적의 준비 명세·대체 구조를 다시 검토합니다. 검증 중인 표적은 `draft`로 두어 수업의 선택 목록과 분리합니다.

학생 화면에서는 각자 실험한 카드가 오른쪽 비교표에 하나씩 추가됩니다. 같은 후보를 두 명이 맡으려 하면 이미 맡은 사람이 표시되고, 같은 노트 칸을 동시에 고치면 두 글을 확인해 합칠 수 있습니다. 모둠이 주력·백업을 바꾸더라도 이전 실험과 선택 이유는 그대로 남습니다.