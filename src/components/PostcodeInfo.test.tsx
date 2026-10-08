import { beforeAll, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import {
  generationsFromYears,
  indexOf,
  intervalAt,
  isUsable,
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

function nameOf(code: string): string {
  const area = areasByCode.get(code)
  if (!area) throw new Error(`Unknown postcode ${code}`)
  return area.name
}

const labelOf = (code: string) => en.controls.area(nameOf(code), code)

function meanOf(from: string, to: string): number {
  const interval = intervalAt(values, indexFor(from), indexFor(to), generations)
  if (!interval) throw new Error(`No data for ${from} to ${to}`)
  return interval.mean
}

// The link from HA to another area as the panel writes it.
const percentFromHarrow = (code: string) =>
  en.percent((100 * meanOf('HA', code)) / meanOf('HA', 'HA'))

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

const rankedFromHarrow = () =>
  rank(values, indexFor('HA'), generations).map(
    ({ index }) => areasByIndex.get(index)?.code,
  )

it('names the selected area', async () => {
  const { screen } = await renderInfo()
  await expect
    .element(screen.getByRole('heading', { level: 2 }))
    .toHaveTextContent(labelOf('HA'))
})

it('states the strongest link as a percentage of the area itself', async () => {
  const { screen } = await renderInfo()
  const top = rankedFromHarrow()[0]
  if (!top) throw new Error('No ranking')
  await expect
    .element(
      screen.getByText(
        en.details.topLink(nameOf('HA'), labelOf(top), percentFromHarrow(top)),
      ),
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

it('gives the hovered area as a percentage with its rank', async () => {
  const { screen } = await renderInfo('B')
  const ranked = rankedFromHarrow()
  await expect
    .element(
      screen.getByText(
        en.details.hoveredLink(
          nameOf('HA'),
          labelOf('B'),
          percentFromHarrow('B'),
          ranked.indexOf('B') + 1,
          ranked.length,
        ),
      ),
    )
    .toBeVisible()
  await expect
    .element(screen.getByText(en.details.hoverPrompt))
    .not.toBeInTheDocument()
})

it('says when the hovered area has no data', async () => {
  const { screen } = await renderInfo('CR')
  await expect
    .element(screen.getByText(en.details.hoveredNoData(labelOf('CR'))))
    .toBeVisible()
})

it('writes no raw values, only percentages', async () => {
  const { screen } = await renderInfo('B')
  await expect.element(screen.getByText(en.details.topAreas)).toBeVisible()
  // Raw values are small decimals such as 0.0026.
  expect(screen.container.textContent).not.toMatch(/0\.\d{2,}/)
})

it('charts the ten most related other areas, in order', async () => {
  const { screen } = await renderInfo()
  await expect
    .element(
      screen.getByRole('img', { name: en.details.chartLabel(labelOf('HA')) }),
    )
    .toBeVisible()
  const codes = [...screen.container.querySelectorAll('[data-code] text')].map(
    (label) => label.textContent,
  )
  expect(codes).toEqual(rankedFromHarrow().slice(0, 10))
  expect(codes).not.toContain('HA')
})

it('lists the chart in percentages for screen readers', async () => {
  const { screen } = await renderInfo()
  const top = rankedFromHarrow()[0]
  if (!top) throw new Error('No ranking')
  expect(screen.container.querySelector('ol li')?.textContent).toBe(
    en.details.chartEntry(labelOf(top), percentFromHarrow(top)),
  )
})

it('keeps the chart in place whatever is hovered', async () => {
  // The usable area with the longest name, which wraps the most.
  const longest = [...areasByCode.values()]
    .filter(({ code }) => code !== 'HA' && isUsable(code))
    .map(({ code }) => code)
    .reduce((a, b) => (labelOf(a).length >= labelOf(b).length ? a : b))
  const chartTop = async (hovered: string | null) => {
    const { screen } = await renderInfo(hovered)
    const chart = screen.getByRole('img', {
      name: en.details.chartLabel(labelOf('HA')),
    })
    await expect.element(chart).toBeVisible()
    const top = chart.element().getBoundingClientRect().top
    await screen.unmount()
    return top
  }
  const settled = await chartTop(null)
  for (const hovered of [longest, 'CR', 'B']) {
    expect(await chartTop(hovered), hovered).toBe(settled)
  }
})

it('reports a bar under the pointer', async () => {
  const { screen, onHover } = await renderInfo()
  const bar = screen.container.querySelector('[data-code]')
  if (!bar) throw new Error('No bars')
  await page.elementLocator(bar).hover()
  expect(onHover).toHaveBeenCalledWith(bar.getAttribute('data-code'))
})
