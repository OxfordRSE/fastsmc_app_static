import { type Palette, palettes } from '../components/palette'

/**
 * The colours of the current theme.
 *
 * @returns The palette of the theme the page is shown in.
 */
export function usePalette(): Palette {
  return palettes[
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  ]
}
