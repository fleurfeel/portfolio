// Не даёт закоммитить файлы больше 10 МБ.
// Проверяет всё, что git отслеживает или увидит при `git add` (с учётом .gitignore).
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const LIMIT = 10 * 1024 * 1024;

let files;
try {
  files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
} catch {
  console.log('check-file-sizes: не git-репозиторий, пропускаю');
  process.exit(0);
}

const tooBig = files.flatMap((file) => {
  try {
    const { size } = statSync(file);
    return size > LIMIT ? [`${file} — ${(size / 1024 / 1024).toFixed(1)} МБ`] : [];
  } catch {
    return []; // файл удалён в рабочей копии
  }
});

if (tooBig.length) {
  console.error('Файлы больше 10 МБ нельзя коммитить:\n  ' + tooBig.join('\n  '));
  process.exit(1);
}
console.log(`check-file-sizes: ок (${files.length} файлов ≤ 10 МБ)`);
