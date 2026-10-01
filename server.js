// Vapi tool webhook server for the clinic voice agent.
// Two tools: check_availability, book_appointment. Bookings live in bookings.json.
// Upgrade path: swap loadBookings/saveBookings for a Google Calendar client.
import express from 'express';
import fs from 'node:fs';

const app = express();
app.use(express.json());

let BOOKINGS_FILE = new URL('./bookings.json', import.meta.url);
const CLINIC = {
  name: process.env.CLINIC_NAME || "Dr. Sharma's clinic",
  hoursStart: Number(process.env.HOURS_START || 9),   // 9am
  hoursEnd: Number(process.env.HOURS_END || 20),      // 8pm
  slotMinutes: 30,
  timezone: 'Asia/Kolkata',
};

const loadBookings = () => {
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); } catch { return []; }
};
const saveBookings = (b) => fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(b, null, 2));

// ponytail: in-memory slot generator over next 7 days; swap for Google Calendar freebusy when a real clinic signs up.
function nextSlots(count = 5, now = new Date()) {
  const booked = new Set(loadBookings().map(b => b.slotISO));
  const slots = [];
  const cur = new Date(now);
  cur.setSeconds(0, 0);
  cur.setMinutes(Math.ceil(cur.getMinutes() / CLINIC.slotMinutes) * CLINIC.slotMinutes);
  const stopAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  while (slots.length < count && cur < stopAt) {
    const h = cur.getHours();
    if (h >= CLINIC.hoursStart && h < CLINIC.hoursEnd) {
      const iso = cur.toISOString();
      if (!booked.has(iso)) {
        slots.push({
          slotISO: iso,
          human: cur.toLocaleString('en-IN', {
            timeZone: CLINIC.timezone, weekday: 'short', day: 'numeric', month: 'short',
            hour: 'numeric', minute: '2-digit', hour12: true,
          }),
        });
      }
    }
    cur.setMinutes(cur.getMinutes() + CLINIC.slotMinutes);
  }
  return slots;
}

function bookSlot({ slotISO, patientName, patientPhone, reason }) {
  if (!slotISO || !patientName || !patientPhone) {
    return { ok: false, error: 'slotISO, patientName and patientPhone are required' };
  }
  const bookings = loadBookings();
  if (bookings.some(b => b.slotISO === slotISO)) return { ok: false, error: 'slot already taken' };
  const booking = { slotISO, patientName, patientPhone, reason: reason || '', bookedAt: new Date().toISOString() };
  bookings.push(booking);
  saveBookings(bookings);
  return { ok: true, booking };
}

// Vapi shape: { message: { toolCallList: [{ id, function: { name, arguments } }] } }
app.post('/vapi/tool', (req, res) => {
  const calls = req.body?.message?.toolCallList || req.body?.message?.toolCalls || [];
  const results = calls.map(call => {
    const name = call.function?.name;
    let args = call.function?.arguments ?? {};
    if (typeof args === 'string') { try { args = JSON.parse(args); } catch { args = {}; } }
    try {
      if (name === 'check_availability') {
        return { toolCallId: call.id, result: JSON.stringify({ slots: nextSlots(args.count || 3) }) };
      }
      if (name === 'book_appointment') {
        return { toolCallId: call.id, result: JSON.stringify(bookSlot(args)) };
      }
      return { toolCallId: call.id, result: JSON.stringify({ error: `unknown tool: ${name}` }) };
    } catch (e) {
      return { toolCallId: call.id, result: JSON.stringify({ error: e.message }) };
    }
  });
  res.json({ results });
});

app.get('/bookings', (_req, res) => res.json(loadBookings()));
app.get('/health', (_req, res) => res.json({ ok: true, clinic: CLINIC.name }));

// ponytail: single self-check instead of a test framework; upgrade to vitest when there are 3+ endpoints.
if (process.env.SELFCHECK) {
  BOOKINGS_FILE = new URL('./bookings.test.json', import.meta.url);
  try { fs.unlinkSync(BOOKINGS_FILE); } catch {}

  const slots = nextSlots(3, new Date('2026-09-04T10:00:00Z'));
  console.assert(slots.length === 3, 'want 3 slots');
  console.assert(slots.every(s => s.slotISO && s.human), 'slot shape');

  const first = bookSlot({ slotISO: slots[0].slotISO, patientName: 'Test', patientPhone: '9999999999' });
  console.assert(first.ok, 'first booking should succeed');
  const dup = bookSlot({ slotISO: slots[0].slotISO, patientName: 'Other', patientPhone: '8888888888' });
  console.assert(!dup.ok && dup.error === 'slot already taken', 'dup should fail');
  const bad = bookSlot({ slotISO: slots[1].slotISO });
  console.assert(!bad.ok, 'missing fields should fail');

  try { fs.unlinkSync(BOOKINGS_FILE); } catch {}
  console.log('selfcheck ok');
  process.exit(0);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`clinic voice agent tool server on http://localhost:${PORT}`));
