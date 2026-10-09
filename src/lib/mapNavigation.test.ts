import { describe, expect, it } from 'vitest'
import { matchTyped, nearestInDirection } from './mapNavigation'

describe('nearestInDirection', () => {
  // A plus shape around C, with a nearer area N off to one side of north.
  const centres = new Map<string, [number, number]>([
    ['C', [0, 0]],
    ['L', [-10, 0]],
    ['R', [10, 0]],
    ['U', [0, -10]],
    ['D', [0, 10]],
    ['NE', [6, -6]],
  ])

  it.each([
    ['left', 'L'],
    ['right', 'R'],
    ['down', 'D'],
  ] as const)('moves %s to the area that way', (direction, expected) => {
    expect(nearestInDirection('C', centres, direction)).toBe(expected)
  })

  it('goes straight on rather than to a nearer area off to one side', () => {
    // NE is nearer (8.5) but at 45 degrees; U is straight up (10).
    expect(nearestInDirection('C', centres, 'up')).toBe('U')
  })

  it('takes an area outside the 45-degree cone if nothing is inside it', () => {
    const sparse = new Map<string, [number, number]>([
      ['A', [0, 0]],
      ['B', [10, -3]],
    ])
    expect(nearestInDirection('A', sparse, 'up')).toBe('B')
  })

  it('finds nothing beyond the edge of the map', () => {
    expect(nearestInDirection('R', centres, 'right')).toBeUndefined()
  })

  it('finds nothing from an unknown area', () => {
    expect(nearestInDirection('X', centres, 'up')).toBeUndefined()
  })
})

describe('matchTyped', () => {
  const areas = [
    { code: 'BA', name: 'Bath' },
    { code: 'B', name: 'Birmingham' },
    { code: 'EC', name: 'London EC' },
    { code: 'HA', name: 'Harrow' },
  ]

  it.each([
    ['an exact code first', 'b', 'B'],
    ['a code in either case', 'Ec', 'EC'],
    ['a name by its start', 'harr', 'HA'],
    ['a name when no code is exactly that', 'l', 'EC'],
    ['a code by its start when no name fits', 'E', 'EC'],
  ])('matches %s', (_, typed, expected) => {
    expect(matchTyped(typed, areas)).toBe(expected)
  })

  it('matches nothing when nothing fits, or nothing is typed', () => {
    expect(matchTyped('zz', areas)).toBeUndefined()
    expect(matchTyped('', areas)).toBeUndefined()
  })
})
