import { rgb } from 'd3-color'
import { describe, expect, it } from 'vitest'
import {
  barColour,
  borderColour,
  inspectedColour,
  inspectedHalo,
  palettes,
  selectedColour,
  selectedHalo,
  type Theme,
} from './palette'

// A colour's relative luminance and two colours' contrast ratio, as WCAG 2.2
// defines them.
function luminance(colour: string): number {
  const { r, g, b } = rgb(colour)
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
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

const themes: readonly Theme[] = ['light', 'dark']

// The page behind the map: index.css's --background in each theme.
const pageBackground: Readonly<Record<Theme, string>> = {
  light: '#ffffff',
  dark: '#0a0a0a',
}

// Colours along the scale, from 0 to 1, and the fill of areas without data.
const fills = (theme: Theme) => [
  ...Array.from({ length: 21 }, (_, i) => palettes[theme].ramp(i / 20)),
  palettes[theme].noData,
]

describe.each(themes)('in the %s theme', (theme) => {
  it.each([
    ['selected', selectedColour, selectedHalo],
    ['inspected', inspectedColour, inspectedHalo],
  ])(
    'the %s outline or its halo stands out against every fill',
    (_, outline, halo) => {
      for (const fill of fills(theme)) {
        const best = Math.max(contrast(outline, fill), contrast(halo, fill))
        expect(best, fill).toBeGreaterThanOrEqual(minimum)
      }
    },
  )

  it('draws boundaries that stand out against both ends of the scale and the page', () => {
    const { ramp } = palettes[theme]
    for (const behind of [ramp(0), ramp(1), pageBackground[theme]]) {
      expect(contrast(borderColour, behind), behind).toBeGreaterThanOrEqual(
        minimum,
      )
    }
  })
})

it.each([
  ['light', 'black'],
  ['dark', 'white'],
] as const)(
  'draws the chart bars to stand out in the %s theme, under %s error bars',
  (theme, errorBars) => {
    expect(contrast(barColour, pageBackground[theme])).toBeGreaterThanOrEqual(
      minimum,
    )
    expect(contrast(barColour, errorBars)).toBeGreaterThanOrEqual(minimum)
  },
)

it('distinguishes the selected and inspected marks by lightness, not only hue', () => {
  expect(contrast(selectedColour, inspectedColour)).toBeGreaterThanOrEqual(
    minimum,
  )
})

// Colour-vision deficiencies, simulated as Chrome's emulation does: Machado,
// Oliveira and Fernandes (2009), at full severity, in linear RGB. Full colour
// blindness keeps luminance alone.
const machado: Readonly<Record<string, readonly number[]>> = {
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882,
    -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
    0.04294, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733,
    0.691367, 0.3039,
  ],
}

type Linear = readonly [number, number, number]

function linear(colour: string): Linear {
  const { r, g, b } = rgb(colour)
  return [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as unknown as Linear
}

const clamp = (x: number) => Math.min(1, Math.max(0, x))

const visions: Readonly<Record<string, (c: Linear) => Linear>> = {
  'normal vision': (c) => c,
  ...Object.fromEntries(
    Object.entries(machado).map(([name, m]) => [
      name,
      ([r, g, b]: Linear): Linear =>
        [0, 3, 6].map((row) =>
          clamp(
            (m[row] ?? 0) * r + (m[row + 1] ?? 0) * g + (m[row + 2] ?? 0) * b,
          ),
        ) as unknown as Linear,
    ]),
  ),
  'no colour vision': ([r, g, b]) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return [y, y, y]
  },
}

// OKLab lightness (Ottosson, 2020), from 0 for black to 1 for white: a
// perceptual scale, unlike luminance.
function lightness([r, g, b]: Linear): number {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
}

describe.each(Object.entries(visions))('with %s', (_, see) => {
  const lightnesses = (theme: Theme) =>
    Array.from({ length: 21 }, (_, i) =>
      lightness(see(linear(palettes[theme].ramp(i / 20)))),
    )

  it.each(themes)(
    'reads the %s scale by lightness: steadily one way, over a wide range',
    (theme) => {
      const values = lightnesses(theme)
      // Darker towards the top in the light theme, lighter in the dark one.
      const sign = theme === 'light' ? -1 : 1
      for (let i = 1; i < values.length; i++) {
        expect(
          sign * ((values[i] ?? 0) - (values[i - 1] ?? 0)),
        ).toBeGreaterThan(0)
      }
      const range = Math.max(...values) - Math.min(...values)
      expect(range).toBeGreaterThan(0.65)
    },
  )
})
