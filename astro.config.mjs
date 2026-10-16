// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://portfolio-d4l.pages.dev',
  output: 'static',
  // IPv4: на некоторых Windows-машинах loopback ::1 заблокирован, а Astro по умолчанию слушает только его
  server: { host: '127.0.0.1' },
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});
