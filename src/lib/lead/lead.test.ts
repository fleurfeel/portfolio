import { describe, expect, it } from 'vitest';
import { LEAD_LIMITS, leadMessage, parseLead } from './lead';

const valid = { service: 'Лендинг', name: 'Анна', contact: '@anna', message: 'Нужен сайт для студии' };

describe('parseLead', () => {
  it('принимает заполненную заявку и обрезает пробелы', () => {
    const r = parseLead({ ...valid, name: '  Анна ', contact: ' @anna  ' });
    expect(r).toEqual({ ok: true, lead: { ...valid } });
  });

  it('комментарий необязателен', () => {
    const r = parseLead({ ...valid, message: '' });
    expect(r.ok && r.lead.message).toBe('');
    expect(parseLead({ service: 'Лендинг', name: 'Анна', contact: '@anna' }).ok).toBe(true);
  });

  it('без имени или контакта — ошибка с названием поля', () => {
    expect(parseLead({ ...valid, name: '   ' })).toEqual({ ok: false, error: 'name' });
    expect(parseLead({ ...valid, contact: '' })).toEqual({ ok: false, error: 'contact' });
    expect(parseLead({ ...valid, contact: '12' })).toEqual({ ok: false, error: 'contact' });
  });

  it('слишком длинные поля — ошибка', () => {
    expect(parseLead({ ...valid, message: 'а'.repeat(LEAD_LIMITS.message + 1) })).toEqual({ ok: false, error: 'message' });
    expect(parseLead({ ...valid, name: 'а'.repeat(LEAD_LIMITS.name + 1) })).toEqual({ ok: false, error: 'name' });
  });

  it('заполненное поле-ловушка — спам', () => {
    expect(parseLead({ ...valid, website: 'http://spam' })).toEqual({ ok: false, error: 'spam' });
  });

  it('не объект или поля не строки — ошибка', () => {
    expect(parseLead(null).ok).toBe(false);
    expect(parseLead('заявка').ok).toBe(false);
    expect(parseLead({ ...valid, name: 42 })).toEqual({ ok: false, error: 'name' });
  });

  it('без услуги — «Не выбрана»', () => {
    const r = parseLead({ ...valid, service: '' });
    expect(r.ok && r.lead.service).toBe('Не выбрана');
  });
});

describe('leadMessage', () => {
  it('услуга, имя, контакт и комментарий — каждый с новой строки', () => {
    expect(leadMessage(valid)).toBe(
      'Новая заявка с сайта\nУслуга: Лендинг\nИмя: Анна\nКонтакт: @anna\nКомментарий: Нужен сайт для студии',
    );
  });

  it('без комментария — без пустой строки', () => {
    expect(leadMessage({ ...valid, message: '' })).toBe('Новая заявка с сайта\nУслуга: Лендинг\nИмя: Анна\nКонтакт: @anna');
  });
});
