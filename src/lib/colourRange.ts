import { at } from './arrays'

/**
 * How the two ends of the map's colour scale are chosen.
 *
 * @remarks
 * - `secondLargest`: from zero to the second-largest value. The largest is
 *   usually the selected area itself, which would otherwise wash out every other
 *   area.
 *
 * - `percentiles`: from the 5th to the 95th percentile, giving the most contrast
 *   across the middle of the distribution.
 *
 * - `user`: the user's own choice, kept as the selection changes.
 */
export type ColourRangeMode = 'secondLargest' | 'percentiles' | 'user'

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
 *   largest value, which `secondLargest` skips.
 * @param current - The range currently in use, kept in `user` mode.
 * @returns The new range. In `user` mode, `current` clamped to the values' extent.
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
    case 'secondLargest':
      return { low: 0, high: at(sorted, last - 1) }
    case 'percentiles':
      return {
        low: at(sorted, Math.round(sorted.length * 0.05)),
        high: at(sorted, Math.min(Math.round(sorted.length * 0.95), last)),
      }
    case 'user': {
      const clamp = (value: number) =>
        Math.min(Math.max(value, at(sorted, 0)), at(sorted, last))
      return { low: clamp(current.low), high: clamp(current.high) }
    }
  }
}
