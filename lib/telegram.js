// lib/telegram.js
// One function. Swap this file for Slack later and nothing else changes.

export async function sendTelegram(html, opts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  if (!chatId) throw new Error('TELEGRAM_CHAT_ID is not set');

  // Telegram caps messages at 4096 chars.
  const text = html.length > 3900 ? html.slice(0, 3900) + '\n\n…truncated' : html;

  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    throw new Error('telegram: ' + (j.description || 'HTTP ' + r.status));
  }
  return { ok: true, message_id: j.result && j.result.message_id };
}

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}
