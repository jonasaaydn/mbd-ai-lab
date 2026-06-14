import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jonasaaydn.github.io',
  base: '/mbd-ai-lab/',
  integrations: [
    sitemap({
      // 更新頻度・優先度のヒント（Google へのクロール指示）
      changefreq: 'daily',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: false,
    },
  },
});
