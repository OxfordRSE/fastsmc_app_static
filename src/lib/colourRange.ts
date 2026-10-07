// Ports set_color_range in App.js, and the colour range controls in
// UserInterface.js, from the original frontend (OxfordRSE/fastsmc_app_frontend).

import { at } from './arrays'

/**
 * How the two ends of the map's colour scale are chosen.
 *
 * @remarks
 * - `second-largest`: from zero to the second-largest value. The largest is
 *   usually the selected area itself, which would otherwise wash out every other
 *   area.
 *
 * - `percentiles`: from the 5th to the 95th percentile, giving the most contrast
 *   across the middle of the distribution.
 *
 * - `custom`: the user's own choice, kept as the selection changes.
 *
 * In the original app these were `color_range_mode` 0, 1 and 2, labelled
 * "second largest", "95% percentiles" and "set by user".
 */
export type ColourRangeMode = 'second-largest' | 'percentiles' | 'custom'

/** The mode the map starts in, as in the original app. */
export const defaultColourRangeMode: ColourRangeMode = 'percentiles'

/** The values mapped to the lightest and darkest colours. */
export interface ColourRange {
  /** Value shown in the lightest colour; anything lower is clamped to it. */
  readonly low: number
  /** Value shown in the darkest colour; anything higher is clamped to it. */
  readonly high: number
}

function sortedAscending(values: readonly number[]): number[] {
  if (values.length < 2) {
    throw new RangeError(`Need at least 2 values, got ${String(values.length)}`)
  }
  return values.toSorted((a, b) => a - b)
}

/**
 * The smallest and largest values: the limits of the user's range slider.
 *
 * @param values - Relatedness of the selected area to every usable area,
 *   including itself.
 * @returns The extent of the values.
 * @throws `RangeError` if there are fewer than 2 values.
 */
export function valueExtent(values: readonly number[]): ColourRange {
  const sorted = sortedAscending(values)
  return { low: at(sorted, 0), high: at(sorted, sorted.length - 1) }
}

/**
 * Chooses the ends of the colour scale.
 *
 * @remarks
 * Percentiles use the original app's arithmetic: the values at sorted positions
 * `round(n * 0.05)` and `round(n * 0.95)`, not an interpolated percentile.
 *
 * @param mode - How to choose the ends.
 * @param values - Relatedness of the selected area to every usable area,
 *   including itself. The selected area must be included: it is usually the
 *   largest value, which `second-largest` skips.
 * @param current - The range currently in use, kept in `custom` mode.
 * @returns The new range. In `custom` mode, `current` clamped to the values' extent.
 * @throws `RangeError` if there are fewer than 2 values.
 */
export function colourRange(
  mode: ColourRangeMode,
  values: readonly number[],
  current: ColourRange,
): ColourRange {
  const sorted = sortedAscending(values)
  const last = sorted.length - 1
  switch (mode) {
    case 'second-largest':
      return { low: 0, high: at(sorted, last - 1) }
    case 'percentiles':
      return {
        low: at(sorted, Math.round(sorted.length * 0.05)),
        high: at(sorted, Math.min(Math.round(sorted.length * 0.95), last)),
      }
    case 'custom': {
      const clamp = (value: number) =>
        Math.min(Math.max(value, at(sorted, 0)), at(sorted, last))
      return { low: clamp(current.low), high: clamp(current.high) }
    }
  }
}
