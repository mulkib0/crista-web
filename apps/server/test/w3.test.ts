import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { describe, test } from 'node:test';
import type { ExperimentResult } from '@crista/shared-types';
import { stripBase } from '../src/app.ts';
import { ConfigError, loadConfig } from '../src/config.ts';
import { clientIp, fromGateway, GATEWAY_CLIENT_IP_HEADER, GATEWAY_SECRET_HEADER, Router, serializeCookie } from '../src/http.ts';
import { affinityOf } from '../src/jobs.ts';
import { checkScreenParams, checkSmiles, computeSteps, COSTS, DISEASES } from '../src/pipeline.ts';
import { workerJobId, workerScopeId } from '../src/worker.ts';

const req = (headers: Record<string, string>, remote = '10.0.0.9') => ({ headers, socket: { remoteAddress: remote } }) as unknown as IncomingMessage;
const SECRET = 'g'.repeat(40);

describe('공개 접두 · 게이트웨이', () => {
  test('접두를 떼고, 접두 없는 경로는 그대로', () => {
    assert.equal(stripBase('/crista/api/me', '/crista'), '/api/me');
    assert.equal(stripBase('/crista', '/crista'), '/');
    assert.equal(stripBase('/api/health', '/crista'), '/api/health');
    assert.equal(stripBase('/cristax/api', '/crista'), '/cristax/api');
    assert.equal(stripBase('/api/me', ''), '/api/me');
  });
  test('게이트웨이 비밀 — 맞을 때만, 사용자 IP 는 게이트웨이 머리', () => {
    assert.equal(fromGateway(req({}), null), true);
    assert.equal(fromGateway(req({}), SECRET), false);
    assert.equal(fromGateway(req({ [GATEWAY_SECRET_HEADER]: 'x' }), SECRET), false);
    assert.equal(fromGateway(req({ [GATEWAY_SECRET_HEADER]: SECRET }), SECRET), true);
    const viaGateway = req({ [GATEWAY_SECRET_HEADER]: SECRET, [GATEWAY_CLIENT_IP_HEADER]: '203.0.113.7', 'x-forwarded-for': '1.1.1.1' });
    assert.equal(clientIp(viaGateway, true, SECRET), '203.0.113.7');
    // 비밀이 틀리면 게이트웨이 머리를 믿지 않는다.
    assert.equal(clientIp(req({ [GATEWAY_CLIENT_IP_HEADER]: '203.0.113.7', 'x-forwarded-for': '1.1.1.1' }), true, SECRET), '1.1.1.1');
  });
  test('쿠키 Path 는 접두 아래로', () => {
    assert.match(serializeCookie('s', 'v', { maxAgeSec: 1, secure: true, path: '/crista' }), /Path=\/crista;/);
  });
  test('호스팅은 게이트웨이 비밀이 있어야 시작한다', () => {
    const env = {
      WEB_TARGET: 'hosted',
      WEB_DATABASE_URL: 'postgres://crista_web.abc:pw@db.example.com:5432/postgres',
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'p',
      SUPABASE_SECRET_KEY: 's',
      WEB_ALLOWED_ORIGINS: 'https://mulk.codes',
    };
    assert.throws(() => loadConfig(env), ConfigError);
    const ok = loadConfig({ ...env, WEB_GATEWAY_SECRET: SECRET });
    assert.equal(ok.basePath, '/crista');
    assert.equal(ok.gatewaySecret, SECRET);
  });
});

describe('경로 인자', () => {
  test('UUID 인자만 소문자로 — 후보 id 는 그대로', () => {
    const router = new Router<null>().on('DELETE', '/api/claims/:compound', async () => 1);
    const hit = router.match('DELETE', '/api/claims/CHEMBL502');
    assert.ok(hit && hit !== 'method');
    assert.equal(hit.params.compound, 'CHEMBL502');
  });
});

describe('워커 id · 결과', () => {
  test('워커로 가는 id 에 web 접두', () => {
    assert.equal(workerJobId('abc'), 'web-abc');
    assert.equal(workerScopeId('abc'), 'web:abc');
  });
  test('ΔG 지표 읽기(유니코드 빼기 포함)', () => {
    const r = (value: string) => ({ metrics: [{ label: '최적 결합 자유에너지 ΔG', value }] }) as unknown as ExperimentResult;
    assert.equal(affinityOf(r('-9.5')), -9.5);
    assert.equal(affinityOf(r('−11.84')), -11.84);
    assert.equal(affinityOf(null), null);
    assert.equal(affinityOf({ metrics: [{ label: '다른 값', value: '1' }] } as unknown as ExperimentResult), null);
  });
});

describe('단계 상태', () => {
  const none = new Map();
  test('표적 전 — 1.1 할 수 있음, 나머지 잠김, 3.x 이후 W4 잠김', () => {
    const steps = computeSteps({ targetId: null, leadForTarget: false, facts: none, balanceCents: 600_000_000 });
    assert.deepEqual(steps.map((s) => s.state), ['ready', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
    assert.equal(steps[1]!.unlockBy, '1.1');
  });
  test('스크리닝 진행 중 · 연구비 부족 · 완료', () => {
    const facts = new Map([['1.2', { step: '1.2', done: false, active: true, progress: 0.4, by_name: '가온' }]]);
    const running = computeSteps({ targetId: 'ache-4ey7', leadForTarget: false, facts: facts as never, balanceCents: 600_000_000 });
    assert.equal(running[0]!.state, 'done');
    assert.equal(running[1]!.state, 'running');
    assert.equal(running[1]!.progressPct, 40);
    const broke = computeSteps({ targetId: 'ache-4ey7', leadForTarget: false, facts: none, balanceCents: COSTS['1.2'] - 1 });
    assert.equal(broke[1]!.state, 'blocked');
    const done = new Map([
      ['1.2', { step: '1.2', done: true, active: false, progress: null, by_name: null }],
      ['2.1', { step: '2.1', done: true, active: false, progress: null, by_name: null }],
    ]);
    const all = computeSteps({ targetId: 'ache-4ey7', leadForTarget: true, facts: done as never, balanceCents: 0 });
    assert.deepEqual(all.slice(0, 4).map((s) => s.state), ['done', 'done', 'done', 'done']);
  });
});

describe('입력 규칙', () => {
  test('질환 목록은 crista 사본 값 그대로(4종 · 표적 짝)', () => {
    assert.equal(DISEASES.length, 4);
    assert.ok(DISEASES.every((d) => d.targetId && d.referenceLigand.smiles && d.referenceKcal < 0));
  });
  test('컷오프 범위 · SMILES 글자', () => {
    assert.deepEqual(checkScreenParams({ maxMw: '500', maxTpsa: 90, ro5Only: 'true', excludeAlerts: false }), { library: null, maxMw: 500, maxTpsa: 90, ro5Only: true, excludeAlerts: false });
    assert.throws(() => checkScreenParams({ maxMw: 5000, maxTpsa: 90 }));
    assert.equal(checkSmiles(' CCO '), 'CCO');
    assert.throws(() => checkSmiles('CCO; drop table'));
    assert.throws(() => checkSmiles('C'.repeat(201)));
  });
});
