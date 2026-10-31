# Prompt for ChatGPT — build the PPTX

Copy everything between the lines into ChatGPT. It is self-contained: no repo access needed.
If you want a `.pptx` file rather than an outline, keep the last line — it asks for a
`python-pptx` script you can run locally.

---

You are building a 5-minute investor-style demo deck for a hackathon presentation.

## Context

The presenter runs **Gym Growth OS**, a business selling marketing systems to gyms in Pune,
India. He built **Gym Radar** in one session: a weekly automated radar that finds gyms showing
a dated, sourced business change (opening, expansion, hiring, funding, partnership), attaches
evidence, runs a bounded AI assessment, and delivers a digest to Telegram every Monday at
12:30 IST with no human involvement.

The room contains automation-track judges and a marketing audience. They have seen many
"AI lead-gen" demos. The differentiator is **evidentiary discipline**: the tool reports what it
rejected and why, labels its own uncertainty, and states what has not been proven.

## Hard constraints

1. **Never invent a number.** Use only the figures below. No market sizes, no ROI, no
   conversion rates, no revenue projections, no "3x pipeline".
2. **Never overstate.** The weekly cron has **not** been observed firing. Say so.
3. Coverage is **press only**. Do not imply it finds all gyms in Pune.
4. The AI step is **additive** — it annotates, it does not score, reject or re-rank.
5. Tone: plain, confident, slightly self-critical. No hype adjectives ("revolutionary",
   "game-changing", "seamless", "cutting-edge"). No emoji. No stock-photo metaphors.
6. **The deck must be self-contained.** No slide says "switch to the browser" — the phone
   message, the run log and the rejection breakdown are all rendered inside the deck.

## Verified facts you may use

- Pipeline: 6 sources → extract → 11 disqualification rules → score → AI assessment → Telegram.
- Latest canonical run (31 Oct 2026, 06:56 UTC): **63 items scanned, 3 opportunities,
  60 rejected, 5 duplicates collapsed**.
- AI: **3 of 3 survivors assessed**, ~20 seconds, model `nvidia/nemotron-3-ultra-550b-a55b`,
  structured JSON validated before publishing.
- Schedule: GitHub Actions cron `0 7 * * 1` UTC = **Monday 12:30 IST**.
- Delivery proven: Telegram message sent (message 5), run log committed to git, run
  `41178563159`.
- Live wall: `https://dheerajkumar1a1a.github.io/find-my-gym-prospects/`
- Repo: `github.com/dheerajkumar1a1a/find-my-gym-prospects` (public, includes a review doc
  listing known weaknesses).
- Rejection rules implemented: franchise branch, vendor/retailer, spa/clinic, institutional
  body, crime report, no event, outside Pune, duplicate, unidentifiable business.
  In the canonical run the actual distribution was:

  | Count | Reason |
  |---|---|
  | 25 | no event |
  | 11 | not a business event (crime, accident, fire) |
  | 9 | outside Pune |
  | 5 | duplicate |
  | 4 | not a fitness business |
  | 3 | could not identify the business |
  | 2 | institutional, not a private gym |
  | 1 | vendor, not a gym |

  Use those counts, not the rule names. A judge who scrolls the log will check them.
- Sources: Bing News RSS (links resolve to publisher), Google News RSS (fallback, links do not
  resolve), Punekar News, Pune Mirror.
- Verified dead/blocked keylessly: Sakal, eSakal, TOI Pune, HT Pune, GeM, mahatenders,
  Instagram, Facebook, Justdial, Google Maps.

### The three cards (real, from the canonical run)

| Gym | Locality | Event | Published | Rules said | AI said |
|---|---|---|---|---|---|
| Tungsten Fitness Club | Wanowrie | opening | 21 Oct 2026 | Stage C · premium launch | gym · event completed · confidence 4 |
| SportsSkill | Pune (locality not stated) | opening | 13 Oct 2026 | Stage A · call this week | **adjacent** · event completed · confidence 4 |
| STAMVIA | Pune (locality not stated) | opening | 18 Aug 2026 | Stage C · premium launch | gym · event completed · confidence 4 |

The **SportsSkill disagreement** is the emotional centre of the deck: the rules scored it a
perfect 5 and told him to call; the model read the same sentence and said it is a sports-tech
platform, not an independent gym. Use it verbatim.

## Design system

- Background cream `#FFF8E7`; ink `#14110F`; signal red `#E3262E`; mint `#7CF0C5`;
  amber `#FFE14D`; muted grey `#6B6259`; terminal navy `#0E1621` for the phone and log slides.
- Headings: **Bricolage Grotesque** ExtraBold, tight letter-spacing (−0.03em), 1 phrase of
  emphasis coloured red per slide. Body: Bricolage Grotesque regular.
- Numbers, labels, timestamps, code: **JetBrains Mono**, uppercase, letter-spaced 0.14em.
- Editorial layout, generous margins, one idea per slide, no bullet-point walls, no clip art,
  no icons except a small filled dot and ✓ / ✗ marks.
- Left-aligned. Big type. Maximum ~25 words of on-slide text per slide except the four data
  slides (4, 6, 8, 9).

## The 13 slides — use this copy, do not rewrite it

**1 · Hook**
Kicker: `GYM GROWTH OS · PUNE`
Headline: *I didn't build a lead tool. I built the thing that says* **don't call them.**
Sub: A weekly radar that finds gyms in Pune showing a dated, sourced business change — and
refuses to rank the ones I can't sell to yet.

**2 · Problem**
Kicker: `THE PROBLEM`
Headline: *Leads arrive* **late**. *Signals arrive* **early**.
Body: By the time a gym is in a database, it's a cold call. The week it opens a flagship, adds
a branch or hires trainers is the week it needs marketing — and nobody is watching.
Side: two pills — **73** gyms on one road · **0** signals about which to call first.
Footer: The data isn't the problem. The judgment is.

**3 · What it does**
Kicker: `WHAT IT DOES`
Headline: Six sources in. Three cards out. **Sixty rejections, all explained.**
Five-step flow strip: `1 FETCH` (Bing News · Google News · Punekar · Pune Mirror) →
`2 EXTRACT` (business name · locality · event) → `3 REJECT` (11 rules, reason recorded) →
`4 ASSESS` (AI on survivors only) → `5 DELIVER` (Telegram, Monday 12:30).
Sub: Rule-based on purpose — the pipeline can't die on a rate limit, and every rejection has a
reason I can point at.

**4 · Rules decide who survives**
Kicker: `THE JUDGMENT — PART 1`
Headline: The rules decide **who survives**.
Four rows, numbers in red mono, real counts: `25` No event · `11` Not a business event
(crime, accident — a police report is not a buying signal) · `9` Outside Pune · `5` Duplicate
(four outlets, one press release = one prospect).
Footer: 60 rejections across 8 reasons. **Every one recorded, none silently dropped.**

**5 · The AI caught my mistake**
Kicker: `THE JUDGMENT — PART 2`
Headline: Then a model reads them — and **caught my mistake**.
Card (white, red left rule): **SportsSkill** · `13 OCT 2026 · REVSPORTZ.IN` ·
`RULES SAID: STAGE A — CALL THIS WEEK`.
Quote: "SportsSkill launches its first physical high-performance centre in Pune."
AI block (mint border, mint label): `AI ASSESSMENT · NEMOTRON-3-ULTRA-550B` —
*Buyer category: **adjacent**, not a gym. Verify before pitching.*
Body: Rules saw "fitness centre" and scored it a 5. The model read the same text and said this
is a sports-tech platform, not an independent gym. It is additive — it cannot reject, re-score
or re-rank, and if the API dies the card is labelled "rules-only fallback" and the run still
ships.

**6 · The hero slide**
Kicker: `THE HERO SLIDE`
Headline: **63 in. 3 out.** 60 thrown away with a reason.
Tally: **63** scanned · **3** opportunities · **60** rejected.
Right side: eight horizontal red bars, one per rejection reason, lengths proportional
(25, 11, 9, 5, 4, 3, 2, 1), each with a mono label left-aligned to the bar's right edge and
the count at the end. Do not add a legend — the labels are the legend.
Footer: Every lead tool shows you what it found. That's half the work. A judge can audit my
judgment in ten seconds. So can I, next Monday.

**7 · Delivery**
Kicker: `DELIVERY`
Headline: Monday, 12:30. **Nobody touches it.**
Four rows: `07:00` UTC · Monday — cron fires, no laptop, no login, no browser open ·
`+20s` Sweep + assess — six sources, three AI calls, twenty seconds · `→` Telegram — digest
with source link, verdict, one next action · `→` Wall + run log — committed back to git,
public and auditable.

**8 · What lands on my phone**
Kicker: `WHAT LANDS ON MY PHONE`
Headline: The message **is** the product.
Body: If it doesn't arrive on a phone, the automation isn't real. Three cards. Each one carries
the date, the source, the AI verdict, one next action — and the one thing still unknown.
Right side: a dark navy phone mock (rounded 30px, subtle shadow, status bar `12:26 · Sat 31 Oct`),
Telegram-style chat header `GR` avatar + **Gym Radar** + `weekly sweep · bot`, one message
bubble containing — copy these lines exactly, they are the real digest:
`Gym Radar · weekly sweep` / `31 Oct 2026, 12:26 pm IST`
`63 items scanned · 3 opportunities · 60 rejected (5 duplicate)`
`AI: 3 assessed by nemotron-3-ultra-550b`
**1. Tungsten Fitness Club** · Wanowrie / Suniel Shetty inaugurates flagship Pune centre /
`opening · published 2026-10-21 · Stage C · premium launch` / `Offer: Founding-member launch funnel` /
`AI: relevant buyer · gym · event completed · confidence 4/5` /
`Next: contact their marketing lead this week — member acquisition at the new flagship` /
`Unknown: member capacity, existing marketing stack` / `Source: latestly.com`
**2. SportsSkill** · Pune (locality not stated) / `AI: relevant buyer · adjacent · confidence 4/5`
Fade the bottom edge of the screen so the cut reads as a scrolled chat, not a truncation. Do not
change the timestamp to a future Monday — this is the message that actually arrived.

**9 · The receipt**
Kicker: `THE RECEIPT`
Headline: Not a claim. **A log line.**
Left: a terminal panel, navy `#0E1621`, mono, with syntax colouring —
`# .github/workflows/daily.yml`
`on: schedule:`
`  # 07:00 UTC Mon = 12:30 IST`
`  - cron: '0 7 * * 1'` (amber)
`# job log, run 41178563159`
`AI_MODEL: nvidia/nemotron-3-ultra-550b-a55b`
`sweep 2026-10-31T06:56:10Z` (dim)
`scanned=63  opportunities=3  rejected=60` (mint)
`  duplicates=5  (16801ms)` (mint)
`telegram: sent (message 5)` (mint)
`[main e4217d6] chore: sweep 2026-10-31` (dim)
Do **not** add an `ai: ok 3/3` line — the workflow does not print one. Everything on this
slide must be a line that actually appears in the run log.
Right: The sweep is rule-based, so it finishes in seconds. The three model calls run in
parallel and take about twenty. And the run log commits itself back to git — so the wall always
shows the last **real** sweep, not a mock.

**10 · What it changes for sales**
Kicker: `WHAT IT CHANGES FOR SALES`
Headline: The list stops being **everyone**.
Rows: `MON` 12:30 — the list lands, three cards, not a spreadsheet · `TUE` two calls, not
twenty, both opening with "you inaugurated on the 21st" · `WED` the objection is already on the
card: budget unknown, decision-maker unknown, existing agency unknown · `FRI` rejections feed
targeting — if everything is a franchise, my ICP is wrong, and the log says so.
Footer: A rep with three evidenced reasons to call beats a rep with three hundred names.

**11 · What I have not proven**
Kicker: `WHAT I HAVE NOT PROVEN`
Headline: Three claims. **Only two are earned.**
Three lines, ✓ in mint, ✗ in red:
- ✓ The pipeline works. Four runs, all green. Three delivered digests, logs committed.
- ✓ The AI step works. 3 of 3 survivors assessed, 20 seconds, structured output validated
  before publishing.
- ✗ The unattended cron has never fired. Every run so far was triggered by hand. First
  scheduled run is Monday 12:30 — after this talk.
Footer: And coverage is honest too: press only. **The gyms I can actually sell to have no press
footprint.**

**12 · Future scope**
Kicker: `FUTURE SCOPE`
Headline: Next: stop finding **launches**. Start finding **my buyer**.
Four numbered rows:
`01` Places proximity sweep — radius over Baner, Balewadi, Aundh, Wakad; review count as
"new", missing website as the digital gap.
`02` Persistence + delta — "new this week" instead of re-sending the same three gyms.
`03` CRM write-back — the signal becomes a deal, evidence attached.
`04` Outcome feedback — log what was called and what closed, so scoring stops being a rubric.

**13 · Close**
Kicker: `CLOSE`
Headline: Anyone can generate a list. The hard part is **earning the right to skip it**.
Footer: Gym Radar · Pune · weekly at 12:30 · `github.com/dheerajkumar1a1a/find-my-gym-prospects`

## Speaker notes

For each slide, write spoken script matching this timing exactly: 0:00 hook (15s) · 0:15
problem (25s) · 0:40 what it does (30s) · 1:10 rules (25s) · 1:35 AI catch (30s) · 2:05 hero
(25s) · 2:30 delivery (20s) · 2:50 phone (25s) · 3:15 receipt (20s) · 3:35 sales (25s) · 4:00
unproven (30s) · 4:30 future (20s) · 4:50 close (10s). Total 5:00. Never let a note claim the
scheduled cron has fired.

## Output

Produce a **16:9 PPTX** with those 13 slides, speaker notes populated, the design system above
applied consistently, and no slide exceeding the on-slide text given here. The phone mock and
the terminal panel on slides 8 and 9 must be built from shapes and text boxes, not images. If
you cannot emit a `.pptx` directly, output a complete `python-pptx` script that builds it, with
colours, fonts, sizes and notes hard-coded, ready to run as `python build_deck.py`.
