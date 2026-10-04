import { createHash } from 'node:crypto';

const hits = new Map();
const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_KEYS = 10000;
const SCRIPT = "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return count";

export async function rateLimited(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url || token) {
    if (!url || !token) throw new Error('rate_limit_configuration');
    const bucket = Math.floor(Date.now() / WINDOW_MS);
    const digest = createHash('sha256').update(ip).digest('hex');
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', SCRIPT, '1', `permitgu:rate:${bucket}:${digest}`, '3600']),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error('rate_limit_unavailable');
    const data = await response.json();
    if (data.error || !Number.isInteger(Number(data.result)) || Number(data.result) < 1) throw new Error('rate_limit_unavailable');
    return Number(data.result) > LIMIT;
  }
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (entry.expires <= now) hits.delete(key);
  }
  let entry = hits.get(ip);
  if (!entry) {
    if (hits.size >= MAX_KEYS) return true;
    entry = { count: 0, expires: now + WINDOW_MS };
    hits.set(ip, entry);
  }
  entry.count++;
  return entry.count > LIMIT;
}
