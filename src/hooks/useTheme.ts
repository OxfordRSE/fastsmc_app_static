import { createContext, useContext } from 'react'
import type { Theme } from '../components/palette'
import type { ThemeSetting } from '../lib/theme'

/** The theme and the visitor's choice of it, from {@link useTheme}. */
export interface ThemeState {
  /** The visitor's choice. */
  readonly setting: ThemeSetting
  /** The theme shown: the choice, or the device's setting for 'system'. */
  readonly theme: Theme
  /** Changes the choice, and keeps it for the next visit. */
  readonly setSetting: (setting: ThemeSetting) => void
}

/** Holds the theme for {@link useTheme}; provided by ThemeProvider. */
export const ThemeContext = createContext<ThemeState>({
  setting: 'system',
  theme: 'light',
  setSetting: () => undefined,
})

/**
 * The theme shown and the visitor's choice of it.
 *
 * @returns The current theme state.
 */
export function useTheme(): ThemeState {
  return useContext(ThemeContext)
}
