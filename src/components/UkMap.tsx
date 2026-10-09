// Ports UkMap.js from the original frontend (OxfordRSE/fastsmc_app_frontend),
// keeping its projection and fill colours. Areas without data are now grey and
// cannot be selected, where the original drew them white; the map is centred
// in its box; and the red and green outlines became colour-blind-safe ones
// with halos (see palette.ts). The map now zooms and pans (see useMapZoom.ts),
// and works by touch and keyboard as well as by mouse.

import { geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { zoomTransform } from 'd3-zoom'
import { House, Minus, Plus } from 'lucide-react'
import {
  type KeyboardEvent,
  type PointerEvent,
  type MouseEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
} from 'react'
import { useCopy } from '../content/useCopy'
import { useElementSize } from '../hooks/useElementSize'
import { useMapZoom } from '../hooks/useMapZoom'
import { usePalette } from '../hooks/usePalette'
import {
  borderColour,
  inspectedColour,
  inspectedHalo,
  selectedColour,
  selectedHalo,
} from './palette'
import type { InspectMethod, Inspection } from '../lib/appState'
import type { ColourRange } from '../lib/colourRange'
import { mapProjection } from '../lib/mapLayout'
import {
  type Direction,
  matchTyped,
  nearestInDirection,
} from '../lib/mapNavigation'
import { isOutOfView, zoomStep } from '../lib/mapZoom'
import { areasByCode, boundaries, postcodeAreas } from '../lib/postcodeMap'
import { Button } from './ui/button'

/** Props for {@link UkMap}. */
export interface UkMapProps {
  /** Relatedness to the selected area in percent of its link with itself, keyed by matrix index. */
  readonly values: ReadonlyMap<number, number>
  /** The values shown in the lightest and darkest colours. */
  readonly range: ColourRange
  /** Code of the selected area, outlined in orange. */
  readonly selected: string
  /** The inspected area, outlined in black, if any. */
  readonly inspected: Inspection | null
  /** Called to select an area with data: a click, a second tap, or Enter. */
  readonly onSelect: (code: string) => void
  /** Called to inspect an area: the pointer over it, a first tap, or the keyboard. */
  readonly onInspect: (code: string, by: InspectMethod) => void
  /** Called to stop inspecting. */
  readonly onClearInspection: () => void
}

// The areas in alphabetical order: the order a screen reader lists them in,
// and in which typed letters search them.
const areasInOrder = postcodeAreas.features
  .map(({ properties }) => properties)
  .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))

const arrows: Readonly<Partial<Record<string, Direction>>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

// Letters typed within this many milliseconds of each other search together.
const typingPauseMs = 1000

/**
 * The map of UK postcode areas, coloured by relatedness to the selected area.
 *
 * @remarks
 * A mouse inspects the area under the pointer and selects with a click. A tap
 * inspects an area and a second tap selects it. With the keyboard, the map is
 * one stop in the tab order, a list box of areas: the arrow keys move between
 * neighbouring areas, typing jumps to an area by code or name, and Enter
 * selects. The focused area is conveyed by `aria-activedescendant` rather than
 * by moving focus, which would scroll the map's clipped box.
 *
 * @param props - See {@link UkMapProps}.
 * @returns The map, sized to fill its container.
 */
export function UkMap({
  values,
  range,
  selected,
  inspected,
  onSelect,
  onInspect,
  onClearInspection,
}: UkMapProps) {
  const copy = useCopy()
  const palette = usePalette()
  const keysId = useId()
  const optionId = (code: string) => `${keysId}-${code}`
  const [ref, { width, height }] = useElementSize<HTMLDivElement>()
  const svgRef = useRef<SVGSVGElement>(null)
  const { transform, max, zoomBy, reset, centreOn } = useMapZoom(
    svgRef,
    width,
    height,
  )
  const pointerType = useRef('')
  const typed = useRef({ letters: '', at: 0 })

  const { outlines, bounds, centres, boundaryLines } = useMemo(() => {
    const path = geoPath(mapProjection(width, height))
    const sized = width > 0 && height > 0
    const drawn = sized ? postcodeAreas.features : []
    return {
      boundaryLines: sized ? (path(boundaries) ?? '') : '',
      outlines: new Map(
        drawn.map((area) => [area.properties.code, path(area) ?? '']),
      ),
      bounds: new Map(
        drawn.map((area) => [area.properties.code, path.bounds(area)]),
      ),
      centres: new Map(
        drawn.map((area) => [area.properties.code, path.centroid(area)]),
      ),
    }
  }, [width, height])

  // Brings an area that is wholly out of view to the centre, keeping the zoom.
  const showArea = useMemo(
    () => (code: string) => {
      const svg = svgRef.current
      const box = bounds.get(code)
      if (
        !svg ||
        !box ||
        !isOutOfView(box, zoomTransform(svg), width, height)
      ) {
        return
      }
      const [[left, top], [right, bottom]] = box
      centreOn((left + right) / 2, (top + bottom) / 2)
    },
    [bounds, width, height, centreOn],
  )

  // An area selected elsewhere, such as from the postcode entry, may be out of view.
  useEffect(() => {
    showArea(selected)
  }, [selected, showArea])

  const current = inspected?.postcode ?? selected
  const inspectByKey = (code: string) => {
    onInspect(code, 'keyboard')
    showArea(code)
  }
  const selectIfData = (code: string) => {
    if (areasByCode.get(code)?.hasData) onSelect(code)
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const { key } = event
    const direction = arrows[key]
    const now = event.timeStamp
    const typing =
      typed.current.letters !== '' && now - typed.current.at < typingPauseMs
    const first = areasInOrder[0]
    const last = areasInOrder[areasInOrder.length - 1]
    if (direction) {
      const next = nearestInDirection(current, centres, direction)
      if (next) inspectByKey(next)
    } else if (key === '+' || key === '=') {
      zoomBy(zoomStep)
    } else if (key === '-') {
      zoomBy(1 / zoomStep)
    } else if (key === '0') {
      reset()
    } else if (key === 'Home' && first) {
      inspectByKey(first.code)
    } else if (key === 'End' && last) {
      inspectByKey(last.code)
    } else if (key === 'Enter' || (key === ' ' && !typing)) {
      selectIfData(current)
    } else if (key === 'Escape') {
      onClearInspection()
    } else if (key.length === 1 && /[\p{L} ]/u.test(key)) {
      const letters = (typing ? typed.current.letters : '') + key
      typed.current = { letters, at: now }
      const match = matchTyped(letters, areasInOrder)
      if (match) inspectByKey(match)
    } else {
      return
    }
    event.preventDefault()
  }

  const onAreaClick = (code: string) => {
    if (pointerType.current !== 'touch') {
      selectIfData(code)
    } else if (inspected?.postcode === code) {
      selectIfData(code)
    } else {
      onInspect(code, 'touch')
    }
  }

  // A click or tap on the sea, rather than on an area, stops inspecting.
  const onMapClick = (event: MouseEvent<SVGSVGElement>) => {
    if (event.target === event.currentTarget) onClearInspection()
  }

  // Position on the colour scale, from 0 at its low end to 1 at its high end.
  const position = scaleLinear().domain([range.low, range.high]).clamp(true)
  const colour = (value: number) => palette.ramp(position(value))

  // A wider halo underneath keeps the outline visible on light and dark fills.
  const outline = (
    code: string | undefined,
    stroke: string,
    halo: string,
    kind: string,
  ) => {
    const d = code === undefined ? undefined : outlines.get(code)
    if (d === undefined) return null
    return (
      <g fill="none" pointerEvents="none" aria-hidden>
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
        role="listbox"
        aria-label={copy.map.label}
        aria-describedby={keysId}
        aria-activedescendant={optionId(current)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={(event) => {
          // From the keyboard only: a click focuses the map too.
          if (
            inspected === null &&
            event.currentTarget.matches(':focus-visible')
          ) {
            onInspect(selected, 'keyboard')
          }
        }}
        onBlur={() => {
          if (inspected?.by === 'keyboard') onClearInspection()
        }}
        onPointerDown={(event: PointerEvent<SVGSVGElement>) => {
          pointerType.current = event.pointerType
        }}
        onPointerLeave={(event: PointerEvent<SVGSVGElement>) => {
          if (event.pointerType !== 'touch' && inspected?.by === 'pointer') {
            onClearInspection()
          }
        }}
        onClick={onMapClick}
        className="outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        style={{ touchAction: transform.k > 1 ? 'none' : 'pan-y' }}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Outlines keep their width at any zoom (non-scaling strokes). */}
        <g transform={transform.toString()}>
          {areasInOrder.map(({ code, name, matrixIndex, hasData }) => {
            const value = values.get(matrixIndex)
            const label = copy.controls.area(name, code)
            const known = hasData && value !== undefined
            return (
              <path
                key={code}
                id={optionId(code)}
                role="option"
                aria-label={
                  known
                    ? copy.map.option(label, copy.percent(value))
                    : copy.map.optionNoData(label)
                }
                aria-selected={code === selected}
                aria-disabled={!hasData || undefined}
                d={outlines.get(code)}
                data-code={code}
                className={hasData ? 'cursor-pointer' : undefined}
                fill={known ? colour(value) : palette.noData}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') onInspect(code, 'pointer')
                }}
                onClick={() => {
                  onAreaClick(code)
                }}
              />
            )
          })}
          {/* Boundaries and coastline over the fills, each line drawn once. */}
          <path
            data-boundaries
            d={boundaryLines}
            fill="none"
            stroke={borderColour}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            aria-hidden
          />
          {outline(
            inspected?.postcode,
            inspectedColour,
            inspectedHalo,
            'inspected',
          )}
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
