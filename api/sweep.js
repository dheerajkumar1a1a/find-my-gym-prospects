// api/sweep.js — the scheduled job. This is the "runs without you" proof.
// Vercel Cron hits it at 01:30 UTC = 07:00 IST, daily.
import { runRadar, toTelegram } from '../lib/radar.js';
import { sendTelegram } from '../lib/telegram.js';

export const config = { maxDuration: 60 };

function authorised(req) {
  const key = process.env.RADAR_KEY;
  if (!key) return true;
  return req.headers['x-radar-key'] === key;
}

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(401).json({ error: { message: 'bad or missing x-radar-key' } });

  try {
    const log = await runRadar();
    let delivery = { ok: false, skipped: true };

    try {
      delivery = await sendTelegram(toTelegram(log));
    } catch (e) {
      delivery = { ok: false, error: e.message };
    }

    // Vercel Cron only needs a 2xx. We still return the log for manual runs.
    res.status(200).json({
      ok: true,
      at: log.at,
      counts: log.counts,
      delivery,
      opportunities: log.opportunities.map((o) => ({
        gym: o.gym,
        locality: o.locality,
        event: o.event_type,
        date: o.event_date,
        stage: o.stage.label,
        source: o.source_url,
      })),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: { message: e.message } });
  }
}
