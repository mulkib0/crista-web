# 항체 설계 랩(트랙 2) — 구현 점검 묶음 (2026-10-24)

- 설계: [`docs/2026-10-24-antibody-lab-design.md`](../../docs/2026-10-24-antibody-lab-design.md) · 재사용 규칙은 §11.
- 이 가지(`feat/antibody-lab`)는 **항체 랩이 가진 파일만** 커밋한다. 공유 파일에 더한 한두 줄은 아래 패치로 둔다 — 트랙 1 기반이 커밋되면 그 위로 rebase 한 뒤 적용한다.

## shared-edits.patch

공유 파일 16개에 더한 줄(설계 §11.4 목록). 기준은 트랙 1 작업 트리를 복사한 시점이다.

```sh
# 트랙 1 기반 커밋 위로 올린 뒤
git apply --3way .review/2026-10-24-antibody/shared-edits.patch
```

| 파일 | 더한 것 |
| --- | --- |
| `packages/web-contract/src/index.ts` | `export * from './antibody.ts'` |
| `packages/web-contract/src/api.ts` | `ErrorCode` 3값 · `ApiErrorBody.error.abNote?` · `LabProgress` · `MeResponse.labs?` · `openTracks?` |
| `packages/web-contract/src/ws.ts` | `ServerMessage` 4종(`antibody.changed` · `progress` · `news` · `consensus`) |
| `apps/server/src/routes.ts` | `registerAntibodyRoutes(router, account)` 한 줄 |
| `apps/server/src/context.ts` | `Limits` 2줄 · `Deps.antibody` |
| `apps/server/src/index.ts` | 항체 러너 start · stop + **공용 배경 루프 기본 off**(§11.6) |
| `apps/server/src/config.ts` | `antibody` 설정 |
| `apps/server/src/db.ts` | 0020 요구 |
| `apps/server/src/accounts.ts` | `me()` 의 `labs` · `openTracks` |
| `apps/web/src/App.tsx` | 라우트 `lab` · `antibody` · 고른 랩 들고 다니기 |
| `apps/web/src/screens/Login.tsx` | 로그인 · 가입 뒤 **연구소 고르기**로 보내기 |
| `apps/web/src/screens/District.tsx` | 등기 뒤 `?lab=` 전달 |
| `apps/web/src/screens/Teacher.tsx` | 선생님 화면에 항체 탭 등록(내용은 `antibody/TeacherPanel.tsx`) |
| `apps/web/src/screens/Board.tsx` | 위 띠 [랩 고르기] |
| `apps/web/src/screens/Teacher.tsx` | 큰 탭 4줄 — 학급 운영 · 항체 설계 랩(내용은 `apps/web/src/antibody/TeacherPanel.tsx`) |
| `apps/web/package.json` · `package.json` · `.env.example` | 3Dmol · e2e 스크립트 · 선택 키 주석 |

## 화면 스크린샷

`labs-*` 연구소 고르기(1판) · `labs2-*` 연구소 고르기(수리 3 · 설계 §1.4 전체 — `labs2-1440` · `labs2-390` 등기 끝난 학생 · `labs2-closed-1440` 선생님이 항체 랩을 닫았을 때 · `labs2-new-*` 등기 전 띠 · 진행 칩 없음) · `antibody-A2~A6` 단계 화면 · `rev-*` 검증 때 실제 서버로 걸어 본 화면(1440px · 390px) · `teacher-*` 선생님 화면 항체 탭(1440px — 기본 상태 · 가중치 합이 안 맞을 때).
