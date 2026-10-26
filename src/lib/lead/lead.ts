// Заявка с сайта: проверка полей (общая для формы и функции Cloudflare) и текст сообщения в Telegram.
export interface Lead {
  service: string;
  name: string;
  contact: string;
  message: string;
}

export type LeadError = 'name' | 'contact' | 'message' | 'consent' | 'spam' | 'invalid';

export const LEAD_LIMITS = { service: 100, name: 100, contact: 200, message: 2000 } as const;

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : v === undefined ? '' : null);

/**
 * Проверяет присланные поля. website — поле-ловушка для ботов: человек его не видит и не заполняет.
 * consent — галочка согласия на обработку персональных данных (152-ФЗ), без неё заявку не принимаем.
 */
export function parseLead(input: unknown): { ok: true; lead: Lead } | { ok: false; error: LeadError } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'invalid' };
  const raw = input as Record<string, unknown>;
  if (text(raw.website)) return { ok: false, error: 'spam' };

  const service = text(raw.service);
  const name = text(raw.name);
  const contact = text(raw.contact);
  const message = text(raw.message);
  if (service === null || service.length > LEAD_LIMITS.service) return { ok: false, error: 'invalid' };
  if (!name || name.length > LEAD_LIMITS.name) return { ok: false, error: 'name' };
  if (!contact || contact.length < 3 || contact.length > LEAD_LIMITS.contact) return { ok: false, error: 'contact' };
  if (message === null || message.length > LEAD_LIMITS.message) return { ok: false, error: 'message' };
  if (raw.consent !== true) return { ok: false, error: 'consent' };
  return { ok: true, lead: { service: service || 'Не выбрана', name, contact, message } };
}

export function leadMessage(lead: Lead) {
  const lines = ['Новая заявка с сайта', `Услуга: ${lead.service}`, `Имя: ${lead.name}`, `Контакт: ${lead.contact}`];
  if (lead.message) lines.push(`Комментарий: ${lead.message}`);
  return lines.join('\n');
}
