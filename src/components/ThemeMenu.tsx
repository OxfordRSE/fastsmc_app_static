// shadcn/ui's mode toggle (ui.shadcn.com/docs/dark-mode/vite), with the choices
// as radio items, so the current one is marked and announced.

import { Moon, Sun } from 'lucide-react'
import { useCopy } from '../content/useCopy'
import { useTheme } from '../hooks/useTheme'
import { type ThemeSetting, themeSettings } from '../lib/theme'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const isSetting = (value: unknown): value is ThemeSetting =>
  themeSettings.some((setting) => setting === value)

/**
 * The button that chooses between following the device, light and dark.
 *
 * @returns The button; its menu opens below it.
 */
export function ThemeMenu() {
  const copy = useCopy()
  const { setting, theme, setSetting } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={copy.theme.label}
            title={copy.theme.label}
          />
        }
      >
        {theme === 'dark' ? <Moon /> : <Sun />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={setting}
          onValueChange={(value) => {
            if (isSetting(value)) setSetting(value)
          }}
        >
          {themeSettings.map((choice) => (
            <DropdownMenuRadioItem key={choice} value={choice}>
              {copy.theme[choice]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
