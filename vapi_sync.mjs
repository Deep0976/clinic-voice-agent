// Sync the Vapi assistant to the current source of truth in agent/.
// Reads: agent/prompt.txt, agent/tools.json.
// Env: VAPI_KEY (required — rotate the key after running).
//
// Usage: VAPI_KEY=vapi_... node /Users/deepagarwal/clinic-voice-agent/vapi_sync.mjs
import fs from 'node:fs';
import path from 'node:path';

const KEY = process.env.VAPI_KEY;
if (!KEY) { console.error('set VAPI_KEY'); process.exit(1); }

const ROOT = '/Users/deepagarwal/clinic-voice-agent';
const WEBHOOK = 'https://clinic-voice-agent.deep567.workers.dev/vapi/tool';

const SYSTEM = fs.readFileSync(path.join(ROOT, 'agent/prompt.txt'), 'utf8').trim();
const BASE_TOOLS = JSON.parse(fs.readFileSync(path.join(ROOT, 'agent/tools.json'), 'utf8'));
// Vapi tool shape adds `async` + per-tool `server`.
// Only our custom tools. The endCall is triggered by endCallPhrases below —
// exposing it as an explicit tool made the model call it BEFORE speaking,
// so the call ended silently without the goodbye reaching the caller.
const tools = BASE_TOOLS.map(t => ({ ...t, async: false, server: { url: WEBHOOK } }));

const h = { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' };

const list = await fetch('https://api.vapi.ai/assistant', { headers: h }).then(r => r.json());
if (!Array.isArray(list)) { console.error('list failed:', list); process.exit(1); }

const target = list.find(a => /agarwal/i.test(a.name || '')) || list[0];
if (!target) { console.error('no assistant found'); process.exit(1); }
console.log('patching:', target.id, target.name);

const patch = {
  firstMessage: "Namaste, Dr. Deep Agarwal's Clinic. How can I help you today?",
  model: {
    provider: 'openai',
    // Upgraded from gpt-4o-mini → GPT-5.6 Luna. Cheaper output ($1.20 vs $0.60 per 1M
    // is a bit more but the newer generation handles edge cases much better) and still
    // pennies per call at clinic volume.
    model: 'gpt-5.6-luna',
    temperature: 0.3,
    messages: [{ role: 'system', content: SYSTEM }],
    tools,
  },
  // Nova-3 is markedly better at Indian English, quiet speech, and Hinglish code-switching.
  // Fixes the "silence-timed-out · caller did not speak" pattern in the call log.
  transcriber: {
    provider: 'deepgram',
    model: 'nova-3-general',
    language: 'multi',   // multilingual — handles English + Hindi + Hinglish switching
  },
  // Human-sounding voice — Aria on the FLAGSHIP model (not turbo).
  // Turbo is optimized for latency; multilingual_v2 is optimized for quality
  // and is noticeably less "AI robot". Aria's natural voice fits a friendly clinic.
  voice: {
    provider: '11labs',
    voiceId: '9BWtsMINqrJLrRacOk9x', // Aria — warm, engaging, conversational
    model: 'eleven_multilingual_v2', // flagship model, human quality
    stability: 0.45,          // more variation → less monotone
    similarityBoost: 0.75,
    style: 0.55,              // more expressive / warmth
    useSpeakerBoost: true,
    speed: 0.98,              // near-natural pace
  },
  // Voice polish:
  backgroundSound: 'off',               // disable — office ambience competed with quiet callers
  backchannelingEnabled: true,          // "mm-hmm" while listening
  backgroundDenoisingEnabled: false,    // denoising was stripping quiet speech; leave raw audio for Deepgram
  // Turn-taking — be more responsive to a quiet caller.
  startSpeakingPlan: {
    waitSeconds: 0.6,                   // small pause before AI replies
    smartEndpointingPlan: { provider: 'livekit' }, // detects end-of-turn faster
  },
  stopSpeakingPlan: {
    numWords: 2,                        // AI stops as soon as caller says 2+ words
    voiceSeconds: 0.2,
    backoffSeconds: 0.8,
  },
  // Auto-end the call on goodbye phrases, in case the model forgets to call endCall.
  // Vapi ends the call as soon as the assistant's speech CONTAINS any of these
  // as a substring (case-insensitive). Cover every variation the AI might actually say.
  endCallPhrases: [
    // English
    'have a good day', 'have a great day', 'take care',
    'thank you for calling', 'goodbye', 'have a nice day',
    'you are welcome', "you're welcome",
    // Hindi / Hinglish — cover the exact phrases from the prompt's step 7
    'dhanyavaad', 'dhanyavad', 'shukriya',
    'aapka din shubh ho', 'aapka din accha rahe',
    'aapka din shubh rahe',
    'namaste, phir milte hain', 'phir milte hain',
    'aapka appointment ho gaya', 'aapka appointment confirm ho gaya',
    'appointment book ho gaya', 'appointment confirm ho gaya',
  ],
  endCallFunctionEnabled: false,        // model shouldn't call endCall directly — Vapi auto-ends via endCallPhrases below
  hipaaEnabled: false,
  silenceTimeoutSeconds: 30,            // hard fallback — actual idle handling below is smarter
  maxDurationSeconds: 300,              // 5-min hard cap (protects from abuse)
  // If the caller stays silent, ask "aap kuch bol rahe hain?" once. If STILL silent, end the call.
  // Two idle messages max; then Vapi auto-ends.
  messagePlan: {
    idleMessages: [
      "Hello? Aap kuch bol rahe hain?",
      "Hello? Are you still there?",
    ],
    idleTimeoutSeconds: 6,              // ~5-6s pause before AI checks in
    idleMessageMaxSpokenCount: 2,       // ask twice, then Vapi ends
  },
};

const res = await fetch(`https://api.vapi.ai/assistant/${target.id}`, {
  method: 'PATCH', headers: h, body: JSON.stringify(patch),
});
const body = await res.json();
console.log('status:', res.status);
if (!res.ok) { console.error(JSON.stringify(body, null, 2)); process.exit(1); }
console.log('OK.');
console.log('  tools:', (body.model?.tools || []).map(t => t.function?.name).join(', '));
console.log('  transcriber:', body.transcriber?.language, body.transcriber?.model);
console.log('  system prompt length:', body.model?.messages?.[0]?.content?.length, 'chars');
