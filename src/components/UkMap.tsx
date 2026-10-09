// Ports UkMap.js from the original frontend (OxfordRSE/fastsmc_app_frontend),
// keeping its projection and fill colours. Areas without data are now grey and
// cannot be selected, where the original drew them white; the map is centred
// in its box; and the red and green outlines became colour-blind-safe ones
// with halos (see palette.ts). The map now zooms and pans (see useMapZoom.ts).

import { geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { zoomTransform } from 'd3-zoom'
import { House, Minus, Plus } from 'lucide-react'
import { type KeyboardEvent, useEffect, useId, useMemo, useRef } from 'react'
import { useCopy } from '../content/useCopy'
import { useElementSize } from '../hooks/useElementSize'
import { useMapZoom } from '../hooks/useMapZoom'
import type { ColourRange } from '../lib/colourRange'
import { mapProjection } from '../lib/mapLayout'
import { isInView, panStepPx, zoomStep } from '../lib/mapZoom'
import { postcodeAreas } from '../lib/postcodeMap'
import { Button } from './ui/button'
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
  const copy = useCopy()
  const keysId = useId()
  const [ref, { width, height }] = useElementSize<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const { transform, max, zoomBy, reset, panBy, centreOn } = useMapZoom(
    svgRef,
    width,
    height,
  )

  const { outlines, bounds } = useMemo(() => {
    if (width === 0 || height === 0) {
      return {
        outlines: new Map<string, string>(),
        bounds: new Map<string, [[number, number], [number, number]]>(),
      }
    }
    const path = geoPath(mapProjection(width, height))
    return {
      outlines: new Map(
        postcodeAreas.features.map((area) => [
          area.properties.code,
          path(area) ?? '',
        ]),
      ),
      bounds: new Map(
        postcodeAreas.features.map((area) => [
          area.properties.code,
          path.bounds(area),
        ]),
      ),
    }
  }, [width, height])

  // An area selected elsewhere, such as from the postcode entry, may be out of
  // view when zoomed in: bring it to the centre.
  useEffect(() => {
    const svg = svgRef.current
    const box = bounds.get(selected)
    if (!svg || !box || isInView(box, zoomTransform(svg), width, height)) {
      return
    }
    const [[left, top], [right, bottom]] = box
    centreOn((left + right) / 2, (top + bottom) / 2)
  }, [selected, bounds, width, height, centreOn])

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const actions: Readonly<Record<string, () => void>> = {
      '+': () => {
        zoomBy(zoomStep)
      },
      '=': () => {
        zoomBy(zoomStep)
      },
      '-': () => {
        zoomBy(1 / zoomStep)
      },
      '0': reset,
      ArrowLeft: () => {
        panBy(panStepPx, 0)
      },
      ArrowRight: () => {
        panBy(-panStepPx, 0)
      },
      ArrowUp: () => {
        panBy(0, panStepPx)
      },
      ArrowDown: () => {
        panBy(0, -panStepPx)
      },
    }
    const action = actions[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

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
        <path
          d={d}
          data-halo={kind}
          stroke={halo}
          strokeWidth={4.5}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={d}
          data-outline={kind}
          stroke={stroke}
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    )
  }

  const zoomButtons = [
    {
      label: copy.map.zoomIn,
      icon: <Plus />,
      onClick: () => {
        zoomBy(zoomStep)
      },
      disabled: transform.k >= max,
    },
    {
      label: copy.map.zoomOut,
      icon: <Minus />,
      onClick: () => {
        zoomBy(1 / zoomStep)
      },
      disabled: transform.k <= 1,
    },
    {
      label: copy.map.resetZoom,
      icon: <House />,
      onClick: reset,
      disabled: transform.k <= 1,
    },
  ]

  return (
    <div ref={ref} className="relative size-full overflow-hidden">
      {/* Round joins and caps, inherited by every outline: sharp mitre joins
          spike at tight turns of the coastline. At the whole map, a touch
          drag scrolls the page (pan-y); once zoomed in, it pans the map. */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="group"
        aria-label={copy.map.label}
        aria-describedby={keysId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        style={{ touchAction: transform.k > 1 ? 'none' : 'pan-y' }}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Outlines keep their width at any zoom (non-scaling strokes). */}
        <g transform={transform.toString()}>
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
                vectorEffect="non-scaling-stroke"
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
        </g>
      </svg>
      <p id={keysId} className="sr-only">
        {copy.map.keys}
      </p>
      {/* Single-pointer alternatives to pinching and dragging (WCAG 2.5.1 and 2.5.7). */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {zoomButtons.map(({ label, icon, onClick, disabled }) => (
          <Button
            key={label}
            variant="outline"
            size="icon-lg"
            className="bg-background"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
          >
            {icon}
          </Button>
        ))}
      </div>
    </div>
  )
}
