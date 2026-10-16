# Портфолио продуктового дизайнера

Astro + TypeScript (статическая сборка) · Tailwind v4 · Vue (только для островов, например калькулятора) · деплой на Cloudflare Pages (из GitHub `fleurfeel/portfolio`, ветка `main`).

## Команды

- `npm run dev` — dev-сервер (http://127.0.0.1:4321 — открывать по IP: loopback ::1 на этой машине заблокирован)
- `npm run check` — проверка файлов > 10 МБ, `astro check`, Vitest, сборка, Playwright, Lighthouse CI (мобильный + десктоп)
- `npm run test:watch` — Vitest в watch-режиме (для TDD)
- `npm run optimize:models` — пересобрать `public/models/*.glb` из `reference/`
- Lighthouse ищет браузер так: `CHROME_PATH` → Google Chrome → Brave → Chromium из Playwright

## Структура

- `src/styles/global.css` — все токены в `@theme` (единственное место, где допустимы hex)
- `src/layouts/BaseLayout.astro` — базовый лейаут (lang="ru", meta, preload шрифта)
- `public/fonts/` — Jura, вариативный woff2, subset latin + cyrillic
- `public/models/` — сжатые GLB (meshopt + WebP)
- `public/_headers` — заголовки кэша для Cloudflare Pages; `.node-version` — версия Node для сборки
- `docs/mascot.md` — разбор прототипа маскота: риг, анимации, параметры
- `tests/unit/` — Vitest, `tests/e2e/` — Playwright, `lighthouserc.cjs` — бюджет Lighthouse

## Правила

- Весь интерфейс и тексты — на русском.
- Секции собираются по макетам из Figma. При расхождении макета и токенов — спрашивать, а не придумывать.
- JS только в Astro-островах. По умолчанию — 0 KB клиентского JS.
- 3D-маскот: Three.js + GLTFLoader + MeshoptDecoder. Сначала статичная картинка (AVIF), 3D — через `client:idle`. Один WebGLRenderer на весь сайт. Пауза рендера вне viewport. Без слежения за курсором на touch и при `prefers-reduced-motion`. pixelRatio не выше 2.
- Изображения — только через `astro:assets`.
- Анимации — только `transform`/`opacity`, всегда уважать `prefers-reduced-motion`.
- Цвета и шрифты — только через токены, никаких hex в компонентах (проверяется тестом `tests/unit/tokens.test.ts`). Нужен новый цвет — сначала спросить и добавить токен в `@theme`.
- Сложные эффекты (spotlight, mix-blend, кастомные анимации) — обычный CSS в `<style>` компонента, на `var(--color-…)`.
- Логика (калькулятор и любые расчёты) — по TDD: сначала тесты в Vitest, потом код.
- После каждой задачи запускать `npm run check`. Задача не готова, пока он не проходит.
- Цель Lighthouse: 90+ мобильный, 95+ десктоп.
- В git не коммитить `reference/`, исходники 3D-моделей и файлы больше 10 МБ (pre-commit хук `.githooks/pre-commit`).
- Новые страницы добавлять в список `pages` в `tests/e2e/smoke.spec.ts`.
