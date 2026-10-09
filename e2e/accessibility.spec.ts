// Checks the built site for accessibility problems that can be tested
// automatically: axe-core's WCAG 2.2 level A and AA rules and its best
// practices, in several states; reflow and text spacing; forced colours;
// reduced motion; and what a screen reader is given. These catch perhaps a
// third of the problems; keyboard use, focus order and what a screen reader
// says still need a person to check.

import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { en } from '../src/content/en.ts'

const rules = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
]

// The rules axe-core breaks, by name and the elements involved, so a failure
// says what to fix.
async function violations(page: Page) {
  const { violations: found } = await new AxeBuilder({ page })
    .withTags(rules)
    .analyze()
  return found.map(({ id, nodes }) => ({
    rule: id,
    elements: nodes.map(({ target }) => target.join(' ')),
  }))
}

async function open(page: Page) {
  await page.goto('./')
  await expect(page.locator('path[data-code]')).toHaveCount(120)
}

test.describe('axe-core rules', () => {
  test.beforeEach(async ({ page }) => {
    await open(page)
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

  for (const [name, button] of [
    ['the table of values', en.dataTable.open],
    ['more information', en.info.open],
    ['the credits', en.credits.open],
  ] as const) {
    test(`the dialog of ${name}`, async ({ page }) => {
      await page.getByRole('button', { name: button }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(await violations(page)).toEqual([])
    })
  }

  test('forced-colours (high contrast) mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    expect(await violations(page)).toEqual([])
  })
})

// Text cut off by a box too small for it: an element that hides overflow,
// holds text, and is narrower or shorter than its contents.
async function clippedText(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((element) => {
        const { overflowX, overflowY } = getComputedStyle(element)
        const hides = (overflow: string) =>
          overflow === 'hidden' || overflow === 'clip'
        return (
          // Not text kept for screen readers only, clipped to a pixel on purpose.
          element.clientWidth > 1 &&
          element.textContent.trim() !== '' &&
          ((hides(overflowX) &&
            element.scrollWidth > element.clientWidth + 1) ||
            (hides(overflowY) &&
              element.scrollHeight > element.clientHeight + 1))
        )
      })
      .map((element) => element.outerHTML.slice(0, 80)),
  )
}

const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)

test('reflows to a 320 px wide window without scrolling sideways (WCAG 1.4.10)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await open(page)
  expect(await scrollsSideways(page)).toBe(false)
  expect(await clippedText(page)).toEqual([])
})

test('loses no text with wider letter, word, line and paragraph spacing (WCAG 1.4.12)', async ({
  page,
}) => {
  await open(page)
  // The spacing WCAG 1.4.12 says people must be able to set.
  await page.addStyleTag({
    content: `* {
      line-height: 1.5 !important;
      letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important;
    }
    p { margin-bottom: 2em !important; }`,
  })
  expect(await scrollsSideways(page)).toBe(false)
  expect(await clippedText(page)).toEqual([])
})

test('keeps the colours that carry data in forced-colours mode', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await open(page)
  const style = (selector: string, property: string) =>
    page
      .locator(selector)
      .first()
      .evaluate(
        (element, name) => getComputedStyle(element).getPropertyValue(name),
        property,
      )
  // The legend's colour ramp, which forced colours would otherwise remove.
  expect(await style('[data-ramp]', 'background-image')).toContain('gradient')
  // The map's fills.
  expect(await style('path[data-code="B"]', 'fill')).not.toBe(
    await style('path[data-code="ZE"]', 'fill'),
  )
  // The chart, kept as an image would be.
  expect(
    await page
      .getByRole('img', { name: /^Bar chart/ })
      .evaluate((svg) =>
        svg.parentElement
          ? getComputedStyle(svg.parentElement).forcedColorAdjust
          : '',
      ),
  ).toBe('none')
})

test('does not animate for those who ask for less motion (WCAG 2.3.3)', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  await page.getByRole('button', { name: en.info.open }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const seconds = await dialog.evaluate((element) =>
    parseFloat(getComputedStyle(element).animationDuration),
  )
  expect(seconds).toBeLessThan(0.001)
})

// What a screen reader is given: the names, roles and states of everything on
// the page as it opens, checked against the file in
// e2e/accessibility.spec.ts-snapshots. An intended change is accepted with
// `npm run test:accessibility -- --update-snapshots`, and the new snapshot
// reviewed in the diff.
test('gives screen readers the same structure as before', async ({ page }) => {
  await open(page)
  await expect(page.locator('body')).toMatchAriaSnapshot({
    name: 'page.aria.yml',
  })
})
