# portfolio

Портфолио продуктового дизайнера. Astro + TypeScript, Tailwind v4, Vue-острова. Правила проекта — в [CLAUDE.md](CLAUDE.md).

## Запуск

```bash
npm install
npm run test:install   # один раз: Chromium для Playwright
npm run dev            # http://127.0.0.1:4321
npm run check          # сборка + все проверки
```

## Деплой — Cloudflare Pages

| Настройка | Значение |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |
| Node | из `.node-version` (24) |

Заголовки кэша — в `public/_headers`.
