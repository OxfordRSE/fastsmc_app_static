// Ports UkMap.js from the original frontend (OxfordRSE/fastsmc_app_frontend),
// keeping its projection and fill colours. Areas without data are now grey and
// cannot be selected, where the original drew them white; the map is centred
// in its box; and the red and green outlines became colour-blind-safe ones
// with halos (see palette.ts).

import { geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { useMemo } from 'react'
import { useElementSize } from '../hooks/useElementSize'
import type { ColourRange } from '../lib/colourRange'
import { mapProjection } from '../lib/mapLayout'
import { postcodeAreas } from '../lib/postcodeMap'
import {
  border,
  darkest,
  hoveredColour,
  hoveredHalo,
  lightest,
  noData,
  selectedColour,
  selectedHalo,
} from './palette'

/** Props for {@link UkMap}. */
export interface UkMapProps {
  /** Relatedness to the selected area, keyed by matrix index: any scale, such as percent of its link with itself. */
  readonly values: ReadonlyMap<number, number>
  /** The values shown in the lightest and darkest colours. */
  readonly range: ColourRange
  /** Code of the selected area, outlined in orange. */
  readonly selected: string
  /** Code of the area under the pointer, outlined in black, if any. */
  readonly hovered: string | null
  /** Called when an area with data is clicked. */
  readonly onSelect: (code: string) => void
  /** Called when the pointer moves onto an area. */
  readonly onHover: (code: string) => void
}

/**
 * The map of UK postcode areas, coloured by relatedness to the selected area.
 *
 * @param props - See {@link UkMapProps}.
 * @returns The map, sized to fill its container.
 */
export function UkMap({
  values,
  range,
  selected,
  hovered,
  onSelect,
  onHover,
}: UkMapProps) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>()

  const outlines = useMemo(() => {
    if (width === 0 || height === 0) return new Map<string, string>()
    const path = geoPath(mapProjection(width, height))
    return new Map(
      postcodeAreas.features.map((area) => [
        area.properties.code,
        path(area) ?? '',
      ]),
    )
  }, [width, height])

  const colour = scaleLinear<string>()
    .domain([range.low, range.high])
    .range([lightest, darkest])
    .clamp(true)

  // A wider halo underneath keeps the outline visible on light and dark fills.
  const outline = (
    code: string | null,
    stroke: string,
    halo: string,
    kind: string,
  ) => {
    const d = code === null ? undefined : outlines.get(code)
    if (d === undefined) return null
    return (
      <g fill="none" pointerEvents="none">
        <path d={d} data-halo={kind} stroke={halo} strokeWidth={4.5} />
        <path d={d} data-outline={kind} stroke={stroke} strokeWidth={2.5} />
      </g>
    )
  }

  return (
    <div ref={ref} className="size-full">
      {/* Round joins and caps, inherited by every outline: sharp mitre joins
          spike at tight turns of the coastline. */}
      <svg
        width={width}
        height={height}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {postcodeAreas.features.map(({ properties }) => {
          const { code, matrixIndex, hasData } = properties
          const value = values.get(matrixIndex)
          return (
            <path
              key={code}
              d={outlines.get(code)}
              data-code={code}
              className={hasData ? 'cursor-pointer' : undefined}
              fill={hasData && value !== undefined ? colour(value) : noData}
              stroke={border}
              strokeWidth={1}
              onMouseEnter={() => {
                onHover(code)
              }}
              onClick={
                hasData
                  ? () => {
                      onSelect(code)
                    }
                  : undefined
              }
            />
          )
        })}
        {outline(hovered, hoveredColour, hoveredHalo, 'hovered')}
        {outline(selected, selectedColour, selectedHalo, 'selected')}
      </svg>
    </div>
  )
}
