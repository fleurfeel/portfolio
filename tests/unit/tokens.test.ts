import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const globalCss = readFileSync(join(root, 'src/styles/global.css'), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('дизайн-токены', () => {
  it.each([
    ['--color-text', '#1b1b1b'],
    ['--color-bg', '#f2f3f5'],
    ['--color-accent', '#4b3bd6'],
    ['--color-secondary', '#5c6370'],
  ])('%s = %s в @theme', (token, value) => {
    expect(globalCss.toLowerCase()).toContain(`${token}: ${value};`);
  });

  it('основной шрифт — Jura', () => {
    expect(globalCss).toMatch(/--font-sans:\s*'Jura'/);
  });
});

describe('правила кода', () => {
  // Цвета — только через токены: hex разрешён лишь в src/styles/global.css
  const files = walk(join(root, 'src')).filter(
    (f) => /\.(astro|vue|ts|tsx|js|css)$/.test(f) && !f.endsWith(join('styles', 'global.css')) && !f.endsWith('.test.ts'),
  );

  it.each(files.map((f) => [relative(root, f), f]))('нет hex-цветов в %s', (_name, file) => {
    const source = readFileSync(file, 'utf8');
    const hex = source.match(/#[0-9a-fA-F]{3,8}\b(?![-\w])/g) ?? [];
    expect(hex).toEqual([]);
  });
});
