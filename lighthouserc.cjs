// Lighthouse CI: мобильный профиль (по умолчанию в Lighthouse — эмуляция Moto G Power + троттлинг 4G).
// Цель проекта: performance ≥ 90 на мобильном (бюджет, ломает `npm run check`) и ≥ 95 на десктопе.
const { chromium } = require('playwright-core');

const { existsSync } = require('node:fs');
const { join } = require('node:path');

const BRAVE_PATHS = [
  join(process.env.PROGRAMFILES || 'C:\Program Files', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/brave-browser',
];

// Браузер: CHROME_PATH → Google Chrome → Brave → Chromium из Playwright (CI без браузеров)
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const { Launcher } = require('chrome-launcher');
    const [installed] = Launcher.getInstallations();
    if (installed) return installed;
  } catch {}
  const brave = BRAVE_PATHS.find((p) => existsSync(p));
  if (brave) return brave;
  return chromium.executablePath();
}

const preset = process.env.LH_FORM_FACTOR === 'desktop' ? 'desktop' : 'mobile';

module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['/'],
      numberOfRuns: 3,
      chromePath: chromePath(),
      settings: {
        ...(preset === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--headless=new --no-sandbox',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: preset === 'desktop' ? 0.95 : 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `./.lighthouseci/${preset}`,
    },
  },
};
