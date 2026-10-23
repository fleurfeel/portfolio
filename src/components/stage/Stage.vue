<script setup lang="ts">
// Скролл-сцена «первый экран → избранные проекты», 3D-маскот и прелоадер.
// Гидрируется через client:idle: включает sticky-сцену, по скроллу ведёт переход «туман» между экранами
// и карусель кейсов. three.js и модели грузятся сразу, прелоадер показывает прогресс
// и уходит, когда 3D готов. Без аппаратного WebGL, при ошибке или дольше LOAD_TIMEOUT_MS
// страница открывается с постерами, а 3D (если грузится) подменит их позже.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { shouldTrackCursor } from '../../lib/mascot/math';
import { hasHardwareWebGL } from '../../lib/mascot/webgl-support';
import { offsetRect, posterBounds, visiblePoster } from '../../lib/stage/dom';
import { approach, overallProgress, percentLabel } from '../../lib/preloader/progress';
import { CARDS_DESKTOP, CARDS_MOBILE, STAGE, aboutStart, cardPose, infoVisibility, sceneState, stageProgress } from '../../lib/stage/math';

const props = defineProps<{ modelSizes: Record<string, number> }>();

const root = ref<HTMLDivElement>();
const cleanups: (() => void)[] = [];
let cancelled = false;

const LOAD_TIMEOUT_MS = 15_000;

/** Полоска прелоадера: плавно догоняет реальный прогресс, по finish() доходит до 100% и растворяется. */
function createPreloader(el: HTMLElement | null, reducedMotion: boolean) {
  const fill = el?.querySelector<HTMLElement>('[data-preloader-fill]');
  const label = el?.querySelector<HTMLElement>('[data-preloader-percent]');
  let target = 0;
  let shown = 0;
  let finished = false;
  let raf = 0;
  let last = 0;
  const paint = () => {
    fill?.style.setProperty('--p', String(shown));
    if (label) label.textContent = percentLabel(shown);
    el?.setAttribute('aria-valuenow', String(Math.floor(shown * 100)));
  };
  const hide = () => {
    if (!el) return;
    el.dataset.done = '';
    el.setAttribute('aria-hidden', 'true');
    cancelAnimationFrame(raf);
  };
  const tick = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    // при reduced motion — без плавности; после finish() — быстрее
    shown = reducedMotion ? target : approach(shown, target, dt, finished ? 12 : 4);
    if (finished && target - shown < 0.005) shown = 1;
    paint();
    if (finished && shown >= 1) return void setTimeout(hide, reducedMotion ? 0 : 250);
    raf = requestAnimationFrame(tick);
  };
  if (el) raf = requestAnimationFrame(tick);
  return {
    set(p: number) {
      if (!finished) target = Math.max(target, Math.min(p, 0.99));
    },
    finish() {
      if (finished || !el) return;
      finished = true;
      target = 1;
    },
  };
}

onMounted(() => {
  const layer = root.value;
  const stage = layer?.closest<HTMLElement>('[data-stage]');
  const pin = stage?.querySelector<HTMLElement>('[data-pin]');
  const heroLayer = stage?.querySelector<HTMLElement>('[data-layer="hero"]');
  const projectsLayer = stage?.querySelector<HTMLElement>('[data-layer="projects"]');
  const aboutLayer = stage?.querySelector<HTMLElement>('[data-layer="about"]');
  const tail = stage?.nextElementSibling instanceof HTMLElement && stage.nextElementSibling.hasAttribute('data-stage-tail') ? stage.nextElementSibling : null;
  if (!layer || !stage || !pin || !heroLayer || !projectsLayer || !aboutLayer) return;

  const cards = [...stage.querySelectorAll<HTMLElement>('[data-card]')];
  const infos = [...stage.querySelectorAll<HTMLElement>('[data-info]')];
  const infoBox = stage.querySelector<HTMLElement>('[data-info-box]');
  const count = cards.length;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 1023.98px)');
  const preloader = createPreloader(document.querySelector<HTMLElement>('[data-preloader]'), reducedMotion);

  stage.dataset.fx = '';

  let transition = sceneState(0, 0, reducedMotion);
  let shownInfo = 0;
  let invalidate3d = () => {};

  // слой экрана: только прозрачность и блюр («туман»), без масштаба
  const setLayer = (el: HTMLElement, opacity: number, blur: number) => {
    el.style.opacity = String(opacity);
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
    el.toggleAttribute('data-hidden', opacity < 0.05);
  };

  let frame = 0;
  function update() {
    frame = 0;
    const vh = pin.clientHeight;
    const { t, active, u } = stageProgress(-stage.getBoundingClientRect().top, vh, count);
    transition = sceneState(t, u, reducedMotion);

    // 3D-маскот не размывается: он — сквозная нить между экранами
    setLayer(heroLayer, transition.heroOpacity, transition.heroBlur);
    setLayer(projectsLayer, transition.projectsOpacity, transition.projectsBlur);
    setLayer(aboutLayer, transition.aboutOpacity, transition.aboutBlur);

    const table = mobile.matches ? CARDS_MOBILE : CARDS_DESKTOP;
    cards.forEach((card, i) => {
      const p = cardPose(i - active, table);
      card.style.setProperty('--cx', String(p.x));
      card.style.setProperty('--cy', String(p.y));
      card.style.setProperty('--cs', String(p.scale));
      card.style.setProperty('--co', String(p.opacity));
      card.style.setProperty('--cb', p.blur.toFixed(2));
      card.style.pointerEvents = p.opacity < 0.05 ? 'none' : '';
    });

    // телефон: текст кейса под карточками — пока они едут, текст уходит в блюр
    if (infoBox) {
      const v = mobile.matches ? infoVisibility(active) : { opacity: 1, blur: 0 };
      infoBox.style.opacity = v.opacity === 1 ? '' : String(v.opacity);
      infoBox.style.filter = v.blur > 0.05 && !reducedMotion ? `blur(${v.blur.toFixed(2)}px)` : '';
    }

    const current = Math.round(active);
    if (current !== shownInfo) {
      infos[shownInfo]?.removeAttribute('data-active');
      infos[shownInfo]?.setAttribute('inert', '');
      infos[current]?.setAttribute('data-active', '');
      infos[current]?.removeAttribute('inert');
      shownInfo = current;
    }
    invalidate3d();
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  // фокус с клавиатуры: прокрутить сцену так, чтобы элемент был виден
  const scrollToStage = (at: number) => {
    const top = stage.getBoundingClientRect().top + scrollY + at * pin.clientHeight;
    scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  };
  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    const card = el.closest<HTMLElement>('[data-card]');
    if (card) return scrollToStage(STAGE.transition + STAGE.step * Number(card.dataset.card));
    if (heroLayer.contains(el) && transition.phase !== 'hero') return scrollToStage(0);
    if (projectsLayer.contains(el) && transition.projectsOpacity < 1) return scrollToStage(STAGE.transition);
    if (aboutLayer.contains(el) && transition.aboutOpacity < 1) scrollToStage(aboutStart(count) + STAGE.about);
  };

  // «Обо мне» выше экрана (телефон): под сценой нужен «хвост» на остаток секции
  const sizeTail = () => {
    if (tail) tail.style.height = `${Math.max(0, aboutLayer.offsetHeight - pin.clientHeight)}px`;
  };

  const ro = new ResizeObserver(() => {
    sizeTail();
    schedule();
  });
  ro.observe(pin);
  ro.observe(aboutLayer);
  addEventListener('scroll', schedule, { passive: true });
  mobile.addEventListener('change', schedule);
  stage.addEventListener('focusin', onFocus);
  cleanups.push(() => {
    ro.disconnect();
    removeEventListener('scroll', schedule);
    mobile.removeEventListener('change', schedule);
    stage.removeEventListener('focusin', onFocus);
    cancelAnimationFrame(frame);
  });
  sizeTail();
  update();

  // --- 3D
  void (async () => {
    if (!hasHardwareWebGL()) return preloader.finish();
    const timeout = setTimeout(preloader.finish, LOAD_TIMEOUT_MS);
    cleanups.push(() => clearTimeout(timeout));
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const progress = { code: 0, models: 0, init: 0 };
    const report = () => preloader.set(overallProgress(progress));
    try {
      const { createMascotScene } = await import('../../lib/mascot/scene');
      if (cancelled) return;
      progress.code = 1;
      report();
      const measure = () => {
        const hero = visiblePoster(heroLayer, 'hero')!;
        const projects = visiblePoster(projectsLayer, 'projects');
        const about = visiblePoster(aboutLayer, 'about');
        return {
          hero: { rect: offsetRect(hero, pin), bounds: posterBounds(hero) },
          projects: projects ? { rect: offsetRect(projects, pin), bounds: posterBounds(projects) } : null,
          about: about ? { rect: offsetRect(about, pin), bounds: posterBounds(about) } : null,
        };
      };
      const scene = await createMascotScene({
        // на touch-устройствах — текстуры 1024 вместо 2048
        modelUrl: canHover ? '/models/artem.glb' : '/models/artem-mobile.glb',
        modelSizes: props.modelSizes,
        onProgress: ({ models, init }) => {
          progress.models = models;
          progress.init = init;
          report();
        },
        container: layer,
        measure,
        getTransition: () => transition,
        reducedMotion,
        trackCursor: shouldTrackCursor({ canHover, reducedMotion }),
        onReady: () => {
          layer.dataset.ready = '';
          stage.dataset.mascot = 'ready'; // постеры уходят
          clearTimeout(timeout);
          preloader.finish();
        },
      });
      if (cancelled) return scene.dispose();
      invalidate3d = scene.invalidate;
      cleanups.push(scene.dispose);
    } catch (error) {
      // остаются постеры
      console.warn('3D-маскот не запустился', error);
      preloader.finish();
    }
  })();
});

onBeforeUnmount(() => {
  cancelled = true;
  for (const fn of cleanups) fn();
});
</script>

<template>
  <div ref="root" class="mascot-layer" aria-hidden="true"></div>
</template>

<style scoped>
.mascot-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.6s ease;
}

.mascot-layer[data-ready] {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .mascot-layer {
    transition: none;
  }
}
</style>
