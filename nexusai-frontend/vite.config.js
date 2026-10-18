/* global process */
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Link previews (WhatsApp, LinkedIn, X) need an absolute image URL. Set VITE_SITE_URL
// to your live address; on Vercel the production domain is picked up automatically.
function siteUrl(env) {
  const raw = env.VITE_SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return raw.replace(/\/+$/, '');
}

const injectSiteUrl = (site) => ({
  name: 'inject-site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE%', site),
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), injectSiteUrl(siteUrl({ ...process.env, ...loadEnv(mode, process.cwd(), '') }))],
  build: {
    rolldownOptions: {
      output: {
        // Keep the big third-party libraries in their own cached files.
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    clearMocks: true,
    setupFiles: ['src/setupTests.js'],
  },
}))
