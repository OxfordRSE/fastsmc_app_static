// Checks the built site against the WCAG 2.2 level A and AA rules that can be
// tested automatically, with axe-core. These catch perhaps a third of the
// problems; keyboard use, focus order and what a screen reader says still need
// a person to check.

import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { en } from '../src/content/en.ts'

const wcag22aa = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// The rules axe-core breaks, by name and the elements involved, so a failure
// says what to fix.
async function violations(page: Page) {
  const { violations: found } = await new AxeBuilder({ page })
    .withTags(wcag22aa)
    .analyze()
  return found.map(({ id, nodes }) => ({
    rule: id,
    elements: nodes.map(({ target }) => target.join(' ')),
  }))
}

test.beforeEach(async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('path[data-code]')).toHaveCount(120)
})

test('the page as it opens', async ({ page }) => {
  expect(await violations(page)).toEqual([])
})

test('the map in use from the keyboard, zoomed in', async ({ page }) => {
  await page.getByRole('listbox', { name: en.map.label }).focus()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: en.map.zoomIn }).click()
  expect(await violations(page)).toEqual([])
})

test('the advanced settings', async ({ page }) => {
  await page.getByRole('checkbox', { name: en.controls.showAdvanced }).click()
  expect(await violations(page)).toEqual([])
})

for (const [name, open] of [
  ['the table of values', en.dataTable.open],
  ['more information', en.info.open],
  ['the credits', en.credits.open],
] as const) {
  test(`the dialog of ${name}`, async ({ page }) => {
    await page.getByRole('button', { name: open }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await violations(page)).toEqual([])
  })
}
