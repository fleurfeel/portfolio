// Пересобирает веб-версии 3D-моделей: reference/*.glb → public/models/*.glb
// meshopt-сжатие геометрии (декодируется MeshoptDecoder), текстуры в WebP.
// Маскот — текстуры до 2048px, логотипы инструментов — до 512px. Геометрию не упрощаем, чтобы не сломать риг.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const SRC = 'reference';
const OUT = join('public', 'models');
const MASCOT = 'artem.glb';

if (!existsSync(SRC)) {
  console.error('Нет папки reference/ с исходными GLB');
  process.exit(1);
}

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.glb'))) {
  const isMascot = file === MASCOT;
  const out = join(OUT, isMascot ? file : `tool-${basename(file)}`);
  const args = ['gltf-transform', 'optimize', join(SRC, file), out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', isMascot ? '2048' : '512', '--simplify', 'false'];
  console.log(`→ ${out}`);
  execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
}
