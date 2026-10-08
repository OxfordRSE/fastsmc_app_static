// Ports UkMap.js from the original frontend (OxfordRSE/fastsmc_app_frontend),
// keeping its projection, colours and outlines. Areas without data are now grey
// and cannot be selected, where the original drew them white.

import { geoAlbers, geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { useMemo } from 'react'
import { useElementSize } from '../hooks/useElementSize'
import type { ColourRange } from '../lib/colourRange'
import { postcodeAreas } from '../lib/postcodeMap'
import {
  border,
  darkest,
  hoveredColour,
  lightest,
  noData,
  selectedColour,
} from './palette'

/** Props for {@link UkMap}. */
export interface UkMapProps {
  /** Mean relatedness to the selected area, keyed by matrix index. */
  readonly values: ReadonlyMap<number, number>
  /** The values shown in the lightest and darkest colours. */
  readonly range: ColourRange
  /** Code of the selected area, outlined in red. */
  readonly selected: string
  /** Code of the area under the pointer, outlined in green, if any. */
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
    const projection = geoAlbers()
      .center([5, 54.4])
      .rotate([4.4, 0])
      .parallels([50, 60])
      .fitExtent(
        [
          [0, 0],
          [0.9 * width, 0.9 * height],
        ],
        postcodeAreas,
      )
    const path = geoPath(projection)
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

  const outline = (code: string | null, stroke: string, kind: string) => {
    const d = code === null ? undefined : outlines.get(code)
    if (d === undefined) return null
    return (
      <path
        d={d}
        data-outline={kind}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        pointerEvents="none"
      />
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
        {outline(hovered, hoveredColour, 'hovered')}
        {outline(selected, selectedColour, 'selected')}
      </svg>
    </div>
  )
}
