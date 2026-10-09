import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import type { ColourRange } from '../lib/colourRange'
import { Legend } from './Legend'
import { palettes } from './palette'

async function renderLegend(range: ColourRange, extent: ColourRange) {
  const screen = await render(
    <Legend range={range} extent={extent} selected="Birmingham" />,
  )
  const end = (which: string) =>
    screen.container.querySelector(`[data-end="${which}"]`)?.textContent
  return { screen, end }
}

it('says what the colours show, as a labelled figure', async () => {
  const { screen } = await renderLegend(
    { low: 8, high: 46 },
    { low: 2, high: 100 },
  )
  await expect
    .element(
      screen.getByRole('figure', { name: en.legend.title('Birmingham') }),
    )
    .toBeVisible()
})

it('runs along the colour scale, from its low end to its high end', async () => {
  const { screen } = await renderLegend(
    { low: 0, high: 46 },
    { low: 0, high: 100 },
  )
  const ramp = screen.container.querySelector('[data-ramp]')
  if (!(ramp instanceof HTMLElement)) throw new Error('No ramp')
  const { ramp: colour } = palettes.light
  const gradient = ramp.style.backgroundImage
  expect(gradient.startsWith(`linear-gradient(to right, ${colour(0)}, `)).toBe(
    true,
  )
  expect(gradient.endsWith(`, ${colour(1)})`)).toBe(true)
  // Spread under the border, so its far end does not repeat into the edges.
  expect(getComputedStyle(ramp).backgroundOrigin).toBe('border-box')
})

it('labels the ends plainly when no values lie beyond them', async () => {
  const { end } = await renderLegend({ low: 8, high: 46 }, { low: 8, high: 46 })
  expect(end('low')).toBe(en.percent(8))
  expect(end('high')).toBe(en.percent(46))
})

it('says when values beyond an end share its colour', async () => {
  const { end } = await renderLegend(
    { low: 8, high: 46 },
    { low: 2, high: 100 },
  )
  expect(end('low')).toBe(en.legend.atMost(en.percent(8)))
  expect(end('high')).toBe(en.legend.atLeast(en.percent(46)))
})
