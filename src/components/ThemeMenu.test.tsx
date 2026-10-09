import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import { usePalette } from '../hooks/usePalette'
import { themeStorageKey } from '../lib/theme'
import { palettes } from './palette'
import { ThemeMenu } from './ThemeMenu'
import { ThemeProvider } from './ThemeProvider'

const root = document.documentElement

// The device's light or dark setting, which a test can change.
const device = {
  dark: false,
  listeners: new Set<(event: MediaQueryListEvent) => void>(),
  set(dark: boolean) {
    this.dark = dark
    for (const listener of this.listeners) {
      listener({ matches: dark } as MediaQueryListEvent)
    }
  },
}

beforeEach(() => {
  device.dark = false
  device.listeners.clear()
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (media) =>
      ({
        media,
        get matches() {
          return device.dark
        },
        addEventListener: (_: string, listener: never) => {
          device.listeners.add(listener)
        },
        removeEventListener: (_: string, listener: never) => {
          device.listeners.delete(listener)
        },
      }) as unknown as MediaQueryList,
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(themeStorageKey)
  root.classList.remove('dark')
  root.style.colorScheme = ''
})

// Shows the palette's top colour, to see that colours follow the theme.
function PaletteProbe() {
  return <p data-probe>{usePalette().ramp(1)}</p>
}

async function renderMenu() {
  const screen = await render(
    <ThemeProvider>
      <ThemeMenu />
      <PaletteProbe />
    </ThemeProvider>,
  )
  const choose = async (choice: string) => {
    await screen.getByRole('button', { name: en.theme.label }).click()
    await page.getByRole('menuitemradio', { name: choice }).click()
  }
  const probe = () =>
    screen.container.querySelector('[data-probe]')?.textContent
  return { screen, choose, probe }
}

it('follows the device by default', async () => {
  device.dark = true
  const { screen } = await renderMenu()
  expect(root.classList.contains('dark')).toBe(true)
  expect(root.style.colorScheme).toBe('dark')
  await screen.getByRole('button', { name: en.theme.label }).click()
  await expect
    .element(page.getByRole('menuitemradio', { name: en.theme.system }))
    .toBeChecked()
})

it('follows the device when its setting changes', async () => {
  const { probe } = await renderMenu()
  expect(root.classList.contains('dark')).toBe(false)
  device.set(true)
  await expect.poll(() => root.classList.contains('dark')).toBe(true)
  expect(probe()).toBe(palettes.dark.ramp(1))
})

it.each([
  ['dark', en.theme.dark, false, true],
  ['light', en.theme.light, true, false],
] as const)(
  'shows %s when chosen, whatever the device, and remembers it',
  async (setting, choice, deviceIsDark, dark) => {
    device.dark = deviceIsDark
    const { choose, probe } = await renderMenu()
    await choose(choice)
    await expect.poll(() => root.classList.contains('dark')).toBe(dark)
    expect(probe()).toBe(palettes[setting].ramp(1))
    expect(localStorage.getItem(themeStorageKey)).toBe(setting)
  },
)

it('forgets a choice when System is chosen again', async () => {
  localStorage.setItem(themeStorageKey, 'dark')
  const { choose } = await renderMenu()
  expect(root.classList.contains('dark')).toBe(true)
  await choose(en.theme.system)
  await expect.poll(() => root.classList.contains('dark')).toBe(false)
  expect(localStorage.getItem(themeStorageKey)).toBeNull()
})

it('ignores a stored value it does not know', async () => {
  localStorage.setItem(themeStorageKey, 'sepia')
  device.dark = true
  await renderMenu()
  expect(root.classList.contains('dark')).toBe(true)
})
