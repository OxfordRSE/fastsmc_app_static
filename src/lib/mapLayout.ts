// The map's projection and fit, shared by the map, which draws with it, and the
// page layout, which needs to know where the map will be drawn. Ports the
// projection of UkMap.js in the original frontend (OxfordRSE/fastsmc_app_frontend).

import { type GeoProjection, geoAlbers, geoPath } from 'd3-geo'
import { postcodeAreas } from './postcodeMap'

/**
 * The map's margin on every side: 5% of the box's smaller dimension.
 *
 * @param width - Width of the box, in pixels.
 * @param height - Height of the box, in pixels.
 * @returns The margin, in pixels.
 */
export function mapMargin(width: number, height: number): number {
  return 0.05 * Math.min(width, height)
}

/**
 * The map's projection, fitted and centred in a box.
 *
 * @remarks
 * An Albers projection with the original app's parameters. The original fitted
 * the map to the top-left 90% of the box; this centres it with an even margin.
 *
 * @param width - Width of the box, in pixels.
 * @param height - Height of the box, in pixels.
 * @returns The fitted projection.
 */
export function mapProjection(width: number, height: number): GeoProjection {
  const margin = mapMargin(width, height)
  return geoAlbers()
    .center([5, 54.4])
    .rotate([4.4, 0])
    .parallels([50, 60])
    .fitExtent(
      [
        [margin, margin],
        [width - margin, height - margin],
      ],
      postcodeAreas,
    )
}

// The map's width over its height, which fitting does not change.
const [[left, top], [right, bottom]] = geoPath(
  mapProjection(1000, 1000),
).bounds(postcodeAreas)
const aspect = (right - left) / (bottom - top)

/**
 * How much free space the map leaves on each side of it.
 *
 * @param width - Width of the box, in pixels.
 * @param height - Height of the box, in pixels.
 * @returns The gap between the box's edge and the map, on the left and on the right.
 */
export function sideSpace(width: number, height: number): number {
  const margin = mapMargin(width, height)
  const drawn = Math.min(width - 2 * margin, (height - 2 * margin) * aspect)
  return (width - drawn) / 2
}
