<script setup lang="ts">
// Остров 3D-головы в футере (client:visible). На главной голову приводит общая сцена (Stage.vue) — там остров
// ничего не делает. Без аппаратного WebGL или при ошибке остаётся PNG-постер.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { shouldTrackCursor } from '../../lib/mascot/math';
import { hasHardwareWebGL } from '../../lib/mascot/webgl-support';

const props = defineProps<{ modelUrl: string; mobileModelUrl: string }>();
const host = ref<HTMLDivElement>();
let dispose: (() => void) | null = null;
let cancelled = false;

onMounted(async () => {
  const el = host.value;
  const frame = el?.closest<HTMLElement>('.footer__head');
  if (!el || !frame || document.querySelector('[data-stage]') || !hasHardwareWebGL()) return;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const { createHeadScene } = await import('../../lib/mascot/head-scene');
    if (cancelled) return;
    dispose = await createHeadScene({
      container: el,
      // на touch-устройствах — текстуры 1024 вместо 2048
      modelUrl: canHover ? props.modelUrl : props.mobileModelUrl,
      observe: frame,
      trackCursor: shouldTrackCursor({ canHover, reducedMotion }),
      reducedMotion,
      onReady: () => (frame.dataset.ready = ''), // постер уходит
    });
    if (cancelled) dispose();
  } catch (error) {
    console.warn('3D-голова в футере не запустилась', error);
  }
});

onBeforeUnmount(() => {
  cancelled = true;
  dispose?.();
});
</script>

<template>
  <div ref="host" class="footer-head-3d" aria-hidden="true"></div>
</template>

<style scoped>
/* ровно по рамке PNG-постера head.png (1334 × 1179): камера наведена по нему */
.footer-head-3d {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 1334 / 1179;
  pointer-events: none;
}
</style>
