// Пересобирает веб-версии 3D-моделей: reference/*.glb → public/models/*.glb
// meshopt-сжатие геометрии (декодируется MeshoptDecoder), текстуры в WebP.
// Маскот: исходник уже подготовлен для веба (meshopt, WebP 2048 px) и копируется как есть — повторное сжатие
// заметно портит текстуры; artem-mobile.glb для touch-устройств — до 1024 px. Логотипы — до 512 px.
// Геометрию не упрощаем, чтобы не сломать риг.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const SRC = 'reference';
const OUT = join('public', 'models');
const MASCOT = 'artem.glb';

if (!existsSync(SRC)) {
  console.error('Нет папки reference/ с исходными GLB');
  process.exit(1);
}

function optimize(src, out, textureSize) {
  const args = ['gltf-transform', 'optimize', src, out, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', String(textureSize), '--simplify', 'false'];
  console.log(`→ ${out}`);
  execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.glb'))) {
  if (file === MASCOT) {
    console.log(`→ ${join(OUT, file)} (копия)`);
    copyFileSync(join(SRC, file), join(OUT, file));
    optimize(join(SRC, file), join(OUT, 'artem-mobile.glb'), 1024);
  } else {
    optimize(join(SRC, file), join(OUT, `tool-${basename(file)}`), 512);
  }
}
