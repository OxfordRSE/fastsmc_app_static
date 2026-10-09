// Limits and steps for zooming and panning the map. New: the original frontend
// (OxfordRSE/fastsmc_app_frontend) had no zoom.

import { geoPath } from 'd3-geo'
import { mapProjection } from './mapLayout'
import { postcodeAreas } from './postcodeMap'

/**
 * The size, in pixels, at which an area is easy to see and select: WCAG 2.2's
 * enhanced target size (2.5.5), beyond the 24 px minimum of level AA (2.5.8).
 */
export const targetSizePx = 44

/** The factor by which each zoom button or key press zooms in or out. */
export const zoomStep = 2

/** How far, in pixels, each arrow key press pans the map. */
export const panStepPx = 100

/**
 * The most the map may be zoomed in: just enough for the smallest area to be
 * easy to see and select.
 *
 * @remarks
 * An area's size is taken as the side of a square of the same area, which
 * suits odd shapes better than a bounding box. Never below 1, the default view.
 *
 * @param width - Width of the map's box, in pixels.
 * @param height - Height of the map's box, in pixels.
 * @returns The largest zoom factor, relative to the default view.
 */
export function maxZoom(width: number, height: number): number {
  const path = geoPath(mapProjection(width, height))
  const smallest = Math.min(
    ...postcodeAreas.features.map((area) => Math.sqrt(path.area(area))),
  )
  return Math.max(1, targetSizePx / smallest)
}

/** A zoom transform: scale `k`, then translate by `x` and `y`, as in d3-zoom. */
export interface ZoomState {
  readonly k: number
  readonly x: number
  readonly y: number
}

/**
 * Whether a box drawn on the map lies wholly within the visible part of it.
 *
 * @param bounds - The box in the default view: [[left, top], [right, bottom]].
 * @param transform - The current zoom.
 * @param width - Width of the map's box, in pixels.
 * @param height - Height of the map's box, in pixels.
 * @returns `true` if none of the box is outside the view.
 */
export function isInView(
  bounds: readonly [readonly [number, number], readonly [number, number]],
  transform: ZoomState,
  width: number,
  height: number,
): boolean {
  const [[left, top], [right, bottom]] = bounds
  const { k, x, y } = transform
  return (
    k * left + x >= 0 &&
    k * top + y >= 0 &&
    k * right + x <= width &&
    k * bottom + y <= height
  )
}
