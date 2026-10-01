# Clinic Voice Agent: an AI receptionist that answers when nobody else can

Small clinics in India lose patients every time the phone rings and nobody picks up. This project is a voice AI receptionist. It answers the clinic's phone in **Hindi, English or Hinglish**, collects the patient's details and preferred time, and **books the appointment straight into Google Calendar**. When a call needs a human, it hands the caller to staff instead of guessing.

## What a call looks like

1. The patient calls. The agent replies in the same language the patient speaks.
2. It checks real availability in 30-minute slots, grouped as morning, afternoon or evening.
3. It confirms the patient's name, phone number and reason, then books the slot.
4. The booking appears on the clinic's Google Calendar and the staff dashboard.

## Product decisions

| Decision | Why |
|---|---|
| **Emergencies are never booked** | Chest pain, breathing trouble and similar cases get told to dial 108 straight away, and staff are flagged to call back. A plain "fever" is not treated as an emergency, so the agent doesn't over-escalate. |
| **Human-in-the-loop callbacks** | Refunds, complaints, medical advice, or a caller who stays stuck all become a callback request for staff, instead of a made-up answer. |
| **Language mirroring** | The agent answers in the caller's own register: pure English, Hinglish or Hindi. |
| **A self-booking web page as a second channel** | Patients can also book from a QR code at the front desk. Cloudflare Turnstile blocks bots. |
| **Always-on QA probe** | A scheduled job books a test slot every 15 minutes and checks that it really reached the calendar. |

## Evals

Agent quality is measured, not eyeballed. [`evals/`](evals/) holds **82 test conversations** across 43 categories, such as elderly callers, anxious parents, Hinglish, quiet speakers, people who interrupt, ambiguous emergencies and refund complaints. Each run replays the conversations against the same prompt and tools that the live agent uses, then scores them against a [rubric](evals/rubric.md).

## Architecture

```
Caller ──► Vapi (speech-to-text, LLM, text-to-speech)
              │  tool calls: check_availability · book_appointment · request_callback
              ▼
        Cloudflare Worker (worker.js)
              ├── Workers KV ............ bookings
              ├── Google Calendar API ... service-account sync
              ├── Staff dashboard ....... bookings, calls, recordings, callbacks, CSV/ICS export
              └── Patient page + QR ..... self-booking, protected by Turnstile
```

| File | What it is |
|---|---|
| `agent/prompt.txt`, `agent/tools.json` | The receptionist's behaviour and tool schema, used by both Vapi and the evals |
| `worker.js` | The production backend on Cloudflare Workers |
| `vapi_sync.mjs` | Pushes the prompt and tools to the Vapi assistant |
| `evals/` | Test conversations, runner, rubric and past results |
| `server.js` | The first local Express prototype, see [README.local-dev.md](README.local-dev.md) |

## Run it

```bash
npm install
npx wrangler secret put DASHBOARD_TOKEN    # also VAPI_KEY, GCAL_SA_JSON, CALENDAR_ID, TURNSTILE_SECRET
npx wrangler deploy
VAPI_KEY=... node vapi_sync.mjs            # sync prompt and tools to Vapi
OPENAI_KEY=... node evals/run.mjs          # run the eval suite
```

No secrets live in this repo. They're all set with `wrangler secret`.

**Stack:** Vapi · LLM tool calling · Cloudflare Workers + KV · Google Calendar API · Cloudflare Turnstile · Node.js
