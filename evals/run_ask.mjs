// Run questions through api/ask locally (or against a live URL) and grade them.
// Usage: node evals/run_ask.mjs [baseUrl]   (no baseUrl = call the function in-process)
// Key: OPENROUTER_API_KEY env, or KEY_ENV_FILE pointing at an env file. Never printed.
import fs from 'node:fs';

const base = process.argv[2];
if (!process.env.OPENROUTER_API_KEY && process.env.KEY_ENV_FILE) {
  const line = fs.readFileSync(process.env.KEY_ENV_FILE, 'utf8').split(/\r?\n/).find((l) => l.startsWith('OPENROUTER_API_KEY='));
  if (line) process.env.OPENROUTER_API_KEY = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}
const { POST } = base ? {} : await import('../api/ask.mjs');
const only = process.env.ONLY ? Number(process.env.ONLY) : Infinity;
const qs = JSON.parse(fs.readFileSync(new URL('./questions.json', import.meta.url), 'utf8')).slice(0, only);

async function ask(q) {
  const t0 = Date.now();
  const res = base
    ? await fetch(`${base}/api/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) })
    : await POST(new Request('http://local/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `eval-${Math.random()}` }, body: JSON.stringify({ q }) }));
  const raw = await res.text();
  let meta = null, text = '';
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    if (j.meta) meta = j.meta;
    if (j.t) text += j.t;
    if (j.error) text += `[error ${j.error}]`;
  }
  return { status: res.status, meta, text, ms: Date.now() - t0 };
}

// Grading. Numbers allowed only if they appear in the KB text (no invented figures).
const kbText = Object.values((await import('../api/_kb.mjs')).KB).map((k) => k.text).join('\n');
const kbNums = new Set((kbText.match(/\$?\d[\d,.]*%?/g) || []).map((n) => n.replace(/[.,]$/, '')));
function grade(x, r) {
  const t = r.text.toLowerCase();
  const nums = (r.text.match(/\$\d[\d,.]*/g) || []).map((n) => n.replace(/[.,]$/, ''));
  const invented = nums.filter((n) => !kbNums.has(n) && !x.q.includes(n));
  const cites = /\[\d+(\s*,\s*\d+)*\]/.test(r.text);
  const refuses = /(only help with|don't have (a )?(verified|confirmed)|do not have (a )?(verified|confirmed)|not (yet )?confirmed|check (with )?the official|confirm with|ask (DPW|the agency|DEH))/i.test(r.text);
  const checks = { status: r.status === 200, no_invented_dollars: invented.length === 0 };
  if (x.kind === 'out_of_scope') checks.refuses = /only help with|don't have verified|do not have verified/i.test(r.text);
  else checks.cites = cites;
  if (x.kind === 'trap_fee' || x.kind === 'trap_unknown') checks.flags_unconfirmed = refuses;
  if (x.kind !== 'out_of_scope') checks.right_topic = r.meta && (r.meta.topic === x.topic || r.meta.topic === 'multi');
  return { checks, invented };
}

let pass = 0, total = 0;
const tally = {};
for (const x of qs) {
  const r = await ask(x.q);
  const { checks, invented } = grade(x, r);
  const ok = Object.values(checks).every(Boolean);
  pass += ok; total++;
  for (const [k, v] of Object.entries(checks)) { tally[k] ??= [0, 0]; tally[k][0] += v; tally[k][1]++; }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${x.kind.padEnd(12)} ${x.q.slice(0, 60).padEnd(60)} topic=${r.meta?.topic} model=${r.meta?.model} ${r.ms}ms`);
  if (!ok || process.env.SHOW) console.log('   checks', JSON.stringify(checks), invented.length ? `invented=${invented}` : '', '\n   >', r.text.replace(/\s+/g, ' ').slice(0, 400));
}
console.log(`\n${pass}/${total} passed`);
for (const [k, [a, b]] of Object.entries(tally)) console.log(`  ${k}: ${a}/${b}`);
