import { afterEach, expect, it, vi } from 'vitest'
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
