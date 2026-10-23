# 현재 코드 대조 기록

확인일: 2026-10-24. 로컬 개발본을 읽은 정적 확인이며 배포 환경이나 외부 계산 워커의 실제 동작을 보증하지 않는다. 여러 기능이 동시에 작성 중이므로 완료 전 연결 상태를 다시 확인한다.

- `apps/web/src/screens/Login.tsx`, `District.tsx`, `Teacher.tsx`: 가입/로그인, 아바타/사옥 입사/등기, 교사의 학급 생성·코드 발급/열기/닫기·명단/모둠 배정 화면이 있다. 교사 화면에서 시계 제어·심사 개입·비밀번호 초기화·프로젝터 보기 UI는 아직 확인되지 않는다.
- `apps/web/src/board/steps/s11.tsx`: 질환 목록, Open Targets 연관 표적 표, 개인 추천/모둠 확정 화면이 있다.
- `apps/web/src/board/steps/s12.tsx`: 현재 연결 화면은 컷오프 입력·깔때기 미리보기·스크리닝 실행 기록·통과 후보 찜이다. 서버 `features/screen.ts`와 `s12-parts.tsx`가 추가되는 중이나 6안건 회의·투표와 5개 탐색 도구가 현재 전체 연결됐다고 단정하면 안 된다.
- `apps/web/src/board/steps/s21.tsx`: 분자 편집·물성 미리보기·도킹·수심계·카드·10배 계단·비교표·다음 대기열 화면이 있다.
- `apps/web/src/board/steps/s22.tsx`: ADMET 실행·물성 레이더·신호등·몸속 여행·점수 분해·비교표·특허 후보 선정 화면이 있다.
- `s31.tsx`, `s32.tsx`, `s33.tsx`: 현재 각 10줄로 StepPreview를 반환하는 안내 자리다. 서버 모듈 patents/preclinical/ind 및 문서 편집 공통 부품은 준비돼 있지만 학생 전체 실습 화면으로 완성됐다고 설명하지 않는다. 설계 의도와 개발 중 흐름으로 소개한다.
- `steps/index.ts`: 4.1은 LockedStep에 연결, 4.2는 Step42에 연결. `features/clinical.ts`, `clinical-sim.ts`, `web-contract/clinical.ts`는 작성 중인 코드가 있다. 4.1은 현재 일반 학생 화면에서 완주 가능한 실습이라고 쓰지 않는다.
- `s42.tsx`: 브랜드 이름 → 포장 디자인 → NDA 신청서 → 심사/접수 → 허가증/포장/연구비 영수증의 5개 탭 화면과 서버 `features/approval.ts`가 있다. 3상 통과가 선행 조건이므로 4.1 등 앞 단계 연결 확인이 필요하다. 현재 새로 구현 중인 화면으로 소개한다.
- `StepLearn.tsx`는 null 반환, `PitchButton.tsx`는 disabled, `features/learn.ts` register는 빈 본문이다. 개념/중급/심화 학습 채점 및 학습 연구비/Series A·B는 준비 중인 설계로 표시한다.
- `RankButton.tsx`는 disabled/순위 —/기초 시가총액 표시. `LedBand.tsx`는 현재 회사 설립 등기 소식만 생성한다. `features/market.ts`는 빈 register. 기업가치 변동/순위/경쟁사 서랍/성과별 뉴스/사옥 Tier 성장의 전체 연동은 개발 중이다.
- `clock.ts`에 교사의 게임 시계 명령 API, `reviews.ts`에 교사 심사 목록·수동 판정·LLM 사용량 API가 있다. API 존재와 교사 화면 제공은 구분한다.
- `llm.ts`: claude-opus-5-5 / effort medium 설정, 구조화 출력·검사·요청 제한·사용 기록·수동 처리 지원. 규칙은 숫자/공정성, LLM은 문서 정합성. 실제 서비스 키/접속 상태는 조회하지 않았다.
- `worker.ts`는 별도 crista bio-worker에 HTTP 요청한다. 실제 데이터/계산/예측/교육용 모의 판정을 구분한다. 워커의 real/fixture 모드 및 외부 실행 준비는 연수 전 점검 대상으로 남긴다.
- 전임상·임상·허가의 효능/안전 판정은 교육용 모의 판정이다. 실제 사람·동물 실험이나 규제 승인이 아니다. ADMET-AI 예측치를 수업 규칙의 모든 판정에 그대로 넣는다고 쓰지 않는다.
- 기존 원고의 'AlphaFold 항체 트랙 준비 완료', '1분 내 설치 완료', '모두 다른 표적 보장', '10~15년·2~3조 원·1만개 중 1개'를 검증된 현재 기능/보편 통계로 반복하지 않는다. AlphaFold를 일반적으로 PDB보다 부정확하다고 단정하지 않는다.
