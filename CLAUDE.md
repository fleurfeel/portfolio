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
- Прод: https://portfolio-d4l.pages.dev (`site` в astro.config.mjs)
- `public/_headers` — заголовки кэша для Cloudflare Pages; `.node-version` — версия Node для сборки
- `docs/mascot.md` — разбор прототипа маскота: риг, анимации, параметры
- `src/components/stage/` — скролл-сцена: первый экран, «Избранные проекты» и «Обо мне» слоями в одном sticky-экране, переходы «туман» и карусель (`Stage.vue`, математика в `src/lib/stage/math.ts`)
- `src/data/about.ts` — тексты «Обо мне» (образование, опыт); резюме — `public/resume.pdf`
- `src/data/projects.ts` — кейсы, страницы `/projects` и `/projects/[slug]`
- `tests/unit/` — Vitest, `tests/e2e/` — Playwright, `lighthouserc.cjs` — бюджет Lighthouse

## Правила

- Весь интерфейс и тексты — на русском.
- Секции собираются по макетам из Figma. При расхождении макета и токенов — спрашивать, а не придумывать.
- JS только в Astro-островах. По умолчанию — 0 KB клиентского JS.
- 3D-маскот: Three.js + GLTFLoader + MeshoptDecoder. На главной — прелоадер (`src/components/preloader/`) с реальным прогрессом загрузки, страница открывается уже с 3D; AVIF-постеры — запасной вариант (нет WebGL, ошибка, дольше 15 с, нет JS). 3D — через `client:idle`. Один WebGLRenderer на весь сайт. Пауза рендера вне viewport. Без слежения за курсором на touch и при `prefers-reduced-motion`. pixelRatio не выше 2.
- Изображения — только через `astro:assets`.
- Анимации — только `transform`/`opacity`, всегда уважать `prefers-reduced-motion`. Исключения (согласованы): `filter: blur` в переходе «первый экран → проекты» (туман на слоях экранов, `Stage.vue`; при reduced motion выключен) и глубина резкости карточек кейсов (блюр по удалённости от активной).
- Цвета и шрифты — только через токены, никаких hex в компонентах (проверяется тестом `tests/unit/tokens.test.ts`). Нужен новый цвет — сначала спросить и добавить токен в `@theme`.
- Сложные эффекты (spotlight, mix-blend, кастомные анимации) — обычный CSS в `<style>` компонента, на `var(--color-…)`.
- Логика (калькулятор и любые расчёты) — по TDD: сначала тесты в Vitest, потом код.
- После каждой задачи запускать `npm run check`. Задача не готова, пока он не проходит.
- Бюджет Lighthouse: performance 65+ и на мобильном, и на десктопе (снижен ради прелоадера с 3D на старте; прежняя цель была 90+/95+). Не опускать дальше без согласования.
- В git не коммитить `reference/`, исходники 3D-моделей и файлы больше 10 МБ (pre-commit хук `.githooks/pre-commit`).
- Новые страницы добавлять в список `pages` в `tests/e2e/smoke.spec.ts`.
