import { geoPath } from 'd3-geo'
import { expect, it } from 'vitest'
import { mapMargin, mapProjection, sideSpace } from './mapLayout'
import { postcodeAreas } from './postcodeMap'

function drawnBounds(width: number, height: number) {
  const [[left, top], [right, bottom]] = geoPath(
    mapProjection(width, height),
  ).bounds(postcodeAreas)
  return { left, top, right, bottom }
}

it.each([
  [800, 600],
  [300, 900],
  [1000, 1000],
])('centres the map in a %i by %i box', (width, height) => {
  const { left, top, right, bottom } = drawnBounds(width, height)
  expect(left).toBeCloseTo(width - right, 6)
  expect(top).toBeCloseTo(height - bottom, 6)
  expect(Math.min(left, top)).toBeCloseTo(mapMargin(width, height), 6)
})

it.each([
  [800, 600],
  [300, 900],
  [1500, 700],
])('measures the space beside the map in a %i by %i box', (width, height) => {
  const { left } = drawnBounds(width, height)
  expect(sideSpace(width, height)).toBeCloseTo(left, 6)
})
