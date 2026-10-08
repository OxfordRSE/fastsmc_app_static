import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'
import { en } from './src/content/en.ts'

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

// https://vite.dev/config/
export default defineConfig({
  // Set in CI from actions/configure-pages, e.g. '/fastsmc_app_static'; unset locally.
  base: `${process.env.BASE_PATH ?? ''}/`,
  plugins: [
    react(),
    tailwindcss(),
    {
      // The page title is copy too, so it comes from src/content/en.ts.
      name: 'page-title-from-copy',
      transformIndexHtml: (html) =>
        html.replace('%APP_TITLE%', escapeHtml(en.appTitle)),
    },
  ],
  test: {
    // Logic tests (*.test.ts) run in Node; component tests (*.test.tsx) in a real browser.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.test.tsx'],
          // Tailwind's classes only work with its stylesheet, which main.tsx loads in the app.
          setupFiles: ['./src/index.css'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
