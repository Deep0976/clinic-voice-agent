# First real-user test — protocol

Run this once with 5 people this weekend. Two hours total. Everything else on this project is theatre until this is done.

## Goal

Find out **whether a real person, with no context and no coaching, can successfully book an appointment using the QR code alone.**

That's the only question. Not "do they like it." Not "would they pay." Not "do they think AI is cool." Whether the actual mechanism works when nobody's holding their hand.

## Recruit

Five people. Pick from this order — stop when you have five:

| Priority | Who | Why |
|---|---|---|
| 1 | A parent, aunt, uncle over 45 | The actual persona. Test this first, everything else is bonus. |
| 2 | A domestic helper, driver, or building watchman | Real language variance, real trust-in-AI variance. If it works for them it works for anyone. |
| 3 | A friend's parent you have never met | Cold recruit — closest to "real patient." Ask your friend to introduce. |
| 4 | A friend who lives alone and manages their own appointments | Sanity check. Should always succeed. |
| 5 | Anyone who has said "I don't trust AI" | The skeptic. Will surface objections nobody else raises. |

**Do NOT recruit** anyone who works in tech, has seen the code, or already knows what this is. The value dies the moment they know.

## What to bring

- Your phone with **the QR code on screen** (or printed on paper)
- A notepad and a pen. Not a laptop. Not a phone with notes app open.
- The dashboard URL open on your OWN device, hidden — so you can verify bookings landed after they leave
- No slides, no explanation, no pitch

## The 20-minute session

### 1. Frame it (30 seconds — no more)

> "I'm building an appointment-booking tool for a clinic. I want you to try booking an appointment. There's no right or wrong. Talk out loud as you use it — say what you're seeing and what you're thinking. I'll stay quiet."

Don't say "AI." Don't say "voice agent." Don't say "this uses GPT." Let them discover.

### 2. Hand them the QR code (silent — this is the test)

Say only: *"Here's the QR code. Please book an appointment for [pick a day this week]."*

Then **shut up**. Every word you say from here on is contamination.

**Watch:**
- Do they scan the QR without asking how?
- What's their first reaction when the page loads?
- Do they click "Start call" or scroll to the form?
- Where do they hesitate?
- What do they read out loud vs. skip?

### 3. Silent observation (10 minutes)

Note **only what actually happens** in this shape:

```
[time]  what they did          what they said        what surprised me
0:15    scanned QR              "oh it's like a menu"  didn't say "AI"
0:40    tapped Start call       "🎤 what's that?"      hesitated 8 sec
1:20    hung up mid-greeting    "who's talking?"       real trust issue
```

Do not help. Do not explain. If they get stuck for 90 seconds, note it and move on to the next part of the flow.

**If they give up completely**, that IS the result. Note where and why.

### 4. Debrief (5 minutes — the extraction)

Ask **only these questions**, in this order. Do NOT ask "did you like it" — worthless data.

1. *"Walk me through what you thought was happening at each step."* — reveals mental model
2. *"What did you expect that didn't happen?"* — reveals gaps
3. *"If you had to describe this to a friend who has a doctor's appointment problem, what would you say?"* — reveals value proposition in THEIR words, which is the copy for the /book page
4. *"What would you have done if I wasn't sitting here?"* — reveals abandonment risk
5. *"Is there anything you want to ask me now?"* — lets them close, gives you their real questions

Write down their answers in **their exact phrasing.** Do not paraphrase into your marketing-speak. "Poori confusing thi" is data. "Suboptimal UX" is your voice, not theirs.

### 5. Verify (after they leave)

Open the dashboard. Did the booking land? Did the phone number make it in correctly? What was in the transcript?

## What "success" means for this test

Per user, mark one of:

- **A. Booked without help** — end-to-end, no coaching, correct data landed
- **B. Booked with a nudge** — you had to break silence exactly once. Note where.
- **C. Started but abandoned** — got in, gave up. Note where and why.
- **D. Never started** — didn't scan, didn't try, walked away
- **E. Emergency-adjacent** — used booking for something it shouldn't be used for

**Target for a "ship" signal: 3 of 5 in A or B.**
**Actual signal you care about: which failure mode dominates the other 2-3.**

Do not celebrate 3/5 booked and ignore the 2/5 who abandoned. That's how founders miss the actual product.

## After all 5 sessions — the extraction (1 hour)

Sit alone with your notes. Do **not** open the code editor. Do these three things in order:

### 1. Failure modes → new eval cases

For every failure mode you saw (mispronounced phone, hung up on greeting, thought "start call" was a game, gave nickname for name, whatever), **add it as a case in `evals/cases.jsonl`.**

The rule: **if a real user broke it, the eval catches it forever.** Your case count grows from 20 to 25-ish.

### 2. Product changes → prioritize

List every change the sessions suggest. For each, mark:
- **Fix now** (a prompt line, a UI copy tweak, a validation) — usually 3-5 of these
- **Fix later** (a feature or flow change) — usually 2-3
- **Deliberately skip** (a change one person wanted that violates the design) — usually 1-2

The "skip" list is as valuable as the "fix" list. It shows you have a spine.

### 3. Value proposition → rewrite the /book page copy

Look at the answers to Question 3. Steal the best sentence, verbatim. That becomes the new headline on `/book`. If no sentence is good, the value prop is still confused — that's the finding, not the copy.

## Failure modes of the protocol itself (things you'll be tempted to do — don't)

- **Explaining after they get stuck.** You've now taught them. All future data is contaminated.
- **Asking "would you use this?"** People say yes to be polite. Meaningless.
- **Testing with the same person twice.** They know it now. Second run is theatre.
- **Doing 3 sessions and calling it done.** Three is a shape, not a signal. Do all five.
- **Skipping the debrief because the session went well.** The debrief is where the actual product insight lives — the session itself is just the setup.

## Time budget

| Step | Time |
|---|---|
| Recruit (WhatsApp / calls) | 30 min |
| 5 sessions × 20 min | 100 min |
| Extraction and eval-case additions | 60 min |
| **Total** | **~3.5 hours over a weekend** |

This is the highest-leverage 3.5 hours you will spend on this project. Nothing you build after user testing is as valuable as the testing itself.

## Deliverable at the end

A single file: `evals/user-test-1.md`, structured as:

```
# User test 1 — <date>

## Participants
1. [Age, relation, tech-comfort level, language]
2. ...

## Outcomes
| # | A/B/C/D/E | key failure or win |
|---|---|---|
| 1 | B | Hung up on Vapi greeting; thought "no one is there" |
| ... | | |

## Top 3 findings (in the users' own words)
1. "..."
2. "..."
3. "..."

## New eval cases added
- user-01: [id and turns]
- user-02: ...

## Prompt / UI changes shipped from this test
- ...

## Deliberate skips (things one user wanted that we won't build)
- ...
```

**That file is the artifact.** More valuable for the writeup than everything the codebase does.
