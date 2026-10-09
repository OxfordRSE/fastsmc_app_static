// shadcn/ui's theme provider for Vite (ui.shadcn.com/docs/dark-mode/vite),
// adapted: it also follows the device if its setting changes while the page is
// open, and the theme is first set by index.html's inline script.

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { ThemeContext } from '../hooks/useTheme'
import {
  applyTheme,
  darkQuery,
  readSetting,
  resolveTheme,
  type ThemeSetting,
  writeSetting,
} from '../lib/theme'

/**
 * Provides the theme to the app, and shows it on the page.
 *
 * @param props - The app, which reads the theme through `useTheme`.
 * @returns The app, inside the provider.
 */
export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [setting, setStoredSetting] = useState<ThemeSetting>(readSetting)
  const [deviceIsDark, setDeviceIsDark] = useState(
    () => window.matchMedia(darkQuery).matches,
  )

  // Follow the device if its setting changes, such as at sunset.
  useEffect(() => {
    const query = window.matchMedia(darkQuery)
    const onChange = (event: MediaQueryListEvent) => {
      setDeviceIsDark(event.matches)
    }
    query.addEventListener('change', onChange)
    return () => {
      query.removeEventListener('change', onChange)
    }
  }, [])

  const theme = resolveTheme(setting, deviceIsDark)

  // Before the browser paints, so a change never shows the old colours.
  useLayoutEffect(() => {
    applyTheme(document.documentElement, theme)
  }, [theme])

  const setSetting = useCallback((next: ThemeSetting) => {
    setStoredSetting(next)
    writeSetting(next)
  }, [])

  const value = useMemo(
    () => ({ setting, theme, setSetting }),
    [setting, theme, setSetting],
  )
  return <ThemeContext value={value}>{children}</ThemeContext>
}
