// api/radar.js — returns the full run log. The wall reads this.
import { runRadar } from '../lib/radar.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  try {
    const log = await runRadar({
      windowDays: Number(req.query.windowDays) || undefined,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(log);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
}
