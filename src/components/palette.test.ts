import { describe, expect, it } from 'vitest'
import {
  darkest,
  inspectedColour,
  inspectedHalo,
  lightest,
  selectedColour,
  selectedHalo,
} from './palette'

// The palette's colours as RGB; CSS names are spelled out here.
const named: Readonly<Record<string, readonly [number, number, number]>> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  blue: [0, 0, 255],
}

function rgb(colour: string): readonly [number, number, number] {
  const known = named[colour]
  if (known) return known
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour)
  if (!hex) throw new Error(`Unrecognised colour ${colour}`)
  return [1, 2, 3].map((i) =>
    parseInt(hex[i] ?? '', 16),
  ) as unknown as readonly [number, number, number]
}

// Relative luminance and contrast ratio, as defined by WCAG 2.2.
function luminance(colour: string): number {
  const [r, g, b] = rgb(colour).map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (high + 0.05) / (low + 0.05)
}

// WCAG 2.2 success criterion 1.4.11, non-text contrast: at least 3:1.
const minimum = 3

describe('the selected and inspected marks stand out against every fill', () => {
  it.each([
    ['selected outline', 'the darkest fill', selectedColour, darkest],
    ['selected halo', 'the lightest fill', selectedHalo, lightest],
    ['inspected outline', 'the lightest fill', inspectedColour, lightest],
    ['inspected halo', 'the darkest fill', inspectedHalo, darkest],
  ])('%s against %s', (_, __, mark, fill) => {
    expect(contrast(mark, fill)).toBeGreaterThanOrEqual(minimum)
  })
})

it('distinguishes the selected and inspected marks by lightness, not only hue', () => {
  expect(contrast(selectedColour, inspectedColour)).toBeGreaterThanOrEqual(
    minimum,
  )
})
