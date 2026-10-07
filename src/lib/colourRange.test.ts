import { describe, expect, it } from 'vitest'
import {
  type ColourRange,
  colourRange,
  defaultColourRangeMode,
  valueExtent,
} from './colourRange'

// Shaped like real data: the selected area (100) dominates 59 others (1 to 59).
const values = [...Array.from({ length: 59 }, (_, i) => i + 1), 100]
const current: ColourRange = { low: 10, high: 20 }

describe('defaultColourRangeMode', () => {
  it('is percentiles, as in the original app', () => {
    expect(defaultColourRangeMode).toBe('percentiles')
  })
})

describe('valueExtent', () => {
  it('spans the smallest to the largest value', () => {
    expect(valueExtent(values)).toEqual({ low: 1, high: 100 })
  })
})

describe('colourRange', () => {
  it('second largest runs from zero and skips the dominant value', () => {
    expect(colourRange('second-largest', values, current)).toEqual({
      low: 0,
      high: 59,
    })
  })

  it('percentiles take the values at sorted positions round(n * 0.05) and round(n * 0.95)', () => {
    // n = 60: positions 3 and 57 hold 4 and 58.
    expect(colourRange('percentiles', values, current)).toEqual({
      low: 4,
      high: 58,
    })
  })

  it('percentiles over the 118 usable areas use positions 6 and 112', () => {
    const positions = Array.from({ length: 118 }, (_, i) => i)
    expect(colourRange('percentiles', positions, current)).toEqual({
      low: 6,
      high: 112,
    })
  })

  it('keeps the user range when it lies within the data', () => {
    expect(colourRange('custom', values, current)).toEqual(current)
  })

  it('clamps the user range to the data', () => {
    expect(colourRange('custom', values, { low: -5, high: 500 })).toEqual({
      low: 1,
      high: 100,
    })
  })

  it('does not depend on the order of the values', () => {
    const shuffled = values.toReversed()
    for (const mode of ['second-largest', 'percentiles', 'custom'] as const) {
      expect(colourRange(mode, shuffled, current)).toEqual(
        colourRange(mode, values, current),
      )
    }
  })

  it('does not modify the values', () => {
    const frozen = Object.freeze([...values].reverse())
    expect(() => colourRange('percentiles', frozen, current)).not.toThrow()
  })

  it('stays within range for very few values', () => {
    expect(colourRange('percentiles', [1, 2], current)).toEqual({
      low: 1,
      high: 2,
    })
    expect(colourRange('second-largest', [1, 2], current)).toEqual({
      low: 0,
      high: 1,
    })
  })

  it('rejects fewer than 2 values', () => {
    expect(() => colourRange('percentiles', [1], current)).toThrow(RangeError)
    expect(() => valueExtent([])).toThrow(RangeError)
  })
})
