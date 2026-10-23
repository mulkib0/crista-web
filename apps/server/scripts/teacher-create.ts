/**
 * 교사 계정 발급(설계 §3 · §9 — 공개 가입 없음). crista `scripts/admin-teacher.ts` 를 옮겼다.
 *
 *   npm run teacher:create -- --login <아이디> --name <이름> [--reset-password] [--json]
 *   (루트 스크립트가 tools/with-local-env.mjs 로 감싸 **로컬** Supabase 값만 싣는다)
 *
 * - GoTrue 관리 API 로 `<아이디>@web.crista.test` 계정을 만들고(email_confirm) web.accounts(kind = teacher) 를 넣는다.
 * - 비밀번호는 여기서 만들어 **한 번만** 출력한다(저장하지 않는다). `--json` 이면 stdout 에
 *   `{"loginId":…,"userId":…,"password":…}` 한 줄만, 안내는 stderr 로(검증 스크립트용).
 * - 같은 아이디의 교사가 있으면 `--reset-password` 없이는 거절(학생 아이디면 늘 거절). 비밀번호를 바꾸면 그 교사의 세션을 모두 끊는다.
 */
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { checkDisplayName, checkLoginId } from '@crista-web/web-contract';
import { createTeacher } from '../src/accounts.ts';
import { loadConfig } from '../src/config.ts';
import { assertDatabase, createPool } from '../src/db.ts';
import { GoTrueClient } from '../src/gotrue.ts';

const log = (message: string) => process.stderr.write(`[teacher:create] ${message}\n`);

/** 헷갈리는 글자 없는 16자 — 영문 대소문자 · 숫자. */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      login: { type: 'string' },
      name: { type: 'string' },
      'reset-password': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
    strict: true,
  });
  const loginId = checkLoginId(values.login);
  if (!loginId.ok) {
    log(`--login: ${loginId.message}`);
    return 1;
  }
  const displayName = checkDisplayName(values.name);
  if (!displayName.ok) {
    log(`--name: ${displayName.message}`);
    return 1;
  }

  const config = loadConfig();
  const db = createPool(config);
  try {
    await assertDatabase(db);
    const auth = new GoTrueClient({ url: config.supabaseUrl, publishableKey: config.publishableKey, secretKey: config.secretKey });
    const password = generatePassword();
    const result = await createTeacher(db, auth, {
      loginId: loginId.value,
      displayName: displayName.value,
      password,
      resetPassword: values['reset-password'],
    });
    log(`${config.target} · ${result.created ? '새로 만듦' : '비밀번호 다시 정함'} — 아이디 ${loginId.value}`);
    if (values.json) {
      process.stdout.write(`${JSON.stringify({ loginId: loginId.value, userId: result.userId, password })}\n`);
    } else {
      log(`비밀번호(한 번만 보여 줍니다): ${password}`);
    }
    return 0;
  } catch (error) {
    log((error as Error).message);
    return 1;
  } finally {
    await db.end();
  }
}

process.exitCode = await main();
