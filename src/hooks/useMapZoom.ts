import { select } from 'd3-selection'
import {
  type D3ZoomEvent,
  zoom,
  zoomIdentity,
  type ZoomTransform,
  zoomTransform,
} from 'd3-zoom'
import { type RefObject, useEffect, useMemo, useState } from 'react'
import { maxZoom } from '../lib/mapZoom'

// A press that moves less than this, in pixels, is still a click, not a drag.
const clickDistancePx = 4

// Which events may start a zoom or pan. As d3-zoom's default, ignoring right
// and middle clicks and Ctrl-clicks; and on touch, one finger only once zoomed
// in, so that at the whole map a one-finger drag scrolls the page.
function startsGesture(this: SVGSVGElement, event: Event): boolean {
  if (event.type.startsWith('touch')) {
    return (event as TouchEvent).touches.length > 1 || zoomTransform(this).k > 1
  }
  const { ctrlKey, button } = event as MouseEvent
  return (!ctrlKey || event.type === 'wheel') && button === 0
}

/** The map's zoom and the ways to change it, from {@link useMapZoom}. */
export interface MapZoom {
  /** The current zoom, to apply to the map's contents. */
  readonly transform: ZoomTransform
  /** The most the map may be zoomed in. */
  readonly max: number
  /** Zooms in or out by a factor, about the centre of the view. */
  readonly zoomBy: (factor: number) => void
  /** Returns to the whole map. */
  readonly reset: () => void
  /** Moves the view to centre a point of the unzoomed map, keeping the zoom. */
  readonly centreOn: (x: number, y: number) => void
}

/**
 * Zooms and pans an SVG map with the mouse wheel, dragging and pinching,
 * between the whole map and a zoom at which the smallest area is easy to select.
 *
 * @remarks
 * d3-zoom handles the gestures on the SVG element; the transform it produces is
 * kept in React state for the map to draw with. Panning never goes beyond the
 * whole map, so there is never anything to scroll to. Double-click zoom is off,
 * since a click selects an area. A new size starts again from the whole map.
 *
 * @param svgRef - The map's SVG element.
 * @param width - Width of the SVG element, in pixels.
 * @param height - Height of the SVG element, in pixels.
 * @returns The current zoom and the functions that change it.
 */
export function useMapZoom(
  svgRef: RefObject<SVGSVGElement | null>,
  width: number,
  height: number,
): MapZoom {
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const behaviour = useMemo(() => zoom<SVGSVGElement, unknown>(), [])
  const max = useMemo(
    () => (width > 0 && height > 0 ? maxZoom(width, height) : 1),
    [width, height],
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || width === 0 || height === 0) return
    const box: [[number, number], [number, number]] = [
      [0, 0],
      [width, height],
    ]
    behaviour
      .extent(box)
      .translateExtent(box)
      .scaleExtent([1, max])
      .clickDistance(clickDistancePx)
      .filter(startsGesture)
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform(event.transform)
      })
    const selection = select(svg)
    selection.call(behaviour).on('dblclick.zoom', null)
    behaviour.transform(selection, zoomIdentity)
    return () => {
      selection.on('.zoom', null)
    }
  }, [svgRef, behaviour, width, height, max])

  // The same functions on every render, so effects can depend on them without
  // re-running at each step of a zoom.
  const actions = useMemo(() => {
    const act = (action: (svg: SVGSVGElement) => void) => {
      if (svgRef.current) action(svgRef.current)
    }
    return {
      zoomBy: (factor: number) => {
        act((svg) => {
          behaviour.scaleBy(select(svg), factor)
        })
      },
      reset: () => {
        act((svg) => {
          behaviour.transform(select(svg), zoomIdentity)
        })
      },
      centreOn: (x: number, y: number) => {
        act((svg) => {
          behaviour.translateTo(select(svg), x, y)
        })
      },
    }
  }, [svgRef, behaviour])

  return { transform, max, ...actions }
}
