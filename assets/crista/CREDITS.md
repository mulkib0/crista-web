# 에셋 출처·라이선스 기록

아트디렉션: **06 픽셀 타이쿤** — `docs/2026-10-22-art-direction-pixel-tycoon.md`
생성기: `node tools/gen-assets.mjs` (단일 소스: `tools/crista-asset-lib.js`)

| 분류 | 개수 | 조달 방식 | 비고 |
| :--- | ---: | :--- | :--- |
| tile | 53 | runtime, draw, free | 런타임 TileSprite로 대체 가능 |
| facility | 36 | draw | 파란 펜 = 완공 확정 · 1단계 |
| building | 33 | draw | 법인 등기·부지 계약·물질특허 출원 |
| prop | 7 | draw | 괘지 시세 화면 · 종이 주문표 · 하단 발자리 |
| char | 176 | draw | 남향 정지 · 이름표는 별도 UI · 팀 표시는 복장만 |
| ui | 36 | draw | 글자 없는 2줄 용지 · 9-slice 24/8/8/16px(좌/우/상/하) · 꼬리는 고정 좌하단 |
| icon | 39 | draw | 단색 1.6px 펜 선, 24px 그리드 |
| pill | 12 | draw | 정면 제품 그림 · ivory = P.raised · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| stamp | 7 | draw | 특허청 승인 |
| fx | 9 | draw | 40×40 셀 3개(소·중·대) · 불투명 pencil 25% 디더(2×2마다 1px) · 애니메이션이 아니라 크기 변주 선택(명세 §5 "해칭 스프라이트 3프레임") |
| chart | 5 | draw | 2단 깔때기 1차 선별 |
| brand | 7 | draw | 문서·스플래시 공용 |
| misc | 14 | draw, runtime, free | hotspot 2,2 |
| sound | 12 | audio | 고역 노이즈 한 점 · 펜 끝이 종이에 닿는 톡 |
| board | 4 | draw | 1280×720 송출 원본 · 최소 글자 18px · 점선 칸은 런타임 데이터 자리(PRD §3.3) |
| form | 3 | draw | 시청·특허청 물질특허 출원 · 도장 자리 = stamp/patent-granted |

## M4 도시·객장·NPC — 직접 제작·가공 내역

외부 이미지·생성형 이미지·소재 팩을 사용하지 않고 본 저장소의 SVG 도형으로 직접 제작했다.
출처: `tools/crista-asset-lib.js` · 라이선스: 본 저장소 자체 생성물.
기존 `char/npc-clinician` 남향은 그대로 재사용하고 나머지 방향을 추가했다.
가공: 06 팔레트 매핑, 불투명 외곽선, 단색 그늘, 투명 배경,
건물 3/4 탑다운·하단 발자리, 알파 이진화·29색 팔레트 맞춤·2px 가장자리 복제 후 PNG-8 아틀라스 변환.
NPC 복장은 흰 가운·장비 색이며 직책은 소품으로 구분한다. 말풍선·장부의
`nineSlice` 및 말풍선 `parts` 좌표는 `assets/manifest.json`에 함께 기록한다.

| 프레임 | 크기(px) | 제작·가공 |
| :--- | :--- | :--- |
| `tile/exchange-floor` | 32×32 | 코드로 직접 제작 · 가로 8px 괘선만 · 모눈 없음 · 32px 반복 |
| `tile/water` | 32×32 | 코드로 직접 제작 · 파란 물 · 16px 직각 물결 · 가로·세로 반복 |
| `tile/water-bank-north` | 32×32 | 코드로 직접 제작 · 위 12px 둑 · 아래 물 · 가로 반복 |
| `tile/water-bank-south` | 32×32 | 코드로 직접 제작 · 위 물 · 아래 12px 둑 · 가로 반복 |
| `tile/bridge-deck` | 32×32 | 코드로 직접 제작 · 도로 용지·중앙 점선 계승 · 좌우 난간 · 세로 반복 |
| `tile/median` | 32×32 | 코드로 직접 제작 · 사방 연결 화단 · 가로수 밑동 · 가장자리 같은 위상 |
| `building/office-a` | 96×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/office-b` | 96×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/apartment-a` | 96×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/apartment-b` | 64×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/shop-row` | 128×64 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/datacenter` | 96×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/bank-tower` | 96×128 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/campus-wing` | 96×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/warehouse` | 128×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/factory` | 128×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/parking-garage` | 96×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/station` | 160×96 | 코드로 직접 제작 · 3/4 탑다운 · 하단 발자리 · 2px 벽 외곽선 · 단색 측면 |
| `building/exchange-ticker` | 64×96 | 코드로 직접 제작 · 글자 없는 띠·막대 · 상승 빈 몸통 / 하락 채움 |
| `prop/exchange-terminal` | 32×48 | 코드로 직접 제작 · 괘지 시세 화면 · 종이 주문표 · 하단 발자리 |
| `char/npc-clinician` | 32×48 | 기존 직접 제작 남향 재사용 · 남향 정지 · 이름표는 별도 UI · 팀 표시는 복장만 |
| `char/npc-clerk` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-clerk-north` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-clerk-east` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-clerk-west` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-clinician-north` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-clinician-east` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-clinician-west` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-vc-partner` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-vc-partner-north` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-vc-partner-east` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-vc-partner-west` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-fda-reviewer` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-fda-reviewer-north` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-fda-reviewer-east` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-fda-reviewer-west` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-broker` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-broker-north` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-broker-east` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-broker-west` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-researcher` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-researcher-north` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-researcher-east` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `char/npc-researcher-west` | 32×48 | 코드로 직접 제작 · 팀 잉크 없는 복장 · 소품으로 직책 구별 · 이름표 별도 |
| `ui/npc-bubble` | 96×48 | 코드로 직접 제작 · 글자 없는 2줄 용지 · 9-slice 24/8/8/16px(좌/우/상/하) · 꼬리는 고정 좌하단 |
| `ui/exchange-ledger` | 96×64 | 코드로 직접 제작 · 가로 8px 괘선만 · 9-slice 8px · 줄 간격 보존 시 중앙을 타일 반복 · 문구는 런타임 |

## M5 포장·아이콘 — 직접 제작·가공 내역

외부 이미지·생성형 이미지·소재 팩 없이 본 저장소 SVG 도형으로 직접 제작한 15종이다.
출처: `tools/crista-asset-lib.js` · 라이선스: 본 저장소 자체 생성물.
가공: 정면 제품 그림, 06 픽셀 타이쿤 팔레트 매핑, 투명 배경, 문자·로고·숫자 제거,
포장 외곽선은 불투명 연필, 그늘은 팔레트의 단색 면,
알파 이진화·29색 팔레트 맞춤·2px 가장자리 복제 후 PNG-8 아틀라스 변환. 아이콘은 불투명 2px 직각 외곽선이다.
포장 주색은 `ivory = P.raised`(밝은 종이), `sage = P.equip`(파란 장비),
`sand = P.edge`(황토 벽)다. 상태 색·팀 잉크와 겹치지 않아 새 토큰은 추가하지 않았다.
캡슐의 반쪽과 바이알 몸체·패치 약물층은 `P.white`, 고무 마개는 `P.equipEdge`다.

| 프레임 | 크기(px) | 제작·가공 |
| :--- | :--- | :--- |
| `icon/trial` | 24×24 | 코드로 직접 제작 · 세 사람 윤곽 · 기존 아이콘과 같은 2px · 불투명 연필 |
| `icon/formulation` | 24×24 | 코드로 직접 제작 · 정제·주사기·패치 · 기존 아이콘과 같은 2px · 불투명 연필 |
| `icon/codename` | 24×24 | 코드로 직접 제작 · 구멍·끈이 있는 빈 태그 · 기존 아이콘과 같은 2px · 불투명 연필 |
| `pill/tablet-ivory` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · ivory = P.raised · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/tablet-sage` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sage = P.equip · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/tablet-sand` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sand = P.edge · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/capsule-ivory` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · ivory = P.raised · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/capsule-sage` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sage = P.equip · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/capsule-sand` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sand = P.edge · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/vial-ivory` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · ivory = P.raised · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/vial-sage` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sage = P.equip · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/vial-sand` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sand = P.edge · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/patch-ivory` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · ivory = P.raised · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/patch-sage` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sage = P.equip · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |
| `pill/patch-sand` | 48×48 | 코드로 직접 제작 · 정면 제품 그림 · sand = P.edge · 불투명 연필 외곽선 · 단색 그늘 · 투명 배경 · 문자 없음 |

## v10 사옥 소품 · 내부 Tier 바닥 — 직접 제작·가공 내역

동기부여 Step 3(설계서 §3.1 · §3.2)의 소품 6종과 사옥 내부 Tier 바닥 2종이다. 외부 이미지·생성형 이미지·소재 팩 없이
본 저장소 SVG 도형으로 직접 제작했다. 출처: `tools/crista-asset-lib.js` · 라이선스: 본 저장소 자체 생성물.
가공: 확정 팔레트만(새 토큰 없음 — 금박 대신 승인 도장 잉크 + 형광펜), 1px 연필 외곽선 60% · 장비 2px, 좌상단 38° 광원에 따른 우하단 해칭,
투명 배경, 2px 가장자리 복제 후 PNG-8 아틀라스 변환.

| 프레임 | 크기(px) | 제작·가공 |
| :--- | :--- | :--- |
| `tile/floor-pen` | 32×32 | 코드로 직접 제작 · 사옥 Tier 2 — 실내 바닥 위 파란 펜 주선 · 모서리 치수 눈금 |
| `tile/floor-showcase` | 32×32 | 코드로 직접 제작 · 사옥 Tier 3 — 형광펜 하이라이트 띠 · 우하단 디더 그늘 |
| `prop/espresso` | 32×48 | 코드로 직접 제작 · 장비 파랑 본체 · 종이컵 · 파란 펜 김 3줄 · 하단 발자리 |
| `prop/poster-board` | 32×48 | 코드로 직접 제작 · 이젤 · 포스트잇 노랑 포스터 · 연필 그래프 · 하단 발자리 |
| `prop/lounge-sofa` | 64×32 | 코드로 직접 제작 · 검토 테이블 · 빨간 펜 교정지 · 의자 2 · 우하단 디더 그늘 |
| `prop/showcase-case` | 32×48 | 코드로 직접 제작 · 유리 진열장 · 선반 2단 · 알약 · 바이알 실루엣 |
| `prop/plaque-nda` | 32×32 | 코드로 직접 제작 · 벽걸이 액자 · 승인 도장 잉크 원(허가) · 형광펜 띠 |
| `prop/landmark` | 64×32 | 코드로 직접 제작 · 옥상 간판 틀 · 파란 펜 글자 자리 · 형광펜 하이라이트 · 깃대 |

## 사운드 12종 — 출처·라이선스·가공 내역

생성 방식: **ffmpeg 신호 합성 (외부 음원 없음)** (`tools/gen-audio.mjs`) · 라이선스: **저장소 자체 생성물 — 제3자 저작물 포함 없음**
샘플레이트 48000 Hz · 효과음 peak -1.5 dBFS · 앰비언트 -28 LUFS · 루프 교차 페이드 1.5s

| id | 길이 | 합성 레시피 | 정규화 | 출처 URL | 라이선스 |
| :--- | ---: | :--- | :--- | :--- | :--- |
| `sfx-click` | 0.12s | click | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-stamp` | 0.3s | stamp | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-page` | 0.42s | page | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-write` | 0.7s | write | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-alert` | 0.5s | alert | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-success` | 0.8s | success | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-coin` | 0.38s | coin | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-trade` | 0.24s | trade | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `sfx-fail` | 0.7s | fail | peak 정규화 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `amb-lab` | 10s (루프) | ambLab | loudnorm 2패스 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `amb-city` | 10s (루프) | ambCity | loudnorm 2패스 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |
| `amb-floor` | 10s (루프) | ambFloor | loudnorm 2패스 | 외부 출처 없음 (본 저장소 생성) | 본 저장소 자체 생성물 |

파일은 `assets/audio/<id>.ogg`(Opus)와 `<id>.m4a`(AAC) 두 벌이다. Opus 가 기본이고 m4a 는 Safari 대체본이다.
**실물 녹음으로 교체할 때**는 같은 id·같은 길이로 파일만 바꾸고 위 표의 출처 URL·라이선스 칸을 채운다
(이 표는 생성기가 다시 쓰므로 `tools/gen-assets.mjs` 의 템플릿 쪽을 고쳐야 한다).

## 조달 방식 표기

- `draw` — 본 저장소에서 코드로 직접 생성. 저작권 이슈 없음.
- `free` — 무료 에셋을 가공해 대체할 수 있는 항목. **채택 시 이 표에 출처 URL·라이선스·가공 내역을 반드시 추가한다.**
- `runtime` — 파일이 아니라 런타임(Phaser TileSprite 등)에서 생성.
- `audio` — CC0 음원 가공 예정. 출처 기록 필수.

## 서체

Galmuri 2.40.3 — **SIL Open Font License 1.1**. 공식 npm 패키지의 woff2 5종을 로컬 번들한다.
파일·출처·버전·SHA-256: [assets/fonts/galmuri/README.md](fonts/galmuri/README.md).
라이선스 원문: [assets/fonts/galmuri/OFL.txt](fonts/galmuri/OFL.txt).
SVG 글자는 Galmuri9(10·20px) · Galmuri11/GalmuriMono11(12·24px) · Galmuri14(15·30px)로 맞춘다.
아틀라스 빌더가 이 폴더를 fontconfig에 등록한 뒤 래스터한다.
