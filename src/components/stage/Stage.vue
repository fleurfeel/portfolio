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
import { CARDS_DESKTOP, CARDS_MOBILE, STAGE, aboutStart, cardPose, headProgress, infoVisibility, partLine, sceneState, snapToStep, stageProgress } from '../../lib/stage/math';

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
  // манифест после сцены: там 3D-маскот остаётся одной головой
  const manifesto = document.querySelector<HTMLElement>('[data-manifesto]');
  const headPoster = manifesto?.querySelector<HTMLElement>('[data-mascot-poster="head"]') ?? null;
  // «Как я работаю»: голова из манифеста перетекает сюда
  const how = document.querySelector<HTMLElement>('[data-how]');
  const howHeadPoster = how?.querySelector<HTMLElement>('[data-mascot-poster="how-head"]') ?? null;

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
    // холст фиксирован во весь экран: клики по маскоту — только пока сцена на экране
    layer.style.pointerEvents = pin.getBoundingClientRect().top < -1 ? 'none' : '';
    partWords();
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

  // манифест: слова переворачиваются, когда секция поднялась примерно на треть экрана;
  // ушла вниз за экран — сбрасываем, чтобы при следующем заходе эффект проигрался снова
  if (manifesto && !reducedMotion) {
    manifesto.dataset.reveal = manifesto.getBoundingClientRect().top < innerHeight * 0.7 ? 'in' : '';
    const reveal = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) manifesto.dataset.reveal = 'in';
        else if (e.boundingClientRect.top > 0) manifesto.dataset.reveal = '';
      },
      { rootMargin: '0px 0px -30% 0px' },
    );
    reveal.observe(manifesto);
    cleanups.push(() => reveal.disconnect());
  }

  // «Как я работаю» на ноутбуке и десктопе — закреплённый экран, шаг = 60% экрана.
  // Когда прокрутка остановилась внутри блока, плавно доводим её ровно до ближайшего шага.
  const howPin = how?.querySelector<HTMLElement>('.how__pin') ?? null;
  const howSteps = how ? how.querySelectorAll('.how__track--client .how__step').length : 0;
  let snapping = false;
  const snapHow = () => {
    if (!how || !howPin || snapping || getComputedStyle(howPin).position !== 'sticky') return;
    const stepPx = howPin.clientHeight * 0.6;
    const offset = -how.getBoundingClientRect().top;
    const target = snapToStep(offset, stepPx, howSteps);
    if (target === null) return;
    snapping = true;
    scrollTo({ top: scrollY + (target - offset), behavior: reducedMotion ? 'auto' : 'smooth' });
    setTimeout(() => (snapping = false), 600);
  };
  let snapTimer = 0;
  const onScrollEnd = () => snapHow();
  // scrollend есть не везде — запасной вариант: пауза в прокрутке 160 мс
  const onScrollIdle = () => {
    clearTimeout(snapTimer);
    snapTimer = window.setTimeout(snapHow, 160);
  };
  const hasScrollEnd = 'onscrollend' in window;
  if (how) {
    if (hasScrollEnd) addEventListener('scrollend', onScrollEnd);
    else addEventListener('scroll', onScrollIdle, { passive: true });
    cleanups.push(() => {
      removeEventListener('scrollend', onScrollEnd);
      removeEventListener('scroll', onScrollIdle);
      clearTimeout(snapTimer);
    });
  }

  // рамка PNG-головы манифеста в документе (по offset*, без анимации появления)
  let headDoc = headPoster ? offsetRect(headPoster, document.body) : null;
  const measureHead = () => {
    headDoc = headPoster ? offsetRect(headPoster, document.body) : null;
  };
  const mixRect = (a: { left: number; top: number; width: number; height: number }, b: typeof a, m: number) => ({
    left: a.left + (b.left - a.left) * m,
    top: a.top + (b.top - a.top) * m,
    width: a.width + (b.width - a.width) * m,
    height: a.height + (b.height - a.height) * m,
  });

  // рамка 3D-головы в окне сейчас и прогресс «тело → голова»
  const headNow = () => {
    let head = headDoc ? { ...headDoc, top: headDoc.top - scrollY } : null;
    const headMix = manifesto ? headProgress(manifesto.getBoundingClientRect().top, innerHeight) : 0;
    if (head && howHeadPoster) {
      // голова манифеста → голова «Как я работаю»: доходит, когда та поднялась примерно на 60% экрана.
      // Рамку берём живую: на ноутбуке и десктопе «Как я работаю» — закреплённый (sticky) экран
      const r = howHeadPoster.getBoundingClientRect();
      const m = headProgress(r.top - innerHeight * 0.45, innerHeight);
      if (m > 0) head = mixRect(head, { left: r.left, top: r.top, width: r.width, height: r.height }, m);
    }
    return { head, headMix };
  };

  // голова пролетает сквозь манифест и раздвигает строки (только с 3D и без reduced motion)
  const words = manifesto && !reducedMotion ? [...manifesto.querySelectorAll<HTMLElement>('.manifesto__word')] : [];
  // строки манифеста: слова с одинаковым offsetTop
  let lines: { top: number; height: number; els: HTMLElement[]; rects: { left: number; width: number }[] }[] = [];
  const measureWords = () => {
    lines = [];
    for (const w of words) {
      const r = offsetRect(w, document.body);
      let line = lines.find((l) => Math.abs(l.top - r.top) < 2);
      if (!line) lines.push((line = { top: r.top, height: r.height, els: [], rects: [] }));
      line.els.push(w);
      line.rects.push(r);
    }
  };
  let parted = false;
  const partWords = () => {
    if (!words.length || stage.dataset.mascot !== 'ready') return;
    const { head, headMix } = headNow();
    const box = manifesto!.getBoundingClientRect();
    const near = head && headMix > 0 && box.bottom > 0 && box.top < innerHeight;
    if (!near) {
      if (parted) words.forEach((w) => w.style.removeProperty('translate'));
      parted = false;
      return;
    }
    const cx = head.left + head.width / 2;
    const cy = head.top + scrollY + head.height / 2;
    // проём по размеру головы; на высоте строки — хорда круга
    const radius = head.width * 0.45;
    for (const line of lines) {
      const dy = Math.max(0, Math.abs(cy - (line.top + line.height / 2)) - line.height / 2);
      const half = dy < radius ? Math.sqrt(radius * radius - dy * dy) * headMix : 0;
      partLine(line.rects, cx, half).forEach((x, i) => {
        line.els[i]!.style.translate = x ? `${x.toFixed(1)}px 0` : '';
      });
    }
    parted = true;
  };

  const ro = new ResizeObserver(() => {
    sizeTail();
    measureHead();
    measureWords();
    schedule();
  });
  ro.observe(pin);
  ro.observe(aboutLayer);
  if (manifesto) ro.observe(manifesto);
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
  measureWords();
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
        getDynamic: () => ({ pinTop: pin.getBoundingClientRect().top, ...headNow() }),
        observe: [pin, manifesto, how].filter((el): el is HTMLElement => !!el),
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
  /* во весь экран: маскот перелетает из сцены в манифест */
  position: fixed;
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
