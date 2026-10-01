// Run the eval cases against OpenAI directly with the SAME prompt + tools the
// production Vapi assistant uses (source of truth: ../agent/). Tool calls are
// mocked so evals are deterministic and don't pollute real bookings.
//
// Usage:
//   OPENAI_KEY=sk-... node evals/run.mjs
//   OPENAI_KEY=sk-... MODEL=gpt-4o-mini node evals/run.mjs --limit 3
//   OPENAI_KEY=sk-... node evals/run.mjs --only happy-01,emergency-02
//
// Reads: agent/prompt.txt, agent/tools.json, evals/cases.jsonl
// Writes: evals/results/<stamp>/<case>.json + summary.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
// Works with any OpenAI-compatible endpoint: OpenAI, Groq (free), OpenRouter, etc.
// Defaults: OpenAI + gpt-4o-mini. Override with BASE_URL + MODEL for others.
const KEY = process.env.OPENAI_KEY || process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.MODEL || 'gpt-4o-mini';
if (!KEY) { console.error('set OPENAI_KEY (or API_KEY) env var'); process.exit(1); }

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const only = new Set((flag('--only') || '').split(',').filter(Boolean));
const limit = Number(flag('--limit')) || 0;

const SYSTEM = fs.readFileSync(path.join(ROOT, 'agent/prompt.txt'), 'utf8').trim();
const TOOLS = JSON.parse(fs.readFileSync(path.join(ROOT, 'agent/tools.json'), 'utf8'));
const casesFile = flag('--file') || 'cases.jsonl';
const cases = fs.readFileSync(path.join(HERE, casesFile), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l))
  .filter(c => (only.size ? only.has(c.id) : true))
  .slice(0, limit || Infinity);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.join(HERE, 'results', stamp);
fs.mkdirSync(outDir, { recursive: true });

// Deterministic mock so every run scores against the same tool outputs.
// ponytail: swap for a real webhook call when we need to eval the full path.
const ALL_SLOTS = [
  { slotISO: '2026-09-05T03:30:00.000Z', human: 'Fri, 5 Sept, 9:00 am',  band: 'morning' },
  { slotISO: '2026-09-05T04:00:00.000Z', human: 'Fri, 5 Sept, 9:30 am',  band: 'morning' },
  { slotISO: '2026-09-05T07:00:00.000Z', human: 'Fri, 5 Sept, 12:30 pm', band: 'afternoon' },
  { slotISO: '2026-09-05T09:00:00.000Z', human: 'Fri, 5 Sept, 2:30 pm',  band: 'afternoon' },
  { slotISO: '2026-09-05T12:30:00.000Z', human: 'Fri, 5 Sept, 6:00 pm',  band: 'evening' },
  { slotISO: '2026-09-05T13:30:00.000Z', human: 'Fri, 5 Sept, 7:00 pm',  band: 'evening' },
];
function mockTool(name, args) {
  if (name === 'check_availability') {
    const pref = args?.preference && args.preference !== 'any' ? args.preference : null;
    const filtered = pref ? ALL_SLOTS.filter(s => s.band === pref) : ALL_SLOTS;
    const slots = filtered.slice(0, args?.count || 3).map(({ slotISO, human }) => ({ slotISO, human }));
    return { slots };
  }
  if (name === 'book_appointment') {
    const valid = args?.slotISO && args?.patientName && /^\d{10}$/.test(args?.patientPhone || '');
    if (!valid) return { ok: false, error: 'invalid args (slotISO / patientName / 10-digit patientPhone required)' };
    if (!ALL_SLOTS.some(s => s.slotISO === args.slotISO)) return { ok: false, error: 'unknown slot' };
    return { ok: true, booking: { ...args, bookedAt: new Date().toISOString() } };
  }
  return { error: `unknown tool: ${name}` };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callOpenAI(messages, attempt = 0) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, temperature: 0.3, messages, tools: TOOLS, tool_choice: 'auto' }),
  });
  const data = await res.json();
  if (res.status === 429 && attempt < 6) {
    // parse "try again in 4.13s" from message, fall back to exponential.
    const m = /try again in ([\d.]+)s/.exec(data?.error?.message || '');
    const wait = m ? Math.ceil(parseFloat(m[1]) * 1000) + 500 : (1000 * 2 ** attempt);
    await sleep(wait);
    return callOpenAI(messages, attempt + 1);
  }
  if (!res.ok) throw new Error(`openai ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data.choices[0].message;
}

async function runCase(c) {
  const messages = [{ role: 'system', content: SYSTEM }];
  const transcript = [];
  const toolCallsMade = [];

  for (const userText of c.turns) {
    messages.push({ role: 'user', content: userText });
    const turnEntry = { user: userText, assistant: '', tool_calls: [] };

    // let the model call as many tools as it wants before answering
    for (let hop = 0; hop < 5; hop++) {
      const msg = await callOpenAI(messages);
      messages.push(msg);
      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          const name = tc.function.name;
          let parsedArgs = {};
          try { parsedArgs = JSON.parse(tc.function.arguments || '{}'); } catch {}
          const result = mockTool(name, parsedArgs);
          const call = { name, args: parsedArgs, result };
          turnEntry.tool_calls.push(call);
          toolCallsMade.push(call);
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue; // model gets another shot with tool results
      }
      turnEntry.assistant = msg.content || '';
      break;
    }
    transcript.push(turnEntry);
  }
  return { case: c, transcript, tool_names: toolCallsMade.map(t => t.name) };
}

function grade(c, result) {
  const seen = new Set(result.tool_names);
  const mustCall = c.expect?.must_call || [];
  const mustNot = c.expect?.must_not_call || [];
  const missing = mustCall.filter(t => !seen.has(t));
  const forbidden = mustNot.filter(t => seen.has(t));
  return { missing, forbidden, ok: !missing.length && !forbidden.length };
}

const summary = [`# Eval run ${stamp}`, `Model: ${MODEL} · Cases: ${cases.length}`, ''];
let counters = { OK: 0, CHECK: 0, ERROR: 0 };
let idx = 0;

for (const c of cases) {
  idx++;
  process.stdout.write(`[${idx}/${cases.length}] ${c.id} … `);
  let result, status = 'OK';
  try {
    result = await runCase(c);
    const g = grade(c, result);
    if (!g.ok) status = 'CHECK';
    fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify({ ...result, grade: g }, null, 2));
    summary.push(`## ${c.id} · ${c.category} · ${status}`);
    summary.push(`_${c.description}_`);
    if (g.missing.length) summary.push(`- ❌ missing tools: ${g.missing.join(', ')}`);
    if (g.forbidden.length) summary.push(`- ❌ forbidden tools called: ${g.forbidden.join(', ')}`);
    for (const t of result.transcript) {
      summary.push(`**U:** ${t.user}`);
      if (t.tool_calls.length) {
        for (const c2 of t.tool_calls) summary.push(`_tool → ${c2.name}(${JSON.stringify(c2.args)})_`);
      }
      if (t.assistant) summary.push(`**A:** ${t.assistant}`);
    }
  } catch (e) {
    status = 'ERROR';
    fs.writeFileSync(path.join(outDir, `${c.id}.json`), JSON.stringify({ case: c, error: String(e) }, null, 2));
    summary.push(`## ${c.id} · ${c.category} · ERROR`);
    summary.push('```', String(e), '```');
  }
  counters[status]++;
  console.log(status);
  summary.push('');
}

const totals = `Totals: ${counters.OK} OK · ${counters.CHECK} CHECK · ${counters.ERROR} ERROR`;
summary.splice(2, 0, totals, '');
fs.writeFileSync(path.join(outDir, 'summary.md'), summary.join('\n'));
console.log(`\n${totals}`);
console.log(`wrote ${outDir}/summary.md`);
