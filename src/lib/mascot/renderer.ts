import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import { clampPixelRatio } from './math';

// Один WebGLRenderer на весь сайт: сцены переносят его canvas к себе, а не создают новый контекст.
let shared: WebGLRenderer | null = null;

export function getRenderer() {
  if (!shared) {
    shared = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    shared.setPixelRatio(clampPixelRatio(window.devicePixelRatio));
    shared.outputColorSpace = SRGBColorSpace;
    shared.toneMapping = ACESFilmicToneMapping;
    shared.toneMappingExposure = 1.05;
  }
  return shared;
}
