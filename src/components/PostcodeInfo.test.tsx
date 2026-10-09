import { beforeAll, describe, expect, it, vi } from 'vitest'
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

async function renderInfo(inspected: string | null = null, tapped = false) {
  const onInspect = vi.fn()
  const onSelect = vi.fn()
  const onExplainNoData = vi.fn()
  const onClearInspection = vi.fn()
  const screen = await render(
    <div style={{ width: 360 }}>
      <PostcodeInfo
        selected="HA"
        inspected={inspected}
        tapped={tapped}
        values={values}
        generations={generations}
        onSelect={onSelect}
        onExplainNoData={onExplainNoData}
        onInspect={onInspect}
        onClearInspection={onClearInspection}
      />
    </div>,
  )
  return { screen, onInspect, onSelect, onExplainNoData, onClearInspection }
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
  ['before anything is inspected', null],
  ['while the selected area itself is inspected', 'HA'],
])('invites a comparison %s', async (_, inspected) => {
  const { screen } = await renderInfo(inspected)
  await expect.element(screen.getByText(en.details.inspectPrompt)).toBeVisible()
})

it('gives the inspected area as a percentage with its rank', async () => {
  const { screen } = await renderInfo('B')
  const ranked = rankedFromHarrow()
  await expect
    .element(
      screen.getByText(
        en.details.inspectedLink(
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
    .element(screen.getByText(en.details.inspectPrompt))
    .not.toBeInTheDocument()
})

it('says when the inspected area has no data', async () => {
  const { screen } = await renderInfo('CR')
  await expect
    .element(screen.getByText(en.details.inspectedNoData(labelOf('CR'))))
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

it('keeps the chart in place whatever is inspected', async () => {
  // The usable area with the longest name, which wraps the most.
  const longest = [...areasByCode.values()]
    .filter(({ code }) => code !== 'HA' && isUsable(code))
    .map(({ code }) => code)
    .reduce((a, b) => (labelOf(a).length >= labelOf(b).length ? a : b))
  const chartTop = async (inspected: string | null, tapped = false) => {
    const { screen } = await renderInfo(inspected, tapped)
    const chart = screen.getByRole('img', {
      name: en.details.chartLabel(labelOf('HA')),
    })
    await expect.element(chart).toBeVisible()
    const top = chart.element().getBoundingClientRect().top
    await screen.unmount()
    return top
  }
  const settled = await chartTop(null)
  for (const inspected of [longest, 'CR', 'B']) {
    expect(await chartTop(inspected), inspected).toBe(settled)
  }
  // With the buttons that follow a tap, too.
  expect(await chartTop(longest, true), `${longest} tapped`).toBe(settled)
  expect(await chartTop('CR', true), 'CR tapped').toBe(settled)
})

describe('after a tap', () => {
  it('offers a button that selects the tapped area', async () => {
    const { screen, onSelect } = await renderInfo('B', true)
    await screen
      .getByRole('button', { name: en.details.selectLabel(labelOf('B')) })
      .click()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('B')
  })

  it('offers a button that explains a tapped area without data', async () => {
    const { screen, onExplainNoData } = await renderInfo('CR', true)
    await screen
      .getByRole('button', { name: en.details.whyLabel(labelOf('CR')) })
      .click()
    expect(onExplainNoData).toHaveBeenCalledExactlyOnceWith('CR')
    expect(
      screen.container.querySelectorAll('button'),
      'no select button too',
    ).toHaveLength(1)
  })

  it.each([
    ['for an area inspected by pointer or keyboard', 'B', false],
    ['for an area without data inspected by pointer or keyboard', 'CR', false],
    ['for the selected area itself', 'HA', true],
  ])('offers no button %s', async (_, inspected, tapped) => {
    const { screen } = await renderInfo(inspected, tapped)
    await expect
      .element(screen.getByRole('heading', { level: 2 }))
      .toBeVisible()
    expect(screen.container.querySelector('button')).toBeNull()
  })
})

it('stops inspecting when the pointer leaves the chart', async () => {
  const { screen, onClearInspection } = await renderInfo('B')
  const chart = screen.getByRole('img', {
    name: en.details.chartLabel(labelOf('HA')),
  })
  await chart.hover()
  await screen.getByRole('heading', { level: 2 }).hover()
  expect(onClearInspection).toHaveBeenCalled()
})

it('reports a bar under the pointer', async () => {
  const { screen, onInspect } = await renderInfo()
  const bar = screen.container.querySelector('[data-code]')
  if (!bar) throw new Error('No bars')
  await page.elementLocator(bar).hover()
  expect(onInspect).toHaveBeenCalledWith(bar.getAttribute('data-code'))
})
