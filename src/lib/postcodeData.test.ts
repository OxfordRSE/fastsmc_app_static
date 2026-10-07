import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import golden from '../data/golden.json'
import meta from '../data/meta.json'
import {
  type Measure,
  generationsFromYears,
  indexOf,
  interpolate,
  intervalAt,
  matrixLength,
  rank,
  toMatrix,
  usableIndices,
} from './postcodeData'

function readMatrix(measure: Measure): Float32Array {
  const bytes = readFileSync(new URL(`../data/${measure}.bin`, import.meta.url))
  return toMatrix(Uint8Array.from(bytes).buffer)
}

const matrices: Record<Measure, Float32Array> = {
  ancestors: readMatrix('ancestors'),
  genome: readMatrix('genome'),
}

function code(index: number): string {
  const postcode = meta.postcodes[index]
  if (postcode === undefined)
    throw new Error(`No postcode at index ${String(index)}`)
  return postcode
}

function indexFor(postcode: string): number {
  const index = indexOf(postcode)
  if (index === undefined) throw new Error(`Unknown postcode ${postcode}`)
  return index
}

describe('metadata', () => {
  it('lists the two measures the loader knows about', () => {
    expect(meta.measures.map((m) => m.key)).toEqual(['ancestors', 'genome'])
  })

  it('stores statistics in lower, mean, upper order', () => {
    expect(meta.stats).toEqual(['lower_95', 'mean', 'upper_95'])
  })
})

describe('toMatrix', () => {
  it('accepts a buffer of the expected size', () => {
    expect(matrices.ancestors).toHaveLength(matrixLength)
  })

  it('rejects a buffer of the wrong size', () => {
    expect(() => toMatrix(new ArrayBuffer(8))).toThrow(/Expected/)
  })
})

describe('interpolate', () => {
  // Threshold t (10, 20, ... 50 generations) holds lower, mean, upper = 10t, 10t+1, 10t+2.
  const pair = Float32Array.from(
    meta.thresholdsGenerations.flatMap((_, t) => [
      10 * t,
      10 * t + 1,
      10 * t + 2,
    ]),
  )

  it('clamps below the first threshold', () => {
    expect(interpolate(pair, 5)).toEqual({ lower: 0, mean: 1, upper: 2 })
  })

  it('clamps above the last threshold', () => {
    expect(interpolate(pair, 60)).toEqual({ lower: 40, mean: 41, upper: 42 })
  })

  it('returns stored values exactly on a threshold', () => {
    expect(interpolate(pair, 10)).toEqual({ lower: 0, mean: 1, upper: 2 })
    expect(interpolate(pair, 20)).toEqual({ lower: 10, mean: 11, upper: 12 })
    expect(interpolate(pair, 50)).toEqual({ lower: 40, mean: 41, upper: 42 })
  })

  it('blends linearly between thresholds', () => {
    expect(interpolate(pair, 25)).toEqual({ lower: 15, mean: 16, upper: 17 })
    expect(interpolate(pair, 42.5)).toEqual({
      lower: 32.5,
      mean: 33.5,
      upper: 34.5,
    })
  })

  it('returns null when there is no data', () => {
    expect(interpolate(new Float32Array(pair.length).fill(NaN), 25)).toBeNull()
  })

  it('throws on a truncated block rather than reporting no data', () => {
    expect(() => interpolate(pair.subarray(0, 3), 25)).toThrow(RangeError)
  })
})

describe('parity with the numpy reference implementation', () => {
  it.each(golden)(
    '$measure $from to $to at $years years',
    ({ measure, from, to, years, expected }) => {
      const result = intervalAt(
        matrices[measure as Measure],
        indexFor(from),
        indexFor(to),
        generationsFromYears(years),
      )
      expect(result).toEqual(
        expected && {
          lower: expected.lower_95,
          mean: expected.mean,
          upper: expected.upper_95,
        },
      )
    },
  )
})

describe('usableIndices', () => {
  it('excludes postcodes without data or without a map shape', () => {
    const excluded = meta.postcodes.filter(
      (_, index) => !usableIndices.includes(index),
    )
    expect(excluded.sort()).toEqual(['BN', 'BT', 'CR', 'NPT'])
  })
})

describe('rank', () => {
  const generations = generationsFromYears(300)

  it('orders postcodes from most to least related', () => {
    const means = rank(matrices.ancestors, indexFor('HA'), generations).map(
      (r) => r.interval.mean,
    )
    expect(means).toEqual([...means].sort((a, b) => b - a))
  })

  it('covers every other usable postcode', () => {
    const ranked = rank(matrices.ancestors, indexFor('HA'), generations)
    expect(ranked).toHaveLength(usableIndices.length - 1)
  })

  it('never ranks a postcode against itself, even when it is not its own strongest link', () => {
    // At 300 years East London's strongest link is South West London, not itself,
    // so dropping the top entry (as the old app did) would wrongly drop SW.
    const codes = rank(matrices.ancestors, indexFor('E'), generations).map(
      (r) => code(r.index),
    )
    expect(codes[0]).toBe('SW')
    expect(codes).not.toContain('E')
  })

  it('leaves out postcodes without data or without a map shape', () => {
    const codes = rank(matrices.genome, indexFor('B'), generations).map((r) =>
      code(r.index),
    )
    for (const missing of ['BN', 'BT', 'CR', 'NPT']) {
      expect(codes).not.toContain(missing)
    }
  })
})
