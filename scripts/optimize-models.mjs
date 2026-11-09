// Пересобирает веб-версии 3D-моделей: reference/*.glb → public/models/*.glb
// meshopt-сжатие геометрии (декодируется MeshoptDecoder), текстуры в WebP.
// Маскот: сжимается только геометрия, текстуры (2048 px) остаются как в исходнике — перекодирование
// заметно портит их; artem-mobile.glb для touch-устройств — текстуры WebP до 1024 px. Логотипы — до 512 px.
// Геометрию не упрощаем, чтобы не сломать риг.
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

function optimize(src, out, textureSize) {
  const textures = textureSize ? ['--texture-compress', 'webp', '--texture-size', String(textureSize)] : ['--texture-compress', 'false'];
  const args = ['gltf-transform', 'optimize', src, out, '--compress', 'meshopt', ...textures, '--simplify', 'false'];
  console.log(`→ ${out}`);
  execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.glb'))) {
  if (file === MASCOT) {
    optimize(join(SRC, file), join(OUT, file), 0);
    optimize(join(SRC, file), join(OUT, 'artem-mobile.glb'), 1024);
  } else {
    optimize(join(SRC, file), join(OUT, `tool-${basename(file)}`), 512);
  }
}
