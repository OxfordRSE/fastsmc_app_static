import { describe, expect, it } from 'vitest'
import { at } from './arrays'

describe('at', () => {
  it('returns the element at a valid index', () => {
    expect(at([10, 20, 30], 1)).toBe(20)
    expect(at(Float32Array.of(1.5), 0)).toBe(1.5)
  })

  it('returns NaN elements rather than treating them as missing', () => {
    expect(at(Float32Array.of(NaN), 0)).toBeNaN()
  })

  it('throws on an index past either end', () => {
    expect(() => at([1, 2], 2)).toThrow(RangeError)
    expect(() => at([1, 2], -1)).toThrow(RangeError)
    expect(() => at(new Float32Array(0), 0)).toThrow(RangeError)
  })
})
