import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import type { Inspection } from '../lib/appState'
import { maxZoom, zoomStep } from '../lib/mapZoom'
import { indexOf } from '../lib/postcodeData'
import { areasByCode } from '../lib/postcodeMap'
import { borderColour, palettes } from './palette'
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
        inspected={null}
        onSelect={() => undefined}
        onInspect={() => undefined}
        onClearInspection={() => undefined}
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
    ['the lowest value', 'HA', palettes.light.ramp(0)],
    ['a middle value', 'B', palettes.light.ramp(0.5)],
    ['the highest value', 'LL', palettes.light.ramp(1)],
    ['a value beyond the range, clamped', 'ZE', palettes.light.ramp(1)],
    ['an area with no value given', 'KW', palettes.light.noData],
    ['an area without data, whatever its value', 'CR', palettes.light.noData],
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
    // Forced: an area without data is marked disabled, which Playwright otherwise waits out.
    await area('CR').click({ force: true })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reports the area under the pointer', async () => {
    const onInspect = vi.fn()
    const { area } = await renderMap({ onInspect })
    await area('LL').hover()
    expect(onInspect).toHaveBeenLastCalledWith('LL', 'pointer')
  })
})

// The map holding its own inspection, as the app does, so sequences of taps
// and keys can be followed. Returns what was selected.
async function renderStateful() {
  const onSelect = vi.fn()
  function StatefulMap() {
    const [inspected, setInspected] = useState<Inspection | null>(null)
    return (
      <div style={{ width: 400, height: 600 }}>
        <UkMap
          values={new Map([[indexFor('B'), 46]])}
          range={{ low: 0, high: 100 }}
          selected="HA"
          inspected={inspected}
          onSelect={onSelect}
          onInspect={(postcode, by) => {
            setInspected({ postcode, by })
          }}
          onClearInspection={() => {
            setInspected(null)
          }}
        />
      </div>
    )
  }
  const screen = await render(<StatefulMap />)
  const svg = screen.container.querySelector('svg')
  if (!svg) throw new Error('No map drawn')
  const area = (code: string) => {
    const element = svg.querySelector(`[data-code="${code}"]`)
    if (!element) throw new Error(`No area ${code}`)
    return element
  }
  await expect.element(page.elementLocator(area('HA'))).toHaveAttribute('d')
  // The inspected area, from its outline, or null.
  const inspected = () => {
    const d = svg.querySelector('[data-outline="inspected"]')?.getAttribute('d')
    if (d === undefined) return null
    return (
      [...areasByCode.keys()].find(
        (code) => area(code).getAttribute('d') === d,
      ) ?? null
    )
  }
  return { screen, svg, area, inspected, onSelect }
}

// A tap, as a touch screen reports it: a touch pointer, then a click.
function tap(target: Element) {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }),
  )
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('touch', () => {
  it('inspects an area with a first tap and selects it with a second', async () => {
    const { area, inspected, onSelect } = await renderStateful()
    tap(area('B'))
    await expect.poll(inspected).toBe('B')
    expect(onSelect).not.toHaveBeenCalled()
    tap(area('B'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('B')
  })

  it('inspects an area without data, but never selects it', async () => {
    const { area, inspected, onSelect } = await renderStateful()
    tap(area('CR'))
    await expect.poll(inspected).toBe('CR')
    tap(area('CR'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('stops inspecting with a tap on the sea', async () => {
    const { svg, area, inspected } = await renderStateful()
    tap(area('B'))
    await expect.poll(inspected).toBe('B')
    tap(svg)
    await expect.poll(inspected).toBeNull()
  })
})

describe('mouse', () => {
  it('stops inspecting when the pointer leaves the map', async () => {
    const { area, inspected } = await renderStateful()
    await page.elementLocator(area('B')).hover()
    await expect.poll(inspected).toBe('B')
    await page.getByRole('button', { name: en.map.zoomIn }).hover()
    await expect.poll(inspected).toBeNull()
  })

  it('never selects an area at the end of a drag', async () => {
    const { svg, area, onSelect } = await renderStateful()
    await page.getByRole('button', { name: en.map.zoomIn }).click()
    const target = area('B')
    const { left, top } = target.getBoundingClientRect()
    const at = (dx: number) => ({
      clientX: left + 5 + dx,
      clientY: top + 5,
      bubbles: true,
      view: window,
    })
    target.dispatchEvent(new MouseEvent('mousedown', at(0)))
    window.dispatchEvent(new MouseEvent('mousemove', at(40)))
    window.dispatchEvent(new MouseEvent('mouseup', at(40)))
    target.dispatchEvent(new MouseEvent('click', at(40)))
    expect(onSelect).not.toHaveBeenCalled()
    expect(svg.querySelector(':scope > g')?.getAttribute('transform')).toMatch(
      /^translate/,
    )
  })
})

describe('keyboard', () => {
  async function focusMap() {
    const rendered = await renderStateful()
    await userEvent.tab()
    expect(document.activeElement).toBe(rendered.svg)
    return rendered
  }

  const centreX = (element: Element) => {
    const { x, width } = (element as SVGGraphicsElement).getBBox()
    return x + width / 2
  }

  it('starts at the selected area when tabbed to', async () => {
    const { svg, area, inspected } = await focusMap()
    await expect.poll(inspected).toBe('HA')
    expect(svg.getAttribute('aria-activedescendant')).toBe(area('HA').id)
  })

  it('moves to a neighbouring area with the arrow keys', async () => {
    const { area, inspected } = await focusMap()
    await userEvent.keyboard('{ArrowRight}')
    await expect.poll(inspected).not.toBe('HA')
    const next = inspected()
    if (next === null) throw new Error('Nothing inspected')
    expect(centreX(area(next))).toBeGreaterThan(centreX(area('HA')))
  })

  it('jumps to an area by typing its code or the start of its name', async () => {
    const { inspected } = await focusMap()
    await userEvent.keyboard('ec')
    await expect.poll(inspected).toBe('EC')
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await userEvent.keyboard('birm')
    await expect.poll(inspected).toBe('B')
  })

  it('selects with Enter and stops with Escape', async () => {
    const { inspected, onSelect } = await focusMap()
    await userEvent.keyboard('ec')
    await expect.poll(inspected).toBe('EC')
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('EC')
    await userEvent.keyboard('{Escape}')
    await expect.poll(inspected).toBeNull()
  })

  it('stops inspecting when focus leaves the map', async () => {
    const { inspected } = await focusMap()
    await expect.poll(inspected).toBe('HA')
    await userEvent.tab()
    await expect.poll(inspected).toBeNull()
  })
})

describe('for screen readers', () => {
  it('is a list box of every area, named, with the selected one marked', async () => {
    const { screen } = await renderStateful()
    const listbox = page.getByRole('listbox', { name: en.map.label })
    await expect.element(listbox).toBeVisible()
    expect(screen.container.querySelectorAll('[role="option"]')).toHaveLength(
      120,
    )
    await expect
      .element(
        listbox.getByRole('option', {
          name: en.map.option(en.controls.area('Birmingham', 'B'), '46%'),
        }),
      )
      .toBeInTheDocument()
    await expect
      .element(
        listbox.getByRole('option', {
          name: en.map.optionNoData(en.controls.area('Croydon', 'CR')),
        }),
      )
      .toHaveAttribute('aria-disabled', 'true')
    await expect
      .element(listbox.getByRole('option', { selected: true }))
      .toHaveAttribute('data-code', 'HA')
  })
})

it('draws every boundary and the coastline once, in grey, over the fills', async () => {
  const { screen } = await renderMap()
  const lines = screen.container.querySelectorAll('[data-boundaries]')
  expect(lines).toHaveLength(1)
  expect(lines[0]?.getAttribute('stroke')).toBe(borderColour)
  expect(lines[0]?.getAttribute('d')).toMatch(/^M/)
  // The areas themselves have no outline of their own to double it.
  for (const area of screen.container.querySelectorAll('path[data-code]')) {
    expect(area.getAttribute('stroke')).toBeNull()
  }
})

describe('outlines', () => {
  it('outlines the selected and inspected areas', async () => {
    const { area, outline } = await renderMap({
      selected: 'B',
      inspected: { postcode: 'LL', by: 'pointer' },
    })
    const shapeOf = (code: string) => area(code).element().getAttribute('d')
    await expect.element(outline('selected')).toHaveAttribute('d', shapeOf('B'))
    await expect
      .element(outline('inspected'))
      .toHaveAttribute('d', shapeOf('LL'))
  })

  it('draws a wider halo under each outline', async () => {
    const { screen } = await renderMap({
      inspected: { postcode: 'LL', by: 'pointer' },
    })
    for (const kind of ['selected', 'inspected']) {
      const line = screen.container.querySelector(`[data-outline="${kind}"]`)
      const halo = screen.container.querySelector(`[data-halo="${kind}"]`)
      expect(halo?.getAttribute('d')).toBe(line?.getAttribute('d'))
      expect(Number(halo?.getAttribute('stroke-width'))).toBeGreaterThan(
        Number(line?.getAttribute('stroke-width')),
      )
    }
  })

  it('draws no hover outline when nothing is inspected', async () => {
    const { screen } = await renderMap()
    expect(
      screen.container.querySelectorAll('[data-outline="inspected"]'),
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

  it('zooms with the keyboard', async () => {
    const { svg, zoom } = await renderZoomable()
    svg.focus()
    await userEvent.keyboard('+')
    expect(zoom().k).toBe(zoomStep)
    await userEvent.keyboard('-')
    expect(zoom().k).toBe(1)
    await userEvent.keyboard('++0')
    expect(zoom()).toEqual({ x: 0, y: 0, k: 1 })
  })

  it('pans with a drag once zoomed in, but never beyond the whole map', async () => {
    const { svg, zoom, button } = await renderZoomable()
    const { left, top } = svg.getBoundingClientRect()
    const drag = (dx: number) => {
      const at = (by: number) => ({
        clientX: left + 200 + by,
        clientY: top + 300,
        bubbles: true,
        view: window,
      })
      svg.dispatchEvent(new MouseEvent('mousedown', at(0)))
      window.dispatchEvent(new MouseEvent('mousemove', at(dx)))
      window.dispatchEvent(new MouseEvent('mouseup', at(dx)))
    }
    drag(100)
    expect(zoom()).toEqual({ x: 0, y: 0, k: 1 })
    await button(en.map.zoomIn).click()
    const before = zoom().x
    drag(50)
    await expect.poll(() => zoom().x).toBe(before + 50)
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
          inspected={null}
          onSelect={() => undefined}
          onInspect={() => undefined}
          onClearInspection={() => undefined}
        />
      </div>,
    )
    await expect.poll(() => shetland().top).toBeGreaterThanOrEqual(view.top)
    expect(shetland().bottom).toBeLessThanOrEqual(view.bottom)
  })

  it('keeps outlines the same width at any zoom', async () => {
    const { svg } = await renderZoomable()
    for (const path of svg.querySelectorAll('path[stroke]')) {
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
