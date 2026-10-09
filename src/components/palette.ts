// Colours shared by the map, the legend, the details panel and the chart, so
// that each means the same thing everywhere, in light and dark themes. The
// original frontend (OxfordRSE/fastsmc_app_frontend) filled the map from white
// to blue, mixed in sRGB; that became ColorBrewer's yellow-green-blue scheme,
// which is ordered by lightness, colour-blind safe and spans more perceptible
// difference. Its red and green marks became Okabe-Ito orange and black,
// distinguishable with any common colour-vision deficiency and by lightness
// alone, each drawn over a halo that contrasts with every fill.

import { interpolateYlGnBu } from 'd3-scale-chromatic'

/** A colour theme. */
export type Theme = 'light' | 'dark'

/** The colours that differ between themes. */
export interface Palette {
  /**
   * The map's fill for a value on its colour scale.
   *
   * @param t - Position on the scale, from 0 (least related) to 1 (most); clamped.
   * @returns A CSS colour: darker for higher values in the light theme, lighter in the dark one.
   */
  readonly ramp: (t: number) => string
  /** Fill of areas without data, under a hatch pattern. */
  readonly noData: string
  /** The hatch lines over areas without data. */
  readonly noDataHatch: string
}

const clamp = (t: number) => Math.min(1, Math.max(0, t))

/** The colours of each theme. */
export const palettes: Readonly<Record<Theme, Palette>> = {
  // Pale yellow for the least related areas, through green and teal, to dark blue.
  light: {
    ramp: (t) => interpolateYlGnBu(clamp(t)),
    noData: '#c8c8c8',
    noDataHatch: '#6b6b6b',
  },
  // The same scheme reversed, so that on a dark background the most related
  // areas are the brightest and stand out, as they are darkest on a light one.
  dark: {
    ramp: (t) => interpolateYlGnBu(1 - clamp(t)),
    noData: '#3a3a3a',
    noDataHatch: '#8a8a8a',
  },
}

/**
 * The chart's bars, in both themes: a mid-blue from the same scheme, which
 * contrasts with either page and with the error bars drawn over it (black in
 * the light theme, white in the dark). The bars' heights carry their values,
 * so their colour need not follow the map's scale.
 */
export const barColour = interpolateYlGnBu(0.7)

/** Marks the selected area: Okabe-Ito orange. */
export const selectedColour = '#e69f00'

/** Drawn under the selected area's outline, so it shows against every fill. */
export const selectedHalo = 'black'

/** Marks the inspected area. */
export const inspectedColour = 'black'

/** Drawn under the inspected area's outline, so it shows against every fill. */
export const inspectedHalo = 'white'

/**
 * Every boundary between areas, and the coastline, in both themes: a neutral
 * grey that shows against both ends of the scale and against either page.
 */
export const borderColour = '#8c8c8c'
