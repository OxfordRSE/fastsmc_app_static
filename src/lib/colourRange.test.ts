import { describe, expect, it } from 'vitest'
import {
  type ColourRange,
  type RangeSetting,
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
    expect(colourRange({ mode: 'second-largest' }, values)).toEqual({
      low: 0,
      high: 59,
    })
  })

  it('percentiles take the values at sorted positions round(n * 0.05) and round(n * 0.95)', () => {
    // n = 60: positions 3 and 57 hold 4 and 58.
    expect(colourRange({ mode: 'percentiles' }, values)).toEqual({
      low: 4,
      high: 58,
    })
  })

  it('percentiles over the 118 usable areas use positions 6 and 112', () => {
    const positions = Array.from({ length: 118 }, (_, i) => i)
    expect(colourRange({ mode: 'percentiles' }, positions)).toEqual({
      low: 6,
      high: 112,
    })
  })

  it('keeps the user range when it lies within the data', () => {
    expect(colourRange({ mode: 'custom', ...current }, values)).toEqual(current)
  })

  it('clamps the user range to the data', () => {
    expect(colourRange({ mode: 'custom', low: -5, high: 500 }, values)).toEqual(
      {
        low: 1,
        high: 100,
      },
    )
  })

  it('does not depend on the order of the values', () => {
    const shuffled = values.toReversed()
    const settings: RangeSetting[] = [
      { mode: 'second-largest' },
      { mode: 'percentiles' },
      { mode: 'custom', ...current },
    ]
    for (const setting of settings) {
      expect(colourRange(setting, shuffled)).toEqual(
        colourRange(setting, values),
      )
    }
  })

  it('does not modify the values', () => {
    const frozen = Object.freeze([...values].reverse())
    expect(() => colourRange({ mode: 'percentiles' }, frozen)).not.toThrow()
  })

  it('stays within range for very few values', () => {
    expect(colourRange({ mode: 'percentiles' }, [1, 2])).toEqual({
      low: 1,
      high: 2,
    })
    expect(colourRange({ mode: 'second-largest' }, [1, 2])).toEqual({
      low: 0,
      high: 1,
    })
  })

  it('rejects fewer than 2 values', () => {
    expect(() => colourRange({ mode: 'percentiles' }, [1])).toThrow(RangeError)
    expect(() => valueExtent([])).toThrow(RangeError)
  })
})
