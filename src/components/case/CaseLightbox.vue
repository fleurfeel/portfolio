<script setup lang="ts">
// Просмотр экранов кейса во весь экран. Экраны на странице — кнопки с data-zoom (страница кейса), остров слушает
// клики по ним. Экран «вырастает» из миниатюры на своё место (FLIP: только transform и opacity) и так же
// сворачивается обратно. Длинные страницы показываются по ширине окна и листаются. Стрелки и ←/→ — соседние
// экраны, Esc, крестик или клик мимо экрана — закрыть. При prefers-reduced-motion — без анимации.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { type Box, flipFrom, largestSource, lightboxLayout } from '../../lib/case/lightbox';

const dialog = ref<HTMLDialogElement>();
const stage = ref<HTMLDivElement>();
const img = ref<HTMLImageElement>();
const backdrop = ref<HTMLDivElement>();
const chrome = ref<HTMLDivElement>();

const src = ref('');
const alt = ref('');
const caption = ref('');
const index = ref(0);
const total = ref(0);
const box = ref<Box & { mode: 'fit' | 'scroll' }>({ mode: 'fit', left: 0, top: 0, width: 0, height: 0 });

let shots: HTMLElement[] = [];
let busy = false; // идёт открытие или смена экрана
let closing = false;
let opener: HTMLElement | null = null;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const thumbOf = (shot: HTMLElement) => shot.querySelector('img')!;
const naturalOf = (shot: HTMLElement) => {
  const [width, height] = (shot.dataset.natural ?? '1x1').split('x').map(Number);
  return { width: width!, height: height! };
};
const rectOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

function layout() {
  const el = stage.value;
  if (!el) return;
  const viewport = { width: el.clientWidth, height: el.clientHeight };
  const pad = viewport.width < 640 ? 12 : 48;
  const fit = lightboxLayout(naturalOf(shots[index.value]!), viewport, pad);
  // длинная страница на телефоне — во всю ширину, без полей по бокам
  box.value = fit.mode === 'scroll' && viewport.width < 640 ? lightboxLayout(naturalOf(shots[index.value]!), viewport, 0) : fit;
}

/** Показать экран: сначала уже загруженная миниатюра, затем полноразмерный файл, когда догрузится. */
function show(i: number) {
  index.value = (i + shots.length) % shots.length;
  const shot = shots[index.value]!;
  const thumb = thumbOf(shot);
  alt.value = thumb.alt;
  caption.value = shot.closest('figure')?.querySelector('figcaption')?.textContent ?? '';
  src.value = thumb.currentSrc || thumb.src;
  const full = largestSource(thumb.srcset, thumb.src);
  if (full !== src.value) {
    const pre = new Image();
    pre.onload = () => {
      if (shots[index.value] === shot) src.value = full;
    };
    pre.src = full;
  }
  layout();
  if (stage.value) stage.value.scrollTop = 0;
}

function lockPage(lock: boolean) {
  const root = document.documentElement;
  if (lock) {
    root.style.setProperty('padding-right', `${innerWidth - root.clientWidth}px`);
    root.style.overflow = 'hidden';
  } else {
    root.style.removeProperty('padding-right');
    root.style.overflow = '';
  }
}

const fade = (el: Element | undefined, from: number, to: number, duration: number) =>
  el?.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'ease', fill: 'both' }).finished;

async function open(shot: HTMLElement) {
  if (busy || !dialog.value) return;
  busy = true;
  opener = shot;
  shots = [...document.querySelectorAll<HTMLElement>('[data-zoom]')];
  total.value = shots.length;
  lockPage(true);
  dialog.value.showModal();
  show(shots.indexOf(shot));
  await nextTick();
  if (!reducedMotion()) {
    const t = flipFrom(rectOf(thumbOf(shot)), rectOf(img.value!));
    const grow = img.value!.animate([{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})` }, { transform: 'none' }], { duration: 480, easing: EASE });
    void fade(backdrop.value, 0, 1, 320);
    void fade(chrome.value, 0, 1, 360);
    await grow.finished.catch(() => {});
  }
  busy = false;
}

/** Убрать следы просмотра: анимации, блокировку прокрутки; вернуть фокус на экран, с которого открыли. */
function cleanup() {
  for (const el of [img.value, backdrop.value, chrome.value]) el?.getAnimations().forEach((a) => a.cancel());
  lockPage(false);
  (shots[index.value] ?? opener)?.focus({ preventScroll: true });
  busy = false;
  closing = false;
}

async function close() {
  // закрыть можно и посреди смены экрана — Esc не должен «теряться»
  if (closing || !dialog.value?.open) return;
  closing = true;
  busy = true;
  for (const el of [img.value, backdrop.value, chrome.value]) el?.getAnimations().forEach((a) => a.cancel());
  const shot = shots[index.value]!;
  const thumb = thumbOf(shot);
  if (!reducedMotion()) {
    // открыт другой экран, чем тот, с которого начали, — прокручиваем к нему страницу, чтобы свернуться на место
    const r = thumb.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) thumb.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    const t = flipFrom(rectOf(thumb), rectOf(img.value!));
    void fade(chrome.value, 1, 0, 160);
    void fade(backdrop.value, 1, 0, 380);
    await img.value!.animate([{ transform: 'none' }, { transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})` }], { duration: 420, easing: EASE, fill: 'forwards' })
      .finished.catch(() => {});
  }
  dialog.value.close();
}

/** Соседний экран. Не ждёт текущих анимаций: быстрые нажатия стрелок не теряются. */
async function step(delta: number) {
  if (closing || total.value < 2 || !dialog.value?.open) return;
  img.value?.getAnimations().forEach((a) => a.cancel());
  busy = false;
  show(index.value + delta);
  await nextTick();
  if (!reducedMotion()) {
    img.value!.animate([{ opacity: 0, transform: `translateX(${delta * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
  }
}

// клик мимо экрана закрывает; по самому экрану — тоже, если он целиком на экране (длинную страницу листают)
const onStageClick = (e: MouseEvent) => {
  if (e.target !== img.value || box.value.mode === 'fit') void close();
};
const onKey = (e: KeyboardEvent) => {
  if (!dialog.value?.open) return;
  if (e.key === 'ArrowRight') void step(1);
  if (e.key === 'ArrowLeft') void step(-1);
};
const onCancel = (e: Event) => {
  e.preventDefault();
  void close();
};
const onDocumentClick = (e: MouseEvent) => {
  const shot = (e.target as Element | null)?.closest<HTMLElement>('[data-zoom]');
  if (shot) void open(shot);
};
const onResize = () => {
  if (dialog.value?.open) layout();
};

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  addEventListener('keydown', onKey);
  addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  removeEventListener('keydown', onKey);
  removeEventListener('resize', onResize);
  lockPage(false);
});
</script>

<template>
  <dialog ref="dialog" class="lightbox" aria-label="Просмотр экрана" @cancel="onCancel" @close="cleanup">
    <div ref="backdrop" class="lightbox__backdrop" aria-hidden="true"></div>
    <div ref="stage" class="lightbox__stage" @click="onStageClick">
      <div class="lightbox__canvas" :style="{ height: `${box.mode === 'scroll' ? box.height + box.top * 2 : 0}px` }">
        <img
          ref="img"
          class="lightbox__img"
          :class="{ 'lightbox__img--scroll': box.mode === 'scroll' }"
          :src="src"
          :alt="alt"
          :style="{ left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` }"
          decoding="async"
        />
      </div>
    </div>
    <div ref="chrome" class="lightbox__chrome">
      <p class="lightbox__caption">
        <span v-if="caption">{{ caption }}</span>
        <span v-if="total > 1" class="lightbox__count">{{ index + 1 }} / {{ total }}</span>
      </p>
      <button class="lightbox__btn lightbox__btn--close" type="button" aria-label="Закрыть" @click="close">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <template v-if="total > 1">
        <button class="lightbox__btn lightbox__btn--prev" type="button" aria-label="Предыдущий экран" @click="step(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button class="lightbox__btn lightbox__btn--next" type="button" aria-label="Следующий экран" @click="step(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100%;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-surface);
  overflow: hidden;
}

.lightbox::backdrop {
  background: none;
}

.lightbox__backdrop {
  position: absolute;
  inset: 0;
  background: var(--color-text); /* плотный: страница под экраном не отвлекает */
}

.lightbox__stage {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.lightbox__canvas {
  position: relative;
}

.lightbox__img {
  position: absolute;
  max-width: none;
  border-radius: 12px;
  transform-origin: 0 0;
  cursor: zoom-out;
  user-select: none;
}

.lightbox__img--scroll {
  cursor: default;
}

.lightbox__chrome {
  pointer-events: none;
}

.lightbox__caption {
  position: fixed;
  left: 50%;
  bottom: 16px;
  display: flex;
  gap: 12px;
  max-width: calc(100% - 140px);
  padding: 8px 14px;
  border-radius: 40px;
  background: color-mix(in srgb, var(--color-text) 80%, transparent);
  font-size: 14px;
  line-height: 1.3;
  white-space: nowrap;
  transform: translateX(-50%);
}

.lightbox__caption span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
}

.lightbox__count {
  flex: none;
  color: color-mix(in srgb, var(--color-surface) 65%, transparent);
}

.lightbox__btn {
  position: fixed;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s ease;
}

.lightbox__btn svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lightbox__btn:hover {
  transform: scale(1.06);
}

.lightbox__btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

.lightbox__btn--close {
  top: 16px;
  right: 16px;
}

.lightbox__btn--prev,
.lightbox__btn--next {
  top: 50%;
  margin-top: -24px;
}

.lightbox__btn--prev {
  left: 16px;
}

.lightbox__btn--next {
  right: 16px;
}

/* телефон: стрелки внизу по краям, подпись между ними */
@media (max-width: 639.98px) {
  .lightbox__btn {
    width: 44px;
    height: 44px;
  }

  .lightbox__btn--prev,
  .lightbox__btn--next {
    top: auto;
    bottom: 12px;
    margin-top: 0;
  }

  .lightbox__btn--prev {
    left: 12px;
  }

  .lightbox__btn--next {
    right: 12px;
  }

  .lightbox__btn--close {
    top: 12px;
    right: 12px;
  }

  .lightbox__caption {
    bottom: 18px;
    max-width: calc(100% - 128px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox__btn {
    transition: none;
  }
}
</style>
