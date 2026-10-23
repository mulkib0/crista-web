# 항체 설계 랩(트랙 2) — 구현 점검 묶음 (2026-10-24)

- 설계: [`docs/2026-10-24-antibody-lab-design.md`](../../docs/2026-10-24-antibody-lab-design.md) · 재사용 규칙은 §11.
- 이 가지(`feat/antibody-lab`)는 **항체 랩이 가진 파일만** 커밋한다. 공유 파일에 더한 한두 줄은 아래 패치로 둔다 — 트랙 1 기반이 커밋되면 그 위로 rebase 한 뒤 적용한다.

## shared-edits.patch

공유 파일 15개에 더한 줄(설계 §11.4 목록). 기준은 트랙 1 작업 트리를 복사한 시점이다.

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
| `apps/web/src/screens/District.tsx` | 등기 뒤 `?lab=` 전달 |
| `apps/web/src/screens/Board.tsx` | 위 띠 [랩 고르기] |
| `apps/web/package.json` · `package.json` · `.env.example` | 3Dmol · e2e 스크립트 · 선택 키 주석 |

## 화면 스크린샷

`labs-*` 연구소 고르기 · `antibody-A2~A6` 단계 화면 · `rev-*` 검증 때 실제 서버로 걸어 본 화면(1440px · 390px).
