// Cloudflare Pages Function: POST /api/lead — заявка с сайта уходит сообщением в Telegram.
// Переменные окружения (Cloudflare → Pages → проект → Settings → Variables and Secrets):
//   TELEGRAM_BOT_TOKEN — токен бота от @BotFather (секрет),
//   TELEGRAM_CHAT_ID — id чата, куда слать (свой id можно узнать у @userinfobot).
import { leadMessage, parseLead } from '../../src/lib/lead/lead';

interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ ok: false, error: 'not-configured' }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  const parsed = parseLead(body);
  // ботам отвечаем «успехом», чтобы не подсказывать, что их поймали
  if (!parsed.ok) return parsed.error === 'spam' ? json({ ok: true }) : json({ ok: false, error: parsed.error }, 400);

  const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: leadMessage(parsed.lead) }),
  });
  return tg.ok ? json({ ok: true }) : json({ ok: false, error: 'send' }, 502);
}
