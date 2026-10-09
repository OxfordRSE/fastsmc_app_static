import { type Palette, palettes } from '../components/palette'
import { useTheme } from './useTheme'

/**
 * The colours of the current theme.
 *
 * @returns The palette of the theme the page is shown in.
 */
export function usePalette(): Palette {
  return palettes[useTheme().theme]
}
