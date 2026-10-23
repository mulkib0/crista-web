/**
 * 학생용 문구(2.1 · 2.2 `SELECTION_COPY` · 3.1 `PATENT_COPY`) — 화폐 규칙(AGENTS.md '화폐'): 돈은 '크리스타' 하나,
 * 돈 자리표시자에는 `formatCrista` 결과(단위 포함)가 들어가므로 문구가 '크리스타'를 다시 붙이지 않는다.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { codeProblemText, fillPatentCopy, formatCrista, PATENT_COPY, SELECTION_COPY } from '../src/index.ts';

/** 문구 나무의 모든 잎 — 함수는 돈 꼴 글 · 숫자로 불러 본다. */
function leaves(node: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (typeof node === 'function') {
    const fn = node as (...a: unknown[]) => unknown;
    const money = formatCrista(250_000);
    const v = fn(...Array.from({ length: Math.max(fn.length, 1) }, (_, i) => (i % 2 ? money : 3)));
    if (typeof v === 'string') out.push([path, v]);
    const w = fn(...Array.from({ length: Math.max(fn.length, 1) }, () => money));
    if (typeof w === 'string') out.push([`${path}(money)`, w]);
  } else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) leaves(v, `${path}.${k}`, out);
}

describe('학생용 문구 — 화폐 하나(크리스타)', () => {
  for (const [name, copy] of [['SELECTION_COPY', SELECTION_COPY], ['PATENT_COPY', PATENT_COPY]] as const) {
    test(`${name} — $ · 달러 · 원 단위 · 영문 CRISTA 없음 · '크리스타' 겹침 없음`, () => {
      const all: Array<[string, string]> = [];
      leaves(copy, name, all);
      assert.ok(all.length > 50);
      for (const [path, text] of all) {
        assert.ok(!/\$|달러|CRISTA|\d\s*원\b/.test(text), `${path}: ${text}`);
        assert.ok(!/크리스타\s*크리스타/.test(text), `${path}: ${text}`);
      }
    });
  }
  test('3.1 칸 안내 · 코드명 문제의 자리표시자를 채운다(값이 없으면 그대로)', () => {
    assert.match(codeProblemText('no_dash', { ticker: 'SEUM' }), /SEUM-101/);
    assert.match(codeProblemText('taken', { ticker: 'SEUM', code: 'SEUM-102' }), /\(SEUM-102\)/);
    assert.equal(fillPatentCopy('{gene} · {disease}', { gene: 'ACHE' }), 'ACHE · {disease}');
    assert.match(PATENT_COPY.abandonConfirm('SEUM-101', formatCrista(250_000)), /SEUM-101 .*출원료 250,000 크리스타는/);
  });
});
