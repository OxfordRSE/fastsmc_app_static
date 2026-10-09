import { defineConfig, devices } from '@playwright/test'

// The smoke test and the accessibility checks run against the production build,
// each run building it afresh and serving it under a base path as
// GitHub Pages serves it. Deploy passes the real one; elsewhere any path other
// than '/' catches asset URLs that ignore it.
const basePath = process.env.BASE_PATH ?? '/smoke-test'
const port = 4173
const siteUrl = `http://localhost:${String(port)}${basePath}/`

export default defineConfig({
  testDir: 'e2e',
  // In CI, a test left focused with test.only fails the run instead of skipping the rest.
  forbidOnly: Boolean(process.env.CI),
  // A flaky failure should be seen and fixed, not retried away.
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: siteUrl, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Build and serve the site before the tests, and stop the server after them.
  webServer: {
    command: `npm run build && npm run preview -- --port ${String(port)} --strictPort`,
    env: { BASE_PATH: basePath },
    url: siteUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
