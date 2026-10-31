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

## Verified facts you may use

- Pipeline: 6 sources → extract → 11 disqualification rules → score → AI assessment → Telegram.
- Latest canonical run (31 Oct 2026, 06:56 UTC): **63 items scanned, 3 opportunities,
  60 rejected, 5 duplicates collapsed**.
- AI: **3 of 3 survivors assessed**, ~20 seconds, model `nvidia/nemotron-3-ultra-550b-a55b`,
  structured JSON validated before publishing.
- Schedule: GitHub Actions cron `0 7 * * 1` UTC = **Monday 12:30 IST**.
- Delivery proven: Telegram message sent (message 5), run log committed to git.
- Live wall: `https://dheerajkumar1a1a.github.io/find-my-gym-prospects/`
- Repo: `github.com/dheerajkumar1a1a/find-my-gym-prospects` (public, includes a review doc
  listing known weaknesses).
- Rejection rules implemented: franchise branch, vendor/retailer, spa/clinic, institutional body,
  crime report, no event, outside Pune, duplicate, unidentifiable business.
  In the canonical run the top four were: **no event 25, not a business event 11, outside Pune 9,
  duplicate 5** — 60 rejections across 8 reasons. Use those counts, not the rule names.
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
  amber `#FFE14D`; muted grey `#6B6259`.
- Headings: **Bricolage Grotesque** ExtraBold, tight letter-spacing (−0.03em), 1 line of
  emphasis coloured red per slide. Body: Bricolage Grotesque regular.
- Numbers, labels, timestamps, code: **JetBrains Mono**, uppercase, letter-spaced 0.14em.
- Editorial layout, generous margins, one idea per slide, no bullet-point walls, no clip art,
  no icons except a small filled dot.
- Left-aligned. Big type. Maximum ~25 words of on-slide text per slide except the two table
  slides.

## The 11 slides — use this copy, do not rewrite it

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
Side stat: **73 gyms on one road · 0 signals about which to call first.** The data isn't the
problem. The judgment is.

**3 · What it does**
Kicker: `WHAT IT DOES`
Headline: Six sources in. Three cards out. **Sixty rejections, all explained.**
Five-step flow strip: `1 FETCH` → `2 EXTRACT` → `3 REJECT` → `4 ASSESS` → `5 DELIVER`
Sub: Rule-based on purpose — the pipeline can't die on a rate limit, and every rejection has a
reason I can point at.

**4 · Rules decide who survives**
Kicker: `THE JUDGMENT — PART 1`
Headline: The rules decide **who survives**.
Four rows with real counts from the canonical run: `25` no event · `11` not a business event
(crime, accident) · `9` outside Pune · `5` duplicate.
Footer: 60 rejections across 8 reasons. Every one recorded, none silently dropped.

**5 · The AI caught my mistake**
Kicker: `THE JUDGMENT — PART 2`
Headline: Then a model reads the survivors — and **caught my mistake**.
Card: **SportsSkill** · 13 Oct 2026 · revsportz.in · rules said STAGE A — call this week.
Quote: "SportsSkill launches its first physical high-performance centre in Pune."
AI block (mint border): *Buyer category: **adjacent**, not a gym. Verify before pitching.*
Body: Rules saw "fitness centre" and scored it a 5. The model read the same text and said this
is a sports-tech platform. It is additive — it cannot reject, re-score or re-rank, and if the
API dies the card is labelled "rules-only fallback" and the run still ships.

**6 · The hero slide**
Kicker: `THE HERO SLIDE`
Headline: **63 in. 3 out.** 60 thrown away with a reason.
Tally: **63** scanned · **3** opportunities · **60** rejected.
Body: Every lead tool shows you what it found. That's half the work. The other half is what it
refused — and why. A judge can audit my judgment in ten seconds. So can I, next Monday.

**7 · Delivery**
Kicker: `DELIVERY`
Headline: Monday, 12:30. **Nobody touches it.**
Rows: `07:00 UTC Monday` cron fires, no laptop · `+20s` sweep and assess · `Telegram` digest
with source, verdict, next action · `Wall + run log` committed to git, public.
Body: The message is the product. If it doesn't arrive on a phone, the automation isn't real.

**8 · What it changes for sales**
Kicker: `WHAT IT CHANGES FOR SALES`
Headline: The list stops being **everyone**.
Rows: `MON 12:30` the list lands — three cards, not a spreadsheet · `TUE` two calls, not
twenty, both opening with "you inaugurated on the 21st" · `WED` the objection is already on the
card: budget unknown, decision-maker unknown, existing agency unknown · `FRI` rejections feed
targeting — if everything is a franchise, my ICP is wrong, and the log says so.
Footer: A rep with three evidenced reasons to call beats a rep with three hundred names.

**9 · What I have not proven**
Kicker: `WHAT I HAVE NOT PROVEN`
Headline: Three claims. **Only two are earned.**
Three lines with ✓ ✓ ✗:
- ✓ The pipeline works. Five runs, delivered digests, committed logs.
- ✓ The AI step works. 3 of 3 survivors assessed, 20 seconds, validated output.
- ✗ The unattended cron has never fired. Every run so far was triggered by hand. First
  scheduled run is Monday 12:30 — after this talk.
Footer: And coverage is honest too: press only. The gyms I can actually sell to have no press
footprint.

**10 · Future scope**
Kicker: `FUTURE SCOPE`
Headline: Next: stop finding **launches**. Start finding **my buyer**.
Four numbered rows:
`01` Places proximity sweep — radius over Baner, Balewadi, Aundh, Wakad; review count as
"new", missing website as the digital gap.
`02` Persistence + delta — "new this week" instead of re-sending the same three gyms.
`03` CRM write-back — the signal becomes a deal, evidence attached.
`04` Outcome feedback — log what was called and what closed, so scoring stops being a rubric.

**11 · Close**
Kicker: `CLOSE`
Headline: Anyone can generate a list. The hard part is **earning the right to skip it**.
Footer: Gym Radar · Pune · weekly at 12:30 · `github.com/dheerajkumar1a1a/find-my-gym-prospects`

## Speaker notes

For each slide, write 40–70 words of spoken script matching this timing: 0:00 hook (15s) ·
0:15 problem (25s) · 0:40 what it does (30s) · 1:10 rules (25s) · 1:35 AI catch (30s) ·
2:05 hero (25s) · 2:30 delivery (25s) · 2:55 sales (30s) · 3:25 unproven (30s) ·
3:55 future (30s) · 4:25 close (35s).

## Output

Produce a **16:9 PPTX** with those 11 slides, speaker notes populated, the design system above
applied consistently, and no slide exceeding the on-slide text given here. If you cannot emit a
`.pptx` directly, output a complete `python-pptx` script that builds it, with colours, fonts,
sizes and notes hard-coded, ready to run as `python build_deck.py`.
