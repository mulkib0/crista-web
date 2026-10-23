// 1.2 문구 반영 스크린샷 준비 — 교사 · 학급 · 학생 3 · 표적(ACHE) · 회의 6개 합의 · 실행 1회 · 찜 3개.
// 쓰는 법: WEB_PORT=3421 node tools/with-local-env.mjs node .review/2026-10-24-copy-apply/1.2/setup.mjs
// 끝에 학생 A 로그인 정보를 JSON 으로 찍어요(화면 확인용 로컬 계정).
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const BASE = `http://127.0.0.1:${process.env.WEB_PORT ?? 3421}`;
const suffix = randomBytes(3).toString('hex');

class Agent {
  constructor(name) { this.name = name; this.cookie = null; }
  async call(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { origin: BASE, ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const sc = res.headers.getSetCookie().find((c) => c.startsWith('crista_web_sid='));
    if (sc) this.cookie = sc.split(';')[0];
    const text = await res.text();
    const out = { status: res.status, body: text ? JSON.parse(text) : null };
    if (res.status >= 400) throw new Error(`${this.name} ${method} ${path} ${res.status} ${text}`);
    return out;
  }
}

const t = spawnSync(process.execPath, ['apps/server/scripts/teacher-create.ts', '--login', `t${suffix}c`, '--name', `문구 교사 ${suffix}`, '--json'], { encoding: 'utf8' });
if (t.status !== 0) throw new Error(t.stderr);
const secret = JSON.parse(t.stdout.trim());
const teacher = new Agent('교사');
await teacher.call('POST', '/api/auth/login', { loginId: `t${suffix}c`, password: secret.password });
const cls = (await teacher.call('POST', '/api/classes', { name: `1.2 문구 ${suffix}`, teamCount: 2, assignment: 'walk-in', maxStudents: 8, teamCapacity: 4 })).body;
const team = cls.teams[0];
const password = `pw-${randomBytes(6).toString('hex')}`;
const names = ['하늘', '바다', '나무'];
const people = names.map((n) => new Agent(n));
for (const [i, s] of people.entries()) {
  await s.call('POST', '/api/auth/signup', { classCode: cls.code, loginId: `s${suffix}${'abc'[i]}`, displayName: names[i], password });
  await s.call('POST', `/api/teams/${team.id}/join`);
}
const [a, b, c] = people;
await a.call('POST', `/api/teams/${team.id}/registration`, { name: `문구제약${suffix}`, ticker: `MG${'ABCDEFGHIJ'[Number.parseInt(suffix[0], 16) % 10]}` });
const board = (await a.call('GET', '/api/board')).body;
const ache = board.diseases.find((d) => d.targetId === 'ache-4ey7');
await a.call('POST', '/api/program/target', { diseaseId: ache.diseaseId });

for (const [i, s] of people.entries()) await s.call('POST', '/api/screen/briefing', { question: 'cns', answer: ['must', 'must', 'nice'][i] });
await a.call('POST', '/api/screen/briefing', { question: 'route', answer: 'oral' });
for (const s of [a, b]) await s.call('POST', '/api/screen/briefing', { question: 'read', answer: '1' });

const plan = [['mw', 450, 'bbb'], ['tpsa', 90, 'bbb'], ['ro5', 1, 'soft'], ['alert', 1, 'long'], ['qed', 0.3, 'like'], ['score', 0.3, 'keep']];
for (const [agenda, value, reason] of plan) {
  await a.call('POST', '/api/screen/proposals', { agenda, value, reason });
  await b.call('POST', '/api/screen/votes', { agenda, proposedBy: (await a.call('GET', '/api/screen')).body.me, value, reason });
}
const job = (await a.call('POST', '/api/jobs', { requestId: randomBytes(12).toString('hex'), step: '1.2', params: {} })).body;
for (let i = 0; i < 120; i += 1) {
  const s = (await a.call('GET', '/api/screen')).body;
  const r = s.runs[0];
  if (r && (r.status === 'succeeded' || r.status === 'failed')) break;
  await new Promise((res) => setTimeout(res, 700));
}
const s = (await a.call('GET', '/api/screen')).body;
const ids = s.shelf?.passIds ?? [];
if (ids.length >= 3) {
  await a.call('POST', '/api/claims', { compoundId: ids[0], reason: 'top', screenJobId: s.shelf.jobId });
  await a.call('POST', '/api/claims', { compoundId: ids[1], reason: 'qed', screenJobId: s.shelf.jobId });
  await b.call('POST', '/api/claims', { compoundId: ids[2], reason: 'top', screenJobId: s.shelf.jobId });
}
// 회의 화면용 — 점수 안건을 다시 열고 B 가 다른 값을 제안(A · C 는 아직 표 없음 · 코치가 보이게).
await a.call('POST', '/api/screen/agendas/score/reopen');
await b.call('POST', '/api/screen/proposals', { agenda: 'score', value: 0.45, reason: 'cost' });
console.log(JSON.stringify({ loginId: `s${suffix}a`, password, job: job?.jobId ?? null, shelf: ids.length, final: s.runs[0]?.snapshot?.final ?? null }));
