import { isSoftwareRenderer } from './math';

/** Есть ли аппаратный WebGL2. Без three.js — проверка до загрузки тяжёлого чанка. */
export function hasHardwareWebGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !isSoftwareRenderer(name);
  } catch {
    return false;
  }
}
