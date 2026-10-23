/**
 * M3 맵 · 시드 — 파산 표식(`stamp/bankrupt`) · 가동 중지 오버레이(`facility/offline`) · 교사 개발 계정.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { DEV_ACCOUNTS, DEV_TEAMS, buildCityMap, buildHqMap, type CityTeamSeed } from '../src/index.ts';

const atlas = JSON.parse(readFileSync(fileURLToPath(new URL('../../../assets/atlas/crista-atlas-0.json', import.meta.url)), 'utf8'));
const frames = new Set(Object.keys(atlas.frames ?? atlas.textures?.[0]?.frames ?? {}));

const cityTeams = (): CityTeamSeed[] =>
  DEV_TEAMS.map((t) => ({ id: t.id, companyName: t.companyName, district: t.district, hqTier: t.hqTier, inkIndex: t.inkIndex }));

describe('도시 맵 — 파산 표식', () => {
  test('운영 중이면 표식이 없다(기존 호출과 같은 결과)', () => {
    const map = buildCityMap(cityTeams());
    assert.equal(map.objects.filter((o) => o.frame === 'stamp/bankrupt').length, 0);
  });

  test('파산 회사 사옥 위에 stamp/bankrupt 하나 — 사옥 뒤에 넣는다', () => {
    const teams = cityTeams();
    teams[0] = { ...teams[0]!, status: 'bankrupt' };
    const map = buildCityMap(teams);
    const stamps = map.objects.filter((o) => o.frame === 'stamp/bankrupt');
    assert.equal(stamps.length, 1);
    assert.equal(stamps[0]!.id, 'hq-bankrupt-team-1');
    assert.ok(frames.has('stamp/bankrupt'));
    const hqIndex = map.objects.findIndex((o) => o.id === 'hq-team-1');
    const stampIndex = map.objects.findIndex((o) => o.id === 'hq-bankrupt-team-1');
    assert.ok(stampIndex > hqIndex);
    const hq = map.objects[hqIndex]!;
    assert.equal(stamps[0]!.ty + stamps[0]!.h / 32, hq.ty + hq.h / 32, '바닥 줄이 같다');
  });

  test('재창업 — 같은 지구에 파산 회사와 새 회사가 있으면 새 회사가 부지를 쓴다', () => {
    const teams = cityTeams();
    const old = { ...teams[0]!, status: 'bankrupt' as const };
    const fresh = { ...teams[0]!, id: 'team-1-r1', companyName: '새 회사' };
    const map = buildCityMap([old, fresh, teams[1]!]);
    assert.ok(map.objects.some((o) => o.id === 'hq-team-1-r1'));
    assert.ok(!map.objects.some((o) => o.id === 'hq-team-1'));
    assert.equal(map.objects.filter((o) => o.frame === 'stamp/bankrupt').length, 0);
  });
});

describe('사옥 맵 — 가동 중지 오버레이', () => {
  const team = DEV_TEAMS[1]!;

  test('facilityStates 생략이면 오버레이가 없다', () => {
    const map = buildHqMap({ id: team.id, companyName: team.companyName, facilities: team.facilities });
    assert.equal(map.objects.filter((o) => o.frame === 'facility/offline').length, 0);
  });

  test('idle 이고 건설된 설비 위에만 facility-<kind>-offline — 설비 바로 뒤', () => {
    const map = buildHqMap({
      id: team.id,
      companyName: team.companyName,
      facilities: team.facilities,
      facilityStates: { docking: 'idle', security: 'idle', htvs: 'active' },
    });
    const overlays = map.objects.filter((o) => o.frame === 'facility/offline');
    assert.deepEqual(overlays.map((o) => o.id), ['facility-docking-offline'], 'security 는 등급 0 이라 두지 않는다');
    assert.ok(frames.has('facility/offline'));
    const i = map.objects.findIndex((o) => o.id === 'facility-docking');
    assert.equal(map.objects[i + 1]?.id, 'facility-docking-offline');
    const f = map.objects[i]!;
    const o = overlays[0]!;
    assert.deepEqual([o.tx, o.ty, o.w, o.h], [f.tx, f.ty, f.w, f.h]);
  });
});

describe('개발 시드 — 교사 계정', () => {
  test('기존 네 학생 계정의 순서 · 값은 그대로이고 test-gm 이 끝에 있다', () => {
    assert.deepEqual(DEV_ACCOUNTS.map((a) => a.username), ['test-a', 'test-b', 'test-a2', 'test-b2', 'test-gm']);
    assert.deepEqual(DEV_ACCOUNTS[0]!.user, { id: 'user-test-a', displayName: '테스트 A · 헬릭사 CEO', role: 'student', teamId: 'team-1', cLevel: 'CEO' });
    const gm = DEV_ACCOUNTS[4]!;
    assert.equal(gm.password, 'crista-dev');
    assert.deepEqual(gm.user, { id: 'user-test-gm', displayName: '테스트 교사 · GM', role: 'teacher', teamId: null, cLevel: null });
  });
});
