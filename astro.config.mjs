import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://vaxogroup.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ua', 'ru'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/(404|admin|demo|partner)\//.test(new URL(page).pathname),
      i18n: { defaultLocale: 'en', locales: { en: 'en', ua: 'uk', ru: 'ru' } },
    }),
  ],
});
