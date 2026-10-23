/**
 * Supabase Auth(GoTrue) REST — crista `auth/gotrue.ts` · `auth/account-admin.ts` 를 옮겼다(`@supabase/supabase-js` 없이 fetch).
 *
 * - 비밀번호 확인: `POST /auth/v1/token?grant_type=password` — **검증값(0004, passwords.ts)이 없는 옛 계정에만** 쓴다.
 *   이 끝점은 IP 당 상한(호스팅 버킷 30)이 있어 한 반이 몰리면 막힌다. 받은 GoTrue 토큰은 저장하지 않고 바로 로그아웃한다 —
 *   이 서버는 자기 세션(web.sessions)을 쓴다. 모든 로그인이 이 서버 IP 하나에서 나가므로 secret 키 + `Sb-Forwarded-For`(학생 IP)를
 *   싣는다 — 프로젝트의 'IP Address Forwarding' 이 켜져 있으면 GoTrue 가 IP 당 상한을 학생 IP 로 센다(꺼져 있으면 무시된다.
 *   그 설정은 게임과 같은 프로젝트 설정이라 이 저장소가 바꾸지 않는다).
 * - 계정 발급: `POST /auth/v1/admin/users` (secret 키, `email_confirm: true`). 프로젝트의 공개 가입 설정은 건드리지 않는다.
 * - **웹 도메인(`@web.crista.test`) 이메일만** 다룬다 — 다른 이메일이 오면 부르기 전에 멈춘다(게임 계정 보호).
 * 키 · 토큰 · 비밀번호는 로그에 찍지 않는다.
 */
import { WEB_EMAIL_DOMAIN } from '@crista-web/web-contract';

const TIMEOUT_MS = 10_000;

/** 인증 서비스에 닿지 않거나 요청이 몰렸다 — 다시 시도할 수 있다. */
export class AuthUnavailableError extends Error {
  constructor(message = '인증 서비스(Supabase Auth)에 닿지 않습니다. 잠시 뒤 다시 시도하세요.', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AuthUnavailableError';
  }
}

/** 비밀번호가 틀렸다 등 — 거절. */
export class AuthRejectedError extends Error {
  readonly status: number;
  constructor(status: number) {
    super('인증에 실패했습니다.');
    this.name = 'AuthRejectedError';
    this.status = status;
  }
}

export interface AuthClient {
  /** 비밀번호가 맞으면 사용자 id. `clientIp` 는 GoTrue 상한을 학생 IP 로 세게 넘긴다. */
  verifyPassword(email: string, password: string, clientIp?: string): Promise<string>;
  /** 새로 만들거나, 같은 이메일의 사용자가 이미 있으면(지난 가입에서 DB 쓰기만 실패한 고아) 비밀번호를 맞춰 이어 붙인다. */
  createOrAttach(input: { email: string; password: string; metadata: Record<string, unknown> }): Promise<{ userId: string; created: boolean }>;
  /** 직접 부르지 않는다 — 검증값과 함께 바꾸는 passwords.ts `changePassword` 로. */
  setPassword(userId: string, password: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

function assertWebEmail(email: string): void {
  if (!email.toLowerCase().endsWith(`@${WEB_EMAIL_DOMAIN}`)) throw new Error(`웹 도메인이 아닌 이메일은 다루지 않습니다.`);
}

interface CallResult {
  status: number;
  body: unknown;
}

export class GoTrueClient implements AuthClient {
  private readonly url: string;
  private readonly publishableKey: string;
  private readonly secretKey: string;

  constructor(options: { url: string; publishableKey: string; secretKey: string }) {
    this.url = options.url.replace(/\/+$/, '');
    this.publishableKey = options.publishableKey;
    this.secretKey = options.secretKey;
  }

  async verifyPassword(email: string, password: string, clientIp?: string): Promise<string> {
    assertWebEmail(email);
    const forwarded = clientIp && /^[0-9a-fA-F:.]{2,45}$/.test(clientIp) ? { 'sb-forwarded-for': clientIp } : undefined;
    const res = await this.call(
      '/token?grant_type=password',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      forwarded ? this.secretKey : this.publishableKey,
      undefined,
      forwarded,
    );
    if (res.status === 429) throw new AuthUnavailableError('로그인 요청이 몰렸습니다. 잠시 뒤 다시 시도하세요.');
    if (res.status >= 400) throw new AuthRejectedError(res.status);
    const body = (res.body ?? {}) as { access_token?: unknown; user?: { id?: unknown } };
    const userId = body.user?.id;
    if (typeof userId !== 'string') throw new AuthUnavailableError('인증 서비스 응답 형식이 다릅니다.');
    // GoTrue 세션은 쓰지 않으니 바로 닫는다(auth.sessions 가 쌓이지 않게). 실패해도 로그인은 이어간다.
    if (typeof body.access_token === 'string') void this.logout(body.access_token);
    return userId;
  }

  private async logout(accessToken: string): Promise<void> {
    try {
      await this.call('/logout?scope=local', { method: 'POST' }, this.publishableKey, accessToken);
    } catch {
      // 무시 — 토큰은 만료로 사라진다.
    }
  }

  async createOrAttach(input: { email: string; password: string; metadata: Record<string, unknown> }): Promise<{ userId: string; created: boolean }> {
    assertWebEmail(input.email);
    const res = await this.admin('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email: input.email, password: input.password, email_confirm: true, user_metadata: input.metadata }),
    });
    if (res.status < 300) {
      const id = (res.body as { id?: unknown } | null)?.id;
      if (typeof id !== 'string') throw new AuthUnavailableError('인증 서비스 응답 형식이 다릅니다.');
      return { userId: id, created: true };
    }
    if (res.status === 422 || res.status === 409 || res.status === 400) {
      const existing = await this.findByEmail(input.email);
      if (!existing) throw new AuthUnavailableError(`계정을 만들지 못했습니다(응답 코드 ${res.status}).`);
      await this.update(existing, { password: input.password, email_confirm: true, user_metadata: input.metadata });
      return { userId: existing, created: false };
    }
    if (res.status === 429) throw new AuthUnavailableError('가입 요청이 몰렸습니다. 잠시 뒤 다시 시도하세요.');
    throw new AuthUnavailableError(`계정을 만들지 못했습니다(응답 코드 ${res.status}).`);
  }

  async setPassword(userId: string, password: string): Promise<void> {
    await this.update(userId, { password });
  }

  async deleteUser(userId: string): Promise<void> {
    const res = await this.admin(`/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (res.status >= 300 && res.status !== 404) throw new AuthUnavailableError(`계정을 지우지 못했습니다(응답 코드 ${res.status}).`);
  }

  private async update(userId: string, body: Record<string, unknown>): Promise<void> {
    const res = await this.admin(`/admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(body) });
    if (res.status >= 300) throw new AuthUnavailableError(`계정을 바꾸지 못했습니다(응답 코드 ${res.status}).`);
  }

  private async findByEmail(email: string): Promise<string | null> {
    assertWebEmail(email);
    const target = email.toLowerCase();
    for (let page = 1; page <= 50; page += 1) {
      const res = await this.admin(`/admin/users?page=${page}&per_page=200`, { method: 'GET' });
      if (res.status >= 300) throw new AuthUnavailableError(`계정 목록을 읽지 못했습니다(응답 코드 ${res.status}).`);
      const users = ((res.body as { users?: Array<{ id: string; email?: string }> } | null)?.users ?? []);
      const hit = users.find((user) => user.email?.toLowerCase() === target);
      if (hit) return hit.id;
      if (users.length < 200) return null;
    }
    return null;
  }

  private admin(path: string, init: RequestInit): Promise<CallResult> {
    return this.call(path, init, this.secretKey, this.secretKey);
  }

  private async call(path: string, init: RequestInit, apikey: string, bearer?: string, extraHeaders?: Record<string, string>): Promise<CallResult> {
    let response: Response;
    try {
      response = await fetch(`${this.url}/auth/v1${path}`, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { apikey, 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extraHeaders },
      });
    } catch (error) {
      throw new AuthUnavailableError(undefined, { cause: error });
    }
    const text = await response.text().catch(() => '');
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (response.status >= 500) throw new AuthUnavailableError(`인증 서비스 응답 코드 ${response.status}.`);
    return { status: response.status, body };
  }
}
