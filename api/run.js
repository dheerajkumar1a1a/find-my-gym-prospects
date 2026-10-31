// api/run.js — force a sweep now, and optionally push it to Telegram.
// Use this live on stage instead of waiting for the cron.
import { runRadar, toTelegram } from '../lib/radar.js';
import { sendTelegram, telegramConfigured } from '../lib/telegram.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  const key = process.env.RADAR_KEY;
  if (key && req.headers['x-radar-key'] !== key) {
    return res.status(401).json({ error: { message: 'bad or missing x-radar-key' } });
  }

  try {
    const log = await runRadar();
    let delivery = null;

    if (req.query.notify === '1') {
      if (!telegramConfigured()) {
        delivery = { ok: false, error: 'Telegram is not configured on this deployment' };
      } else {
        try {
          delivery = await sendTelegram(toTelegram(log));
        } catch (e) {
          delivery = { ok: false, error: e.message };
        }
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ...log, delivery });
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
}
