// Lighthouse CI: мобильный профиль (по умолчанию в Lighthouse — эмуляция Moto G Power + троттлинг 4G).
// Цель проекта: performance ≥ 90 на мобильном (бюджет, ломает `npm run check`) и ≥ 95 на десктопе.
const { chromium } = require('playwright-core');

// Chrome: CHROME_PATH → установленный Google Chrome → Chromium из Playwright (CI без Chrome)
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    const { Launcher } = require('chrome-launcher');
    const [installed] = Launcher.getInstallations();
    if (installed) return installed;
  } catch {}
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
