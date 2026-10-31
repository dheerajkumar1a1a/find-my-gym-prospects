# Gym Radar — context for external review

**Date:** 31 Oct 2026
**Built in:** one session, ~60 minutes of build time
**Repo:** https://github.com/dheerajkumar1a1a/find-my-gym-prospects (public)
**Live wall:** https://dheerajkumar1a1a.github.io/find-my-gym-prospects/
**Local path:** `Documents/Find_my_gym_prospects`

This document is a complete handover. It states what exists, what was measured, what was
decided and why, and — most importantly — where the thing is weak. Claims are separated from
inferences. Anything not verified is marked as unverified.

---

## 1. What this is

A daily radar that finds gyms in Pune showing a **dated, sourced business change** (opening,
expansion, hiring, funding, partnership), attaches the evidence, maps it to one of the seller's
services, and pushes a digest to Telegram at 07:00 IST with no human involvement.

It has two jobs at once:

1. **A real tool** for the owner's business, "Gym Growth OS" (marketing systems for gyms).
2. **A demo** for the FlytBase Marketing Build Session automation track, same day it was built.

The demo spine is: *cron fires → phone buzzes → wall opens → evidence holds → rejection log
proves it throws things away*. The hero beat is not a card, it is the log of what was rejected.

**The seller's ICP:** independent gyms and small local chains in Pune, West Pune first
(Baner, Balewadi, Aundh, Wakad, Hinjawadi). Stage A = no case study, no template library yet.
Stage C = premium operators who are the right trigger but the wrong time.

**Non-negotiable constraint from the owner:** no fabricated gyms, dates, links, intent or scores.
Evidence and inference must stay in separate fields. Rejections must be visible, not hidden.

---

## 2. Architecture

```
sources ──► extract ──► resolve ──► disqualify ──► score ──► opportunity
                                                       │
                                                 run log (JSON)
                                                       │
                                    ┌──────────────────┴──────────────────┐
                              wall (static HTML)                  Telegram digest
```

Two runtimes share one pipeline:

- **GitHub Actions** (`sweep.mjs`) — the real one. Cron `30 1 * * *` UTC = 07:00 IST. Writes
  `runs/latest.json`, `runs/YYYY-MM-DD.json`, `runs/index.json`, sends Telegram, commits the
  run log back to `main`, which triggers a Pages rebuild.
- **Local / Vercel** (`serve.mjs`, `api/*.js`) — the same pipeline behind HTTP, for development.

The wall reads `/api/radar` if it answers, otherwise falls back to `./runs/latest.json`. One
HTML file works on Pages, on Vercel and on localhost. In static mode it disables the "Run
sweep" button and shows "Scheduled 07:00 IST" instead, because pretending a static page can
trigger a sweep would be a lie.

### File map

| File | Bytes | Role |
|---|---|---|
| `lib/radar.js` | 24982 | the entire pipeline: connectors, extraction, dedupe, disqualification, scoring, offer mapping, `toTelegram()` |
| `lib/telegram.js` | 1200 | `sendTelegram()`, `telegramConfigured()` |
| `index.html` | 14061 | the wall: coverage strip, tally, two views, cards, rejection log |
| `sweep.mjs` | 2349 | CLI runner for CI: writes run logs, sends digest |
| `serve.mjs` | 2212 | local HTTP server, no Vercel login needed |
| `api/radar.js`, `api/run.js`, `api/sweep.js`, `api/ok.js` | ~3.2k | Vercel-style handlers (currently **not deployed**) |
| `.github/workflows/daily.yml` | 982 | cron, secret wiring, run-log commit step |
| `scripts/set-secret.mjs` | 1662 | sets Actions secrets without the `gh` CLI |
| `test.mjs` | 941 | smoke test: prints coverage, counts, opportunities |
| `vercel.json` | 92 | **stale** — declares a Vercel cron that is not used (see §9) |

No dependencies at runtime. `tweetsodium` was installed `--no-save` only to set secrets once.

---

## 3. The pipeline, exactly

### 3.1 Sources (all keyless, all RSS)

| Source | Queries | Items/query | Link resolves? |
|---|---|---|---|
| Bing News RSS | 7 | 12 | **yes** — `apiclick.aspx` redirect unwrapped to the publisher |
| Google News RSS | 7 | 12 | **no** — JS wrapper URLs, never resolve |
| Punekar News RSS | 1 feed | 40 | yes |
| Pune Mirror RSS | 1 feed | 40 | yes |

Seven queries: `gym opening Pune`, `new gym Pune`, `fitness studio launch Pune`,
`gym launched Pune`, `fitness centre opening Pune`, `gym expansion new branch Pune`,
`crossfit studio Pune launch`.

Every fetch is wrapped in a `job()` that catches errors and returns `status: 'error'` with zero
items. `Promise.allSettled` means one dead source never kills a run. Coverage is aggregated per
source and rendered on the wall, including failures — a red dot is a feature.

### 3.2 Disqualification order (first match wins, reason recorded)

1. `NOISE` — crime, accident, arrest, fire, death. Reason: *not a business event*.
2. `classifyEvent(title) === 'other'` — no opening/expansion/hiring/funding/partnership verb.
   Reason: *no event*.
3. `!FITNESS.test(title + desc)` — no gym/fitness vocabulary. Reason: *not a fitness business*.
4. `VENDOR` — `store|showroom|retail|e-commerce|marketplace|distributor|dealership`. Reason:
   *vendor, not a gym*.
5. `CLINIC` — `spa|salon|clinic|physiotherap|ayurved|diagnostic|nutritio`. Reason: *not a gym*.
6. `INSTITUTIONS` — municipal, police, army, school, college, hospital, sports authority,
   stadium, government. Reason: *institutional, not a private gym*.
7. `FRANCHISES` matched in the headline — Anytime Fitness, Gold's, Cult, F45, etc. Reason:
   *franchise branch* — the brand buys the software, not the Wakad branch.
8. Name extraction returns null. Reason: *could not identify the business*.
9. No Pune reference and no known locality. Reason: *outside Pune*.
10. Published before the window (`SCOPE.windowDays = 365`). Reason: *too old*.
11. Duplicate: normalised gym name equal, **or** Jaccard similarity of headline word-sets
    ≥ 0.55. Reason: *duplicate*, and the survivor gains an `also_reported_by` entry.

Everything above lands in `rejected[]` with `{name, reason, detail, source, url}`. Nothing is
silently dropped.

### 3.3 Extraction

Headlines are Title Case, so "find the capitalised run" is useless — the whole headline is
capitalised. `extractGymName()` instead:

1. Strips wire prefixes (`Business News | `, `ANI | `, …).
2. Strips a trailing ` - Publisher Name` when the tail is ≤ 6 words and contains no fitness
   vocabulary.
3. Removes a leading `Person Name Verb` (`Suniel Shetty Inaugurates …`) — case-sensitive, so an
   all-caps brand like `STAMVIA` survives.
4. Takes the first token that is not in `GENERIC`, `VERBS`, `STOP` or `LOCALITIES`, and walks
   forward until one of those appears, capping at 5 tokens.
5. Rejects the result if it is a generic name (`fitness`, `gym`, `health club`, …) or a bare
   acronym under 4 letters.

`extractLocality()` matches ~60 Pune localities plus `Pune` itself against title + description.

### 3.4 Scoring

Three axes, 1–5 each. Deliberately small and inspectable.

```
evidence  = 1 + (resolvable ? 2 : 0) + (has_date ? 1 : 0) + (has_locality ? 1 : 0)   cap 5
timing    = ≤30d:5 · ≤90d:4 · ≤180d:3 · ≤365d:2 · older:1 · no date:2
relevance = opening:5 · expansion:5 · funding:4 · hiring:3 · partnership:3 · other:2

act_now        = timing*3 + relevance*2 + evidence
best_evidence  = evidence*3 + relevance*2 + timing
```

Two views, two rankings. "Act now" is urgency-weighted, "best evidenced" is proof-weighted.
One opportunity per (gym, primary event) — a gym opening *and* hiring is one card.

**Structural consequence worth noticing:** a Google News item can never score above 3 on
evidence, because its link does not resolve. That is intentional — an unresolvable source is
weaker evidence — but it means the "best evidenced" view is effectively a Bing-only view.

### 3.5 Stage fit

```
PREMIUM_CUE = flagship | inaugurat | celebrity | bollywood | actor | suniel
            | 24-hour | 24x7 | 24/7 | luxury | premium | signature studio | grand opening
```

- Match → **Stage C**, label `Stage C · premium launch`, note: *"Right trigger, wrong time for
  you. No case study yet, so this is a park-and-revisit, not a call this week."*
- Otherwise → **Stage A**, label `Stage A · fits your current stage`, note: *"No premium cue in
  the coverage. Verify size and decision-maker before pitching."*

There is **no Stage B** in the code. See §9.

### 3.6 Offer mapping

| Event | Offer | Service | Next action |
|---|---|---|---|
| opening | Founding-member launch funnel | Digital Launch System | Audit pre-launch enquiry path, pitch a launch page with trial booking |
| expansion | Branch pages and lead routing | Digital Launch System + Lead Conversion | Check whether the new branch exists on their site yet |
| hiring | Lead tracking and conversion audit | Lead Conversion System | Ask what happens to an enquiry after the first call |
| funding | Growth campaign and attribution | AI-enabled Marketing | Ask which channel they plan to scale first |
| partnership | Corporate enquiry workflow | Lead Conversion System | Ask how corporate enquiries are handled today |

Every card also carries a fixed `unknowns[]`: whether they have budget, who decides, whether
they already have an agency. Those are printed on the card, not hidden in a footnote.

### 3.7 Output

`runRadar()` returns a run log with `run_id`, `at`, `scope`, `window_days`, `counts`,
`sources[]` (per-source ok/failed/items/errors), `opportunities[]` (ranked), `views{}` (id
lists for both rankings), and `rejected[]`.

---

## 4. Measured evidence

Three real runs, all on 31 Oct 2026. Counts move between runs because RSS feeds shift by the
minute — that is a fact about the sources, not a bug.

| Run | Scanned | Opportunities | Rejected | Duplicates |
|---|---|---|---|---|
| local, 06:13 UTC | 72 | 3 | 69 | 5 |
| GitHub Actions, 06:27 UTC | 56 | 3 | 53 | 3 |
| local, earlier | 73 | 3 | 70 | 4 |

The three opportunities are stable across runs:

| Gym | Locality | Event | Date | Stage | Source | Resolves |
|---|---|---|---|---|---|---|
| Tungsten Fitness Club | Wanowrie | opening | 21 Oct 2026 | C | latestly.com | yes |
| SportsSkill | Pune (locality not stated) | opening | 13 Oct 2026 | A | revsportz.in | yes |
| STAMVIA | Pune (locality not stated) | opening | 18 Aug 2026 | C | Google News | **no** |

Tungsten's headline: *"Suniel Shetty Inaugurates Tungsten Fitness Club Flagship Pune Centre in
Wanowrie"* — a celebrity-inaugurated flagship, correctly flagged Stage C, i.e. the tool's
advice is *do not call this week*. That is the demo's twist: a lead tool that says don't.

Rejection reasons observed in practice: duplicate, franchise branch, vendor, spa/clinic,
institutional, crime report, no event, not a fitness business, could not identify the business.

### Infrastructure, verified

- Repo created via API (no `gh` CLI on this machine; `winget` install failed with exit 1602,
  needs admin).
- GitHub Pages enabled, live, serving `runs/latest.json` (HTTP 200, 36 KB).
- Actions run `41176688395` — **completed / success**, all steps green.
- Job log contains `telegram: sent (message 3)` — delivery proven, not assumed.
- Both secrets present on the repo: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
- Local working tree rebased cleanly after the bot's commit.

### Sources verified dead or blocked (keyless, 31 Oct 2026)

Sakal (502), eSakal (404), TOI Pune RSS (0 items), HT Pune RSS (0 items), GeM (JS shell + 403),
mahatenders (session-gated), Instagram (login wall), Facebook (400), Justdial (empty body),
Google Maps (JS only, needs paid API). `api.telegram.org` reachable; `web.telegram.org` blocked
by corporate Sophos ("Chat" category) — the bot had to be created on a phone.

---

## 5. Decisions and reasons

| Decision | Reason |
|---|---|
| Rule-based extraction, no model call | A demo cannot die on a rate limit. Deterministic output is also auditable — you can point at the regex that rejected something. |
| Bing News primary, Google News fallback | Bing returns fewer items but the links resolve to the publisher. A judge clicking "source" must land on the article. |
| Franchise branches rejected outright | The brand decides software centrally; a Wakad branch manager cannot buy a website. This is a qualification rule, not a data-quality rule. |
| Dedupe on brand + locality | Four outlets carrying one press release is one prospect, not four. |
| Rejections are first-class output | A tool that only shows what it found hides half its work. The rejection log is also the honest answer to "why only three?". |
| Digital gap is a gap, never a signal | "No website" is a fact about them, not an event that happened. It qualifies a gym; it cannot trigger an opportunity. |
| Two views (Act now / Best evidenced) | Urgency and proof are different questions and the owner asks both. |
| Stage as a label, no rupees on cards | Deal size would be invented. The stage label is derived from press language and says so. |
| New repo, not a fork | `find-my-buyers` stays untouched. |
| Telegram, not email | The owner already lives in Telegram; the phone buzz *is* the automation proof. |
| GitHub Actions, not Vercel cron | No Vercel account/login needed, secrets are free, and the run log can be committed back so Pages always shows the last real sweep. |

---

## 6. What is genuinely good

1. **The rejection log.** Every rejected item carries a human-readable reason and the source.
   Nothing is dropped silently. This is the part most lead-gen tools refuse to show.
2. **Evidence discipline.** Every card has a URL, a publisher hostname, a publication date, and
   an explicit `source_resolvable` flag. The wall prints "link not directly resolvable" rather
   than hiding a dead link.
3. **Honest failure.** A source that fails on the GitHub runner appears as a red dot with
   "0 items · 1 failed". The tool reports its own blindness.
4. **The stage label argues against the sale.** Stage C tells the owner not to call. That is
   rare and it is the most defensible thing in the build.
5. **`unknowns[]` on every card.** Three things the tool does not know, printed on the artefact.
6. **One file, three runtimes.** The same `index.html` works on Pages, Vercel and localhost with
   no build step and no framework.
7. **No dependencies at runtime.** Nothing to rot, nothing to audit.

---

## 7. Where it is weak — read this part

**7.1 Coverage does not reach the ICP.** Press coverage finds *premium launches* — celebrity
inaugurations, flagship stores. The stated ICP is independent gyms in Baner/Wakad/Aundh, and
those have no press footprint. So the tool currently finds the gyms the owner **cannot sell to
yet** (Stage C) and misses the ones he can. This is the single biggest gap and it is stated on
the wall itself.

**7.2 Stage is binary.** `readStage()` returns A or C only. The vocabulary in the design
conversation had A/B/C. There is no Stage B, so "mid-market chain" has nowhere to land, and any
headline containing "premium" or "flagship" is Stage C regardless of actual size.

**7.3 Rejection display truncates but the tally does not.** `runRadar()` returns
`rejected: rejected.slice(0, 40)` while `counts.rejected` is the full count. The wall prints
"53 items rejected across N reasons" but the rows are built from only 40 entries, so the group
counts do not sum to 53. This is a visible honesty bug in the very section that claims honesty.

**7.4 Dedupe ignores locality.** The dedupe key is `norm(gym)` alone (or headline Jaccard ≥
0.55), while the opportunity `id` includes locality. Two genuinely different gyms sharing a name
in different suburbs would merge, and the survivor keeps the wrong locality.

**7.5 Entity resolution is headline-shaped.** It works because press headlines are formulaic.
It will fail on any headline that does not lead with the brand: "Pune's newest 24-hour gym opens
in Wanowrie" produced the name `24-hour` before a guard was added. The ceiling is real and close.

**7.6 Scoring is a rubric, not a prediction.** The weights (3/2/1) are arbitrary and unfitted.
There is no outcome data, so nothing here is calibrated. It ranks; it does not forecast.

**7.7 No persistence.** Each run is independent. No week-over-week diff, no "this gym appeared
3 days ago", no "this one went quiet". The product's real value is probably in the delta, and the
delta does not exist yet.

**7.8 Two deployment paths, one live.** `api/*.js` and `vercel.json` describe a Vercel
deployment that was never made; the actual deployment is GitHub Pages plus Actions. The README
still tells the reader to run `npx vercel --prod`. Dead config that looks live is a review
hazard.

**7.9 The digest drops the best part.** `toTelegram()` sends top 5 opportunities and a tally. It
does not send the rejection summary, so the Telegram message is weaker than the wall.

**7.10 No tests beyond a smoke test.** `test.mjs` prints coverage and counts. There is no
assertion anywhere: nothing fails if extraction regresses.

**7.11 `windowDays = 365`.** A year is too long for "why now". STAMVIA (18 Aug 2026) scores
timing 4 purely because it is 74 days old. A 90-day window would be more honest.

**7.12 Locality is often missing.** Two of three opportunities say "Pune (locality not stated)",
which is exactly the field the ICP depends on. No geocoding, no address resolution.

---

## 8. Questions for the reviewer

Answer these in order of usefulness to the owner, not in order of elegance:

1. **Is the ICP mismatch fixable within this architecture, or does it need a different
   connector entirely?** The owner's own answer is a Google Places radius sweep (needs a paid
   key). Is there a keyless path to independent gyms — Justdial, Practo, IndiaMART, gym
   aggregator listings, Google Maps HTML scraping — or is paid Places simply the honest answer?

2. **What is the cheapest upgrade that raises extraction quality without losing the
   "no rate limit" property?** Options: a small local NER model, a deterministic gazetteer of
   Pune gym names built once and cached, an LLM call only on the survivors (~5 per run, so
   rate limits are irrelevant), or better regex. Which buys the most and costs the least?

3. **How should the rejection log be presented so it is both complete and readable?** Right now
   it truncates to 40 and the numbers disagree with the tally (§7.3). Is the fix pagination, a
   reasons-only histogram, or showing counts computed from the full array while listing examples
   from the first 40?

4. **Is Stage A/C defensible, or should stage fit be a separate qualification step with real
   inputs** (branch count, review volume, website presence) rather than a regex over press
   adjectives?

5. **Is "evidence score caps Google News at 3" a bug or a feature?** It makes the ranking
   partly a ranking of *link quality*, not of evidence strength.

6. **Does the absence of persistence make this a toy?** If the product's value is the delta
   ("this gym changed 3 days ago"), what is the minimum persistence layer worth building — flat
   JSON files in the repo, SQLite, or something else?

7. **What is the strongest counter-argument to this whole approach?** The owner's claim is that
   a tool which says "don't call them" is more valuable than one that says "call everyone". Is
   that true for a seller with no case study, or is it a rationalisation for low volume?

8. **What would you cut?** The build is deliberately small, but the two views, the Vercel
   handlers and `vercel.json` are candidates for deletion.

---

## 9. Known-broken or misleading, stated plainly

- `rejected[]` is truncated to 40 while `counts.rejected` is not (§7.3).
- `vercel.json` and `api/*.js` are undeployed and the README implies otherwise (§7.8).
- Stage B does not exist (§7.2).
- Dedupe ignores locality (§7.4).
- No assertions in the test (§7.10).
- `SCOPE.windowDays = 365` is too generous for an urgency tool (§7.11).
- The scheduled cron has **not** been observed firing on its own. The workflow was triggered
  manually via `workflow_dispatch` and by API dispatch; both succeeded. The first unattended
  cron is 01 Nov 2026, 01:30 UTC. **This is the one claim in the demo resting on documentation
  rather than evidence.**

---

## 10. How to verify any of this yourself

```bash
git clone https://github.com/dheerajkumar1a1a/find-my-gym-prospects
cd find-my-gym-prospects
node test.mjs          # coverage, counts, opportunities — no install needed
node sweep.mjs --no-notify
```

```bash
# the run log the wall actually reads
curl https://dheerajkumar1a1a.github.io/find-my-gym-prospects/runs/latest.json
```

```bash
# proof delivery works
# GitHub → Actions → run 41176688395 → job log → "telegram: sent (message 3)"
```

Node 20+. No `npm install` required. Secrets are `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`;
`RADAR_KEY` is optional and only used by the undeployed Vercel handlers.

---

## 11. Next build, in the owner's own priority

1. **Places proximity sweep** — radius around Baner/Balewadi/Aundh/Wakad, review count as a
   proxy for "new", website presence as the digital-gap check. Turns discovery into
   qualification: *which of the 47 gyms on Baner Road is worth walking into.*
2. **Persistence + delta** — so the digest can say "new today" instead of repeating the same
   three cards.
3. **Stage B** and a real qualification input set.
4. **Fix the rejection display** so the numbers reconcile.
5. **Delete the Vercel path** or actually deploy it. Two half-live runtimes is worse than one.
