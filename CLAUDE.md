# Портфолио продуктового дизайнера

Astro + TypeScript (статическая сборка) · Tailwind v4 · Vue (только для островов, например калькулятора) · деплой на Cloudflare Pages (из GitHub `fleurfeel/portfolio`, ветка `main`).

## Команды

- `npm run dev` — dev-сервер (http://127.0.0.1:4321 — открывать по IP: loopback ::1 на этой машине заблокирован)
- `npm run check` — проверка файлов > 10 МБ, `astro check`, Vitest, сборка, Playwright, Lighthouse CI (мобильный + десктоп)
- `npm run test:watch` — Vitest в watch-режиме (для TDD)
- `npm run optimize:models` — пересобрать `public/models/*.glb` из `reference/` (маскот `artem.glb` копируется как есть, он уже сжат)
- Lighthouse ищет браузер так: `CHROME_PATH` → Google Chrome → Brave → Chromium из Playwright

## Структура

- `src/styles/global.css` — все токены в `@theme` (единственное место, где допустимы hex)
- `src/layouts/BaseLayout.astro` — базовый лейаут (lang="ru", meta, preload шрифта)
- `public/fonts/` — Sofia Sans Semi Condensed, вариативный woff2, subset latin + cyrillic
- `public/models/` — сжатые GLB (meshopt + WebP)
- Прод: https://portfolio-d4l.pages.dev (`site` в astro.config.mjs)
- `public/_headers` — заголовки кэша для Cloudflare Pages; `.node-version` — версия Node для сборки
- `docs/mascot.md` — разбор прототипа маскота: риг, анимации, параметры
- `src/components/stage/` — скролл-сцена: первый экран, «Избранные проекты» и «Обо мне» слоями в одном sticky-экране, переходы «туман» и карусель (`Stage.vue`, математика в `src/lib/stage/math.ts`)
- `src/data/about.ts` — тексты «Обо мне» (образование, опыт); резюме — `public/resume.pdf`
- `src/data/cases/` — разборы кейсов по slug (факты и разделы «заголовок — текст — экраны»), экраны лежат в `src/assets/projects/<slug>/`; кейс без разбора показывает только шапку. Экраны кейса открываются во весь экран по нажатию: остров `src/components/case/CaseLightbox.vue` (кнопки `data-zoom`, размер в макете — `data-natural`), расчёты — `src/lib/case/lightbox.ts`
- `src/data/projects.ts` — кейсы, страницы `/projects` и `/projects/[slug]`; по нажатию обложка карточки вырастает в шапку кейса и сворачивается обратно — нативный переход между страницами (`@view-transition` и `case-cover` в `global.css`, без JS-роутера). На главной имя перехода получает только нажатая карточка (ставит `Stage.vue`), в `/projects` имена статичны
- `src/components/manifesto/` — цитата-манифест после сцены; переворот слов волной по времени, когда сам текст поднялся на 20% экрана (запускает Stage.vue, атрибут `data-reveal`); 3D-маскот прилетает сюда одной головой (холст сцены — окно во весь экран, которое едет вместе со страницей: `placeLayer` в Stage.vue, чтобы на телефоне маскот не дрожал относительно текста)
- `src/components/how/` и `src/data/how.ts` — «Как я работаю»: две ветки шагов; на телефоне переключатель на радиокнопках (`:has(:checked)`, без JS) и шкала прогресса с головой (sticky + scroll-driven); 3D-голова перетекает сюда из манифеста
- `src/components/services/` и `src/data/services.ts` — «Услуги и стоимость» (`#services`): список строк (название, теги, описание, срок и цена); появление по скроллу (scroll-driven: линия, переворот слов, теги веером), реакция на наведение; ≥ 1024 — три колонки, 640–1023 — описание и цена рядом, телефон — один столбец
- Заявки: кнопки «Оставить заявку» в строках услуг → форма `src/components/services/LeadForm.vue` → `functions/api/lead.ts` (Cloudflare Pages Function) → Telegram. Проверка полей — `src/lib/lead/lead.ts` (общая для формы и функции). В Cloudflare нужны переменные `TELEGRAM_BOT_TOKEN` (секрет) и `TELEGRAM_CHAT_ID`; локально (`astro dev`/`preview`) функции нет — в e2e запрос подменяется
- `src/components/faq/` и `src/data/faq.ts` — «Частые вопросы» (`#faq`): аккордеон на `<details name="faq">` без JS; кнопка «Задать вопрос» открывает ту же форму заявки
- `src/components/footer/` — футер (на фоне сайта, снизу выглядывает 3D-голова, на страницах без 3D — постер; ссылки на документы); `src/data/legal.ts` + `src/components/legal/` — страницы `/privacy` и `/consent` (152-ФЗ). Форма заявки требует галочку согласия (`consent` в `parseLead`). Меняя текст документов, обновлять `edition`
- `tests/unit/` — Vitest, `tests/e2e/` — Playwright, `lighthouserc.cjs` — бюджет Lighthouse

## Правила

- Весь интерфейс и тексты — на русском.
- Секции собираются по макетам из Figma. При расхождении макета и токенов — спрашивать, а не придумывать.
- JS только в Astro-островах. По умолчанию — 0 KB клиентского JS.
- 3D-маскот: Three.js + GLTFLoader + MeshoptDecoder. На главной — прелоадер (`src/components/preloader/`) с реальным прогрессом загрузки, страница открывается уже с 3D; AVIF-постеры — запасной вариант (нет WebGL, ошибка, дольше 15 с, нет JS). 3D — через `client:idle`. Один WebGLRenderer на весь сайт. Пауза рендера вне viewport. Без слежения за курсором на touch и при `prefers-reduced-motion`. pixelRatio не выше 2.
- Изображения — только через `astro:assets`.
- Анимации — только `transform`/`opacity`, всегда уважать `prefers-reduced-motion`. Исключения (согласованы): `filter: blur` в переходе «первый экран → проекты» (туман на слоях экранов, `Stage.vue`; при reduced motion выключен) глубина резкости карточек кейсов (блюр по удалённости от активной) фокус в «Как я работаю» (закреплённый экран, текущая пара шагов резкая, соседние — блюр; только ноутбук и десктоп) и высота ответа в аккордеоне FAQ (`::details-content` + `interpolate-size`, плавно открывается и закрывается).
- Цвета и шрифты — только через токены, никаких hex в компонентах (проверяется тестом `tests/unit/tokens.test.ts`). Нужен новый цвет — сначала спросить и добавить токен в `@theme`.
- Сложные эффекты (spotlight, mix-blend, кастомные анимации) — обычный CSS в `<style>` компонента, на `var(--color-…)`.
- Логика (калькулятор и любые расчёты) — по TDD: сначала тесты в Vitest, потом код.
- После каждой задачи запускать `npm run check`. Задача не готова, пока он не проходит.
- Бюджет Lighthouse: performance 65+ и на мобильном, и на десктопе (снижен ради прелоадера с 3D на старте; прежняя цель была 90+/95+). Не опускать дальше без согласования.
- В git не коммитить `reference/`, исходники 3D-моделей и файлы больше 10 МБ (pre-commit хук `.githooks/pre-commit`).
- Новые страницы добавлять в список `pages` в `tests/e2e/smoke.spec.ts`.
