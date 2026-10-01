# Evals

Twenty cases across eight categories that will catch the failure modes worth catching in a clinic booking agent. **Growing this set is the highest-leverage work on the project.**

## Files

- `cases.jsonl` — the test set. One case per line.
- `rubric.md` — how to score a case (three dimensions, 3 grades each).
- `run.mjs` — replays each case's turns against the live Vapi assistant, dumps transcripts + tool calls into `results/<stamp>/summary.md`.
- `results-template.md` — copy into `results/<stamp>/scored.md` and fill in.

## Run

```bash
cd ~/clinic-voice-agent
OPENAI_KEY=sk-... node evals/run.mjs
```

The runner uses `agent/prompt.txt` + `agent/tools.json` (same source of truth Vapi uses) and calls OpenAI directly with mocked tool responses — so evals are deterministic and don't pollute real bookings. Model defaults to `gpt-4o-mini`; override with `MODEL=gpt-4o`, etc., to compare.

Options:
- `--only happy-01,emergency-02` — run one or two cases
- `--limit 5` — smoke-test the first 5

Output:
```
evals/results/2026-09-04T…/
  summary.md      ← read this first
  happy-01.json   ← full transcript + tool calls for each case
  …
```

## Scoring the run

1. Open `summary.md` — glance the ✅ / CHECK / ERROR column
2. Copy `results-template.md` next to it, rename to `scored.md`
3. Score each row from `rubric.md`. ~30 seconds per case.
4. Write the three top failure classes at the bottom. This is the writeup material.

## Categories and why each exists

| Category | Count | Failure it catches |
|---|---|---|
| `happy_path` | 5 | Booking flow works at all |
| `emergency` | 3 | Doesn't book past a life-safety issue |
| `out_of_scope` | 3 | Doesn't give medical advice / act outside remit |
| `hinglish` / `hindi` | 3 | Matches the caller's register |
| `confirmation` | 2 | Reads name/phone back correctly (highest-cost real-world failure) |
| `no_slot` | 2 | Doesn't book at 2am or in the past |
| `adversarial` | 2 | Doesn't invent slots when pressured, refuses garbage phone |

## What's deliberately not here yet

- **LLM judge** — score in your head first. When the manual pass takes >20 min, add a judge with GPT-4o and re-score. Not before.
- **Latency + cost per call** — read them off the Vapi call log for now. Automate when you're running >50 cases.
- **Regression harness** — no baseline yet. First run IS the baseline; second run diffs against it.
- **Multi-turn interruption cases** — Vapi's text-chat can't model the caller talking over the agent. Do those live on the phone.

## When to grow the set

Two triggers, nothing else:

1. **You found a bug in real testing** → add the case that would have caught it.
2. **The assistant fails a category type you don't have yet** → add three cases in that category.

Don't pad. 20 sharp cases beat 100 diluted ones.
