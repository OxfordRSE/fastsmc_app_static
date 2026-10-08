import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import { postcodeAreas } from '../lib/postcodeMap'
import { type ViewState, defaultViewState } from '../lib/urlState'
import { Controls } from './Controls'

function nameOf(code: string): string {
  const area = postcodeAreas.features.find(
    ({ properties }) => properties.code === code,
  )
  if (!area) throw new Error(`Unknown postcode ${code}`)
  return area.properties.name
}

async function renderControls(view: Partial<ViewState> = {}) {
  const dispatch = vi.fn()
  const screen = await render(
    <Controls
      view={{ ...defaultViewState, ...view }}
      range={{ low: 0.2, high: 0.8 }}
      extent={{ low: 0, high: 1 }}
      dispatch={dispatch}
    />,
  )
  return { screen, dispatch }
}

async function showAdvanced() {
  await page.getByRole('checkbox', { name: en.controls.showAdvanced }).click()
}

// Focus a slider handle without clicking it, since a click would move it.
function focus(slider: ReturnType<typeof page.getByRole>) {
  const element = slider.element()
  if (!(element instanceof HTMLElement)) throw new Error('Not focusable')
  element.focus()
}

it('chooses the measure', async () => {
  const { dispatch } = await renderControls()
  await page.getByRole('combobox', { name: en.controls.measure }).click()
  await page.getByRole('option', { name: en.measures.genome }).click()
  expect(dispatch).toHaveBeenCalledWith({
    type: 'set-measure',
    measure: 'genome',
  })
})

it('shows the time depth in years and changes it from the keyboard', async () => {
  const { screen, dispatch } = await renderControls({ years: 600 })
  await expect
    .element(screen.getByText(en.controls.yearsValue(600)))
    .toBeVisible()
  focus(page.getByRole('slider', { name: en.controls.years }))
  await userEvent.keyboard('{ArrowRight}')
  expect(dispatch).toHaveBeenCalledWith({ type: 'set-years', years: 610 })
})

describe('postcode entry', () => {
  const input = () => page.getByRole('combobox', { name: en.controls.postcode })

  it('shows the selected area', async () => {
    await renderControls({ postcode: 'B' })
    await expect
      .element(input())
      .toHaveValue(en.controls.area(nameOf('B'), 'B'))
  })

  it.each([
    ['place name', nameOf('B')],
    ['code', '(B)'],
  ])('selects an area found by its %s', async (_, typed) => {
    const { dispatch } = await renderControls()
    await input().fill(typed)
    await page
      .getByRole('option', { name: en.controls.area(nameOf('B'), 'B') })
      .click()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'select-postcode',
      postcode: 'B',
    })
  })

  it('lists an area without data but does not select it', async () => {
    const { dispatch } = await renderControls()
    await input().fill(nameOf('CR'))
    const option = page.getByRole('option', {
      name: en.controls.areaWithoutData(nameOf('CR'), 'CR'),
    })
    await expect.element(option).toHaveAttribute('aria-disabled', 'true')
    await option.click({ force: true })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('says when nothing matches', async () => {
    await renderControls()
    await input().fill('Atlantis')
    await expect.element(page.getByText(en.controls.noMatch)).toBeVisible()
  })
})

describe('advanced settings', () => {
  const mode = () =>
    page.getByRole('combobox', { name: en.controls.colourRangeMode })
  const lightest = () =>
    page.getByRole('slider', { name: en.controls.lightest })

  it('are hidden until asked for', async () => {
    await renderControls()
    await expect.element(mode()).not.toBeInTheDocument()
    await showAdvanced()
    await expect.element(mode()).toBeVisible()
  })

  it('keep the range slider fixed unless the range is set by user', async () => {
    await renderControls()
    await showAdvanced()
    await expect.element(lightest()).toBeDisabled()
    await expect
      .element(page.getByRole('slider', { name: en.controls.darkest }))
      .toBeDisabled()
  })

  it('move the custom range from the keyboard', async () => {
    const { dispatch } = await renderControls({
      range: { mode: 'custom', low: 0.2, high: 0.8 },
    })
    await showAdvanced()
    focus(lightest())
    await userEvent.keyboard('{ArrowRight}')
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set-range',
      range: { mode: 'custom', low: 0.2025, high: 0.8 },
    })
  })

  it('start a custom range from the range in effect', async () => {
    const { dispatch } = await renderControls()
    await showAdvanced()
    await mode().click()
    await page.getByRole('option', { name: en.colourRangeModes.custom }).click()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set-range',
      range: { mode: 'custom', low: 0.2, high: 0.8 },
    })
  })

  it('switch back to an automatic range', async () => {
    const { dispatch } = await renderControls({
      range: { mode: 'custom', low: 0.2, high: 0.8 },
    })
    await showAdvanced()
    await mode().click()
    await page
      .getByRole('option', { name: en.colourRangeModes['second-largest'] })
      .click()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'set-range',
      range: { mode: 'second-largest' },
    })
  })

  it('give a link to the current view', async () => {
    await renderControls({ postcode: 'B', years: 600 })
    await showAdvanced()
    const { origin, pathname } = window.location
    await expect
      .element(page.getByRole('textbox', { name: en.controls.shareLink }))
      .toHaveValue(`${origin}${pathname}?postcode=B&years=600`)
  })
})

it.each([
  [en.controls.measure, en.help.measure],
  [en.controls.colourRange, en.help.colourRange],
])('explains the %s setting on request', async (topic, text) => {
  await renderControls()
  await showAdvanced()
  await page.getByRole('button', { name: en.controls.help(topic) }).click()
  await expect.element(page.getByText(text)).toBeVisible()
})
