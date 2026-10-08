import { expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import { type ChartEntry, TopPostcodesChart } from './TopPostcodesChart'

const entries: ChartEntry[] = [
  {
    code: 'B',
    label: 'Birmingham (B)',
    interval: { lower: 1.8, mean: 2, upper: 2.2 },
  },
  {
    code: 'CV',
    label: 'Coventry (CV)',
    interval: { lower: 0.5, mean: 1, upper: 1.5 },
  },
  {
    code: 'WS',
    label: 'Walsall (WS)',
    interval: { lower: 0.4, mean: 0.5, upper: 0.6 },
  },
]

async function renderChart(hovered: string | null = null, width = 400) {
  const onHover = vi.fn()
  const screen = await render(
    <div style={{ width }}>
      <TopPostcodesChart
        entries={entries}
        hovered={hovered}
        label="Top areas"
        onHover={onHover}
      />
    </div>,
  )
  const svg = screen.getByRole('img', { name: 'Top areas' })
  // Nothing is drawn until the container has been measured.
  await expect.element(svg).toHaveAttribute('width', String(width))
  const group = (code: string) => {
    const element = screen.container.querySelector(`[data-code="${code}"]`)
    if (!element) throw new Error(`No bar for ${code}`)
    return element
  }
  const number = (element: Element | null, name: string) =>
    Number(element?.getAttribute(name))
  return { screen, svg, group, number, onHover }
}

it('draws one bar per area, labelled with its code, in order', async () => {
  const { screen } = await renderChart()
  const labels = [...screen.container.querySelectorAll('[data-code] text')]
  expect(labels.map((label) => label.textContent)).toEqual(['B', 'CV', 'WS'])
})

it('makes bar heights proportional to the means', async () => {
  const { group, number } = await renderChart()
  const height = (code: string) =>
    number(group(code).querySelector('[data-bar]'), 'height')
  expect(height('CV') / height('B')).toBeCloseTo(0.5)
  expect(height('WS') / height('B')).toBeCloseTo(0.25)
})

it('ends each error bar at the bounds of its interval', async () => {
  const { group, number } = await renderChart()
  const bar = group('CV').querySelector('[data-bar]')
  const baseline = number(bar, 'y') + number(bar, 'height')
  const heightOf = (y: number) => (baseline - y) / (baseline - number(bar, 'y'))
  const stem = group('CV').querySelector('[data-error-bar] line')
  // Heights relative to the mean's: lower 0.5 and upper 1.5, against a mean of 1.
  expect(heightOf(number(stem, 'y1'))).toBeCloseTo(0.5)
  expect(heightOf(number(stem, 'y2'))).toBeCloseTo(1.5)
})

it('labels the value axis with round numbers from zero', async () => {
  const { screen } = await renderChart()
  const ticks = [...screen.container.querySelectorAll('[data-tick] text')]
  expect(ticks.map((tick) => tick.textContent)).toEqual([
    '0.0',
    '0.5',
    '1.0',
    '1.5',
    '2.0',
  ])
})

it('reports the bar under the pointer', async () => {
  const { group, onHover } = await renderChart()
  await page.elementLocator(group('WS')).hover()
  expect(onHover).toHaveBeenCalledWith('WS')
})

it('outlines only the hovered area', async () => {
  const { group } = await renderChart('CV')
  expect(group('CV').querySelector('[data-bar]')?.getAttribute('stroke')).toBe(
    'green',
  )
  expect(group('B').querySelector('[data-bar]')?.getAttribute('stroke')).toBe(
    'none',
  )
})

it('lists the values for screen readers', async () => {
  const { screen } = await renderChart()
  const items = screen.container.querySelectorAll('ol li')
  expect(items[0]?.textContent).toBe(
    en.details.chartEntry('Birmingham (B)', en.details.estimate(2, 1.8, 2.2)),
  )
  expect(items).toHaveLength(3)
})

it('follows the width of its container', async () => {
  const { screen, svg } = await renderChart()
  const container = screen.container.firstElementChild
  if (!(container instanceof HTMLElement)) throw new Error('No container')
  container.style.width = '300px'
  await expect.element(svg).toHaveAttribute('width', '300')
})
