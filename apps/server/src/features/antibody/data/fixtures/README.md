# 항체 랩 고정 예시(fixture) — 원자료만

설계 `docs/2026-10-24-antibody-lab-design.md` §3.4 ② 층. **2026-10-24** 에 아래 명령으로 실제 API 를 불러 받은
**응답 원문**이에요. 네트워크를 끊어도 A1~A5 가 이 자료로 돌아가요.

## 규칙

- **원자료만** 둬요. 다양성 벡터 · 계면 잔기쌍 같은 **파생 값은 굽지 않아요** — 그 계산은 묶음 3 함수이고,
  적재는 묶음 4 의 시드 단계예요(§7 의존 그래프).
- 큰 파일은 **gzip 으로만** 눌렀어요. 내용은 한 글자도 손대지 않았고, `fixtures.ts` 의 `readFixtureText` 가 `.gz` 를 알아서 풀어요.
- 수집 날짜는 `fixtures.ts` 의 `FIXTURE_COLLECTED_ON` 한 곳에서 관리하고, 화면 배지
  (`미리 받아 둔 참고 자료입니다(2026-10-24 수집 · 실시간 조회 아님)`)에 그대로 나가요.
- 표적·구조 짝은 모두 **항원 복합체**예요 — Fab 단독 구조(`6ARP`)를 기본값으로 두면 '타깃 체인 자동 탐색'이 중쇄를
  항원으로 잘못 고를 수 있어요(§2.3).

## 받은 명령 (`UA` = `crista-web-edu/0.1 (classroom teaching tool; mulk.codes)`)

### ChEMBL REST (`chembl/`)

```sh
# 표적 → 기전 (EGFR CHEMBL203 90건 2.42s · HER2 CHEMBL1824 · VEGFR2 CHEMBL279)
curl -A "$UA" "https://www.ebi.ac.uk/chembl/api/data/mechanism.json?target_chembl_id=CHEMBL203&limit=200"
# 기전에 묶인 분자 중 항체만, 칸을 줄여서 (EGFR 15종 1.30s)
curl -A "$UA" -G "https://www.ebi.ac.uk/chembl/api/data/molecule.json" \
  --data-urlencode "molecule_chembl_id__in=<위 응답의 id 들>" \
  --data-urlencode "molecule_type=Antibody" --data-urlencode "limit=100" \
  --data-urlencode "only=molecule_chembl_id,pref_name,molecule_type,first_approval,max_phase,withdrawn_flag,biotherapeutic"
# 단건 — 여기에만 biotherapeutic.biocomponents(사슬 서열)가 동봉돼요 (1.24s)
curl -A "$UA" "https://www.ebi.ac.uk/chembl/api/data/molecule/CHEMBL1201577.json"
```

확인한 것 — 서열 키는 `bio_component_sequences` 가 아니라 **`biocomponents`**, `max_phase` 는 숫자가 아니라
**문자열 `'4.0'`**, 세툭시맙은 사슬 2개(213 · 452잔기)예요.

### RCSB (`rcsb/`)

```sh
# search v2 — full_text AND entity_poly.rcsb_entity_polymer_type exact_match Protein (40건 2.96s)
curl -A "$UA" -H 'Content-Type: application/json' --data @search-cetuximab.req.json \
  https://search.rcsb.org/rcsbsearch/v2/query
# data GraphQL — 해상도 + 엔티티 설명 · auth 체인 · 서열을 한 번에 (0.67s)
curl -A "$UA" -H 'Content-Type: application/json' --data @graphql.req.json https://data.rcsb.org/graphql
# 구조 파일 (1YY9 752KB 1.62s · 1N8Z 704KB · 3S37 709KB)
curl -A "$UA" -O "https://files.rcsb.org/download/1YY9.pdb"
```

`graphql-entries.json` 에는 `1YY9` · `1N8Z` · `3S37` · `5SX4` 네 건이 함께 들어 있어요.
`5SX4` 는 비대칭 단위에 복합체가 **2벌**(중쇄 `H`·`J` / 경쇄 `I`·`L` / 항원 `M`·`N`)이라 '체인 조' 처리 시험에 써요.

확인한 체인 역할 · 길이:

| PDB | 해상도 | 중쇄 | 경쇄 | 항원 |
| --- | --- | --- | --- | --- |
| `1YY9` EGFR·세툭시맙 | 2.605Å | `D` 221 | `C` 213 | `A` 624 |
| `1N8Z` HER2·트라스투주맙 | 2.52Å | `B` 220 | `A` 214 | `C` 607 |
| `3S37` VEGFR2·라무시루맙 | 2.7Å | `H` 221 | `L` 214 | `X` 122 |

### ColabFold MSA (`colabfold/`)

```sh
VH=QVQLKQSGPGLVQPSQSLSITCTVSGFSLTNYGVHWVRQSPGKGLEWLGVIWSGGNTDYNTPFTSRLSINKDNSKSQVFFKMNSLQSNDTAIYYCARALTYYDYEFAYWGQGTLVTVSA
curl -A "$UA" --data-urlencode "q=>101
$VH" --data-urlencode "mode=env" https://api.colabfold.com/ticket/msa   # → {"id":…,"status":…}
curl -A "$UA" "https://api.colabfold.com/ticket/<id>"                   # PENDING → COMPLETE
curl -A "$UA" -O "https://api.colabfold.com/result/download/<id>"       # tar.gz 552KB
tar -xzf … && gzip -9 -c uniref.a3m > 1YY9-H-uniref.a3m.gz
```

세툭시맙 VH 119잔기 · uniref 안에 **7,304 서열**. 열 엔트로피 · 백분위 등급은 묶음 3(`diversity.ts`)이 계산해요.

### SAbDab2 (`sabdab/`)

```sh
curl -A "$UA" -H 'Content-Type: application/json' \
  -d '{"heavy_seq":"<VH>","light_seq":"<VL>","n":5,"threshold":0.7,"region":"CDRs"}' \
  https://sabdab.opig.stats.ox.ac.uk/api/sequence-similarity-search      # 5.50s
curl -A "$UA" https://sabdab.opig.stats.ox.ac.uk/api/frontend/pdb/1YY9          # 404
curl -A "$UA" https://sabdab.opig.stats.ox.ac.uk/api/frontend/pdb/pdb_00001yy9  # 200 — 확장 ID 만 받아요
curl -A "$UA" --max-time 300 https://sabdab.opig.stats.ox.ac.uk/api/download/all-summary  # 17.5MB · 22,693줄 · 96초
head -400 all-summary > all-summary-head.csv && gzip -9 all-summary-head.csv
```

`all-summary` 는 이름과 달리 **쉼표 구분 CSV** 이고, `compound` 칸에 `"N-(2,6-dimethylphenyl)-…"` 처럼 따옴표 안
쉼표가 들어 있어요 — `split(',')` 로는 칸이 밀려요. 여기 둔 건 **앞 400줄**(머리줄 포함)이고 전체는 묶음 4 의 시드가 받아요.

### ESM Atlas ESMFold (`esmfold/`)

```sh
curl -A "$UA" --data-binary @vh.txt   https://api.esmatlas.com/foldSequence/v1/pdb/   # 119잔기 2.07s · 77KB
curl -A "$UA" --data-binary @scfv.txt https://api.esmatlas.com/foldSequence/v1/pdb/   # 241잔기 1.41s · 149KB
curl -A "$UA" --data-binary @heavy-452.txt https://api.esmatlas.com/foldSequence/v1/pdb/  # 413
printf 'QVQLKQSGPGL:DILLTQSPVIL' | curl -A "$UA" --data-binary @- https://api.esmatlas.com/foldSequence/v1/pdb/  # 422
```

- `error-413.txt` = `Sequence is longer than 400.`
- `error-422.txt` = `Sequence is only allowed to have {…} tokens.` — 쓰인 글자 집합이 20종보다 넓어요(`B` · `J` · `X` · `Z` 포함).
- 확신도는 B-factor 열에 **0~1** 로 들어와요(VH 측정 최소 0.43 · 최대 0.96 · 평균 0.8666) → 화면에는 ×100 해서 올려요.
- scFv 는 `VH + GGGGS×3 + VL` = 119 + 15 + 107 = **241잔기**예요.
