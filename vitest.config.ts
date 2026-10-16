/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig подтягивает Vite-плагины Astro (в т.ч. Vue), чтобы логику и компоненты
// можно было тестировать в том же окружении, что и сборку.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
