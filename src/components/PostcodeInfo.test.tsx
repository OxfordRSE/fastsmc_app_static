import { beforeAll, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import {
  type Interval,
  generationsFromYears,
  indexOf,
  intervalAt,
  loadMatrix,
  rank,
} from '../lib/postcodeData'
import { areasByCode, areasByIndex } from '../lib/postcodeMap'
import { PostcodeInfo } from './PostcodeInfo'

let values: Float32Array
const generations = generationsFromYears(600)

beforeAll(async () => {
  values = await loadMatrix('ancestors')
})

function indexFor(code: string): number {
  const index = indexOf(code)
  if (index === undefined) throw new Error(`Unknown postcode ${code}`)
  return index
}

function labelOf(code: string): string {
  const area = areasByCode.get(code)
  if (!area) throw new Error(`Unknown postcode ${code}`)
  return en.controls.area(area.name, code)
}

function estimate(interval: Interval | null): string {
  if (!interval) throw new Error('Expected data')
  return en.details.estimate(interval.mean, interval.lower, interval.upper)
}

async function renderInfo(hovered: string | null = null) {
  const onHover = vi.fn()
  const screen = await render(
    <div style={{ width: 360 }}>
      <PostcodeInfo
        selected="HA"
        hovered={hovered}
        values={values}
        generations={generations}
        onHover={onHover}
      />
    </div>,
  )
  return { screen, onHover }
}

it('names the selected area', async () => {
  const { screen } = await renderInfo()
  await expect
    .element(screen.getByRole('heading', { level: 2 }))
    .toHaveTextContent(labelOf('HA'))
})

it('gives the relatedness within the selected area', async () => {
  const { screen } = await renderInfo()
  const ha = indexFor('HA')
  await expect
    .element(screen.getByText(en.details.within(labelOf('HA'))))
    .toBeVisible()
  await expect
    .element(
      screen.getByText(estimate(intervalAt(values, ha, ha, generations))),
    )
    .toBeVisible()
})

it.each([
  ['before anything is hovered', null],
  ['while the selected area itself is hovered', 'HA'],
])('invites a comparison %s', async (_, hovered) => {
  const { screen } = await renderInfo(hovered)
  await expect.element(screen.getByText(en.details.hoverPrompt)).toBeVisible()
})

it('compares the hovered area with the selected one', async () => {
  const { screen } = await renderInfo('B')
  const between = intervalAt(values, indexFor('HA'), indexFor('B'), generations)
  await expect
    .element(screen.getByText(en.details.between(labelOf('HA'), labelOf('B'))))
    .toBeVisible()
  await expect.element(screen.getByText(estimate(between))).toBeVisible()
  await expect
    .element(screen.getByText(en.details.hoverPrompt))
    .not.toBeInTheDocument()
})

it('says when the hovered area has no data', async () => {
  const { screen } = await renderInfo('CR')
  await expect.element(screen.getByText(en.details.noData)).toBeVisible()
})

it('charts the ten most related other areas, in order', async () => {
  const { screen } = await renderInfo()
  const expected = rank(values, indexFor('HA'), generations)
    .slice(0, 10)
    .map(({ index }) => areasByIndex.get(index)?.code)
  await expect
    .element(
      screen.getByRole('img', {
        name: en.details.chartLabel(labelOf('HA')),
      }),
    )
    .toBeVisible()
  const codes = [...screen.container.querySelectorAll('[data-code] text')].map(
    (label) => label.textContent,
  )
  expect(codes).toEqual(expected)
  expect(codes).not.toContain('HA')
})

it('reports a bar under the pointer', async () => {
  const { screen, onHover } = await renderInfo()
  const bar = screen.container.querySelector('[data-code]')
  if (!bar) throw new Error('No bars')
  await page.elementLocator(bar).hover()
  expect(onHover).toHaveBeenCalledWith(bar.getAttribute('data-code'))
})
