// api/ok.js — health check the page uses before offering the run buttons.
import { telegramConfigured } from '../lib/telegram.js';

export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    telegram: telegramConfigured(),
    cron: '0 7 * * 1 UTC (12:30 IST, Mondays)',
  });
}
