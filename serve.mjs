// serve.mjs — local server, no Vercel login needed. `node serve.mjs`
// Serves index.html and the same routes Vercel will serve in production.
import http from 'node:http';
import fs from 'node:fs/promises';
import { runRadar, toTelegram } from './lib/radar.js';
import { sendTelegram, telegramConfigured } from './lib/telegram.js';

const PORT = process.env.PORT || 3000;

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj, null, 2));
  };

  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await fs.readFile(new URL('./index.html', import.meta.url));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    if (url.pathname === '/api/ok') {
      return send(200, { ok: true, telegram: telegramConfigured(), mode: 'local server' });
    }

    if (url.pathname === '/api/radar') {
      return send(200, await runRadar());
    }

    if (url.pathname === '/api/run' || url.pathname === '/api/sweep') {
      await readBody(req);
      const log = await runRadar();
      let delivery = null;
      if (url.searchParams.get('notify') === '1' || url.pathname === '/api/sweep') {
        try {
          delivery = telegramConfigured() ? await sendTelegram(toTelegram(log)) : { ok: false, error: 'Telegram not configured in .env' };
        } catch (e) {
          delivery = { ok: false, error: e.message };
        }
      }
      return send(200, { ...log, delivery });
    }

    send(404, { error: { message: 'not found' } });
  } catch (e) {
    send(500, { error: { message: e.message } });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Gym Radar  ->  http://localhost:${PORT}`);
  console.log(`  Telegram:   ${telegramConfigured() ? 'configured' : 'not configured (set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)'}\n`);
});
