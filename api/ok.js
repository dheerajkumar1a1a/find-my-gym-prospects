// api/ok.js — health check the page uses before offering the run buttons.
import { telegramConfigured } from '../lib/telegram.js';

export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    telegram: telegramConfigured(),
    cron: '30 1 * * * UTC (07:00 IST daily)',
  });
}
