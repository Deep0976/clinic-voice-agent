// Cloudflare Worker for the clinic voice agent.
// Bindings (see wrangler.toml): env.BOOKINGS — KV namespace, keys "slot:<ISO>" → booking JSON.
// Secrets (wrangler secret): env.DASHBOARD_TOKEN — required for /, /bookings, /calendar.ics, DELETE.

const CLINIC = {
  name: "Dr. Agarwal's clinic",
  hoursStart: 9,   // 9am IST
  hoursEnd: 20,    // 8pm IST
  slotMinutes: 30,
  timezone: 'Asia/Kolkata',
};

// Some V8 builds inject invisible LRM/RLM chars or format midnight as "24".
// Strip non-digits before Number() so we never return NaN.
const istHour = (d) => Number(new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC.timezone, hour: 'numeric', hour12: false,
}).format(d).replace(/\D/g, '')) % 24;

const humanSlot = (d) => d.toLocaleString('en-IN', {
  timeZone: CLINIC.timezone, weekday: 'short', day: 'numeric', month: 'short',
  hour: 'numeric', minute: '2-digit', hour12: true,
});

// morning: 9am-12pm, afternoon: 12pm-5pm, evening: 5pm-8pm (IST)
const bandOf = (d) => {
  const h = istHour(d);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
};

// urgency shifts the search window:
//   urgent  → start from NOW (get the earliest slots today)
//   normal  → start from NOW (same window; typical booking)
//   routine → start 48h from now (leave short-notice slots for patients who need them)
const URGENCY_OFFSET_HRS = { urgent: 0, normal: 0, routine: 48 };

// Reserved emergency-ish slots — held for `urgent` bookings only until N hours before.
// After the hold window, anyone can book them (they become normal free slots).
const RESERVE_SLOTS_IST = ['17:00', '19:30'];  // 5:00 PM and 7:30 PM daily
const RESERVE_HOLD_HRS = 4;

// ponytail: in-instance cache for KV list('slot:') — the free tier caps 1000 lists/day
// and dashboard poll + patient page + QA cron blow through it. 15s TTL keeps live-enough
// updates while cutting KV.list calls ~10x.
let SLOT_KEYS_CACHE = { at: 0, keys: null };
async function listSlotKeysCached(env, startISO) {
  const now = Date.now();
  if (SLOT_KEYS_CACHE.keys && now - SLOT_KEYS_CACHE.at < 15_000) return SLOT_KEYS_CACHE.keys;
  try {
    const listed = await env.BOOKINGS.list({ prefix: 'slot:', start: startISO ? 'slot:' + startISO : undefined });
    SLOT_KEYS_CACHE = { at: now, keys: listed.keys };
    return listed.keys;
  } catch (e) {
    // KV list quota exhausted or transient failure — serve stale keys if we have any,
    // otherwise treat as empty (patient sees synthetic slots as available; worst case a
    // double-book gets caught by bookSlot's individual .get() check).
    console.error('list slot keys failed:', e);
    return SLOT_KEYS_CACHE.keys || [];
  }
}
function invalidateSlotKeysCache() { SLOT_KEYS_CACHE = { at: 0, keys: null }; }

const istHHMM = (d) => new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(d);

function isReserveHeldFor(cur, now, urgency) {
  if (!RESERVE_SLOTS_IST.includes(istHHMM(cur))) return false;
  const hoursOut = (cur.getTime() - now.getTime()) / 3600_000;
  // Only enforce the hold BEFORE the release window. Urgent bookings pass regardless.
  return hoursOut > RESERVE_HOLD_HRS && urgency !== 'urgent';
}

async function nextSlots(env, count = 3, preference = 'any', urgency = 'normal', now = new Date()) {
  // Cached KV list (15s TTL) — see listSlotKeysCached above for the why.
  const keys = await listSlotKeysCached(env, new Date(now.getTime() - 5 * 60 * 1000).toISOString());
  const booked = new Set(keys.map(k => k.name.slice(5)));
  const wantBand = preference && preference !== 'any' ? preference : null;
  const offsetHrs = URGENCY_OFFSET_HRS[urgency] ?? 0;
  const startAt = new Date(now.getTime() + offsetHrs * 3600 * 1000);
  const slots = [];
  const cur = new Date(startAt);
  cur.setUTCSeconds(0, 0);
  cur.setUTCMinutes(Math.ceil(cur.getUTCMinutes() / CLINIC.slotMinutes) * CLINIC.slotMinutes);
  const stopAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  while (slots.length < count && cur < stopAt) {
    const h = istHour(cur);
    if (h >= CLINIC.hoursStart && h < CLINIC.hoursEnd) {
      const iso = cur.toISOString();
      const held = isReserveHeldFor(cur, now, urgency);
      if (!booked.has(iso) && !held && (!wantBand || bandOf(cur) === wantBand)) {
        slots.push({ slotISO: iso, human: humanSlot(cur), reserved: RESERVE_SLOTS_IST.includes(istHHMM(cur)) });
      }
    }
    cur.setUTCMinutes(cur.getUTCMinutes() + CLINIC.slotMinutes);
  }
  return slots;
}

// Rate limiter — KV-backed. Not atomic (KV is eventually consistent), so a
// burst of concurrent requests can exceed the limit by a small factor.
// ponytail: fine for anti-spam; upgrade to Durable Objects if we need strict quotas.
// IP limits generous — Indian CGNAT shares public IPs across thousands of mobile users.
// Per-phone limit does the real anti-spam work; IP is a soft backstop.
const LIMITS = { ipPerHour: 50, ipPerDay: 200, phonePerDay: 3 };

async function bumpCount(env, key, limit, ttlSeconds) {
  const cur = Number(await env.BOOKINGS.get(key)) || 0;
  if (cur >= limit) return { ok: false, count: cur };
  await env.BOOKINGS.put(key, String(cur + 1), { expirationTtl: ttlSeconds });
  return { ok: true, count: cur + 1 };
}

async function checkRateLimit(request, env, phone) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const now = new Date().toISOString();
  const hour = now.slice(0, 13);   // "2026-09-05T05"
  const day  = now.slice(0, 10);   // "2026-09-05"
  const checks = [
    { key: `rl:ip:${ip}:h:${hour}`,   limit: LIMITS.ipPerHour,   ttl: 3600 * 2,  label: 'too many attempts from this network in the last hour' },
    { key: `rl:ip:${ip}:d:${day}`,    limit: LIMITS.ipPerDay,    ttl: 86400 * 2, label: 'too many attempts from this network today' },
    { key: `rl:phone:${phone}:d:${day}`, limit: LIMITS.phonePerDay, ttl: 86400 * 2, label: 'this phone number has already booked its daily limit' },
  ];
  for (const c of checks) {
    const r = await bumpCount(env, c.key, c.limit, c.ttl);
    if (!r.ok) return { ok: false, error: c.label };
  }
  return { ok: true };
}

// --- Event log — persisted to KV with 7-day TTL, viewable at /logs.
// Key uses reverse timestamp so KV list returns newest first.
async function logEvent(env, kind, data = {}) {
  try {
    const ts = Date.now();
    const key = `log:${(1e15 - ts).toString().padStart(16, '0')}:${Math.random().toString(36).slice(2, 8)}`;
    await env.BOOKINGS.put(key, JSON.stringify({ ts, kind, ...data }), { expirationTtl: 7 * 24 * 3600 });
  } catch (e) { console.error('log write failed:', e); }
}

async function readLogs(env, limit = 100, kindFilter = null) {
  const listed = await env.BOOKINGS.list({ prefix: 'log:', limit });
  const entries = await Promise.all(listed.keys.map(k => env.BOOKINGS.get(k.name).then(v => {
    if (!v) return null;
    try { return JSON.parse(v); } catch { return null; }
  })));
  const clean = entries.filter(Boolean);
  return kindFilter ? clean.filter(e => e.kind === kindFilter) : clean;
}

// mask a phone number for logs: keep first 2 + last 2 digits, hide the middle.
const maskPhone = (p) => (typeof p === 'string' && p.length >= 4) ? p.slice(0, 2) + '******' + p.slice(-2) : '******';

// Google Calendar via service account JWT — pushes events to CALENDAR_ID.
// Falls back gracefully if GCAL_SA_JSON / CALENDAR_ID not set (dev mode).
// ponytail: cache access token in module scope; Workers instances live long enough.
let gcalTokenCache = null; // { token: string, expires: number ms }

const b64url = (s) => btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64urlBytes = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function gcalAccessToken(env) {
  if (gcalTokenCache && gcalTokenCache.expires > Date.now() + 60_000) return gcalTokenCache.token;
  const sa = JSON.parse(env.GCAL_SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: sa.private_key_id };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const bin = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', bin, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64urlBytes(sig)}`;
  const r = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }).toString(),
  });
  const data = await r.json();
  if (!r.ok) throw new Error('gcal token: ' + JSON.stringify(data));
  gcalTokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return gcalTokenCache.token;
}

async function gcalInsert(env, booking) {
  if (!env.GCAL_SA_JSON || !env.CALENDAR_ID) return null;
  try {
    const token = await gcalAccessToken(env);
    const start = new Date(booking.slotISO);
    const end = new Date(start.getTime() + CLINIC.slotMinutes * 60 * 1000);
    const body = {
      summary: `${booking.patientName}${booking.reason ? ' — ' + booking.reason : ''}`,
      description: `Phone: ${booking.patientPhone}${booking.reason ? '\nReason: ' + booking.reason : ''}\n\nBooked via clinic voice agent.`,
      start: { dateTime: start.toISOString(), timeZone: CLINIC.timezone },
      end:   { dateTime: end.toISOString(),   timeZone: CLINIC.timezone },
    };
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.CALENDAR_ID)}/events`,
      { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) },
    );
    const data = await r.json();
    if (!r.ok) { console.error('gcal insert failed:', data); return null; }
    return data.id;
  } catch (e) { console.error('gcal insert error:', e); return null; }
}

async function gcalDelete(env, eventId) {
  if (!env.GCAL_SA_JSON || !env.CALENDAR_ID || !eventId) return;
  try {
    const token = await gcalAccessToken(env);
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE', headers: { authorization: `Bearer ${token}` } },
    );
  } catch (e) { console.error('gcal delete error:', e); }
}

// Vapi call history — auth-gated proxy so the dashboard can show transcripts + recordings.
// Requires env.VAPI_KEY (wrangler secret).
async function fetchVapiCalls(env, limit = 40) {
  if (!env.VAPI_KEY) return { error: 'VAPI_KEY not configured' };
  const r = await fetch(`https://api.vapi.ai/call?limit=${limit}`, {
    headers: { authorization: `Bearer ${env.VAPI_KEY}` },
  });
  if (!r.ok) return { error: `vapi ${r.status}: ${(await r.text()).slice(0, 200)}` };
  const calls = await r.json();
  if (!Array.isArray(calls)) return { error: 'unexpected response' };
  // Correlate: a booking is linked to a call if it was created between call.startedAt
  // and call.endedAt + 30s (grace for the book_appointment tool call latency).
  const bookings = await listBookings(env).catch(() => []);
  // Prefer voice-source bookings in window; fall back to ANY booking in window
  // (older bookings lack the `source` field).
  const findLinked = (c) => {
    if (!c.startedAt || !c.endedAt) return null;
    const s = new Date(c.startedAt).getTime();
    const e = new Date(c.endedAt).getTime() + 30_000;
    const inWindow = (b) => b.bookedAt && (() => { const t = new Date(b.bookedAt).getTime(); return t >= s && t <= e; })();
    return bookings.find(b => b.source === 'voice' && inWindow(b))
        || bookings.find(b => !b.source && inWindow(b))
        || null;
  };
  // Extract caller name from transcript if AI got it during the call.
  // Two patterns: AI's spelling confirmation ("R-A-H-U-L") or the caller stating it.
  const extractName = (t) => {
    if (!t) return null;
    // AI's spelling confirmation: "R-A-H-U-L" — most reliable, that's the booked name.
    const spelled = t.match(/\b([A-Z](?:-[A-Z]){2,20})\b/);
    if (spelled) return spelled[1].split('-').join('').replace(/(.)(.*)/, (_, a, b) => a + b.toLowerCase());
    // Explicit self-introduction only. "I'm" / "I am" over-match casual speech.
    const said = t.match(/(?:my\s+name\s+is|name\s+is|this\s+is|myself)\s+([A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15}){0,2})/i);
    if (said) return said[1].trim();
    return null;
  };
  const mapped = calls.map(c => {
    const durationSec = (c.startedAt && c.endedAt) ? Math.round((new Date(c.endedAt) - new Date(c.startedAt)) / 1000) : null;
    const transcript = c.transcript || null;
    const hasUserTurn = transcript ? /(^|\n)\s*(User|user)\s*:/.test(transcript) : false;
    // Estimate caller talk time by counting words on User: lines (~2.5 words/sec).
    // Rough but useful — shows whether the caller was mostly listening or actually talking.
    let userWords = 0;
    if (transcript) {
      for (const line of transcript.split(/\r?\n/)) {
        const m = line.match(/^\s*(User|Caller)\s*:\s*(.*)$/i);
        if (m) userWords += m[2].split(/\s+/).filter(Boolean).length;
      }
    }
    const userTalkSec = userWords ? Math.round(userWords / 2.5) : 0;
    const linkedBooking = findLinked(c);
    return {
      id: c.id,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      endedReason: c.endedReason,
      durationSec,
      cost: c.cost,
      customerNumber: c.customer?.number || null,
      summary: c.analysis?.summary || null,
      transcript: transcript && transcript.length > 8000 ? transcript.slice(0, 8000) + '\n\n… [truncated]' : transcript,
      recordingUrl: c.recordingUrl || null,
      hasUserTurn,
      userTalkSec,
      linkedBooking,
      extractedName: linkedBooking ? null : extractName(transcript),
    };
  });
  // Hide dead calls: <10s and the caller never said anything AND no booking was made.
  return mapped.filter(c => !(c.durationSec != null && c.durationSec < 10 && !c.hasUserTurn && !c.linkedBooking));
}

// Proxy the recording (Vapi added access control — direct URL 401s from browser).
async function proxyRecording(env, callId) {
  if (!env.VAPI_KEY) return new Response('not configured', { status: 503 });
  const call = await fetch(`https://api.vapi.ai/call/${callId}`, {
    headers: { authorization: `Bearer ${env.VAPI_KEY}` },
  }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!call?.recordingUrl) return new Response('no recording', { status: 404 });
  const audio = await fetch(call.recordingUrl, {
    headers: { authorization: `Bearer ${env.VAPI_KEY}` },
  });
  if (!audio.ok) return new Response('vapi ' + audio.status, { status: audio.status });
  return new Response(audio.body, {
    headers: {
      'content-type': audio.headers.get('content-type') || 'audio/mpeg',
      'cache-control': 'private, max-age=300',
    },
  });
}

// Read a Google Calendar event — used by QA probe to verify insert landed.
async function gcalGet(env, eventId) {
  if (!env.GCAL_SA_JSON || !env.CALENDAR_ID || !eventId) return false;
  try {
    const token = await gcalAccessToken(env);
    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    return r.ok;
  } catch { return false; }
}

async function bookSlot(env, { slotISO, patientName, patientPhone, reason, urgency }, source = 'unknown') {
  const start = Date.now();
  if (!slotISO || !patientName || !patientPhone) {
    await logEvent(env, 'booking.failed', { source, reason: 'missing_fields', slotISO, name: patientName, phone: maskPhone(patientPhone) });
    return { ok: false, error: 'slotISO, patientName and patientPhone are required' };
  }
  // Guard against arbitrary strings landing as KV keys / rendered on dashboard.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(slotISO) || isNaN(Date.parse(slotISO))) {
    await logEvent(env, 'booking.failed', { source, reason: 'invalid_slotISO', slotISO, name: patientName, phone: maskPhone(patientPhone) });
    return { ok: false, error: 'invalid slotISO format' };
  }
  const key = 'slot:' + slotISO;
  if (await env.BOOKINGS.get(key)) {
    await logEvent(env, 'booking.failed', { source, reason: 'slot_taken', slotISO, name: patientName, phone: maskPhone(patientPhone) });
    return { ok: false, error: 'slot already taken' };
  }
  const normalizedUrgency = ['urgent', 'normal', 'routine'].includes(urgency) ? urgency : 'normal';
  // Reserve-slot guard — non-urgent can't grab a held reserve slot.
  if (isReserveHeldFor(new Date(slotISO), new Date(), normalizedUrgency)) {
    await logEvent(env, 'booking.failed', { source, reason: 'reserve_slot_blocked', slotISO, name: patientName, phone: maskPhone(patientPhone) });
    return { ok: false, error: 'This slot is reserved for urgent cases. Try a different time, or mark your booking as Urgent if your case qualifies.' };
  }
  const booking = {
    slotISO, patientName, patientPhone, reason: reason || '',
    urgency: normalizedUrgency,
    bookedAt: new Date().toISOString(),
    source, // 'voice' | 'web' | 'qa' — surfaced on dashboard rows
  };
  const eventId = await gcalInsert(env, booking);
  if (eventId) booking.gcalEventId = eventId;
  await env.BOOKINGS.put(key, JSON.stringify(booking));
  invalidateSlotKeysCache(); invalidateBookingsCache();
  await logEvent(env, 'booking.created', {
    source, slotISO, name: patientName, phone: maskPhone(patientPhone),
    reason: booking.reason, urgency: normalizedUrgency, gcalSynced: !!eventId, duration_ms: Date.now() - start,
  });
  return { ok: true, booking };
}

// Log a callback request — the caller has something we can't handle, staff needs to call back.
// Persist under `callback:<iso>` so the dashboard can list them, oldest-first.
async function logCallback(env, { patientName, patientPhone, reason }) {
  const phone = String(patientPhone || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(phone)) {
    await logEvent(env, 'callback.failed', { reason: 'bad_phone', name: patientName, phone: maskPhone(phone) });
    return { ok: false, error: 'need a valid 10-digit phone number' };
  }
  const iso = new Date().toISOString();
  const cb = { requestedAt: iso, patientName: patientName || '', patientPhone: phone, reason: reason || '', status: 'pending' };
  await env.BOOKINGS.put('callback:' + iso, JSON.stringify(cb));
  await logEvent(env, 'callback.requested', { name: cb.patientName, phone: maskPhone(phone), reason: cb.reason });
  return { ok: true, message: 'Our team will call you back shortly.' };
}
async function listCallbacks(env) {
  try {
    const keys = await env.BOOKINGS.list({ prefix: 'callback:', limit: 100 });
    const rows = await Promise.all(keys.keys.map(k => env.BOOKINGS.get(k.name).then(v => v ? { key: k.name, ...JSON.parse(v) } : null)));
    return rows.filter(Boolean).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  } catch (e) { console.error('list callbacks failed:', e); return []; }
}

async function handleTool(request, env) {
  const body = await request.json().catch(() => ({}));
  const calls = body?.message?.toolCallList || body?.message?.toolCalls || [];
  const results = await Promise.all(calls.map(async (call) => {
    const name = call.function?.name;
    let args = call.function?.arguments ?? {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
    try {
      if (name === 'check_availability') {
        return { toolCallId: call.id, result: JSON.stringify({ slots: await nextSlots(env, args.count || 3, args.preference) }) };
      }
      if (name === 'book_appointment') {
        return { toolCallId: call.id, result: JSON.stringify(await bookSlot(env, args, 'voice')) };
      }
      if (name === 'request_callback') {
        return { toolCallId: call.id, result: JSON.stringify(await logCallback(env, args)) };
      }
      return { toolCallId: call.id, result: JSON.stringify({ error: `unknown tool: ${name}` }) };
    } catch (e) {
      return { toolCallId: call.id, result: JSON.stringify({ error: e.message }) };
    }
  }));
  return Response.json({ results });
}

let BOOKINGS_CACHE = { at: 0, data: null };
async function listBookings(env) {
  const now = Date.now();
  if (BOOKINGS_CACHE.data && now - BOOKINGS_CACHE.at < 15_000) return BOOKINGS_CACHE.data;
  const startISO = new Date(now - 90 * 24 * 3600 * 1000).toISOString();
  const keys = await listSlotKeysCached(env, startISO);
  const bookings = await Promise.all(
    keys.map(k => env.BOOKINGS.get(k.name).then(v => {
      if (!v) return null;
      try { return JSON.parse(v); } catch { return null; }
    }))
  );
  const result = bookings.filter(Boolean).sort((a, b) => a.slotISO.localeCompare(b.slotISO));
  BOOKINGS_CACHE = { at: now, data: result };
  return result;
}
function invalidateBookingsCache() { BOOKINGS_CACHE = { at: 0, data: null }; }

async function deleteBooking(env, slotISO, source = 'unknown') {
  const key = 'slot:' + slotISO;
  const existing = await env.BOOKINGS.get(key);
  if (!existing) return { ok: false, error: 'not found' };
  let name = '', phone = '';
  try {
    const b = JSON.parse(existing);
    name = b.patientName; phone = b.patientPhone;
    if (b.gcalEventId) await gcalDelete(env, b.gcalEventId);
  } catch {}
  await env.BOOKINGS.delete(key);
  invalidateSlotKeysCache(); invalidateBookingsCache();
  await logEvent(env, 'booking.deleted', { source, slotISO, name, phone: maskPhone(phone) });
  return { ok: true };
}

// ICS calendar feed — subscribe from Google Calendar to see all bookings.
// ponytail: read-only feed, no OAuth. Upgrade to Calendar API if two-way sync is needed.
const pad2 = (n) => String(n).padStart(2, '0');
const icsDate = (d) => {
  const t = new Date(d);
  return `${t.getUTCFullYear()}${pad2(t.getUTCMonth() + 1)}${pad2(t.getUTCDate())}T${pad2(t.getUTCHours())}${pad2(t.getUTCMinutes())}00Z`;
};
const icsEscape = (s) => String(s).replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');

function toIcs(bookings, host) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${CLINIC.name}//Clinic Voice Agent//EN`,
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${CLINIC.name} — appointments`,
    `X-WR-TIMEZONE:${CLINIC.timezone}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];
  for (const b of bookings) {
    const end = new Date(new Date(b.slotISO).getTime() + CLINIC.slotMinutes * 60 * 1000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${b.slotISO}@${host}`,
      `DTSTAMP:${icsDate(b.bookedAt || b.slotISO)}`,
      `DTSTART:${icsDate(b.slotISO)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(b.patientName || 'Appointment')}${b.reason ? ' — ' + icsEscape(b.reason) : ''}`,
      `DESCRIPTION:Phone: ${icsEscape(b.patientPhone || '')}${b.reason ? '\\nReason: ' + icsEscape(b.reason) : ''}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function toCsv(bookings) {
  const esc = (s) => {
    const v = String(s ?? '');
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const rows = [['slot_iso', 'slot_ist', 'name', 'phone', 'reason', 'booked_at'].join(',')];
  for (const b of bookings) {
    rows.push([b.slotISO, humanSlot(new Date(b.slotISO)), b.patientName, b.patientPhone, b.reason || '', b.bookedAt].map(esc).join(','));
  }
  return rows.join('\n') + '\n';
}

// ponytail: shared token; header OR ?token=. URL query is required for ICS/CSV
// (Google Calendar can't send headers when it subscribes to an ICS feed).
function isAuthed(request, env) {
  if (!env.DASHBOARD_TOKEN) return true; // no secret set = auth disabled (dev)
  const url = new URL(request.url);
  const t = url.searchParams.get('token') || request.headers.get('x-token');
  return t === env.DASHBOARD_TOKEN;
}

const DASHBOARD_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__CLINIC__ — Bookings</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0e1116; color: #e6edf3; }
  header { padding: 20px 24px; border-bottom: 1px solid #21262d; display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  h1 { margin: 0; font-size: 18px; font-weight: 600; }
  .sub { color: #7d8590; font-size: 13px; }
  .actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
  .btn { background: #21262d; color: #e6edf3; border: 1px solid #30363d; padding: 6px 12px; border-radius: 6px; font-size: 12px; text-decoration: none; cursor: pointer; }
  .btn:hover { background: #30363d; }
  main { padding: 20px 24px; }
  section { margin-bottom: 32px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #7d8590; margin: 0 0 12px; font-weight: 600; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 32px; }
  .tile { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 14px 16px; }
  .tile .k { font-family: -apple-system, ui-monospace, Menlo, monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #7d8590; margin-bottom: 4px; }
  .tile .v { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .tile .n { color: #7d8590; font-size: 12px; margin-top: 2px; }
  .list { display: grid; gap: 8px; }
  .row { background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 14px 16px; display: grid; grid-template-columns: 160px 1fr auto; gap: 16px; align-items: center; }
  .time { font-variant-numeric: tabular-nums; color: #7ee787; font-weight: 500; font-size: 14px; }
  .who { display: grid; gap: 2px; min-width: 0; }
  .name { font-weight: 600; }
  .meta { color: #7d8590; font-size: 12px; }
  .del { background: transparent; color: #7d8590; border: 1px solid #30363d; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
  .del:hover { color: #ff7b72; border-color: #ff7b72; }
  .empty { color: #7d8590; padding: 24px; text-align: center; background: #161b22; border: 1px dashed #30363d; border-radius: 8px; }
  .authbox { max-width: 400px; margin: 80px auto; background: #161b22; border: 1px solid #21262d; border-radius: 8px; padding: 24px; }
  .authbox input { width: 100%; padding: 8px 10px; margin-top: 8px; background: #0e1116; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; font: 13px ui-monospace, Menlo, monospace; }
  .authbox button { width: 100%; margin-top: 12px; padding: 8px; background: #238636; color: white; border: 0; border-radius: 6px; font-weight: 500; cursor: pointer; }
  @media (max-width: 640px) {
    .row { grid-template-columns: 1fr auto; }
    .time { grid-column: 1; }
    .del { grid-row: 1 / 3; }
  }
</style></head>
<body>
<div id="app" hidden>
<header>
  <h1>__CLINIC__</h1>
  <span class="sub" id="stat">loading…</span>
  <span class="actions">
    <a class="btn" href="/qr" target="_blank">📱 Print QR</a>
    <a class="btn" id="ical">📅 iCal feed</a>
    <a class="btn" id="csv">⤓ CSV</a>
    <button class="btn" onclick="load()">↻ Refresh</button>
  </span>
</header>
<main>
  <div class="tiles">
    <div class="tile"><div class="k">Today</div><div class="v" id="tCount">0</div><div class="n" id="tNext">—</div></div>
    <div class="tile"><div class="k">This week</div><div class="v" id="wCount">0</div><div class="n">Mon–Sun</div></div>
    <div class="tile"><div class="k">Unique callers</div><div class="v" id="uCount">0</div><div class="n">all time</div></div>
    <div class="tile"><div class="k">Total booked</div><div class="v" id="aCount">0</div><div class="n">all time</div></div>
    <div class="tile"><div class="k">Last QA probe</div><div class="v" id="qStatus">—</div><div class="n" id="qWhen"><button class="btn" onclick="runQA()" style="padding:2px 8px;font-size:11px">Run now</button></div></div>
  </div>
  <section><h2>Today</h2><div id="today" class="list"></div></section>
  <section><h2>Upcoming</h2><div id="upcoming" class="list"></div></section>
  <section><h2>Past appointments <span style="color:#7d8590;font-weight:400;text-transform:none;letter-spacing:0">(most recent first)</span></h2><div id="past" class="list"></div></section>
  <section><h2>📞 Callbacks pending <span style="color:#7d8590;font-weight:400;text-transform:none;letter-spacing:0">(caller needs a human — call them)</span></h2><div id="callbacks" class="list"></div></section>
  <section><h2>Recent calls <span style="color:#7d8590;font-weight:400;text-transform:none;letter-spacing:0">(click to expand — transcript + recording)</span></h2><div id="calls" class="list"></div></section>
  <section><h2>Recent activity <span style="color:#7d8590;font-weight:400;text-transform:none;letter-spacing:0">(last 20 events)</span></h2><div id="activity" class="list"></div></section>
</main>
</div>
<div id="gate" class="authbox" hidden>
  <h1 style="margin:0 0 8px;font-size:16px">Enter dashboard token</h1>
  <p class="sub" style="margin:0">Paste the DASHBOARD_TOKEN this worker was deployed with.</p>
  <input id="tokIn" type="password" placeholder="token…" autofocus>
  <button onclick="saveToken()">Continue</button>
</div>
<script>
const q = new URLSearchParams(location.search);
let token = q.get('token') || localStorage.getItem('cvatoken') || '';
if (q.get('token')) localStorage.setItem('cvatoken', token);

// Escape any user-controlled value before .innerHTML interpolation.
// Patient names / phones / reasons come from the public booking form;
// without escaping, a malicious name could inject a script tag and
// exfiltrate the dashboard token from localStorage when staff open the page.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function saveToken() {
  token = document.getElementById('tokIn').value.trim();
  if (!token) return;
  localStorage.setItem('cvatoken', token);
  boot();
}

async function api(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (token) headers['x-token'] = token;
  return fetch(path, { ...init, headers });
}

const fmt = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
const timeOnly = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });
const fmtDay = (x) => new Date(x).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
const isToday = (iso) => fmtDay(iso) === fmtDay(new Date());
function weekStart() {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}
const SOURCE_PILL = {
  voice: { label: '🎙 voice', bg: '#1a3a2e', fg: '#7ee787' },
  web:   { label: '⌨ form',  bg: '#1a2a3a', fg: '#79c0ff' },
  qa:    { label: '🤖 qa',    bg: '#2a2a2a', fg: '#7d8590' },
};
function sourcePill(src) {
  const p = SOURCE_PILL[src];
  if (!p) return '';
  return \`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:\${p.bg};color:\${p.fg};margin-left:8px;letter-spacing:0.2px">\${p.label}</span>\`;
}
function row(b) {
  return \`<div class="row">
    <span class="time">\${esc(fmt(b.slotISO))}</span>
    <div class="who">
      <span class="name">\${esc(b.patientName) || 'Unknown'}\${sourcePill(b.source)}</span>
      <span class="meta">📞 \${esc(b.patientPhone) || '—'}\${b.reason ? ' · ' + esc(b.reason) : ''}</span>
    </div>
    <button class="del" data-iso="\${esc(b.slotISO)}">Cancel</button>
  </div>\`;
}
// Event delegation so a malicious slotISO can't break out of an inline onclick attribute.
document.addEventListener('click', async e => {
  const btn = e.target.closest('.del[data-iso]');
  if (!btn) return;
  if (!confirm('Cancel this appointment?')) return;
  const r = await api('/bookings/' + encodeURIComponent(btn.dataset.iso), { method: 'DELETE' });
  if (r.ok) load(); else alert('failed — check token');
});
async function load() {
  const r = await api('/bookings');
  if (r.status === 401) { localStorage.removeItem('cvatoken'); location.reload(); return; }
  const bookings = await r.json();
  const now = new Date();
  const wk = weekStart();
  const upcoming = bookings.filter(b => new Date(b.slotISO) >= now);
  const past = bookings.filter(b => new Date(b.slotISO) < now).reverse(); // newest first
  const today = upcoming.filter(b => isToday(b.slotISO));
  const later = upcoming.filter(b => !isToday(b.slotISO));
  const thisWeek = bookings.filter(b => new Date(b.slotISO) >= wk);
  const unique = new Set(bookings.map(b => b.patientPhone).filter(Boolean)).size;

  document.getElementById('tCount').textContent = today.length;
  document.getElementById('tNext').textContent = today[0] ? 'next: ' + timeOnly(today[0].slotISO) : 'none';
  document.getElementById('wCount').textContent = thisWeek.length;
  document.getElementById('uCount').textContent = unique;
  document.getElementById('aCount').textContent = bookings.length;

  document.getElementById('today').innerHTML = today.length ? today.map(row).join('') : '<div class="empty">No appointments today.</div>';
  document.getElementById('upcoming').innerHTML = later.length ? later.map(row).join('') : '<div class="empty">Nothing scheduled ahead.</div>';
  document.getElementById('past').innerHTML = past.length ? past.slice(0, 50).map(row).join('') : '<div class="empty">No past appointments yet.</div>';
  document.getElementById('stat').textContent = \`\${upcoming.length} upcoming · updated \${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\`;
  loadLogs();
}

const relTime = (ts) => {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
};

const KIND_LABEL = {
  'booking.created': ['📅', '#7ee787'],
  'booking.deleted': ['✕', '#ff7b72'],
  'booking.failed':  ['⚠', '#d29922'],
  'qa.run':          ['🤖', '#79c0ff'],
  'error':           ['❌', '#ff7b72'],
};

function renderLogRow(e) {
  const [icon, color] = KIND_LABEL[e.kind] || ['•', '#7d8590'];
  // Escape here — everything below flows through .innerHTML and includes
  // patient-controlled name/phone/reason via the log entries.
  const name = esc(e.name || '');
  const phone = esc(e.phone || '');
  const reason = esc(e.reason || '');
  const src = esc(e.source || '');
  const when = esc(fmt(e.slotISO));
  const err = esc(e.error || '');
  let text = esc(e.kind);
  if (e.kind === 'booking.created') text = \`\${name} · \${phone} · \${when}\${reason ? ' · ' + reason : ''} · \${src} \${e.gcalSynced ? '· gcal ✓' : '· gcal ✕'}\`;
  else if (e.kind === 'booking.deleted') text = \`\${name || 'unknown'} · \${when} · by \${src}\`;
  else if (e.kind === 'booking.failed')  text = \`\${name} \${phone} → \${reason} (\${src})\`;
  else if (e.kind === 'qa.run') text = e.ok ? \`probe OK · \${e.total_ms}ms\` : \`probe FAILED · \${err}\`;
  return \`<div class="row" style="grid-template-columns: 80px 24px 1fr">
    <span class="time" style="color:#7d8590;font-size:12px">\${esc(relTime(e.ts))}</span>
    <span style="color:\${color};font-size:16px">\${icon}</span>
    <span style="font-size:13px;color:#e6edf3">\${text}</span>
  </div>\`;
}

function renderTurns(raw) {
  if (!raw) return '<div style="color:#7d8590;font-size:12px">(transcript unavailable)</div>';
  // Vapi transcripts are newline-separated lines starting with AI: or User:.
  // Preserve continuation lines as part of the previous turn.
  const turns = [];
  for (const line of raw.split(/\\r?\\n/)) {
    const m = line.match(/^\s*(AI|Bot|Assistant|User|Caller)\s*:\s*(.*)$/i);
    if (m) {
      const who = /^(user|caller)$/i.test(m[1]) ? 'user' : 'ai';
      turns.push({ who, text: m[2] });
    } else if (turns.length && line.trim()) {
      turns[turns.length - 1].text += ' ' + line.trim();
    }
  }
  if (!turns.length) return \`<div style="color:#e6edf3;font-size:12px;white-space:pre-wrap">\${esc(raw)}</div>\`;
  return turns.map(t => {
    const isAI = t.who === 'ai';
    const bg = isAI ? '#1a3a2e' : '#1a2333';
    const fg = isAI ? '#c8f2d5' : '#c9d9f0';
    const label = isAI ? 'AI' : 'Caller';
    const align = isAI ? 'flex-start' : 'flex-end';
    return \`<div style="display:flex;justify-content:\${align};margin:6px 0">
      <div style="max-width:75%;background:\${bg};color:\${fg};padding:8px 12px;border-radius:12px;font-size:12.5px;line-height:1.45">
        <div style="font-size:10.5px;opacity:0.75;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px">\${label}</div>
        \${esc(t.text || '')}
      </div>
    </div>\`;
  }).join('');
}
function callRow(c) {
  const when = c.startedAt ? new Date(c.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
  const duration = c.durationSec != null ? c.durationSec + 's' : '—';
  const cost = c.cost != null ? '$' + Number(c.cost).toFixed(3) : '—';
  const talk = c.userTalkSec ? \`caller ~\${c.userTalkSec}s\` : '';
  const summary = c.summary || (c.hasUserTurn ? '(no summary generated)' : '(caller did not speak)');
  const summaryShort = summary.length > 100 ? summary.slice(0, 100) + '…' : summary;
  const b = c.linkedBooking;
  // Priority: booked patient's name → name mentioned in the transcript → phone → "Web call".
  const headerName = b?.patientName
    ? esc(b.patientName)
    : (c.extractedName ? esc(c.extractedName) : esc(c.customerNumber || 'Web call'));
  const headerDetail = b
    ? \`booked \${esc(fmt(b.slotISO))}\${b.reason ? ' · ' + esc(b.reason) : ''}\`
    : (c.extractedName
        ? \`<span style="color:#7d8590">said their name — no slot booked</span>\`
        : \`<span style="color:#7d8590">\${esc(c.endedReason || 'call')}</span>\`);
  const audio = c.recordingUrl ? \`<audio controls preload="none" src="/recordings/\${encodeURIComponent(c.id)}?token=\${encodeURIComponent(token)}" style="width:100%;margin-top:10px"></audio>\` : '';
  return \`<details style="background:#161b22;border:1px solid #21262d;border-radius:8px;padding:12px 16px">
    <summary style="cursor:pointer;list-style:none;display:grid;grid-template-columns:130px 1fr 110px;gap:14px;align-items:center">
      <span class="time">\${esc(when)}</span>
      <div class="who">
        <span class="name">\${b ? '📅' : '📞'} \${headerName}\${b ? sourcePill('voice') : ''}</span>
        <span class="meta">\${headerDetail}\${b?.patientPhone ? ' · 📞 ' + esc(b.patientPhone) : ''} · \${esc(summaryShort)}</span>
      </div>
      <span class="meta" style="text-align:right">\${esc(duration)} · \${esc(cost)}\${talk ? '<br><span style=\"color:#7ee787;font-size:11px\">' + esc(talk) + '</span>' : ''}</span>
    </summary>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #21262d">
      \${c.summary ? \`<div style="font-size:12px;color:#7ee787;margin-bottom:4px;font-weight:600">Summary</div>
      <div style="font-size:13px;color:#e6edf3;margin-bottom:12px">\${esc(c.summary)}</div>\` : ''}
      <div style="font-size:12px;color:#7ee787;margin-bottom:6px;font-weight:600">Transcript</div>
      <div style="max-height:340px;overflow-y:auto;background:#0e1116;padding:10px;border-radius:6px">\${renderTurns(c.transcript)}</div>
      \${audio}
    </div>
  </details>\`;
}
async function loadCalls() {
  const r = await api('/calls');
  if (!r.ok) return;
  const data = await r.json();
  const el = document.getElementById('calls');
  if (data.error) { el.innerHTML = \`<div class="empty">Vapi not connected: \${esc(data.error)}</div>\`; return; }
  if (!data.length) { el.innerHTML = '<div class="empty">No calls yet.</div>'; return; }
  el.innerHTML = data.map(callRow).join('');
}
async function loadCallbacks() {
  const r = await api('/callbacks');
  if (!r.ok) return;
  const rows = await r.json();
  const el = document.getElementById('callbacks');
  if (!rows.length) { el.innerHTML = '<div class="empty">No callbacks pending. Nice.</div>'; return; }
  el.innerHTML = rows.map(cb => \`<div class="row" style="border-left:3px solid #d29922;padding-left:12px">
    <span class="time">\${esc(fmt(cb.requestedAt))}</span>
    <div class="who">
      <span class="name">\${esc(cb.patientName) || '(no name given)'} · <span style="color:#7d8590">📞 \${esc(cb.patientPhone)}</span></span>
      <span class="meta">\${esc(cb.reason)}</span>
    </div>
    <button class="del" data-cb="\${esc(cb.key)}">Done</button>
  </div>\`).join('');
}
document.addEventListener('click', async e => {
  const btn = e.target.closest('.del[data-cb]');
  if (!btn) return;
  if (!confirm('Mark this callback done?')) return;
  const r = await api('/callbacks/' + encodeURIComponent(btn.dataset.cb), { method: 'DELETE' });
  if (r.ok) loadCallbacks(); else alert('failed');
});
async function loadLogs() {
  const r = await api('/logs?limit=100');
  if (!r.ok) return;
  const logs = await r.json();
  const interesting = logs.filter(e => KIND_LABEL[e.kind]);

  // Last QA
  const lastQA = logs.find(e => e.kind === 'qa.run');
  const qStat = document.getElementById('qStatus');
  const qWhen = document.getElementById('qWhen');
  if (lastQA) {
    qStat.textContent = lastQA.ok ? 'OK' : 'FAIL';
    qStat.style.color = lastQA.ok ? '#7ee787' : '#ff7b72';
    qWhen.innerHTML = relTime(lastQA.ts) + ' · <button class="btn" onclick="runQA()" style="padding:2px 8px;font-size:11px">Run now</button>';
  } else {
    qStat.textContent = '—';
    qWhen.innerHTML = 'no runs yet · <button class="btn" onclick="runQA()" style="padding:2px 8px;font-size:11px">Run now</button>';
  }

  // Activity feed — last 20 interesting events
  document.getElementById('activity').innerHTML =
    interesting.slice(0, 20).map(renderLogRow).join('') ||
    '<div class="empty">No activity yet.</div>';
}

async function runQA() {
  const r = await api('/qa/run', { method: 'POST' });
  const data = await r.json();
  alert(data.ok ? '✓ QA probe passed' : '✗ QA probe failed: ' + (data.error || 'see logs'));
  load();
}
window.runQA = runQA;
function boot() {
  document.getElementById('gate').hidden = true;
  document.getElementById('app').hidden = false;
  const t = encodeURIComponent(token);
  document.getElementById('ical').href = '/calendar.ics?token=' + t;
  document.getElementById('csv').href = '/bookings.csv?token=' + t;
  load();
  loadCalls();
  loadCallbacks();
  // Poll every 60s (was 30s) — plus each booking write invalidates the cache anyway.
  setInterval(() => { load(); loadCalls(); loadCallbacks(); }, 60000);
}
if (token) boot();
else document.getElementById('gate').hidden = false;
</script>
</body></html>`;

// Printable QR page — points to /book. Public, safe (target is already public).
// ponytail: uses qrserver.com — swap to a JS QR lib if that service ever flakes.
const QR_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Book with __CLINIC__ — QR</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: white; color: #14171a; }
  .page { max-width: 500px; margin: 40px auto; padding: 40px 30px; text-align: center; }
  h1 { font-size: 28px; margin: 0 0 6px; color: #1D6B58; }
  .doc { color: #7d8590; margin-bottom: 28px; }
  .qr { border: 6px solid #1D6B58; border-radius: 14px; padding: 18px; background: white; display: inline-block; margin: 8px 0 22px; }
  .qr img { display: block; width: 300px; height: 300px; }
  .instruction { font-size: 20px; font-weight: 600; margin: 22px 0 8px; }
  .sub { color: #626b62; }
  .url { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #626b62; word-break: break-all; margin-top: 16px; padding: 8px 12px; background: #f5f7f6; border-radius: 6px; }
  .foot { margin-top: 32px; font-size: 13px; color: #626b62; }
  .btn { margin-top: 24px; background: #1D6B58; color: white; border: 0; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
  .share { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 22px; }
  .share-btn { margin: 0; padding: 10px 14px; font-size: 13px; }
  .share-btn.wa { background: #25D366; }
  .share-btn.sms { background: #3A85FF; }
  @media print {
    body { background: white; }
    .btn, .share { display: none; }
    .page { margin: 0; padding: 30px; }
  }
</style></head>
<body>
<div class="page">
  <h1>__CLINIC__</h1>
  <div class="doc">General Practitioner · Dr. Agarwal · Open 9 AM – 8 PM</div>

  <div class="qr">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=0&data=__BOOK_URL_ENC__" alt="Scan to book an appointment" width="300" height="300">
  </div>

  <div class="instruction">📱 Scan to book an appointment</div>
  <div class="sub">Talk to our AI receptionist — or pick a slot online</div>
  <div class="url" id="url">__BOOK_URL__</div>

  <div class="share">
    <button class="btn share-btn" onclick="copyLink()" id="copyBtn">📋 Copy link</button>
    <a class="btn share-btn wa" href="https://wa.me/?text=Book%20your%20appointment%20at%20Dr.%20Agarwal's%20Clinic%3A%20__BOOK_URL_ENC__" target="_blank" rel="noopener">💬 WhatsApp</a>
    <a class="btn share-btn sms" href="sms:?body=Book%20at%20Dr.%20Agarwal's%20Clinic%3A%20__BOOK_URL_ENC__">✉️ SMS</a>
  </div>

  <div class="foot">Speaks English & Hindi · Not for emergencies (dial 112)</div>
  <button class="btn" onclick="print()">🖨 Print QR</button>
</div>
<script>
async function copyLink() {
  const btn = document.getElementById('copyBtn');
  const url = document.getElementById('url').textContent.trim();
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy link'; }, 2000);
  } catch {
    // Fallback for older browsers / restrictive contexts
    const t = document.createElement('textarea');
    t.value = url; document.body.appendChild(t); t.select();
    document.execCommand('copy'); t.remove();
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy link'; }, 2000);
  }
}
</script>
</body></html>`;

// Patient-facing page — public. Voice widget + booking form.
// Vapi public key is safe to embed; assistant ID is fine in HTML.
const VAPI_PUBLIC_KEY = '598565ae-7c9a-4152-bcd7-bf331aa52abd';
const VAPI_ASSISTANT_ID = '48bce9da-7d28-45bb-bff2-c66d9f610b05';
const TURNSTILE_SITEKEY = '0x4AAAAAAEonKP5oMkUrIb7Q';

// Cloudflare Turnstile — CAPTCHA-alternative. Server-side verify before booking.
async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // dev fallback if secret not set
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = await r.json();
    return data.success === true;
  } catch { return false; }
}

const PATIENT_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Book with __CLINIC__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after { box-sizing: border-box; margin: 0; }
  html,body { background: #FBFCFB; color: #14211C; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .mono { font-family: 'IBM Plex Mono', monospace; }
  .serif { font-family: 'Instrument Serif', Georgia, serif; }
  a { color: inherit; }
  [hidden] { display: none !important; }

  @keyframes wave { 0%,100% { transform: scaleY(.55); } 50% { transform: scaleY(1); } }
  @keyframes livedot { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
  @keyframes ring { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(1.6); opacity: 0; } }
  @keyframes popin { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
  @keyframes flash-attn { 0%,100% { box-shadow: 0 0 0 0 rgba(224,138,70,0); } 30% { box-shadow: 0 0 0 4px rgba(224,138,70,.35); } }
  .attn { animation: flash-attn 0.9s ease-in-out; border-color: #E08A46 !important; }

  .app { max-width: 1180px; margin: 0 auto; background: #fff; box-shadow: 0 1px 2px rgba(20,33,28,.05), 0 18px 50px rgba(20,33,28,.08); border-radius: 0; min-height: 100vh; }
  @media (min-width: 1220px) { .app { margin: 20px auto; border-radius: 16px; border: 1px solid #D5E2DB; overflow: hidden; min-height: auto; } }

  /* Topbar */
  .topbar { position: sticky; top: 0; z-index: 5; background: rgba(255,255,255,.94); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom: 1px solid #EAF1ED; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; gap: 14px; }
  .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .brand .av { width: 34px; height: 34px; border-radius: 50%; background: #14654C; color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; flex-shrink: 0; }
  .brand .nm { font-size: 14px; font-weight: 600; letter-spacing: -0.01em; color: #14211C; }
  .brand .rl { font-size: 11.5px; color: #55655E; }
  .top-open { display: flex; align-items: center; gap: 7px; background: #E4F0EA; padding: 7px 10px; border-radius: 10px; white-space: nowrap; }
  .top-open .dot { flex-shrink: 0; }
  .top-open .stack { display: flex; flex-direction: column; line-height: 1.15; gap: 0; }
  .top-open .stack b { font-size: 11.5px; font-weight: 600; color: #14654C; letter-spacing: -0.005em; }
  .top-open .stack span { font-size: 11px; color: #6A8378; font-weight: 400; margin-top: 1px; }
  .top-open .dot { width: 5px; height: 5px; border-radius: 50%; background: #14654C; animation: livedot 2.4s ease-in-out infinite; }
  .top-extra { display: none; align-items: center; gap: 20px; }
  .top-extra .sep { width: 1px; height: 26px; background: #EAF1ED; }
  .top-live { display: flex; align-items: center; gap: 9px; }
  .top-live .dot { width: 8px; height: 8px; border-radius: 50%; background: #14654C; animation: livedot 2.4s ease-in-out infinite; flex-shrink: 0; }
  .top-extra .col { display: flex; flex-direction: column; gap: 1px; }
  .top-extra .col b { font-size: 12.5px; font-weight: 600; }
  .top-extra .col span { font-size: 12px; color: #55655E; }
  .top-chip { background: #E4F0EA; border: 1px solid #CBE0D5; border-radius: 11px; padding: 8px 14px; }
  .top-chip .a { font-size: 12.5px; font-weight: 600; color: #14654C; }
  .top-chip .b { font-size: 11.5px; color: #3E6A5A; }
  @media (min-width: 900px) {
    .topbar { padding: 14px 30px; height: 70px; }
    .brand .av { width: 40px; height: 40px; font-size: 13.5px; }
    .brand .nm { font-size: 16px; }
    .brand .rl { font-size: 12.5px; }
    .top-open { display: none; }
    .top-extra { display: flex; }
  }

  /* Hero */
  .hero { position: relative; background: linear-gradient(155deg, #E9F5F1 0%, #F3F9F7 40%, #EFF6FA 70%, #FCF4EC 100%); padding: 24px 16px 26px; overflow: hidden; }
  .hero::before { content: ''; position: absolute; inset: 0; background-image: repeating-linear-gradient(90deg, rgba(20,101,76,.07) 0 1px, transparent 1px 52px), repeating-linear-gradient(0deg, rgba(20,101,76,.05) 0 1px, transparent 1px 52px); pointer-events: none; }
  .hero::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(20,101,76,.3), rgba(224,138,70,.3), transparent); }
  .hero .glow1, .hero .glow2, .hero .glow3 { position: absolute; border-radius: 50%; pointer-events: none; }
  .hero .glow1 { top: -120px; right: -100px; width: 340px; height: 280px; background: radial-gradient(closest-side, rgba(127,227,184,.34), rgba(127,227,184,0)); }
  .hero .glow2 { top: 40px; right: 200px; width: 260px; height: 230px; background: radial-gradient(closest-side, rgba(88,166,214,.2), rgba(88,166,214,0)); display: none; }
  .hero .glow3 { bottom: -120px; left: -90px; width: 320px; height: 260px; background: radial-gradient(closest-side, rgba(224,138,70,.15), rgba(224,138,70,0)); display: none; }
  .hero-inner { position: relative; }
  .hero-pill { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(100deg, rgba(20,101,76,.1), rgba(224,138,70,.16)); border: 1px solid rgba(20,101,76,.22); border-radius: 999px; padding: 5px 11px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 500; letter-spacing: .14em; color: #0F5340; }
  .hero-pill .dot { width: 5px; height: 5px; border-radius: 50%; background: #E08A46; }
  .hero h1 { margin: 12px 0 10px; font-size: 32px; line-height: 1.07; font-weight: 700; letter-spacing: -0.032em; color: #14211C; }
  .hero h1 .grad { background: linear-gradient(96deg, #14654C 8%, #1B8367 52%, #2E8FA8 96%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .hero p.sub { margin: 0 0 18px; font-size: 14px; line-height: 1.55; color: #455750; max-width: 42ch; }
  @media (min-width: 780px) {
    .hero { padding: 40px 30px 46px; }
    .hero .glow1 { top: -170px; right: -110px; width: 640px; height: 500px; background: radial-gradient(closest-side, rgba(127,227,184,.42), rgba(127,227,184,0)); }
    .hero .glow2 { display: block; top: 60px; right: 280px; width: 420px; height: 380px; background: radial-gradient(closest-side, rgba(88,166,214,.22), rgba(88,166,214,0)); }
    .hero .glow3 { display: block; bottom: -190px; left: -130px; width: 460px; height: 380px; background: radial-gradient(closest-side, rgba(224,138,70,.16), rgba(224,138,70,0)); }
    .hero-inner { display: grid; grid-template-columns: minmax(0, 1fr) 430px; gap: 40px; align-items: start; }
    .hero-left { padding-top: 8px; }
    .hero-pill { padding: 6px 13px; font-size: 11px; }
    .hero h1 { font-size: 44px; line-height: 1.06; letter-spacing: -0.035em; margin: 16px 0 14px; }
    .hero h1 br { display: block; }
    .hero p.sub { font-size: 16px; margin-bottom: 26px; max-width: 40ch; }
  }

  /* Voice card (dark green with waveform) */
  .voice { position: relative; background: #0F5340; background-image: radial-gradient(300px 200px at 90% -12%, rgba(127,227,184,.34), transparent 70%), radial-gradient(260px 180px at 4% 106%, rgba(224,138,70,.26), transparent 72%), linear-gradient(158deg, #167054 0%, #0F5340 46%, #0A3B36 100%), repeating-linear-gradient(90deg, rgba(255,255,255,.055) 0 1px, transparent 1px 36px), repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 36px); border: 1px solid #2B7A62; border-radius: 18px; padding: 20px; box-shadow: 0 16px 36px rgba(12,45,35,.3); }
  .voice-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .voice-head .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .11em; color: #A9CFC0; }
  .voice-head .live { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; color: #7FE3B8; }
  .voice-head .live .d { width: 5px; height: 5px; border-radius: 50%; background: #7FE3B8; animation: livedot 1.6s ease-in-out infinite; }
  .waves { display: flex; align-items: center; justify-content: center; gap: 4px; height: 56px; margin-bottom: 16px; }
  .waves span { width: 4px; border-radius: 3px; transform-origin: 50% 50%; animation: wave 1.1s ease-in-out infinite; }
  .voice h3 { margin: 0 0 7px; font-size: 19px; font-weight: 600; letter-spacing: -0.022em; color: #fff; }
  .voice p { margin: 0 0 22px; font-size: 13.5px; line-height: 1.5; color: #C6E2D7; }
  .voice-btn { width: 100%; height: 54px; border: 0; border-radius: 13px; background: #F4FAF7; color: #0F5340; font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 9px; cursor: pointer; box-shadow: 0 12px 24px rgba(6,30,22,.28); font-family: inherit; }
  .voice-btn:hover { background: #fff; }
  .voice-btn.busy { background: #C2352B; color: #fff; }
  .voice-btn .btn-dot { width: 10px; height: 10px; border-radius: 50%; background: #0F5340; }
  .voice-btn.busy .btn-dot { background: #fff; }
  .voice-meta { margin: 14px 0 0; font-size: 12px; color: #A9CFC0; text-align: center; min-height: 16px; }
  @media (min-width: 780px) {
    .voice { padding: 26px; border-radius: 20px; }
    .voice h3 { font-size: 22px; }
    .voice p { font-size: 14px; margin-bottom: 22px; }
    .voice-btn { height: 56px; font-size: 16.5px; }
    .waves { height: 74px; margin-bottom: 20px; gap: 5px; }
    .waves span { width: 5px; }
  }
  .better-health { display: none; }
  @media (min-width: 900px) {
    .hero-right { position: relative; display: flex; flex-direction: column; gap: 14px; }
    .better-health { display: block; position: absolute; top: -16px; left: -170px; font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 27px; line-height: 1.15; color: #41705D; text-align: right; width: 110px; }
  }

  /* Trust rail */
  .trust-rail { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 22px; margin-bottom: 22px; }
  @media (min-width: 780px) { .trust-rail { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 0; } .trust { flex: 1; min-width: 120px; } }
  .trust { display: flex; flex-direction: column; align-items: flex-start; gap: 9px; background: #fff; border: 1px solid #DDE9E3; border-radius: 12px; padding: 11px 9px 12px; min-width: 0; }
  @media (min-width: 780px) { .trust { flex-direction: row; align-items: center; padding: 10px 14px; gap: 10px; } }
  .trust .ic { width: 26px; height: 26px; border-radius: 8px; background: #E4F0EA; display: grid; place-items: center; flex: none; }
  @media (min-width: 780px) { .trust .ic { width: 30px; height: 30px; border-radius: 9px; } }
  .trust .ic > span { width: 9px; height: 9px; border-radius: 50%; background: #14654C; }
  .trust .ic.sq > span { width: 9px; height: 9px; border-radius: 2px; }
  .trust .ic.chat > span { width: 11px; height: 8px; border-radius: 3px 3px 3px 0; }
  .trust .tt { display: flex; flex-direction: column; gap: 1px; }
  .trust .tt { min-width: 0; }
  .trust .tt b { font-size: 11.5px; font-weight: 700; line-height: 1.2; color: #14211C; letter-spacing: -0.005em; }
  .trust .tt b.mob { display: block; }
  .trust .tt b.desk { display: none; }
  @media (min-width: 780px) { .trust .tt b { font-size: 12.5px; } .trust .tt b.mob { display: none; } .trust .tt b.desk { display: block; } }
  .trust .tt span { font-size: 11.5px; color: #55655E; line-height: 1.2; display: none; }
  @media (min-width: 780px) { .trust .tt span { font-size: 11.5px; display: block; } }

  /* Form shell */
  .form-shell { padding: 18px 16px 26px; background: linear-gradient(180deg, #F7FBF9 0%, #FBFCFB 40%, #F6FAFC 100%); border-top: 1px solid #EAF1ED; }
  .form-shell::before { content: ''; position: absolute; }
  @media (min-width: 900px) { .form-shell { padding: 26px 30px 30px; display: grid; grid-template-columns: minmax(0, 1fr) 316px; gap: 22px; align-items: start; } }

  .card { background: #fff; border: 1px solid #E4EBE7; border-radius: 18px; box-shadow: 0 1px 2px rgba(20,33,28,.04); overflow: hidden; }
  .card-body { padding: 20px 16px; display: flex; flex-direction: column; gap: 22px; }
  @media (min-width: 780px) { .card-body { padding: 24px 26px 26px; gap: 24px; } }

  .step { display: flex; flex-direction: column; gap: 12px; }
  .step-head { display: flex; align-items: flex-start; gap: 12px; }
  .badge { width: 30px; height: 30px; border-radius: 50%; background: #14654C; color: #fff; font-weight: 700; font-size: 14px; display: grid; place-items: center; flex-shrink: 0; margin-top: 2px; }
  .badge.pending { background: #E4EBE7; color: #55655E; }
  .step-title { display: flex; flex-direction: column; gap: 2px; }
  .step-title b { font-size: 15.5px; font-weight: 600; letter-spacing: -0.015em; }
  .step-title span { font-size: 12.5px; color: #55655E; }
  @media (min-width: 780px) { .step-title b { font-size: 16px; } }

  /* Pick tiles (urgency + preference) */
  .picks-4 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .picks-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  @media (min-width: 780px) { .picks-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 11px; } .picks-3 { gap: 11px; } }

  .pick { -webkit-appearance: none; appearance: none; position: relative; background: #fff; border: 1.5px solid #DDE9E3; border-radius: 14px; padding: 14px 10px 12px; cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: all .12s; font-family: inherit; }
  .pick:hover { border-color: #B4D0C1; }
  .pick input { position: absolute; opacity: 0; pointer-events: none; }
  .pick .tile { width: 32px; height: 32px; border-radius: 10px; background: #F1F7F3; display: grid; place-items: center; flex-shrink: 0; }
  .pick .tile-dot { width: 10px; height: 10px; border-radius: 50%; }
  .pick .t { font-size: 13.5px; font-weight: 600; color: #14211C; }
  .pick .s { font-size: 11.5px; line-height: 1.3; color: #55655E; text-align: center; }
  .pick.on { border-color: #14654C; background: #F1F7F3; box-shadow: 0 0 0 3px rgba(20,101,76,.08); }
  .pick .check { position: absolute; top: -8px; right: -8px; width: 21px; height: 21px; border-radius: 50%; background: #14654C; border: 2px solid #fff; display: none; place-items: center; color: #fff; font-size: 12px; font-weight: 700; line-height: 1; }
  .pick.on .check { display: grid; }
  .pick.u-emergency .tile-dot { background: #C2352B; }
  .pick.u-urgent .tile-dot { background: #E08A46; }
  .pick.u-normal .tile-dot { background: #C89B2E; }
  .pick.u-routine .tile-dot { background: #17A96A; }
  .pick.u-emergency.on { border-color: #C2352B; background: #FDEDEA; box-shadow: 0 0 0 3px rgba(194,53,43,.1); }
  .pick.u-emergency.on .check { background: #C2352B; }
  .pick.u-emergency.on .t { color: #93261E; }
  .pick.u-urgent.on { border-color: #E08A46; background: #FCF3E5; box-shadow: 0 0 0 3px rgba(224,138,70,.14); }
  .pick.u-urgent.on .t { color: #8A5C08; }
  .pick.u-urgent.on .check { background: #E08A46; }
  .pref .tile { background: #F1F7F3; font-size: 16px; }
  .pref .pick { flex-direction: row; text-align: left; gap: 10px; padding: 12px 12px; }
  .pref .pick > .tile { width: 34px; height: 34px; }
  .pref .pick .text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .pref .pick .text .t { font-size: 13.5px; }
  .pref .pick .text .s { font-size: 11.5px; color: #55655E; }
  @media (max-width: 480px) {
    .pref .pick { flex-direction: column; align-items: center; text-align: center; padding: 12px 8px; }
    .pref .pick .text { align-items: center; }
  }

  /* Emergency box */
  .emerg-box { background: #FDEDEA; border: 1px solid #F3CAC3; border-radius: 15px; padding: 18px; display: flex; gap: 14px; align-items: flex-start; }
  .emerg-box .bang { width: 38px; height: 38px; border-radius: 12px; background: #C2352B; color: #fff; font-size: 20px; font-weight: 700; display: grid; place-items: center; flex: none; }
  .emerg-box h4 { margin: 0 0 8px; font-size: 17px; font-weight: 600; letter-spacing: -0.02em; color: #93261E; }
  .emerg-box p { margin: 0 0 14px; font-size: 13.5px; line-height: 1.55; color: #55332E; }
  .call-108 { display: inline-flex; align-items: center; justify-content: center; height: 46px; padding: 0 22px; border-radius: 12px; background: #C2352B; color: #fff !important; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 10px 20px rgba(194,53,43,.24); }
  .call-108:hover { background: #93261E; }
  .not-emerg { display: block; background: none; border: 0; padding: 8px 0 0; font-size: 13px; color: #55655E; text-decoration: underline; cursor: pointer; font-family: inherit; }

  /* Slots */
  .slot-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
  .slot-hint { font-size: 11.5px; font-weight: 600; color: #8A5C08; background: #FCF3E5; border: 1px solid #EFDFC2; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
  .slots { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  @media (min-width: 620px) { .slots { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 11px; } }
  .slot { -webkit-appearance: none; appearance: none; position: relative; background: #fff; border: 1.5px solid #DDE9E3; border-radius: 13px; padding: 12px 8px 10px; cursor: pointer; text-align: center; display: flex; flex-direction: column; gap: 4px; transition: all .12s; font-family: inherit; }
  .slot:hover { border-color: #B4D0C1; }
  .slot .day { font-size: 11px; color: #55655E; text-transform: uppercase; letter-spacing: .04em; font-weight: 500; }
  .slot .time { font-size: 14.5px; font-weight: 600; color: #14211C; letter-spacing: -0.01em; }
  .slot .check { position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; border-radius: 50%; background: #14654C; border: 2px solid #fff; display: none; place-items: center; color: #fff; font-size: 11px; font-weight: 700; }
  .slot.on { border-color: #14654C; background: #F1F7F3; box-shadow: 0 0 0 3px rgba(20,101,76,.08); }
  .slot.on .check { display: grid; }
  .slot-hint { font-size: 12px; font-weight: 600; color: #8A5C08; background: #FCF3E5; border: 1px solid #EFDFC2; padding: 6px 11px; border-radius: 999px; white-space: nowrap; }
  .today-card { background: #fff; border: 1px solid #E4EBE7; border-radius: 18px; padding: 18px 20px; }
  .today-label { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: .1em; color: #55655E; }
  .today-stats { display: flex; gap: 22px; margin-top: 12px; }
  .today-stats > span { display: flex; flex-direction: column; gap: 2px; }
  .today-stats b { font-size: 22px; font-weight: 600; letter-spacing: -0.025em; color: #14211C; }
  .today-stats small { font-size: 11.5px; color: #55655E; font-weight: 500; }
  .slot .reserved { display: none; margin-top: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 9.5px; letter-spacing: .07em; color: #8A5C08; background: #FCF3E5; padding: 2px 6px; border-radius: 5px; }
  .slot.has-reserved .reserved { display: inline-block; }
  .slot.none { grid-column: 1 / -1; color: #55655E; text-align: center; padding: 20px; cursor: default; font-size: 13px; }
  .slot.none:hover { border-color: #DDE9E3; }

  /* Details */
  .fields { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 520px) { .fields { grid-template-columns: 1fr 1fr; gap: 14px; } }
  .fld { display: flex; flex-direction: column; gap: 6px; }
  .fld label { font-size: 12.5px; font-weight: 600; color: #14211C; }
  .fld label .opt { font-weight: 400; color: #55655E; }
  .fld input, .fld textarea { width: 100%; padding: 12px 14px; border: 1px solid #DDE9E3; border-radius: 11px; font: inherit; font-size: 15px; color: #14211C; background: #fff; transition: border-color .12s, box-shadow .12s; }
  .fld input:focus, .fld textarea:focus { outline: 0; border-color: #14654C; box-shadow: 0 0 0 3px rgba(20,101,76,.13); }
  .fld.phone .inp-wrap { display: flex; align-items: stretch; border: 1px solid #DDE9E3; border-radius: 11px; overflow: hidden; background: #fff; transition: border-color .12s, box-shadow .12s; }
  .fld.phone .inp-wrap:focus-within { border-color: #14654C; box-shadow: 0 0 0 3px rgba(20,101,76,.13); }
  .fld.phone .prefix { padding: 0 12px; font-size: 14px; color: #55655E; border-right: 1px solid #EAF1ED; display: flex; align-items: center; background: #F5F9F7; }
  .fld.phone input { border: 0; border-radius: 0; box-shadow: none; padding: 12px 13px; }
  .fld.phone input:focus { border: 0; box-shadow: none; }

  /* CTA row */
  .cta-row { display: flex; flex-direction: column; align-items: stretch; gap: 12px; border-top: 1px solid #EFF4F1; padding-top: 20px; }
  @media (min-width: 620px) { .cta-row { flex-direction: row; align-items: center; gap: 16px; } }
  .cta-btn { flex: 1; width: 100%; height: 56px; border: 0; border-radius: 14px; background: #14654C; color: #fff; font-size: 16px; font-weight: 700; letter-spacing: -0.015em; cursor: pointer; font-family: inherit; box-shadow: 0 10px 20px rgba(20,101,76,.15); }
  .cta-btn:hover:not(:disabled) { background: #0F5340; }
  .cta-btn:disabled { background: #B0BFB8; cursor: not-allowed; }
  .cta-meta { display: flex; flex-direction: column; gap: 2px; text-align: center; align-items: center; margin-top: 2px; }
  .cta-meta .rs { font-size: 11.5px !important; color: #55655E; }
  .cta-meta .rc { display: none !important; }
  @media (min-width: 780px) { .cta-meta { text-align: left; align-items: flex-start; margin-top: 0; flex-direction: column; gap: 4px; } .cta-meta .rs { font-size: 13px !important; color: #3A4B44; } .cta-meta .rc { display: flex !important; } }
  .cta-meta .rs { font-size: 13px; color: #3A4B44; }
  .cta-meta .rc { display: flex; align-items: center; gap: 7px; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: .05em; color: #55655E; }
  .cta-meta .rc::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #14654C; }

  #result { margin-top: 10px; font-size: 13px; text-align: center; }
  #result.err { color: #C2352B; font-weight: 500; }

  /* Success screen */
  .success { padding: 40px 20px 34px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  @media (min-width: 780px) { .success { padding: 58px 40px 54px; } }
  .success-ring { position: relative; width: 68px; height: 68px; display: grid; place-items: center; }
  @media (min-width: 780px) { .success-ring { width: 76px; height: 76px; } }
  .success-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; border: 2px solid #14654C; animation: ring 1.8s ease-out infinite; }
  .success-tick { width: 100%; height: 100%; border-radius: 50%; background: #E4F0EA; display: grid; place-items: center; color: #14654C; font-size: 34px; font-weight: 700; animation: popin .42s cubic-bezier(.2,.9,.3,1.2) both; }
  .success h3 { margin: 20px 0 6px; font-size: 23px; font-weight: 600; letter-spacing: -0.025em; }
  @media (min-width: 780px) { .success h3 { font-size: 27px; margin-top: 24px; } }
  .success .sub { margin: 0 0 20px; font-size: 13.5px; color: #55655E; }
  .booked-card { width: 100%; max-width: 430px; border: 1px solid #DDE9E3; border-radius: 16px; overflow: hidden; text-align: left; }
  .booked-card .head { background: #14654C; padding: 16px 20px; }
  .booked-card .head .label { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: .1em; color: #A9CFC0; }
  .booked-card .head .when { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #fff; margin-top: 5px; }
  .booked-card .rows { padding: 16px 20px; display: flex; flex-direction: column; gap: 11px; background: #F7FAF8; }
  .booked-card .rows .row { display: flex; justify-content: space-between; gap: 12px; font-size: 13.5px; }
  .booked-card .rows .row .k { color: #55655E; }
  .booked-card .rows .row .v { font-weight: 600; }
  .success .actions { display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap; justify-content: center; }
  .success .actions button { height: 48px; padding: 0 20px; border-radius: 12px; font-size: 14.5px; font-weight: 600; cursor: pointer; font-family: inherit; border: 0; }
  .success .actions .primary { background: #14654C; color: #fff; }
  .success .actions .primary:hover { background: #0F5340; }
  .success .actions .secondary { border: 1px solid #DDE9E3; background: #fff; color: #14654C; }
  .success .actions .secondary:hover { background: #F1F7F3; }

  /* Sidebar (desktop only) */
  .sidebar { display: none; flex-direction: column; gap: 14px; }
  @media (min-width: 900px) { .sidebar { display: flex; } }
  .reassure { position: relative; background: linear-gradient(165deg, #EDF6F1, #F4F9F7 60%, #EFF6FA); border: 1px solid #DDE9E3; border-radius: 18px; padding: 22px; overflow: hidden; }
  .reassure::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #14654C, #2E8FA8 60%, #E08A46); }
  .reassure .ic { width: 38px; height: 38px; border-radius: 12px; background: #fff; border: 1px solid #DDE9E3; display: grid; place-items: center; margin-bottom: 14px; }
  .reassure .ic > span { width: 12px; height: 12px; border-radius: 4px; background: linear-gradient(135deg, #14654C, #2E8FA8); }
  .reassure h4 { margin: 0 0 14px; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
  .reassure ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 11px; }
  .reassure li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #2E3E38; }
  .reassure li::before { content: '✓'; width: 18px; height: 18px; border-radius: 50%; background: #DCEBE3; color: #14654C; font-size: 10px; font-weight: 700; display: grid; place-items: center; flex: none; }
  .reassure blockquote { margin: 20px 0 0; padding-top: 18px; border-top: 1px solid #DDE9E3; font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 19px; line-height: 1.35; color: #2E3E38; }
  .reassure blockquote cite { display: block; margin-top: 9px; font-size: 12.5px; color: #55655E; font-style: normal; }
  .side-emerg { background: #FDEDEA; border: 1px solid #F3CAC3; border-radius: 18px; padding: 20px; }
  .side-emerg .bang { width: 34px; height: 34px; border-radius: 11px; background: #fff; border: 1px solid #F3CAC3; color: #C2352B; font-size: 17px; font-weight: 700; display: grid; place-items: center; margin-bottom: 12px; }
  .side-emerg h4 { margin: 0 0 7px; font-size: 16px; font-weight: 600; letter-spacing: -0.015em; color: #93261E; }
  .side-emerg p { margin: 0 0 14px; font-size: 12.5px; line-height: 1.5; color: #55332E; }
  .side-emerg .call-108 { display: flex; height: 46px; }

  /* Footer */
  .footer { border-top: 1px solid #EAF1ED; background: #fff; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; font-size: 12px; color: #55655E; }
  .footer .signals { display: flex; gap: 24px; flex-wrap: wrap; }
  .footer .signals span { display: flex; align-items: center; gap: 8px; }
  .footer .signals span::before { content: ''; width: 6px; height: 6px; border-radius: 50%; }
  .footer .signals .r::before { background: #C2352B; }
  .footer .signals .g::before { background: #14654C; }
</style></head>
<body>
<div class="app">

  <header class="topbar">
    <div class="brand">
      <div class="av">DA</div>
      <div>
        <div class="nm">__CLINIC__</div>
        <div class="rl">General Practitioner</div>
      </div>
    </div>
    <div class="top-open"><span class="dot"></span><div class="stack"><b>Open · until 8 PM</b><span>Kanpur, India</span></div></div>
    <div class="top-extra">
      <div class="top-live"><span class="dot"></span><div class="col"><b>Open daily</b><span>9 AM – 8 PM</span></div></div>
      <div class="sep"></div>
      <div class="col"><b>Kanpur, India</b><span>Care for a healthier you</span></div>
      <div class="top-chip"><div class="a">Your Health</div><div class="b">Our Priority</div></div>
    </div>
  </header>

  <section class="hero">
    <div class="glow1"></div><div class="glow2"></div><div class="glow3"></div>
    <div class="hero-inner">
      <div class="hero-left">
        <span class="hero-pill"><span class="dot"></span>SIMPLE. FAST. RELIABLE.</span>
        <h1>Book your appointment<br><span class="grad">with Dr. Deep Agarwal</span></h1>
        <p class="sub">Talk to our AI receptionist or pick a slot yourself — anytime, day or night.</p>
        <div class="trust-rail">
          <div class="trust"><div class="ic"><span></span></div><div class="tt"><b class="mob">24×7 booking</b><b class="desk">24×7</b><span>booking</span></div></div>
          <div class="trust"><div class="ic sq"><span></span></div><div class="tt"><b class="mob">Calendar sync</b><b class="desk">Calendar</b><span>sync</span></div></div>
          <div class="trust"><div class="ic chat"><span></span></div><div class="tt"><b class="mob">English &amp; हिन्दी</b><b class="desk">English &amp;</b><span>हिन्दी</span></div></div>
        </div>
      </div>
      <div class="hero-right">
        <div class="better-health">Better health, brighter days</div>
        <div class="voice">
          <div class="voice-head">
            <span class="label">VOICE BOOKING</span>
            <span class="live"><span class="d"></span>LIVE</span>
          </div>
          <div class="waves">
            <span style="height:32px;background:#4FB894;animation-delay:0s"></span>
            <span style="height:48px;background:#7FE3B8;animation-delay:.12s"></span>
            <span style="height:24px;background:#4FB894;animation-delay:.24s"></span>
            <span style="height:52px;background:linear-gradient(180deg,#F2A868,#E08A46);animation-delay:.36s"></span>
            <span style="height:36px;background:#7FE3B8;animation-delay:.48s"></span>
            <span style="height:44px;background:#4FB894;animation-delay:.6s"></span>
            <span style="height:28px;background:#7FE3B8;animation-delay:.72s"></span>
          </div>
          <h3>Just say when you're free</h3>
          <p>It listens, checks the calendar and books it. Hindi or English — whatever you speak at home.</p>
          <button type="button" id="talk" class="voice-btn"><span class="btn-dot"></span>Start voice call</button>
          <p class="voice-meta" id="callStatus">Free · needs mic access · no app to install</p>
        </div>
      </div>
    </div>
  </section>

  <div class="form-shell">
    <div class="card">
      <div class="card-body" id="formFields">

        <form id="form" style="display:contents">

          <div class="step">
            <div class="step-head">
              <span class="badge">1</span>
              <div class="step-title">
                <b>How urgent is this?</b>
                <span>This helps us offer you the right time slot.</span>
              </div>
            </div>
            <div class="picks-4 pick-row urgency-row">
              <button type="button" class="pick u-emergency"><span class="check">✓</span><input type="radio" name="urgency" value="emergency"><span class="tile"><span class="tile-dot"></span></span><span class="t">Emergency</span><span class="s">Life-threatening<br>call 108</span></button>
              <button type="button" class="pick u-urgent"><span class="check">✓</span><input type="radio" name="urgency" value="urgent"><span class="tile"><span class="tile-dot"></span></span><span class="t">Urgent</span><span class="s">Fever, pain, injury</span></button>
              <button type="button" class="pick u-normal on"><span class="check">✓</span><input type="radio" name="urgency" value="normal" checked><span class="tile"><span class="tile-dot"></span></span><span class="t">Normal</span><span class="s">Ongoing symptom</span></button>
              <button type="button" class="pick u-routine"><span class="check">✓</span><input type="radio" name="urgency" value="routine"><span class="tile"><span class="tile-dot"></span></span><span class="t">Routine</span><span class="s">Check-up</span></button>
            </div>
          </div>

          <div class="emerg-box" id="emergencyBox" hidden>
            <span class="bang">!</span>
            <div style="flex:1;min-width:0">
              <h4>Please call 108 immediately</h4>
              <p>Chest pain, trouble breathing, heavy bleeding or someone unconscious needs an ambulance now — not an appointment.</p>
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px">
                <a href="tel:108" class="call-108">Call 108 now</a>
                <button type="button" class="not-emerg" onclick="clearEmergency()">This is not an emergency →</button>
              </div>
            </div>
          </div>

          <div data-hide-emergency style="display:flex;flex-direction:column;gap:22px">

            <div class="step pref">
              <div class="step-head">
                <span class="badge">2</span>
                <div class="step-title">
                  <b>Preferred time of day</b>
                  <span>Select when you'd like to visit.</span>
                </div>
              </div>
              <div class="picks-3 pick-row">
                <button type="button" class="pick"><span class="check">✓</span><input type="radio" name="preference" value="morning"><span class="tile">🌅</span><div class="text"><span class="t">Morning</span><span class="s">9 AM – 12 PM</span></div></button>
                <button type="button" class="pick on"><span class="check">✓</span><input type="radio" name="preference" value="afternoon" checked><span class="tile">☀️</span><div class="text"><span class="t">Afternoon</span><span class="s">12 PM – 5 PM</span></div></button>
                <button type="button" class="pick"><span class="check">✓</span><input type="radio" name="preference" value="evening"><span class="tile">🌙</span><div class="text"><span class="t">Evening</span><span class="s">5 PM – 8 PM</span></div></button>
              </div>
            </div>

            <div class="step">
              <div class="slot-head">
                <div class="step-head" style="margin:0">
                  <span class="badge">3</span>
                  <div class="step-title">
                    <b>Pick a slot</b>
                    <span id="slotSub">Loading availability…</span>
                  </div>
                </div>
                <span id="slotHint" class="slot-hint" hidden></span>
              </div>
              <div id="slots" class="slots"><div class="slot none">Loading available slots…</div></div>
            </div>

            <div class="step">
              <div class="step-head">
                <span class="badge">4</span>
                <div class="step-title">
                  <b>Your details</b>
                  <span>Just a few details to confirm your appointment.</span>
                </div>
              </div>
              <div class="fields">
                <div class="fld">
                  <label>Your name</label>
                  <input name="name" required minlength="2" autocomplete="name" placeholder="Rahul Sharma">
                </div>
                <div class="fld phone">
                  <label>Phone (10 digits)</label>
                  <div class="inp-wrap">
                    <span class="prefix">+91</span>
                    <input name="phone" required pattern="[0-9]{10}" inputmode="numeric" autocomplete="tel-national" placeholder="98765 43210">
                  </div>
                </div>
              </div>
              <div class="fld" style="margin-top:12px">
                <label>What's the issue? <span class="opt">— optional, helps the doctor prepare</span></label>
                <textarea name="reason" rows="2" placeholder="e.g. cough for 3 days, or general check-up"></textarea>
              </div>
              <div class="cf-turnstile" data-sitekey="__TURNSTILE_SITEKEY__" data-callback="onTurnstile" data-expired-callback="onTurnstileExpired" style="margin-top:14px"></div>
            </div>

            <div class="cta-row">
              <button type="submit" class="cta-btn" id="submit">Confirm appointment</button>
              <div class="cta-meta">
                <span class="rs">Pick a slot to continue.</span>
                <span class="rc">SPAM CHECK · SMS CONFIRMATION</span>
              </div>
            </div>
            <div id="result"></div>
          </div>

        </form>
      </div>

      <div class="success" id="success" hidden>
        <div class="success-ring"><span class="success-tick">✓</span></div>
        <h3>Appointment booked</h3>
        <p class="sub">It's in Dr. Agarwal's calendar. An SMS is on its way to your phone.</p>
        <div class="booked-card">
          <div class="head">
            <span class="label">YOUR APPOINTMENT</span>
            <div class="when" id="successWhen">—</div>
          </div>
          <div class="rows">
            <div class="row"><span class="k">Patient</span><span class="v" id="successName">—</span></div>
            <div class="row"><span class="k">With</span><span class="v">Dr. Deep Agarwal · GP</span></div>
            <div class="row"><span class="k">Where</span><span class="v">Clinic, ground floor</span></div>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="secondary" onclick="location.reload()">Book another</button>
        </div>
        <div id="successDetail" hidden></div>
      </div>
    </div>

    <aside class="sidebar">
      <div class="reassure">
        <div class="ic"><span></span></div>
        <h4>You're in good hands</h4>
        <ul>
          <li>Experienced &amp; caring doctor</li>
          <li>Booking takes under a minute</li>
          <li>Private and secure</li>
          <li>Instant confirmation by SMS</li>
          <li>Reschedule anytime</li>
        </ul>
        <blockquote>"Good health is the foundation of a brighter tomorrow."<cite>— Dr. Deep Agarwal</cite></blockquote>
      </div>
      <div class="side-emerg">
        <div class="bang">!</div>
        <h4>Medical emergency?</h4>
        <p>If this is a life-threatening situation, call 108 immediately.</p>
        <a href="tel:108" class="call-108">Call 108 now</a>
      </div>
      <div class="today-card">
        <span class="today-label">TODAY AT THE CLINIC</span>
        <div class="today-stats">
          <span><b id="statFree">—</b><small>slots left</small></span>
          <span><b id="statBook">38s</b><small>to book</small></span>
          <span><b id="statMonth">—</b><small>booked in Sept</small></span>
        </div>
      </div>
    </aside>
  </div>

  <footer class="footer">
    <span>© 2026 __CLINIC__<br>Powered by an AI receptionist</span>
    <div class="signals">
      <span class="r">Not for emergencies — dial 108</span>
      <span class="g">Care today, healthier tomorrow</span>
    </div>
  </footer>
</div>

<script>
  window.__cvaTurnstileToken = null;
  window.onTurnstile = function(t) { window.__cvaTurnstileToken = t; if (window.__cvaOnToken) window.__cvaOnToken(t); };
  window.onTurnstileExpired = function() { window.__cvaTurnstileToken = null; if (window.__cvaOnToken) window.__cvaOnToken(null); };
</script>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<script type="module">
import Vapi from 'https://esm.sh/@vapi-ai/web@2';

let turnstileToken = window.__cvaTurnstileToken || null;
window.__cvaOnToken = (t) => { turnstileToken = t; refreshSubmit(); };
if (turnstileToken) setTimeout(() => refreshSubmit(), 0);

const talkBtn = document.getElementById('talk');
const statusEl = document.getElementById('callStatus');
let vapi = null, calling = false;

function showErr(prefix, e) {
  console.error(prefix, e);
  const friendly = prefix === 'Mic permission denied'
    ? 'Microphone is blocked — allow mic access, or use the form below.'
    : 'Voice booking is temporarily unavailable — please use the form below.';
  statusEl.innerHTML = '<span style="color:#C2352B">' + friendly + '</span>';
}

let voiceCallStartedAt = null;
async function checkForVoiceBooking() {
  if (!voiceCallStartedAt) return;
  // Subtract 90s to survive browser-vs-server clock skew — a booking made
  // during THIS call always falls after (voiceCallStartedAt - buffer).
  // Worst case we catch someone else's simultaneous voice booking (very rare
  // for a solo clinic; polling stops on first hit anyway).
  const started = new Date(new Date(voiceCallStartedAt).getTime() - 90_000).toISOString();
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const r = await fetch('/patient/recent-voice-booking?after=' + encodeURIComponent(started));
      if (r.status === 200) {
        const b = await r.json();
        showSuccess(b.patientName, b.humanSlot);
        statusEl.textContent = '✓ Booked — see confirmation below';
        voiceCallStartedAt = null;
        return;
      }
    } catch {}
  }
  // No booking found — leave the form as-is, caller may have hung up before finishing.
  statusEl.textContent = 'Call ended — no booking made';
}
function initVapi() {
  if (vapi) return vapi;
  try {
    vapi = new Vapi('__VAPI_PUBLIC_KEY__');
    vapi.on('call-start', () => {
      calling = true;
      voiceCallStartedAt = new Date().toISOString();
      talkBtn.classList.add('busy');
      talkBtn.innerHTML = '<span class="btn-dot"></span>End call';
      statusEl.textContent = 'Connected — speak now';
    });
    vapi.on('call-end',   () => {
      calling = false;
      talkBtn.classList.remove('busy');
      talkBtn.innerHTML = '<span class="btn-dot"></span>Start voice call';
      statusEl.textContent = 'Call ended — checking for booking…';
      checkForVoiceBooking();
    });
    vapi.on('error', (e) => showErr('Call error', e));
  } catch (e) { showErr('Voice SDK failed to load', e); }
  return vapi;
}
talkBtn.addEventListener('click', async () => {
  const v = initVapi();
  if (!v) return;
  if (calling) { v.stop(); return; }
  statusEl.textContent = 'Requesting mic + connecting…';
  try {
    if (navigator.mediaDevices?.getUserMedia) await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) { showErr('Mic permission denied', e); return; }
  try { await v.start('__VAPI_ASSISTANT_ID__'); }
  catch (e) { showErr('Could not start call', e); }
});

let selectedSlot = null;
const submitBtn = document.getElementById('submit');
const slotsEl = document.getElementById('slots');
const form = document.getElementById('form');
const resultEl = document.getElementById('result');
const emergencyBox = document.getElementById('emergencyBox');
const readyText = document.querySelector('.cta-meta .rs');

function refreshSubmit() {
  const ready = !!(selectedSlot && turnstileToken);
  if (readyText) readyText.textContent = ready ? 'Ready to confirm.' : (!selectedSlot ? 'Pick a slot in step 3 →' : 'Waiting for spam check…');
  submitBtn.style.opacity = ready ? '1' : '.6';
}

window.clearEmergency = () => {
  const urgentEl = document.querySelector('.pick.u-urgent input');
  urgentEl.checked = true;
  document.querySelectorAll('.urgency-row .pick').forEach(x => x.classList.remove('on'));
  urgentEl.closest('.pick').classList.add('on');
  emergencyBox.hidden = true;
  document.querySelectorAll('[data-hide-emergency]').forEach(el => el.hidden = false);
  loadSlots();
// Best-effort today-at-the-clinic stats (public counts, not personal data)
(async () => {
  try {
    const r = await fetch('/patient/stats').then(r => r.ok ? r.json() : null);
    if (!r) return;
    if (document.getElementById('statFree')) document.getElementById('statFree').textContent = r.freeToday ?? '—';
    if (document.getElementById('statMonth')) document.getElementById('statMonth').textContent = r.bookedMonth ?? '—';
  } catch {}
})();
};

document.querySelectorAll('.pick-row').forEach(row => {
  row.addEventListener('click', (e) => {
    const pick = e.target.closest('.pick');
    if (!pick) return;
    e.preventDefault();
    row.querySelectorAll('.pick').forEach(x => x.classList.remove('on'));
    pick.classList.add('on');
    const input = pick.querySelector('input');
    if (input) input.checked = true;
    if (pick.classList.contains('u-emergency')) {
      emergencyBox.hidden = false;
      document.querySelectorAll('[data-hide-emergency]').forEach(el => el.hidden = true);
      return;
    }
    emergencyBox.hidden = true;
    document.querySelectorAll('[data-hide-emergency]').forEach(el => el.hidden = false);
    setTimeout(loadSlots, 0);
  });
});

async function loadSlots() {
  const pref = form.preference.value;
  const urgency = form.urgency.value;
  slotsEl.innerHTML = '<div class="slot none">Loading available slots…</div>';
  selectedSlot = null;
  refreshSubmit();
  const url = '/patient/slots?count=6&preference=' + encodeURIComponent(pref) + '&urgency=' + encodeURIComponent(urgency);
  const r = await fetch(url);
  const slots = await r.json();
  if (!slots.length) { slotsEl.innerHTML = '<div class="slot none">No slots in this window — try a different time or urgency.</div>'; document.getElementById('slotHint').hidden = true; return; }
  const reservedCount = slots.filter(s => s.reserved).length;
  const firstSlot = slots[0];
  const firstDay = new Date(firstSlot.slotISO).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short'});
  const prefLabel = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', any: 'Any time' }[pref] || 'Any time';
  const sub = document.getElementById('slotSub');
  const hint = document.getElementById('slotHint');
  if (sub) sub.textContent = \`Available slots for \${firstDay} (\${prefLabel})\`;
  if (hint) {
    hint.hidden = false;
    if (urgency === 'routine') hint.textContent = 'Check-ups start 48 hours out';
    else if (urgency === 'urgent' && reservedCount > 0) hint.textContent = \`\${reservedCount} reserved for urgent\`;
    else hint.textContent = \`\${slots.length} slots left today\`;
  }
  slotsEl.innerHTML = slots.map(s => {
    const parts = s.human.split(', ');
    const day = parts[0] + (parts[1] ? ', ' + parts[1] : '');
    const time = parts[parts.length - 1];
    const cls = s.reserved ? 'slot has-reserved' : 'slot'; const badge = s.reserved ? '<span class="reserved">HELD FOR URGENT</span>' : ''; return \`<button type="button" class="\${cls}" data-iso="\${s.slotISO}" data-human="\${s.human}"><span class="check">✓</span><span class="day">\${day}</span><span class="time">\${time}</span>\${badge}</button>\`;
  }).join('');
  slotsEl.querySelectorAll('.slot').forEach(el => {
    el.addEventListener('click', () => {
      slotsEl.querySelectorAll('.slot').forEach(x => x.classList.remove('on'));
      el.classList.add('on');
      selectedSlot = el.dataset.iso;
      refreshSubmit();
    });
  });
}

function showSuccess(name, whenHuman) {
  document.getElementById('formFields').hidden = true;
  document.getElementById('success').hidden = false;
  document.getElementById('successWhen').textContent = whenHuman || '—';
  document.getElementById('successName').textContent = name || '—';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function flashSection(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const targets = el.querySelectorAll('.slot, .cf-turnstile') ;
  el.classList.add('attn');
  setTimeout(() => el.classList.remove('attn'), 900);
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedSlot) {
    flashSection(document.getElementById('slots'));
    resultEl.className = 'err';
    resultEl.textContent = 'Please pick a time slot first (step 3).';
    return;
  }
  if (!turnstileToken) {
    // Last-resort fallback — if the widget solved silently, read its token directly
    try { turnstileToken = window.turnstile?.getResponse?.() || window.__cvaTurnstileToken || null; } catch {}
  }
  if (!turnstileToken) {
    flashSection(document.querySelector('.cf-turnstile'));
    resultEl.className = 'err';
    resultEl.textContent = 'Please complete the "I\\'m not a robot" check.';
    return;
  }
  resultEl.className = ''; resultEl.textContent = 'Booking…';
  submitBtn.disabled = true;
  const pickedBtn = slotsEl.querySelector('.slot.on');
  const humanSlot = pickedBtn?.dataset.human || '';
  const name = form.name.value.trim();
  const body = {
    slotISO: selectedSlot,
    patientName: name,
    patientPhone: form.phone.value.replace(/\\D/g, ''),
    reason: form.reason.value.trim(),
    urgency: form.urgency.value,
    turnstileToken,
  };
  const r = await fetch('/patient/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json();
  if (data.ok) {
    showSuccess(name, humanSlot);
  } else {
    resultEl.className = 'err';
    resultEl.textContent = 'Could not book: ' + (data.error || 'try another slot');
    if (window.turnstile) turnstile.reset();
    turnstileToken = null;
    refreshSubmit();
  }
});

loadSlots();
</script>
</body></html>`;

// End-to-end QA probe — runs on cron. Books a synthetic slot in the future,
// verifies KV + Google Calendar, cleans up. Records result to logs so the
// dashboard shows a green/red "Last QA" tile.
async function runQAProbe(env) {
  const started = Date.now();
  // Use a slot far in the future to avoid colliding with real bookings.
  const slotISO = '2099-12-31T05:00:00.000Z';
  const step = { book: null, kv: null, gcal: null, cleanup: null };
  let error = null, gcalEventId = null;
  try {
    // Ensure prior probe cleaned up
    await env.BOOKINGS.delete('slot:' + slotISO);

    let t = Date.now();
    const b = await bookSlot(env, { slotISO, patientName: 'QA Bot', patientPhone: '0000000001', reason: 'automated QA probe' }, 'qa');
    step.book = { ok: b.ok, ms: Date.now() - t, error: b.error };
    if (!b.ok) throw new Error('book: ' + b.error);
    gcalEventId = b.booking?.gcalEventId || null;

    t = Date.now();
    // KV is eventually consistent — retry a couple of times before failing.
    let raw = null;
    for (let i = 0; i < 4 && !raw; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 500));
      raw = await env.BOOKINGS.get('slot:' + slotISO);
    }
    step.kv = { ok: !!raw, ms: Date.now() - t };
    if (!raw) throw new Error('kv verify failed (after retries)');

    if (gcalEventId) {
      t = Date.now();
      const ok = await gcalGet(env, gcalEventId);
      step.gcal = { ok, ms: Date.now() - t };
      if (!ok) throw new Error('gcal verify failed');
    } else {
      step.gcal = { ok: false, ms: 0, skipped: 'no gcalEventId (calendar not configured?)' };
    }
  } catch (e) {
    error = String(e);
  } finally {
    const t = Date.now();
    try { await deleteBooking(env, slotISO, 'qa'); step.cleanup = { ok: true, ms: Date.now() - t }; }
    catch (e) { step.cleanup = { ok: false, error: String(e), ms: Date.now() - t }; }
  }
  const ok = !error && step.book?.ok && step.kv?.ok && (step.gcal?.ok !== false || step.gcal?.skipped);
  await logEvent(env, 'qa.run', { ok, error, step, total_ms: Date.now() - started });
  return { ok, error, step };
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runQAProbe(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);

    // Public endpoints (no auth):
    if (url.pathname === '/health') return Response.json({ ok: true, clinic: CLINIC.name });
    if (url.pathname === '/vapi/tool' && request.method === 'POST') return handleTool(request, env);

    // Patient page — public. Serves at `/`, `/book`, `/patient` for shareable landing.
    if (url.pathname === '/' && !url.searchParams.has('token')) {
      // Bare root = patient page. `/?token=…` still opens the dashboard (backward compat).
    }
    if (url.pathname === '/book' || url.pathname === '/patient' || (url.pathname === '/' && !url.searchParams.has('token'))) {
      const html = PATIENT_HTML
        .replaceAll('__CLINIC__', CLINIC.name)
        .replaceAll('__VAPI_PUBLIC_KEY__', VAPI_PUBLIC_KEY)
        .replaceAll('__VAPI_ASSISTANT_ID__', VAPI_ASSISTANT_ID)
        .replaceAll('__TURNSTILE_SITEKEY__', TURNSTILE_SITEKEY);
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    // Printable QR page pointing at /book — public, safe.
    if (url.pathname === '/qr') {
      const bookUrl = `${url.origin}/book`;
      const html = QR_HTML
        .replaceAll('__CLINIC__', CLINIC.name)
        .replaceAll('__BOOK_URL_ENC__', encodeURIComponent(bookUrl))
        .replaceAll('__BOOK_URL__', bookUrl);
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    if (url.pathname === '/patient/stats') {
      // Public counters for the "TODAY AT THE CLINIC" widget — no PII.
      const now = new Date();
      const todayIST = now.toLocaleDateString('en-CA', { timeZone: CLINIC.timezone });
      const monthPrefix = todayIST.slice(0, 7);
      const keys = await listSlotKeysCached(env, new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString());
      let todayCount = 0, monthCount = 0;
      for (const k of keys) {
        const iso = k.name.slice(5);
        const dayIST = new Date(iso).toLocaleDateString('en-CA', { timeZone: CLINIC.timezone });
        if (dayIST === todayIST) todayCount++;
        if (dayIST.startsWith(monthPrefix)) monthCount++;
      }
      // Free slots today = slots in clinic hours from now to end of today - already booked today
      const endOfDayIST = new Date(todayIST + 'T20:00:00+05:30');
      let futureSlotsToday = 0;
      const step = new Date(now); step.setUTCSeconds(0, 0);
      step.setUTCMinutes(Math.ceil(step.getUTCMinutes() / CLINIC.slotMinutes) * CLINIC.slotMinutes);
      while (step < endOfDayIST) {
        const h = istHour(step);
        if (h >= CLINIC.hoursStart && h < CLINIC.hoursEnd) futureSlotsToday++;
        step.setUTCMinutes(step.getUTCMinutes() + CLINIC.slotMinutes);
      }
      return Response.json({ freeToday: Math.max(0, futureSlotsToday - todayCount), bookedMonth: monthCount });
    }
    // Public — patient page polls this after a voice call ends, to see if the
    // call resulted in a booking. Returns the most recent voice booking created
    // after `after` (an ISO timestamp), or 204 if none. Cheap read via cache.
    if (url.pathname === '/patient/recent-voice-booking') {
      const after = url.searchParams.get('after');
      if (!after) return new Response('after required', { status: 400 });
      const t = new Date(after).getTime();
      if (isNaN(t)) return new Response('bad after', { status: 400 });
      const bookings = await listBookings(env).catch(() => []);
      const hit = bookings
        .filter(b => b.source === 'voice' && b.bookedAt && new Date(b.bookedAt).getTime() >= t)
        .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))[0];
      if (!hit) return new Response(null, { status: 204 });
      return Response.json({
        patientName: hit.patientName,
        slotISO: hit.slotISO,
        humanSlot: humanSlot(new Date(hit.slotISO)),
      });
    }
    if (url.pathname === '/patient/slots') {
      const preference = url.searchParams.get('preference') || 'any';
      const urgency = url.searchParams.get('urgency') || 'normal';
      const count = Math.max(1, Math.min(Number(url.searchParams.get('count') || 6), 20));
      return Response.json(await nextSlots(env, count, preference, urgency));
    }
    if (url.pathname === '/patient/book' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const name = String(body.patientName || '').trim();
      const phone = String(body.patientPhone || '').replace(/\D/g, '');
      if (name.length < 2) return Response.json({ ok: false, error: 'Name too short' }, { status: 400 });
      if (!/^\d{10}$/.test(phone)) return Response.json({ ok: false, error: 'Phone must be 10 digits' }, { status: 400 });
      const tsOk = await verifyTurnstile(env, body.turnstileToken, request.headers.get('cf-connecting-ip'));
      if (!tsOk) return Response.json({ ok: false, error: 'CAPTCHA failed — please refresh and try again' }, { status: 403 });
      const rl = await checkRateLimit(request, env, phone);
      if (!rl.ok) return Response.json({ ok: false, error: rl.error }, { status: 429 });
      const r = await bookSlot(env, { slotISO: body.slotISO, patientName: name, patientPhone: phone, reason: String(body.reason || '').slice(0, 200), urgency: body.urgency }, 'web');
      return Response.json(r, { status: r.ok ? 200 : 409 });
    }

    // Dashboard — the page gates access via the token input, then calls /bookings etc.
    // with the token in a header. Also served at `/` when a token is present in the URL,
    // so old bookmarks like `/?token=...` still work.
    if (url.pathname === '/admin' || url.pathname === '/dashboard' || (url.pathname === '/' && url.searchParams.has('token'))) {
      const html = DASHBOARD_HTML.replaceAll('__CLINIC__', CLINIC.name);
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    // Data endpoints require auth
    if (!isAuthed(request, env)) return new Response('unauthorized', { status: 401 });

    if (url.pathname === '/bookings') return Response.json(await listBookings(env));
    if (url.pathname === '/bookings.csv') {
      return new Response(toCsv(await listBookings(env)), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    if (url.pathname === '/calendar.ics') {
      return new Response(toIcs(await listBookings(env), url.host), {
        headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'public, max-age=300' },
      });
    }
    if (url.pathname.startsWith('/bookings/') && request.method === 'DELETE') {
      const slotISO = decodeURIComponent(url.pathname.slice('/bookings/'.length));
      return Response.json(await deleteBooking(env, slotISO, 'staff'));
    }
    if (url.pathname === '/logs') {
      const limit = Math.max(1, Math.min(Number(url.searchParams.get('limit') || 100), 500));
      const kind = url.searchParams.get('kind') || null;
      return Response.json(await readLogs(env, limit, kind));
    }
    if (url.pathname === '/qa/run' && request.method === 'POST') {
      return Response.json(await runQAProbe(env));
    }
    if (url.pathname === '/calls') {
      return Response.json(await fetchVapiCalls(env));
    }
    if (url.pathname === '/callbacks') {
      return Response.json(await listCallbacks(env));
    }
    if (url.pathname.startsWith('/callbacks/') && request.method === 'DELETE') {
      const key = decodeURIComponent(url.pathname.slice('/callbacks/'.length));
      if (!key.startsWith('callback:')) return new Response('bad key', { status: 400 });
      await env.BOOKINGS.delete(key);
      return Response.json({ ok: true });
    }
    if (url.pathname.startsWith('/recordings/')) {
      const callId = url.pathname.slice('/recordings/'.length);
      return proxyRecording(env, callId);
    }
    return new Response('not found', { status: 404 });
  },
};
