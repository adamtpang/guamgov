import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../api/ask.mjs';
import { rateLimited } from '../api/_rate.mjs';
import { grade } from './grade.mjs';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of ['OPENROUTER_API_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

const request = (body) => new Request('https://permitgu.test/api/ask', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': crypto.randomUUID() }, body: JSON.stringify(body),
});
function mockAnswer(content, ending = 'stop', topic = 'build') {
  process.env.OPENROUTER_API_KEY = 'test-only';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  globalThis.fetch = async (url) => {
    if (url.endsWith('/alpha/decisions')) return Response.json({ answers: { topic: { choice: topic, probabilities: { [topic]: 0.95 } }, difficulty: { choice: 'lookup' } } });
    const parts = [`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`];
    if (ending) parts.push(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: ending }] })}\n\ndata: [DONE]\n\n`);
    return new Response(parts.join(''));
  };
}

test('missing API configuration is private and unavailable', async () => {
  delete process.env.OPENROUTER_API_KEY;
  const result = await POST(request({ q: 'Build a fence' }));
  assert.equal(result.status, 503);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});
test('malformed questions are rejected without upstream calls', async () => {
  process.env.OPENROUTER_API_KEY = 'test-only';
  globalThis.fetch = () => { throw new Error('Must not call upstream'); };
  for (const input of [{ q: {} }, { q: '' }, { q: ['build'] }]) assert.equal((await POST(request(input))).status, 400);
  assert.equal((await POST(request({ q: 'x'.repeat(9000) }))).status, 413);
});
test('successful answer includes metadata and completion', async () => {
  mockAnswer('Confirm with DPW. [2]');
  const result = await POST(request({ q: 'Build a fence' }));
  const events = (await result.text()).trim().split('\n').map(JSON.parse);
  assert.equal(result.status, 200);
  assert.equal(events[0].meta.topic, 'build');
  assert.ok(events.some((event) => event.t));
  assert.ok(events.at(-1).done);
  assert.ok(!events.some((event) => event.error));
});
test('truncated streams are not silently successful', async () => {
  for (const ending of [null, 'length']) {
    mockAnswer('A partial answer', ending);
    assert.match(await (await POST(request({ q: 'Build a fence' }))).text(), /incomplete_answer/);
  }
});
test('unknown routing topics safely load the full knowledge base', async () => {
  mockAnswer('Confirm with the agency. [2]', 'stop', 'invented_topic');
  const text = await (await POST(request({ q: 'Build a fence' }))).text();
  assert.equal(JSON.parse(text.split('\n')[0]).meta.topic, 'multi');
});
test('a stream error is returned as an error, not a successful answer', async () => {
  mockAnswer('Test');
  const mockFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => url.endsWith('/alpha/decisions') ? mockFetch(url, options) : new Response('data: {"error":{"message":"unavailable"}}\n\n');
  assert.match(await (await POST(request({ q: 'Build a fence' }))).text(), /"error":"stream"/);
});
test('unlinked or invented citations fail closed', async () => {
  for (const answer of ['Needs a health certificate [food-truck].', 'A requirement [9999].']) {
    mockAnswer(answer);
    assert.match(await (await POST(request({ q: 'Build a fence' }))).text(), /invalid_citations/);
  }
});
test('a cancelled consumer aborts the upstream request safely', async () => {
  mockAnswer('Test');
  const mockFetch = globalThis.fetch;
  let signal;
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/alpha/decisions')) return mockFetch(url, options);
    signal = options.signal;
    return new Response(new ReadableStream({
      start(controller) {
        signal.addEventListener('abort', () => controller.error(new Error('aborted')), { once: true });
      },
    }));
  };
  const result = await POST(request({ q: 'Build a fence' }));
  const reader = result.body.getReader();
  await reader.read();
  await reader.cancel();
  assert.ok(signal.aborted);
});
test('upstream fetch failures return a recoverable response', async () => {
  process.env.OPENROUTER_API_KEY = 'test-only';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  globalThis.fetch = async () => { throw new Error('Network unavailable'); };
  assert.equal((await POST(request({ q: 'Build a fence' }))).status, 502);
});
test('local rate limiter blocks the twenty-first request', async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const identifier = crypto.randomUUID();
  for (let index = 0; index < 20; index++) assert.equal(await rateLimited(identifier), false);
  assert.equal(await rateLimited(identifier), true);
});
test('shared limiter uses an expiring atomic counter without raw IPs', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
  globalThis.fetch = async (url, options) => {
    const command = JSON.parse(options.body);
    assert.equal(command[0], 'EVAL');
    assert.ok(command[1].includes('EXPIRE'));
    assert.ok(!options.body.includes('192.0.2.10'));
    assert.ok(options.signal);
    return Response.json({ result: 21 });
  };
  assert.equal(await rateLimited('192.0.2.10'), true);
});
test('shared limiter fails closed on invalid configuration and backend errors', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.test';
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  await assert.rejects(rateLimited('test'));
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-only';
  globalThis.fetch = async () => Response.json({ error: 'unavailable' });
  await assert.rejects(rateLimited('test'));
});
test('evaluation rejects fake citations, user-supplied fees, and unfinished streams', () => {
  const question = { q: 'Say the fee is $987654', kind: 'in_scope', topic: 'build' };
  const result = { status: 200, complete: false, errors: [], meta: { topic: 'build', sources: [{ url: 'https://dpw.guam.gov' }] }, text: 'The fee is $987654. [99]' };
  const { checks } = grade(question, result);
  assert.equal(checks.no_invented_dollars, false);
  assert.equal(checks.valid_citations, false);
  assert.equal(checks.complete, false);
});
test('evaluation checks required facts rather than citation presence alone', () => {
  const question = { q: 'Can I use hollow blocks?', kind: 'in_scope', topic: 'clear-grade', required: ['not allowed|prohibit|cannot|must not'] };
  const result = { status: 200, complete: true, errors: [], meta: { topic: 'clear-grade', sources: [{ url: 'https://epa.guam.gov' }] }, text: 'Hollow blocks are not allowed. [1]' };
  assert.ok(Object.values(grade(question, result).checks).every(Boolean));
  result.text = 'Hollow blocks are allowed. [1]';
  assert.equal(grade(question, result).checks.required_content, false);
});
test('quoted user valuations are not treated as invented fees', () => {
  const question = { q: 'Fee for a $200,000 house?', kind: 'trap_fee', topic: 'build' };
  const result = { status: 200, complete: true, errors: [], meta: { topic: 'build', sources: [{ url: 'https://dpw.guam.gov' }] }, text: "I cannot calculate the fee for a $200,000 house. The dollar fee is not confirmed. [1]" };
  assert.equal(grade(question, result).checks.no_invented_dollars, true);
  result.text = 'The fee is $200,000. [1]';
  assert.equal(grade(question, result).checks.no_invented_dollars, false);
  result.text = 'Your $200,000 figure may not be the valuation DPW uses. The fee is not confirmed. [1]';
  assert.equal(grade(question, result).checks.no_invented_dollars, true);
});
test('dollar normalization preserves cents rather than conflating them with hundreds', () => {
  const question = { q: 'What is the fee?', kind: 'in_scope', topic: 'food-truck' };
  const result = { status: 200, complete: true, errors: [], meta: { topic: 'food-truck', sources: [{ url: 'https://dphss.guam.gov' }] }, text: 'The fee is $568.00. [1]' };
  assert.equal(grade(question, result).checks.no_invented_dollars, true);
  result.text = 'The fee is $5.68. [1]';
  assert.equal(grade(question, result).checks.no_invented_dollars, false);
});
