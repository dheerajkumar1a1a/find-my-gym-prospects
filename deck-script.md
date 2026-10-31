# Gym Radar — 5 minute demo script

Open `deck.html`, press **F**. Arrow keys move. Click the right third to advance if the
clicker fails. Everything you need is inside the deck — **do not switch windows**. Total
spoken length ~670 words at a normal pace; the timings below have no slack.

---

## Before you walk up

- [ ] `deck.html` open and fullscreened — **`F`**, then arrow through it once
- [ ] Laptop volume off, notifications off, phone face-down
- [ ] Water. Breathe. You have one number to remember: **63 in, 3 out, 60 thrown away.**

---

## 0:00 — Slide 1 · The hook (15s)

> "I didn't build a lead tool. I built the thing that says *don't call them*.
>
> It's a weekly radar for gyms in Pune. It finds gyms that just showed a dated, sourced
> business change — and it refuses to rank the ones I can't sell to yet."

*Pause. Don't explain the tech yet.*

## 0:15 — Slide 2 · The problem (25s)

> "Leads arrive late. Signals arrive early.
>
> By the time a gym is in a database, it's a cold call. But the week it opens a flagship, adds
> a branch, or hires trainers — that's the week it actually needs marketing. And nobody is
> watching.
>
> There are 73 gyms on one road near me. I have zero signal about which one to call first. The
> data isn't the problem. The judgment is."

## 0:40 — Slide 3 · What it does (30s)

> "Six sources in. Three cards out. Sixty rejections, all explained.
>
> It fetches news, extracts the business and the locality, throws out anything that isn't a
> gym, and hands only the survivors to a model.
>
> It's rule-based on purpose. Two reasons: the pipeline can't die on a rate limit during a
> demo — or during my Monday — and every rejection has a reason I can point at."

## 1:10 — Slide 4 · Rules decide who survives (25s)

> "Eleven disqualification rules, and here's what they actually threw out on the last run.
>
> Twenty-five headlines described no event at all. Eleven were crime or accident reports — a
> police report is not a buying signal. Nine were outside Pune. Five were the same press
> release carried by four outlets, collapsed into one prospect.
>
> Sixty rejections, eight reasons, every one recorded. Nothing silently dropped."

## 1:35 — Slide 5 · The AI caught my mistake (30s)

> "Then a model reads them. And on the first real run, it caught a mistake my rules made.
>
> SportsSkill. My rules saw 'fitness centre' and scored it a five — call this week. The model
> read the same text and said: this is a sports-tech platform. Adjacent. Verify before you
> pitch.
>
> That's the difference between filtering and judgment.
>
> And it's additive by design — it can't reject, re-score or re-rank. If the API dies, the card
> says 'rules-only fallback' and the run still ships."

## 2:05 — Slide 6 · The hero (25s)

> "Here's the slide I'd show a judge first.
>
> Sixty-three items in. Three opportunities. Sixty thrown away — and this is the breakdown of
> why. No event, twenty-five. Not a business event, eleven. Outside Pune, nine. Duplicate,
> five.
>
> Every lead tool shows you what it found. That's half the work. The other half is what it
> refused. Anyone can audit my judgment in ten seconds. So can I, next Monday."

## 2:30 — Slide 7 · Delivery (20s)

> "Monday, 12:30. Nobody touches it.
>
> GitHub Actions fires at 07:00 UTC. Twenty seconds later the sweep is done, the digest is
> sent, and the run log commits itself back to the repo."

## 2:50 — Slide 8 · What lands on my phone (25s)

> "This is the message. Three cards, not a spreadsheet.
>
> Each one carries the date, the source, the AI's verdict, one next action — and the one thing
> still unknown, which here is member capacity and whether they already have a marketing stack.
>
> The message is the product. If it doesn't arrive on a phone, the automation isn't real."

## 3:15 — Slide 9 · The receipt (20s)

> "And this is why you should believe that.
>
> Top half is the config: one line, `cron: '0 7 star star 1'` — Monday, 07:00 UTC. Bottom half
> is the job log from the last run: sixty-three scanned, three opportunities, sixty rejected,
> sixteen seconds, and `telegram: sent`, message five.
>
> Not a claim. A log line."

## 3:35 — Slide 10 · What it changes for sales (25s)

> "So what does a rep do differently?
>
> Monday the list lands — three cards. Tuesday, two calls instead of twenty, and both open with
> 'you inaugurated on the 21st' instead of 'do you need marketing'. Wednesday, the objection is
> already on the card: budget unknown, decision-maker unknown, existing agency unknown.
>
> And by Friday the rejections feed targeting. If everything I find is a franchise, my ICP is
> wrong — and the log tells me that."

## 4:00 — Slide 11 · What I have not proven (30s)

*Slow down. This is the credibility slide.*

> "Three claims. Only two are earned.
>
> The pipeline works — four runs, all green, three delivered digests. The AI step works — three
> of three assessed, twenty seconds, validated output.
>
> The third one: the unattended cron has never fired. Every run so far, I triggered by hand.
> The first scheduled one is Monday 12:30 — after this talk.
>
> And coverage is honest too: press only. The gyms I can actually sell to have no press
> footprint. That's the next build, not a nice-to-have."

## 4:30 — Slide 12 · Future scope (20s)

> "Next, in order. One: a Places proximity sweep over Baner, Balewadi, Aundh, Wakad — review
> count as a proxy for 'new', no website as the digital gap.
>
> Two: persistence, so Monday says 'new this week'. Three: CRM write-back with the evidence
> attached. Four: log what was called and what closed — then the scoring stops being a rubric."

## 4:50 — Slide 13 · Close (10s)

> "Anyone can generate a list. The hard part is earning the right to skip it.
>
> Repo and wall are public — including a document listing every weakness I know about.
> Thank you."

---

## If you get asked

**"Isn't this just an RSS reader with a filter?"**
> "The filter is the product. It rejects a duplicate and a crime report and tells you it did.
> An RSS reader can't tell you why it's safe to ignore something."

**"Why only three results?"**
> "Because press coverage only finds premium launches, and my ICP doesn't get press. Three is
> the honest number for this connector. The next connector is proximity, not more queries."

**"What if the AI is wrong?"**
> "It's additive — it can't remove a card or change a score. It adds a verdict and an
> uncertainty list. When it disagreed with my rules on SportsSkill, the disagreement was the
> useful part."

**"Is the cron actually running?"**
> "Not yet observed. Every run so far was triggered by hand; first scheduled one is Monday
> 12:30. I'd rather tell you that than let you find it in the Actions tab."

**"How much does it cost to run?"**
> "Free tier on both: GitHub Actions minutes and an NVIDIA NIM key. Three model calls a week."

**"Can it work for other niches?"**
> "The rules are niche-specific — franchise list, localities, fitness vocabulary. The shape is
> generic. Swapping the vocabulary and the offer map is the whole port."

**"Show me the code."**
> "Two files. `lib/radar.js` is the rules and the scoring — about twenty-five lines of regex for
> the eleven disqualifications. `lib/ai.js` is the model call and a validator that throws away
> any response missing a required field. Happy to walk you through either."

---

## Do not say

- ❌ "It runs every day at 7am" — it's **weekly, Monday 12:30 IST**.
- ❌ "It finds all the gyms in Pune" — it finds **press-visible fitness openings**.
- ❌ "The AI scores the leads" — it **annotates** them; the rules score.
- ❌ "Stage C means don't contact" — say **"qualification pending"**; the label is a heuristic
  from press adjectives, not a fact about their budget.
- ❌ "The cron is running every Monday" — it has **never fired on schedule yet**. Say it once,
  on slide 11, and don't contradict yourself earlier.
- ❌ Any conversion or revenue number. You don't have one yet, and inventing it is the only
  thing in this deck that could sink you.

---

## Timing discipline

If you're running long, cut in this order:
1. Slide 12 (future) — name the Places sweep only, drop 02–04.
2. Slide 4 (rules) — compress to one sentence: "eleven rules, and here's the breakdown."
3. Slide 9 (receipt) — read only `telegram: sent (message 5)` and move on.
4. Never cut slide 6 or slide 11. The rejection breakdown and the unproven claim **are** the
   talk.
