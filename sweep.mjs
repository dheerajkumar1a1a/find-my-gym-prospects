// sweep.mjs — run the radar once, save the run log, push it to Telegram.
// This is what GitHub Actions runs every morning. No server needed.
//
//   node sweep.mjs              normal run
//   node sweep.mjs --no-notify  run without touching Telegram
import fs from 'node:fs/promises';
import path from 'node:path';
import { runRadar, toTelegram } from './lib/radar.js';
import { sendTelegram, telegramConfigured } from './lib/telegram.js';

const noNotify = process.argv.includes('--no-notify');
const startedAt = Date.now();

const log = await runRadar();

const dir = path.join(process.cwd(), 'runs');
await fs.mkdir(dir, { recursive: true });

const stamp = log.at.slice(0, 10);
await fs.writeFile(path.join(dir, 'latest.json'), JSON.stringify(log, null, 2));
await fs.writeFile(path.join(dir, `${stamp}.json`), JSON.stringify(log, null, 2));

// A small index so the wall can show history later without reading every file.
const indexFile = path.join(dir, 'index.json');
let history = [];
try {
  history = JSON.parse(await fs.readFile(indexFile, 'utf8'));
} catch (e) {
  history = [];
}
history = [
  {
    date: stamp,
    at: log.at,
    opportunities: log.counts.opportunities,
    scanned: log.counts.items_scanned,
    rejected: log.counts.rejected,
  },
  ...history.filter((h) => h.date !== stamp),
].slice(0, 60);
await fs.writeFile(indexFile, JSON.stringify(history, null, 2));

console.log(
  `sweep ${log.at}  scanned=${log.counts.items_scanned}  opportunities=${log.counts.opportunities}  rejected=${log.counts.rejected}  duplicates=${log.counts.duplicates}  (${Date.now() - startedAt}ms)`
);
for (const o of log.opportunities) {
  console.log(`  · ${o.gym} | ${o.locality} | ${o.event_type} | ${o.event_date} | stage ${o.stage.tier}`);
}

if (noNotify) {
  console.log('telegram: skipped (--no-notify)');
  process.exit(0);
}

if (!telegramConfigured()) {
  console.warn('telegram: not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
  process.exit(0);
}

try {
  const r = await sendTelegram(toTelegram(log));
  console.log(`telegram: sent (message ${r.message_id})`);
} catch (e) {
  // A delivery failure should be loud in the logs but should not fail the run:
  // the run log is already written and the wall will still show it.
  console.warn('telegram: failed — ' + e.message);
  process.exitCode = 0;
}
