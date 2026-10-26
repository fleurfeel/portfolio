<script setup lang="ts">
// Форма заявки: открывается кнопками «Оставить заявку» в карточках услуг (атрибут data-lead — название услуги),
// отправляет на /api/lead (функция Cloudflare Pages → Telegram). Поля проверяет та же parseLead, что и сервер.
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { type LeadError, parseLead } from '../../lib/lead/lead';

const props = defineProps<{ services: string[] }>();

const dialog = ref<HTMLDialogElement>();
const form = reactive({ service: '', name: '', contact: '', message: '', website: '', consent: false });
const state = ref<'idle' | 'sending' | 'sent' | 'error'>('idle');
const error = ref<LeadError | null>(null);

const errors: Partial<Record<LeadError, string>> = {
  name: 'Напишите, как к вам обращаться',
  contact: 'Оставьте телефон, почту или ник в Telegram',
  message: 'Комментарий получился слишком длинным',
  consent: 'Без согласия не смогу принять заявку',
};

function open(service: string) {
  form.service = service;
  state.value = 'idle';
  error.value = null;
  dialog.value?.showModal();
}

const onClick = (e: MouseEvent) => {
  const button = (e.target as Element | null)?.closest<HTMLElement>('[data-lead]');
  if (button) open(button.dataset.lead ?? '');
};

async function submit() {
  const parsed = parseLead(form);
  if (!parsed.ok && parsed.error !== 'spam') return void (error.value = parsed.error);
  error.value = null;
  state.value = 'sending';
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error(String(res.status));
    state.value = 'sent';
    Object.assign(form, { name: '', contact: '', message: '', consent: false });
  } catch {
    state.value = 'error';
  }
}

const close = () => dialog.value?.close();
// клик по затемнению вокруг окна — закрыть
const onBackdrop = (e: MouseEvent) => {
  if (e.target === dialog.value) close();
};

onMounted(() => document.addEventListener('click', onClick));
onBeforeUnmount(() => document.removeEventListener('click', onClick));
</script>

<template>
  <dialog ref="dialog" class="lead" aria-labelledby="lead-title" @click="onBackdrop">
    <div class="lead__box">
      <button class="lead__close" type="button" aria-label="Закрыть" @click="close">×</button>

      <template v-if="state === 'sent'">
        <h2 id="lead-title" class="lead__title">Заявка отправлена</h2>
        <p class="lead__lead">Спасибо! Скоро свяжусь с вами.</p>
        <button class="lead__submit" type="button" @click="close">Хорошо</button>
      </template>

      <form v-else class="lead__form" novalidate @submit.prevent="submit">
        <h2 id="lead-title" class="lead__title">Оставить заявку</h2>

        <label class="lead__field">
          <span class="lead__label">Услуга</span>
          <select v-model="form.service" name="service">
            <option v-for="s in props.services" :key="s" :value="s">{{ s }}</option>
            <option value="">Пока не знаю</option>
          </select>
        </label>

        <label class="lead__field">
          <span class="lead__label">Имя</span>
          <input v-model="form.name" name="name" autocomplete="name" :aria-invalid="error === 'name'" maxlength="100" />
          <span v-if="error === 'name'" class="lead__error">{{ errors.name }}</span>
        </label>

        <label class="lead__field">
          <span class="lead__label">Как с вами связаться</span>
          <input
            v-model="form.contact"
            name="contact"
            placeholder="Телефон, почта или @ник в Telegram"
            :aria-invalid="error === 'contact'"
            maxlength="200"
          />
          <span v-if="error === 'contact'" class="lead__error">{{ errors.contact }}</span>
        </label>

        <label class="lead__field">
          <span class="lead__label">Коротко о задаче <span class="lead__optional">— необязательно</span></span>
          <textarea v-model="form.message" name="message" rows="3" :aria-invalid="error === 'message'" maxlength="2000" />
          <span v-if="error === 'message'" class="lead__error">{{ errors.message }}</span>
        </label>

        <label class="lead__consent">
          <input v-model="form.consent" type="checkbox" name="consent" :aria-invalid="error === 'consent'" />
          <span>
            Даю <a href="/consent" target="_blank">согласие на обработку персональных данных</a> в соответствии
            с <a href="/privacy" target="_blank">политикой</a>
          </span>
        </label>
        <span v-if="error === 'consent'" class="lead__error">{{ errors.consent }}</span>

        <!-- ловушка для ботов: людям не видна -->
        <input v-model="form.website" class="lead__trap" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <p v-if="state === 'error'" class="lead__error" role="alert">Не получилось отправить. Попробуйте ещё раз чуть позже.</p>

        <button class="lead__submit" type="submit" :disabled="state === 'sending'">
          {{ state === 'sending' ? 'Отправляю…' : 'Отправить' }}
        </button>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.lead {
  width: min(100% - 32px, 480px);
  max-height: calc(100% - 32px);
  margin: auto;
  padding: 0;
  overflow: auto;
  border: 0;
  border-radius: 30px;
  background: var(--color-surface);
  color: var(--color-text);
  opacity: 0;
  transform: translateY(16px) scale(0.98);
  transition:
    opacity 0.25s ease,
    transform 0.25s ease,
    overlay 0.25s allow-discrete,
    display 0.25s allow-discrete;
}

.lead[open] {
  opacity: 1;
  transform: none;
}

@starting-style {
  .lead[open] {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
}

.lead::backdrop {
  background: color-mix(in srgb, var(--color-text) 45%, transparent);
}

.lead__box {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px 24px 24px;
  /* фиолетовое свечение в углу — как у карточек */
  background: radial-gradient(
    circle at 110% -10%,
    color-mix(in srgb, var(--color-accent) 35%, transparent),
    transparent 55%
  );
}

.lead__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.lead__close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.lead__title {
  padding-right: 40px;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.lead__lead {
  color: var(--color-secondary);
  line-height: 1.3;
}

.lead__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lead__label {
  font-size: 14px;
  font-weight: 600;
}

.lead__optional {
  color: var(--color-secondary);
  font-weight: 400;
}

.lead input:not([type='checkbox']),
.lead select,
.lead textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent);
  border-radius: 16px;
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 16px; /* меньше 16 px — iOS приближает страницу при вводе */
}

.lead textarea {
  resize: vertical;
}

.lead__consent {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 10px;
  color: var(--color-secondary);
  font-size: 14px;
  line-height: 1.3;
  cursor: pointer;
}

.lead__consent input {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--color-accent);
}

.lead__consent a {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.lead [aria-invalid='true'] {
  border-color: var(--color-accent);
}

.lead__error {
  color: var(--color-accent);
  font-size: 14px;
}

.lead__trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.lead__submit {
  margin-top: 8px;
  padding: 18px 24px;
  border-radius: 42px;
  background: var(--color-accent);
  color: var(--color-surface);
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.lead__submit:disabled {
  opacity: 0.6;
  cursor: progress;
}

.lead button:focus-visible,
.lead input:focus-visible,
.lead select:focus-visible,
.lead textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .lead {
    transition: none;
  }
}
</style>
