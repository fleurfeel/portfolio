<script setup lang="ts">
// 3D-маскот поверх статичного постера. Остров гидрируется через client:idle,
// а three.js и модели грузятся отдельным чанком при первом действии пользователя
// (мышь, касание, скролл, клавиатура) и только при аппаратном WebGL.
// До этого виден постер — он совпадает с первым кадром, поэтому подмена незаметна.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { shouldTrackCursor } from '../../lib/mascot/math';
import { hasHardwareWebGL } from '../../lib/mascot/webgl-support';

const root = ref<HTMLDivElement>();
let dispose: (() => void) | undefined;
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

onMounted(async () => {
  const layer = root.value;
  const hero = layer?.closest<HTMLElement>('[data-hero]');
  const poster = hero?.querySelector<HTMLElement>('[data-mascot-poster]');
  if (!layer || !hero || !poster || !hasHardwareWebGL()) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  await whenUserActive();
  if (cancelled) return;

  try {
    const { createMascotScene } = await import('../../lib/mascot/scene');
    if (cancelled) return;
    const scene = await createMascotScene({
      // на touch-устройствах — текстуры 1024 вместо 2048
      modelUrl: canHover ? '/models/artem.glb' : '/models/artem-mobile.glb',
      container: layer,
      poster,
      reducedMotion,
      trackCursor: shouldTrackCursor({ canHover, reducedMotion }),
      onReady: () => {
        layer.dataset.ready = '';
        hero.dataset.mascot = 'ready'; // постер в Hero.astro уходит
      },
    });
    if (cancelled) scene.dispose();
    else dispose = scene.dispose;
  } catch (error) {
    // остаётся постер
    console.warn('3D-маскот не запустился', error);
  }
});

onBeforeUnmount(() => {
  cancelled = true;
  dispose?.();
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
</style>
