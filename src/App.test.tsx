import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import App from './App'
import { en } from './content/en'

// The test page's URL carries Vitest's own parameters, and the app rewrites the
// URL, so put it back after every test.
const testPageUrl = window.location.href

afterEach(() => {
  window.history.replaceState(null, '', testPageUrl)
  vi.restoreAllMocks()
})

it('shows the app once the data has loaded', async () => {
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('heading', { name: en.appTitle }))
    .toBeVisible()
})

it('shows a loading message until then', async () => {
  vi.spyOn(window, 'fetch').mockReturnValue(new Promise(() => undefined))
  const screen = await render(<App />)
  await expect.element(screen.getByRole('status')).toHaveTextContent(en.loading)
})

it('explains when the data cannot be downloaded', async () => {
  vi.spyOn(window, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent(en.loadError)
})

it('treats an error response from the server as a failure too', async () => {
  vi.spyOn(window, 'fetch').mockResolvedValue(
    new Response(null, { status: 404 }),
  )
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent(en.loadError)
})

it.each([
  [
    'a normalised query for a non-default view',
    '?postcode=b&utm_source=x',
    '?postcode=B',
  ],
  ['no query at all for the default view', '?utm_source=x', ''],
])('rewrites the address bar to %s', async (_, before, after) => {
  const { pathname } = window.location
  window.history.replaceState(null, '', pathname + before)
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('heading', { name: en.appTitle }))
    .toBeVisible()
  expect(window.location.pathname).toBe(pathname)
  expect(window.location.search).toBe(after)
})

describe('the layout', () => {
  const initialViewport = [window.innerWidth, window.innerHeight] as const

  afterEach(async () => {
    await page.viewport(...initialViewport)
  })

  async function renderAt(width: number) {
    await page.viewport(width, 800)
    const screen = await render(<App />)
    await expect
      .element(screen.getByRole('heading', { name: en.appTitle }))
      .toBeVisible()
    const map = screen.container.querySelector('svg')
    if (!map) throw new Error('No map')
    const panel = screen.getByRole('complementary').element()
    return { map, panel }
  }

  it('puts the panel beside the map on wide screens', async () => {
    const { map, panel } = await renderAt(1200)
    await expect
      .poll(() => map.getBoundingClientRect().width)
      .toBeGreaterThan(0)
    const mapBox = map.getBoundingClientRect()
    const panelBox = panel.getBoundingClientRect()
    expect(panelBox.left).toBeGreaterThanOrEqual(mapBox.right)
    expect(panelBox.top).toBe(0)
    expect(panelBox.height).toBe(800)
  })

  it('puts the panel below the map on narrow screens', async () => {
    const { map, panel } = await renderAt(400)
    await expect.poll(() => map.getBoundingClientRect().width).toBe(400)
    const mapBox = map.getBoundingClientRect()
    const panelBox = panel.getBoundingClientRect()
    expect(panelBox.top).toBeGreaterThanOrEqual(mapBox.bottom)
    expect(panelBox.width).toBe(400)
  })
})

describe('the map', () => {
  async function renderApp() {
    const screen = await render(<App />)
    const area = (code: string) => {
      const element = screen.container.querySelector(`[data-code="${code}"]`)
      if (!element) throw new Error(`No area ${code}`)
      return page.elementLocator(element)
    }
    await expect
      .element(screen.getByRole('heading', { name: en.appTitle }))
      .toBeVisible()
    await expect.element(area('B')).toHaveAttribute('d')
    return area
  }

  it('selects the clicked area and records it in the address bar', async () => {
    const area = await renderApp()
    await area('B').click()
    await expect.poll(() => window.location.search).toBe('?postcode=B')
  })

  it('keeps the selection when an area without data is clicked', async () => {
    const area = await renderApp()
    await area('B').click()
    await expect.poll(() => window.location.search).toBe('?postcode=B')
    await area('CR').click()
    expect(window.location.search).toBe('?postcode=B')
  })
})

describe('the controls', () => {
  async function renderApp() {
    const screen = await render(<App />)
    await expect
      .element(screen.getByRole('heading', { name: en.appTitle }))
      .toBeVisible()
    return screen
  }

  it('select an area typed into the postcode entry', async () => {
    const screen = await renderApp()
    await screen
      .getByRole('combobox', { name: en.controls.postcode })
      .fill('(ZE)')
    await screen.getByRole('option', { name: /\(ZE\)$/ }).click()
    await expect.poll(() => window.location.search).toBe('?postcode=ZE')
  })

  it('change the measure', async () => {
    const screen = await renderApp()
    await screen.getByRole('combobox', { name: en.controls.measure }).click()
    await screen.getByRole('option', { name: en.measures.genome }).click()
    await expect.poll(() => window.location.search).toBe('?measure=genome')
  })
})

it('offers the map attribution, the data credit and more information beside the map', async () => {
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('button', { name: en.info.open }))
    .toBeVisible()
  await screen.getByRole('button', { name: en.credits.open }).click()
  const credits = page.getByRole('dialog', { name: en.credits.title })
  for (const line of en.credits.map) {
    await expect.element(credits.getByText(line, { exact: true })).toBeVisible()
  }
  await expect
    .element(credits.getByRole('link', { name: en.credits.dataLink }))
    .toBeVisible()
})

describe('the details panel', () => {
  async function renderApp() {
    const screen = await render(<App />)
    await expect
      .element(screen.getByRole('heading', { name: en.appTitle }))
      .toBeVisible()
    const map = screen.container.querySelector('main > div')
    if (!map) throw new Error('No map')
    const area = (code: string) => {
      const element = map.querySelector(`[data-code="${code}"]`)
      if (!element) throw new Error(`No area ${code}`)
      return page.elementLocator(element)
    }
    await expect.element(area('B')).toHaveAttribute('d')
    return { screen, map, area }
  }

  it('compares the area under the pointer on the map', async () => {
    const { screen, area } = await renderApp()
    await area('B').hover()
    await expect
      .element(
        screen.getByText(
          en.details.between(
            en.controls.area('Harrow', 'HA'),
            en.controls.area('Birmingham', 'B'),
          ),
        ),
      )
      .toBeVisible()
  })

  it('outlines on the map the area of the bar under the pointer', async () => {
    const { screen, map } = await renderApp()
    const bar = screen.container.querySelector('aside [data-code]')
    if (!bar) throw new Error('No bars')
    await page.elementLocator(bar).hover()
    const code = bar.getAttribute('data-code')
    const outline = map.querySelector('[data-outline="hovered"]')
    expect(outline?.getAttribute('d')).toBe(
      map.querySelector(`[data-code="${String(code)}"]`)?.getAttribute('d'),
    )
  })
})
