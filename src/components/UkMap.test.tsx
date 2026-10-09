import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import { maxZoom, panStepPx, zoomStep } from '../lib/mapZoom'
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

  it('draws a wider halo under each outline', async () => {
    const { screen } = await renderMap({ hovered: 'LL' })
    for (const kind of ['selected', 'hovered']) {
      const line = screen.container.querySelector(`[data-outline="${kind}"]`)
      const halo = screen.container.querySelector(`[data-halo="${kind}"]`)
      expect(halo?.getAttribute('d')).toBe(line?.getAttribute('d'))
      expect(Number(halo?.getAttribute('stroke-width'))).toBeGreaterThan(
        Number(line?.getAttribute('stroke-width')),
      )
    }
  })

  it('draws no hover outline when nothing is hovered', async () => {
    const { screen } = await renderMap()
    expect(
      screen.container.querySelectorAll('[data-outline="hovered"]'),
    ).toHaveLength(0)
  })
})

it.each([
  ['wider', 800],
  ['narrower', 200],
])('centres the map in a container %s than the map', async (_, width) => {
  const { screen } = await renderMap({}, width)
  const svg = screen.container.querySelector('svg')
  if (!svg) throw new Error('No map drawn')
  const box = svg.getBBox()
  const margins = {
    left: box.x,
    right: width - (box.x + box.width),
    top: box.y,
    bottom: 600 - (box.y + box.height),
  }
  expect(margins.left).toBeCloseTo(margins.right, 0)
  expect(margins.top).toBeCloseTo(margins.bottom, 0)
  // At least the old app's 5% margin on every side.
  expect(Math.min(...Object.values(margins))).toBeGreaterThanOrEqual(
    0.05 * Math.min(width, 600) - 1,
  )
})

describe('zoom', () => {
  async function renderZoomable(props: Partial<UkMapProps> = {}) {
    const rendered = await renderMap(props)
    const svg = rendered.screen.container.querySelector('svg')
    if (!svg) throw new Error('No map drawn')
    // The current zoom, read from the transform the map draws with.
    const zoom = () => {
      const transform =
        svg.querySelector(':scope > g')?.getAttribute('transform') ?? ''
      const match = /translate\((.+),(.+)\) scale\((.+)\)/.exec(transform)
      if (!match) throw new Error(`Unexpected transform ${transform}`)
      const [x = NaN, y = NaN, k = NaN] = match.slice(1).map(Number)
      return { x, y, k }
    }
    const button = (name: string) => page.getByRole('button', { name })
    return { ...rendered, svg, zoom, button }
  }

  it('starts at the whole map, which it cannot zoom out of', async () => {
    const { zoom, button } = await renderZoomable()
    expect(zoom()).toEqual({ x: 0, y: 0, k: 1 })
    await expect.element(button(en.map.zoomOut)).toBeDisabled()
    await expect.element(button(en.map.resetZoom)).toBeDisabled()
    await expect.element(button(en.map.zoomIn)).toBeEnabled()
  })

  it('zooms in with the button, up to the limit that suits the smallest area', async () => {
    const { zoom, button } = await renderZoomable()
    await button(en.map.zoomIn).click()
    expect(zoom().k).toBe(zoomStep)
    while (!button(en.map.zoomIn).element().hasAttribute('disabled')) {
      await button(en.map.zoomIn).click()
    }
    expect(zoom().k).toBeCloseTo(maxZoom(400, 600), 6)
  })

  it('zooms out and returns to the whole map with the buttons', async () => {
    const { zoom, button } = await renderZoomable()
    await button(en.map.zoomIn).click()
    await button(en.map.zoomIn).click()
    await button(en.map.zoomOut).click()
    expect(zoom().k).toBe(zoomStep)
    await button(en.map.resetZoom).click()
    expect(zoom()).toEqual({ x: 0, y: 0, k: 1 })
  })

  it('zooms and pans with the keyboard', async () => {
    const { svg, zoom } = await renderZoomable()
    svg.focus()
    await userEvent.keyboard('+')
    expect(zoom().k).toBe(zoomStep)
    const before = zoom()
    await userEvent.keyboard('{ArrowRight}')
    expect(zoom().x).toBe(before.x - panStepPx)
    await userEvent.keyboard('0')
    expect(zoom()).toEqual({ x: 0, y: 0, k: 1 })
  })

  it('never pans beyond the whole map', async () => {
    const { svg, zoom } = await renderZoomable()
    svg.focus()
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}')
    expect(zoom()).toEqual({ x: 0, y: 0, k: 1 })
  })

  it('zooms in with the mouse wheel', async () => {
    const { svg, zoom } = await renderZoomable()
    const { left, top } = svg.getBoundingClientRect()
    svg.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -200,
        clientX: left + 200,
        clientY: top + 300,
        bubbles: true,
        cancelable: true,
      }),
    )
    await expect.poll(() => zoom().k).toBeGreaterThan(1)
  })

  it('lets a touch drag scroll the page until zoomed in', async () => {
    const { svg, button } = await renderZoomable()
    expect(svg.style.touchAction).toBe('pan-y')
    await button(en.map.zoomIn).click()
    expect(svg.style.touchAction).toBe('none')
  })

  it('brings a newly selected area into view', async () => {
    const { screen, svg, button } = await renderZoomable({ selected: 'HA' })
    for (let i = 0; i < 3; i++) await button(en.map.zoomIn).click()
    const shetland = () => {
      const area = svg.querySelector('[data-code="ZE"]')
      if (!area) throw new Error('No ZE')
      return area.getBoundingClientRect()
    }
    const view = svg.getBoundingClientRect()
    expect(shetland().bottom).toBeLessThan(view.top)
    await screen.rerender(
      <div style={{ width: 400, height: 600 }}>
        <UkMap
          values={new Map()}
          range={{ low: 0, high: 1 }}
          selected="ZE"
          hovered={null}
          onSelect={() => undefined}
          onHover={() => undefined}
        />
      </div>,
    )
    await expect.poll(() => shetland().top).toBeGreaterThanOrEqual(view.top)
    expect(shetland().bottom).toBeLessThanOrEqual(view.bottom)
  })

  it('keeps outlines the same width at any zoom', async () => {
    const { svg } = await renderZoomable()
    for (const path of svg.querySelectorAll('path')) {
      expect(path.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    }
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
