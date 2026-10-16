<script setup lang="ts">
// Скролл-сцена «первый экран → избранные проекты» и 3D-маскот.
// Гидрируется через client:idle: включает sticky-сцену, по скроллу двигает слои (пролёт с блюром)
// и карточки на дуге. three.js и модели грузятся при первом действии пользователя
// и только при аппаратном WebGL; до этого маскота показывают постеры.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { shouldTrackCursor } from '../../lib/mascot/math';
import { hasHardwareWebGL } from '../../lib/mascot/webgl-support';
import { offsetRect, posterBounds, visiblePoster } from '../../lib/stage/dom';
import { CARDS_DESKTOP, CARDS_MOBILE, STAGE, cardPose, stageProgress, transitionState } from '../../lib/stage/math';

const root = ref<HTMLDivElement>();
const cleanups: (() => void)[] = [];
let cancelled = false;

const ACTIVITY = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'] as const;

function whenUserActive() {
  return new Promise<void>((resolve) => {
    const go = () => {
      for (const e of ACTIVITY) removeEventListener(e, go);
      resolve();
    };
    for (const e of ACTIVITY) addEventListener(e, go, { passive: true });
  });
}

onMounted(() => {
  const layer = root.value;
  const stage = layer?.closest<HTMLElement>('[data-stage]');
  const pin = stage?.querySelector<HTMLElement>('[data-pin]');
  const heroLayer = stage?.querySelector<HTMLElement>('[data-layer="hero"]');
  const projectsLayer = stage?.querySelector<HTMLElement>('[data-layer="projects"]');
  if (!layer || !stage || !pin || !heroLayer || !projectsLayer) return;

  const cards = [...stage.querySelectorAll<HTMLElement>('[data-card]')];
  const infos = [...stage.querySelectorAll<HTMLElement>('[data-info]')];
  const count = cards.length;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 1023.98px)');

  stage.dataset.fx = '';

  let transition = transitionState(0, reducedMotion);
  let shownInfo = 0;
  let invalidate3d = () => {};

  // точки, вокруг которых растут слои при пролёте, — глаза маскота на постерах
  const origin = (poster: HTMLElement | null) => {
    if (!poster) return '50% 50%';
    const r = offsetRect(poster, pin);
    const b = posterBounds(poster);
    return `${r.left + r.width * b.centerX}px ${r.top + r.height * b.eye}px`;
  };
  const measureOrigins = () => {
    heroLayer.style.transformOrigin = origin(visiblePoster(heroLayer, 'hero'));
    projectsLayer.style.transformOrigin = origin(visiblePoster(projectsLayer, 'projects'));
  };

  const setLayer = (el: HTMLElement, scale: number, opacity: number, blur: number) => {
    el.style.transform = scale === 1 ? '' : `scale(${scale})`;
    el.style.opacity = String(opacity);
    el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
    el.toggleAttribute('data-hidden', opacity < 0.05);
  };

  let frame = 0;
  function update() {
    frame = 0;
    const vh = pin.clientHeight;
    const { t, active } = stageProgress(-stage.getBoundingClientRect().top, vh, count);
    transition = transitionState(t, reducedMotion);

    setLayer(heroLayer, transition.heroScale, transition.heroOpacity, transition.phase === 'hero' ? transition.blur : 0);
    setLayer(projectsLayer, transition.projectsScale, transition.projectsOpacity, transition.phase === 'projects' ? transition.blur : 0);
    layer.style.filter = transition.blur > 0.05 ? `blur(${transition.blur.toFixed(2)}px)` : '';

    const table = mobile.matches ? CARDS_MOBILE : CARDS_DESKTOP;
    cards.forEach((card, i) => {
      const p = cardPose(i - active, table);
      card.style.setProperty('--cx', String(p.x));
      card.style.setProperty('--cy', String(p.y));
      card.style.setProperty('--cs', String(p.scale));
      card.style.setProperty('--co', String(p.opacity));
      card.style.pointerEvents = p.opacity < 0.05 ? 'none' : '';
    });

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
    if (projectsLayer.contains(el) && transition.projectsOpacity < 1) scrollToStage(STAGE.transition);
  };

  const ro = new ResizeObserver(() => {
    measureOrigins();
    schedule();
  });
  ro.observe(pin);
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
  measureOrigins();
  update();

  // --- 3D
  void (async () => {
    if (!hasHardwareWebGL()) return;
    await whenUserActive();
    if (cancelled) return;
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    try {
      const { createMascotScene } = await import('../../lib/mascot/scene');
      if (cancelled) return;
      const measure = () => {
        const hero = visiblePoster(heroLayer, 'hero')!;
        const projects = visiblePoster(projectsLayer, 'projects');
        return {
          hero: { rect: offsetRect(hero, pin), bounds: posterBounds(hero) },
          projects: projects ? { rect: offsetRect(projects, pin), bounds: posterBounds(projects) } : null,
        };
      };
      const scene = await createMascotScene({
        // на touch-устройствах — текстуры 1024 вместо 2048
        modelUrl: canHover ? '/models/artem.glb' : '/models/artem-mobile.glb',
        container: layer,
        measure,
        getTransition: () => transition,
        reducedMotion,
        trackCursor: shouldTrackCursor({ canHover, reducedMotion }),
        onReady: () => {
          layer.dataset.ready = '';
          stage.dataset.mascot = 'ready'; // постеры уходят
        },
      });
      if (cancelled) return scene.dispose();
      invalidate3d = scene.invalidate;
      cleanups.push(scene.dispose);
    } catch (error) {
      // остаются постеры
      console.warn('3D-маскот не запустился', error);
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
