import { geoPath } from 'd3-geo'
import { describe, expect, it } from 'vitest'
import { mapProjection } from './mapLayout'
import { isInView, maxZoom, targetSizePx } from './mapZoom'
import { postcodeAreas } from './postcodeMap'

describe('maxZoom', () => {
  it.each([
    [1440, 900],
    [390, 600],
    [1920, 1080],
  ])(
    'makes the smallest area %i by %i box just easy to select',
    (width, height) => {
      const k = maxZoom(width, height)
      const path = geoPath(mapProjection(width, height))
      const sizes = postcodeAreas.features.map((area) =>
        Math.sqrt(path.area(area)),
      )
      // Zoomed in fully, the smallest area is exactly the target size, and
      // every other area at least that.
      expect(k * Math.min(...sizes)).toBeCloseTo(targetSizePx, 6)
      expect(k).toBeGreaterThan(1)
    },
  )

  it('allows more zoom in a smaller box', () => {
    expect(maxZoom(390, 600)).toBeGreaterThan(maxZoom(1440, 900))
  })
})

describe('isInView', () => {
  const box = [
    [100, 100],
    [200, 200],
  ] as const

  it.each([
    ['in the default view', { k: 1, x: 0, y: 0 }, true],
    ['zoomed in, still on screen', { k: 2, x: -100, y: -100 }, true],
    ['zoomed in, off to the right', { k: 4, x: 0, y: 0 }, false],
    ['panned so it is off the left', { k: 2, x: -250, y: 0 }, false],
    ['partly off the bottom', { k: 1, x: 0, y: 450 }, false],
  ])('is %s', (_, transform, expected) => {
    expect(isInView(box, transform, 500, 500)).toBe(expected)
  })
})
