import { defineConfig, envField } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
 site: 'https://ember-and-ink.sm-officialcreates.workers.dev',
  output: 'static',

  integrations: [
    sitemap({
      // Keep utility pages out of the sitemap.
      filter: (page) => !page.includes('/404') && !page.includes('/thank-you'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  // Avoid eagerly prefetching every visible link; pages opt in only where useful.
// Typed environment variables. Access them via `astro:env/client`
  // in components â€” never read `process.env` directly in client code.
  env: {
    schema: {
      PUBLIC_AMAZON_ASSOCIATE_TAG: envField.string({
        context: 'client',
        access: 'public',
        default: 'shubhstor0de4-21',
      }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_CONTACT_FORM_ENDPOINT: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_NEWSLETTER_FORM_ENDPOINT: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
});
