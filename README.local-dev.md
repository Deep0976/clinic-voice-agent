# Clinic Voice Agent — MVP

The whole product surface is a phone number. Vapi runs the call; this repo is the tool webhook it calls to check availability and write bookings.

## Files

- `server.js` — Express server exposing `/vapi/tool` (webhook), `/bookings` (view), `/health`.
- `assistant.json` — Vapi assistant config. Paste into the Vapi dashboard.
- `bookings.json` — created on first booking. This is the "calendar" for the MVP.

## Run

```bash
cd ~/clinic-voice-agent
npm install
npm run selfcheck          # sanity-checks the tool logic, no server
npm start                  # http://localhost:3000
```

Quick tool test without Vapi:

```bash
curl -s localhost:3000/health
curl -s -X POST localhost:3000/vapi/tool -H 'content-type: application/json' \
  -d '{"message":{"toolCallList":[{"id":"t1","function":{"name":"check_availability","arguments":{"count":3}}}]}}'
```

## Wire it to Vapi (free tier)

1. Sign up at https://vapi.ai — free credits on signup.
2. In another terminal expose this server: `npx ngrok http 3000` → copy the `https://...ngrok...` URL.
3. In `assistant.json`, set `server.url` to `https://<your-ngrok>/vapi/tool`.
4. Vapi dashboard → Assistants → New → paste `assistant.json`.
5. Vapi dashboard → Phone Numbers → get a free test number → attach the assistant.
6. Call the number from your phone. Watch bookings land in `bookings.json`.

## Cost while testing

Zero to a few rupees. Vapi free credits cover ~50–100 test calls. Buying a live Indian number is separate and only needed once a real clinic pilots this.

## Upgrade path (deliberately skipped for now)

- Google Calendar in place of `bookings.json` — swap `loadBookings`/`saveBookings`.
- WhatsApp summary to clinic — add one call to Twilio in `bookSlot`.
- Auth on `/vapi/tool` — Vapi supports `serverUrlSecret`; add when you leave localhost.
- Real DB — when bookings exceed one clinic.
