# Gym Radar

Evidence-based opportunity radar for gyms in Pune.

It does not tell you which gyms exist. It tells you which identifiable gyms just showed a
**commercially relevant change**, what evidence supports that, which of your services may be
useful, and what to do next. Two credible cards beat ten invented ones.

Built for the FlytBase Marketing Build Session (31 Oct 2026), automation track. The pipeline is
deliberately rule-based: no model call, so a demo cannot die on a rate limit.

---

## What it does

```
sources ─► extract ─► resolve ─► verify ─► disqualify ─► score ─► opportunity
                                                          │
                                                    run log (JSON)
                                                          │
                                        ┌─────────────────┴─────────────────┐
                                     wall (browser)                  Telegram digest
```

Every run produces a **run log**: what was scanned, what was kept, and — equally important —
**what was thrown away and why**.

## The words

| Word | Meaning |
|---|---|
| **Business** | one gym, deduped by brand + locality so two branches never merge |
| **Source** | the URL and fetch time an item came from |
| **Signal** | a dated business event, with evidence text and source ids |
| **Opportunity** | one gym × one primary signal × one offer |
| **Rejected** | an item we threw out, with the reason. First-class output, not a log line |

## Endpoints

| Route | Job |
|---|---|
| `GET /api/radar` | full run log (the wall reads this) |
| `GET /api/run?notify=1` | force a sweep and push it to Telegram |
| `GET /api/sweep` | the cron target, 07:00 IST daily (`30 1 * * *` UTC) |
| `GET /api/ok` | health check + whether Telegram is configured |

## Run it locally (no login, no build)

```bash
node serve.mjs
# open http://localhost:3000
```

## Deploy

```bash
npx vercel --prod
```

Then set two environment variables in the Vercel project:

| Variable | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | message **@BotFather** → `/newbot` → copy the token |
| `TELEGRAM_CHAT_ID` | message your new bot once, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id` |
| `RADAR_KEY` *(optional)* | if set, callers must send header `x-radar-key` |

`vercel.json` already schedules the sweep at `30 1 * * *` UTC = **07:00 IST**. Vercel Cron fires it
with no hands on it, which is the entire point of the automation track.

## Sources

| Source | Status |
|---|---|
| Bing News RSS | **primary.** Fewer items than Google News, but the links resolve to the publisher. |
| Google News RSS | fallback. High volume, but links are JS wrappers that never resolve. |
| Punekar News RSS | live, but no gym beat |
| Pune Mirror RSS | live, but no gym beat |

Verified dead or blocked on 31 Oct 2026: Sakal (502), eSakal (404), TOI Pune RSS (0 items),
HT Pune RSS (0 items), GeM (JS shell + 403), mahatenders (session-gated), Instagram (login wall),
Facebook (400), Justdial (empty body), Google Maps (JS only, needs paid API).

## Honest limitation

Press coverage finds **premium launches**, not independent gyms. A gym with no press footprint
cannot appear here — and most independent gyms in Pune have none. That is why the next connector
is a **proximity sweep** (Google Places, by radius, with review count as a proxy for "new" and
website presence as the digital-gap check). The tool's job then becomes qualification, not
discovery: you can already see the gyms from your scooter, the question is which ones are worth
walking into.

## Known gaps

- Places proximity sweep not wired (needs an API key)
- No persistence: every load is a fresh sweep, so there is no week-over-week diff yet
- Stage fit is read from press language only (flagship / inauguration / 24-hour), so it is a
  heuristic, not a qualification
- Entity resolution is name-based; two unrelated gyms with similar names would merge
- No CRM write-back
