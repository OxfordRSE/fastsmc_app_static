import { beforeAll, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import {
  generationsFromYears,
  indexOf,
  type Interval,
  intervalAt,
  isUsable,
  loadMatrix,
  type Measure,
  rank,
} from '../lib/postcodeData'
import { areasByCode, areasByIndex } from '../lib/postcodeMap'
import { DataTable } from './DataTable'

const years = 600
const generations = generationsFromYears(years)
const matrices = {} as Record<Measure, Float32Array>

beforeAll(async () => {
  matrices.ancestors = await loadMatrix('ancestors')
  matrices.genome = await loadMatrix('genome')
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

async function openTable(measure: Measure = 'ancestors') {
  await render(
    <DataTable
      selected="HA"
      values={matrices[measure]}
      measure={measure}
      years={years}
    />,
  )
  await page.getByRole('button', { name: en.dataTable.open }).click()
  const dialog = page.getByRole('dialog', {
    name: en.dataTable.title(labelOf('HA')),
  })
  await expect.element(dialog).toBeVisible()
  const table = dialog.getByRole('table', {
    name: en.dataTable.title(labelOf('HA')),
  })
  await expect.element(table).toBeVisible()
  return { dialog, table }
}

// Each body row's cells, as text.
const bodyRows = (table: ReturnType<typeof page.getByRole>) =>
  [...table.element().querySelectorAll('tbody tr')].map((row) =>
    [...row.children].map((cell) => cell.textContent),
  )

it('is closed until asked for', async () => {
  await render(
    <DataTable
      selected="HA"
      values={matrices.ancestors}
      measure="ancestors"
      years={years}
    />,
  )
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
})

it('says which measure and time threshold the values are for', async () => {
  const { dialog } = await openTable()
  await expect
    .element(
      dialog.getByText(
        en.dataTable.description(nameOf('HA'), en.measures.ancestors, years),
      ),
    )
    .toBeVisible()
})

it.each<Measure>(['ancestors', 'genome'])(
  'heads the columns, with the unit of %s',
  async (measure) => {
    const { table } = await openTable(measure)
    const headings = table
      .getByRole('columnheader')
      .elements()
      .map((cell) => cell.textContent)
    expect(headings).toEqual([
      en.dataTable.area,
      en.dataTable.rank,
      en.dataTable.share('HA'),
      en.dataTable.interval,
      en.dataTable.mean[measure],
    ])
  },
)

it('lists every area on the map once', async () => {
  const { table } = await openTable()
  const areas = bodyRows(table).map(([area]) => area)
  expect(areas).toHaveLength(areasByCode.size)
  expect(new Set(areas)).toEqual(new Set([...areasByCode.keys()].map(labelOf)))
})

// HA's link with itself, the yardstick for the percentages.
function ownOfHarrow(): Interval {
  const own = intervalAt(
    matrices.ancestors,
    indexFor('HA'),
    indexFor('HA'),
    generations,
  )
  if (!own) throw new Error('No data for HA')
  return own
}

// A row as the table should write it: percentages of HA's own mean, then the exact mean.
function expectedRow(code: string, position: string, interval: Interval) {
  const percentOf = (value: number) => (100 * value) / ownOfHarrow().mean
  return [
    labelOf(code),
    position,
    en.dataTable.percent(percentOf(interval.mean)),
    en.dataTable.intervalValue(
      percentOf(interval.lower),
      percentOf(interval.upper),
    ),
    en.dataTable.value(interval.mean),
  ]
}

it('gives the selected area first, at 100% and without a rank', async () => {
  const { table } = await openTable()
  const first = bodyRows(table)[0]
  expect(first).toEqual(expectedRow('HA', '', ownOfHarrow()))
  expect(first?.[2]).toBe('100.0%')
})

it('ranks the other areas, with their values', async () => {
  const { table } = await openTable()
  const expected = rank(matrices.ancestors, indexFor('HA'), generations).map(
    ({ index, interval }, i) =>
      expectedRow(areasByIndex.get(index)?.code ?? '', String(i + 1), interval),
  )
  expect(bodyRows(table).slice(1, 1 + expected.length)).toEqual(expected)
})

it('ends with the areas without data, by name', async () => {
  const { table } = await openTable()
  const withoutData = [...areasByCode.values()]
    .filter(({ code }) => !isUsable(code))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))
    .map(({ code }) => [labelOf(code), '', en.dataTable.noData])
  expect(withoutData.length).toBeGreaterThan(0)
  expect(bodyRows(table).slice(-withoutData.length)).toEqual(withoutData)
})

it('makes each area name the header of its row', async () => {
  const { table } = await openTable()
  await expect
    .element(table.getByRole('rowheader', { name: labelOf('B') }))
    .toBeInTheDocument()
})

it.each([
  ['the close button in the corner', 0],
  ['the close button at the foot', 1],
])('closes with %s', async (_, index) => {
  const { dialog } = await openTable()
  await dialog.getByRole('button', { name: en.info.close }).nth(index).click()
  await expect.element(dialog).not.toBeInTheDocument()
})

it('closes with the Escape key', async () => {
  const { dialog } = await openTable()
  await userEvent.keyboard('{Escape}')
  await expect.element(dialog).not.toBeInTheDocument()
})
