/**
 * LLM 클라이언트 — 실제 SDK(@anthropic-ai/sdk beta.messages)에 가짜 fetch 를 끼워, 거절 · 잘림 응답에 부분 JSON text 가 있어도
 * 거절(refused) · 잘림(max_tokens)으로 나뉘는지 본다(Claude 를 부르지 않는다).
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { loadLlmConfig } from '../src/config.ts';
import { LlmClient, type MessagesParser } from '../src/llm.ts';

const config = { ...loadLlmConfig({ ANTHROPIC_API_KEY: 'x' }), keyPresent: true };
const schema = z.object({ verdict: z.enum(['pass', 'revise']) });
const req = { task: 'probe' as const, version: 'probe-v1', system: '고정', user: '바뀜', schema };

function sdkWith(reply: Record<string, unknown>): { parser: MessagesParser; seen: Array<{ headers: Headers; body: Record<string, unknown> }> } {
  const seen: Array<{ headers: Headers; body: Record<string, unknown> }> = [];
  const fetch = async (_url: unknown, init?: RequestInit) => {
    seen.push({ headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) as Record<string, unknown> });
    const message = { id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', usage: { input_tokens: 3, output_tokens: 2 }, ...reply };
    return new Response(JSON.stringify(message), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const sdk = new Anthropic({ apiKey: 'test-key', fetch: fetch as never, maxRetries: 0 });
  return { parser: sdk.beta.messages as unknown as MessagesParser, seen };
}

describe('LLM 클라이언트(실제 SDK · 가짜 fetch)', () => {
  test('거절 + 부분 JSON text → refused(종류 그대로) · invalid 가 아님', async () => {
    const { parser } = sdkWith({ content: [{ type: 'text', text: '{"verdict":"pa' }], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'bio' } });
    const out = await new LlmClient(config, null, parser).call(req);
    assert.deepEqual(out, { kind: 'refused', category: 'bio', model: 'claude-opus-5-5' });
  });
  test('max_tokens + 잘린 JSON → invalid max_tokens(parse_failed 가 아님)', async () => {
    const { parser } = sdkWith({ content: [{ type: 'text', text: '{"verdict":"re' }], stop_reason: 'max_tokens' });
    assert.deepEqual(await new LlmClient(config, null, parser).call(req), { kind: 'invalid', reason: 'max_tokens' });
  });
  test('정상 · 깨진 JSON · 스키마 밖 — ok · parse_failed · schema', async () => {
    const ok = sdkWith({ content: [{ type: 'text', text: '{"verdict":"pass"}' }], stop_reason: 'end_turn' });
    const good = await new LlmClient(config, null, ok.parser).call(req);
    assert.equal(good.kind, 'ok');
    assert.deepEqual(good.kind === 'ok' && good.output, { verdict: 'pass' });
    // 요청 모양 — 구조화 출력 beta 머리 · JSON Schema 만(본문에 betas 없음)
    const sent = ok.seen[0]!;
    assert.match(sent.headers.get('anthropic-beta') ?? '', /structured-outputs-2025-12-15/);
    assert.equal('betas' in sent.body, false);
    assert.equal(((sent.body.output_config as { format: { type: string } }).format).type, 'json_schema');
    const broken = sdkWith({ content: [{ type: 'text', text: '{"verdict":' }], stop_reason: 'end_turn' });
    assert.deepEqual(await new LlmClient(config, null, broken.parser).call(req), { kind: 'invalid', reason: 'parse_failed' });
    const off = sdkWith({ content: [{ type: 'text', text: '{"verdict":"maybe"}' }], stop_reason: 'end_turn' });
    assert.deepEqual(await new LlmClient(config, null, off.parser).call(req), { kind: 'invalid', reason: 'schema' });
  });
});
