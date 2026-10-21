import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { clampPixelRatio, shouldAntialias } from './math';

// Один WebGLRenderer на весь сайт: сцены переносят его canvas к себе, а не создают новый контекст.
let shared: WebGLRenderer | null = null;

export function getRenderer() {
  if (!shared) {
    // MSAA только на обычных экранах: при pixelRatio 2 канвас во весь экран — 2880×1800 и больше,
    // мультисэмплинг на таком буфере даёт зависания GPU до 1 с, а на плотном экране лесенки и так не видно.
    shared = new WebGLRenderer({ antialias: shouldAntialias(window.devicePixelRatio), alpha: true, powerPreference: 'high-performance' });
    shared.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
    shared.outputColorSpace = SRGBColorSpace;
    shared.toneMapping = ACESFilmicToneMapping;
    shared.toneMappingExposure = 1.05;
  }
  return shared;
}
