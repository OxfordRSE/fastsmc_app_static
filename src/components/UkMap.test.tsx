import { describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { indexOf } from '../lib/postcodeData'
import { UkMap, type UkMapProps } from './UkMap'

function indexFor(postcode: string): number {
  const index = indexOf(postcode)
  if (index === undefined) throw new Error(`Unknown postcode ${postcode}`)
  return index
}

// The map fills its container, so give it one with a size.
async function renderMap(props: Partial<UkMapProps> = {}, width = 400) {
  const screen = await render(
    <div style={{ width, height: 600 }}>
      <UkMap
        values={new Map()}
        range={{ low: 0, high: 1 }}
        selected="HA"
        hovered={null}
        onSelect={() => undefined}
        onHover={() => undefined}
        {...props}
      />
    </div>,
  )
  const find = (selector: string) => {
    const element = screen.container.querySelector(selector)
    if (!element) throw new Error(`Nothing matches ${selector}`)
    return page.elementLocator(element)
  }
  const area = (code: string) => find(`[data-code="${code}"]`)
  const outline = (kind: string) => find(`[data-outline="${kind}"]`)
  // Areas have no outline until the container has been measured.
  await expect.element(area('HA')).toHaveAttribute('d')
  return { screen, area, outline }
}

it('draws every postcode area', async () => {
  const { screen } = await renderMap()
  expect(screen.container.querySelectorAll('[data-code]')).toHaveLength(120)
})

describe('colours', () => {
  const values = new Map([
    [indexFor('HA'), 0],
    [indexFor('B'), 0.5],
    [indexFor('LL'), 1],
    [indexFor('ZE'), 7],
    [indexFor('CR'), 1],
  ])

  it.each([
    ['the lowest value', 'HA', 'rgb(255, 255, 255)'],
    ['a middle value', 'B', 'rgb(128, 128, 255)'],
    ['the highest value', 'LL', 'rgb(0, 0, 255)'],
    ['a value beyond the range, clamped', 'ZE', 'rgb(0, 0, 255)'],
    ['an area with no value given', 'KW', '#c8c8c8'],
    ['an area without data, whatever its value', 'CR', '#c8c8c8'],
  ])('shades %s', async (_, code, fill) => {
    const { area } = await renderMap({ values })
    await expect.element(area(code)).toHaveAttribute('fill', fill)
  })
})

describe('selection', () => {
  it('selects an area with data when clicked', async () => {
    const onSelect = vi.fn()
    const { area } = await renderMap({ onSelect })
    await area('B').click()
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('B')
  })

  it('ignores clicks on an area without data', async () => {
    const onSelect = vi.fn()
    const { area } = await renderMap({ onSelect })
    await area('CR').click()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reports the area under the pointer', async () => {
    const onHover = vi.fn()
    const { area } = await renderMap({ onHover })
    await area('LL').hover()
    expect(onHover).toHaveBeenLastCalledWith('LL')
  })
})

describe('outlines', () => {
  it('outlines the selected and hovered areas', async () => {
    const { area, outline } = await renderMap({ selected: 'B', hovered: 'LL' })
    const shapeOf = (code: string) => area(code).element().getAttribute('d')
    await expect.element(outline('selected')).toHaveAttribute('d', shapeOf('B'))
    await expect.element(outline('hovered')).toHaveAttribute('d', shapeOf('LL'))
  })

  it('draws no hover outline when nothing is hovered', async () => {
    const { screen } = await renderMap()
    expect(
      screen.container.querySelectorAll('[data-outline="hovered"]'),
    ).toHaveLength(0)
  })
})

it('resizes with its container', async () => {
  const { screen } = await renderMap({}, 400)
  const svg = screen.container.querySelector('svg')
  if (!svg) throw new Error('No map drawn')
  await expect.element(page.elementLocator(svg)).toHaveAttribute('width', '400')
  const wrapper = screen.container.firstElementChild
  if (!(wrapper instanceof HTMLElement)) throw new Error('No wrapper')
  wrapper.style.width = '300px'
  await expect.element(page.elementLocator(svg)).toHaveAttribute('width', '300')
})
