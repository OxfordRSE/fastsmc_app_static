// Checks the production build as a visitor sees it: what the component tests,
// which render the app in a test page, cannot. Behaviour is tested there.

import { expect, type Page, test } from '@playwright/test'
import { en } from '../src/content/en.ts'

test('the built site loads and works under its base path', async ({
  page,
  baseURL,
}) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`)
  })
  page.on('requestfailed', (request) => {
    problems.push(`request failed: ${request.url()}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`HTTP ${String(response.status())}: ${response.url()}`)
    }
  })

  await page.goto('./')
  await expect(page).toHaveTitle(en.appTitle)

  // The map and the data: every area drawn, and the details panel's chart filled.
  const map = page.locator('main > div')
  await expect(map.locator('path[data-code]')).toHaveCount(120)
  const heading = page.getByRole('heading', { level: 2 })
  await expect(heading).toHaveText(en.controls.area('Harrow', 'HA'))
  await expect(page.locator('aside [data-code]')).toHaveCount(10)

  // Selecting an area keeps the base path in the address bar.
  await map.locator('path[data-code="B"]').click()
  await expect(heading).toHaveText(en.controls.area('Birmingham', 'B'))
  await expect(page).toHaveURL(`${String(baseURL)}?postcode=B`)

  const icon = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(icon).toBe(`${new URL(String(baseURL)).pathname}favicon.svg`)
  expect((await page.request.get(String(icon))).ok()).toBe(true)

  expect(problems).toEqual([])
})

// index.html's inline script sets the theme before the first paint, so a dark
// page never flashes white. With the app's scripts blocked, only it can act.
test.describe('the theme, before the app runs', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/*.{js,ts,tsx}', (route) => route.abort())
  })

  const isDark = (page: Page) =>
    page.evaluate(() => document.documentElement.classList.contains('dark'))

  test('follows a device set to dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('./')
    expect(await isDark(page)).toBe(true)
  })

  test('follows a device set to light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('./')
    expect(await isDark(page)).toBe(false)
  })

  test('shows a stored choice over the device', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark')
    })
    await page.goto('./')
    expect(await isDark(page)).toBe(true)
  })
})
