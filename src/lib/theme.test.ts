import { expect, it } from 'vitest'
import { resolveTheme } from './theme'

it.each([
  ['system', false, 'light'],
  ['system', true, 'dark'],
  ['light', true, 'light'],
  ['dark', false, 'dark'],
] as const)(
  'shows %s on a device set to dark: %s, as %s',
  (setting, deviceIsDark, theme) => {
    expect(resolveTheme(setting, deviceIsDark)).toBe(theme)
  },
)
