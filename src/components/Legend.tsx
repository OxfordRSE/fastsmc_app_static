// The map's colour legend, new in this version: the original frontend
// (OxfordRSE/fastsmc_app_frontend) had none.

import { useCopy } from '../content/useCopy'
import type { ColourRange } from '../lib/colourRange'
import { usePalette } from '../hooks/usePalette'

/** Props of {@link Legend}. */
export interface LegendProps {
  /** The values shown in the lightest and darkest colours, in percent. */
  readonly range: ColourRange
  /** The smallest and largest values on the map, in percent. */
  readonly extent: ColourRange
  /** The selected area's place name, such as "Birmingham". */
  readonly selected: string
}

/**
 * The colour scale with its ends labelled.
 *
 * @remarks
 * The scale is clamped, so an end that values beyond it share says so, such as
 * "46% or more".
 *
 * @param props - See {@link LegendProps}.
 * @returns The legend, as a figure.
 */
export function Legend({ range, extent, selected }: LegendProps) {
  const copy = useCopy()
  const palette = usePalette()
  // Enough stops for the gradient to follow the scale's curve.
  const stops = Array.from({ length: 11 }, (_, i) => palette.ramp(i / 10))
  const low = copy.percent(range.low)
  const high = copy.percent(range.high)
  return (
    <figure className="flex w-52 flex-col gap-1.5 rounded-md border bg-background/90 p-2 text-xs shadow-sm">
      <figcaption className="font-medium">
        {copy.legend.title(selected)}
      </figcaption>
      <div
        aria-hidden
        data-ramp
        // Kept in forced-colours mode, which would otherwise drop the gradient.
        // Spread under the border too (bg-origin-border): sized to the inside
        // alone, the gradient would repeat into the border, and the dark
        // theme's translucent border would show its far end at each edge.
        className="h-3 rounded-sm border bg-origin-border forced-color-adjust-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${stops.join(', ')})`,
        }}
      />
      <div className="flex justify-between gap-2 text-muted-foreground tabular-nums">
        <span data-end="low">
          {extent.low < range.low ? copy.legend.atMost(low) : low}
        </span>
        <span data-end="high">
          {extent.high > range.high ? copy.legend.atLeast(high) : high}
        </span>
      </div>
    </figure>
  )
}
