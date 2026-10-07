// Ports Data.js and the data loading in App.js from the original frontend
// (OxfordRSE/fastsmc_app_frontend), which fetched per-postcode slices from the
// old Flask backend (OxfordRSE/fastsmc_app_backend) instead of loading whole matrices.

import ancestorsUrl from '../data/ancestors.bin?url'
import genomeUrl from '../data/genome.bin?url'
import meta from '../data/meta.json'
import { at } from './arrays'

/**
 * The two measures of shared ancestry: the number of shared ancestors, and the
 * percentage of the genome shared. Matches the keys in `meta.json`.
 *
 * @remarks
 * Named `ibd_segments` and `genome_fraction` in the original app and backend
 * (`display_data_options`, selected by `display_data_index` 0 and 1).
 */
export type Measure = 'ancestors' | 'genome'

/** A statistic with its 95% confidence interval. */
export interface Interval {
  /** Lower bound of the 95% confidence interval. */
  readonly lower: number
  /** Mean estimate. */
  readonly mean: number
  /** Upper bound of the 95% confidence interval. */
  readonly upper: number
}

/** One entry of a {@link rank} result. */
export interface Ranked {
  /** Matrix index of the ranked postcode. */
  readonly index: number
  /** Its relatedness to the postcode being ranked against. */
  readonly interval: Interval
}

const urls: Readonly<Record<Measure, string>> = {
  ancestors: ancestorsUrl,
  genome: genomeUrl,
}

const thresholds = meta.thresholdsGenerations
const statCount = meta.stats.length
const pairLength = thresholds.length * statCount
const rowLength = meta.postcodes.length * pairLength

/** Number of values in one complete matrix file. */
export const matrixLength = meta.postcodes.length * rowLength

const indexByCode = new Map(meta.postcodes.map((code, index) => [code, index]))
const unmapped = new Set(meta.unmapped)

/** Matrix indices of the postcodes that have data and a map shape: the only ones the app shows. */
export const usableIndices: readonly number[] = meta.postcodes.flatMap(
  (code, index) => (meta.hasData[index] && !unmapped.has(code) ? [index] : []),
)

const usableCodes = new Set(
  usableIndices.map((index) => at(meta.postcodes, index)),
)

/**
 * Whether the app shows a postcode: it has data and a shape on the map.
 *
 * @param code - Postcode area code, such as `HA`.
 * @returns `true` if the postcode can be selected and ranked.
 */
export function isUsable(code: string): boolean {
  return usableCodes.has(code)
}

/**
 * Looks up a postcode's position in the matrices.
 *
 * @param code - Postcode area code, such as `HA`.
 * @returns The matrix index, or `undefined` if the code is not in the dataset.
 */
export function indexOf(code: string): number | undefined {
  return indexByCode.get(code)
}

/** The shortest and longest time depths the data covers, in years: the slider's limits. */
export const yearsExtent = {
  min: at(thresholds, 0) * meta.yearsPerGeneration,
  max: at(thresholds, thresholds.length - 1) * meta.yearsPerGeneration,
} as const

/**
 * Converts a time depth in years to generations.
 *
 * @param years - Time depth in years.
 * @returns The equivalent number of generations.
 */
export function generationsFromYears(years: number): number {
  return years / meta.yearsPerGeneration
}

/**
 * Fetches and validates one measure's matrix.
 *
 * @param measure - Which matrix to load.
 * @returns The matrix values.
 * @throws `Error` if the request fails or the file has the wrong size.
 */
export async function loadMatrix(measure: Measure): Promise<Float32Array> {
  const response = await fetch(urls[measure])
  if (!response.ok) {
    throw new Error(
      `Failed to load ${measure}: HTTP ${String(response.status)}`,
    )
  }
  return toMatrix(await response.arrayBuffer())
}

/**
 * Interprets raw bytes as a matrix, checking the size.
 *
 * @param buffer - The contents of a matrix file.
 * @returns The matrix values.
 * @throws `Error` if the buffer does not hold exactly {@link matrixLength} values.
 */
export function toMatrix(buffer: ArrayBuffer): Float32Array {
  const values = new Float32Array(buffer)
  if (values.length !== matrixLength) {
    throw new Error(
      `Expected ${String(matrixLength)} values, got ${String(values.length)}`,
    )
  }
  return values
}

/**
 * Selects the values for one postcode pair, without copying.
 *
 * @param values - A complete matrix.
 * @param from - Matrix index of the first postcode.
 * @param to - Matrix index of the second postcode.
 * @returns A view of the pair's thresholds-by-statistics block.
 */
export function pairOf(
  values: Float32Array,
  from: number,
  to: number,
): Float32Array {
  const start = from * rowLength + to * pairLength
  return values.subarray(start, start + pairLength)
}

/**
 * Interpolates one postcode pair's statistics at a time depth.
 *
 * @remarks
 * Clamps outside the threshold range, and blends the two bracketing thresholds
 * linearly within it, matching `scripts/build_data.py`.
 *
 * @param pair - One pair's block, as returned by {@link pairOf}.
 * @param generations - Time depth in generations.
 * @returns The interval, or `null` if the pair has no data.
 */
export function interpolate(
  pair: Float32Array,
  generations: number,
): Interval | null {
  let upper = thresholds.findIndex((threshold) => threshold > generations)
  if (upper === -1) upper = thresholds.length - 1
  const lowerWeight =
    upper === 0
      ? 0
      : (at(thresholds, upper) - generations) /
        (at(thresholds, upper) - at(thresholds, upper - 1))

  const stat = (s: number) => {
    const high = at(pair, upper * statCount + s)
    if (lowerWeight <= 0) return high
    const low = at(pair, (upper - 1) * statCount + s)
    return high * (1 - lowerWeight) + low * lowerWeight
  }

  const interval = { lower: stat(0), mean: stat(1), upper: stat(2) }
  return Number.isNaN(interval.mean) ? null : interval
}

/**
 * Interpolates the relatedness of two postcodes at a time depth.
 *
 * @param values - A complete matrix.
 * @param from - Matrix index of the first postcode.
 * @param to - Matrix index of the second postcode.
 * @param generations - Time depth in generations.
 * @returns The interval, or `null` if either postcode has no data.
 */
export function intervalAt(
  values: Float32Array,
  from: number,
  to: number,
  generations: number,
): Interval | null {
  return interpolate(pairOf(values, from, to), generations)
}

/**
 * Ranks every other usable postcode by its relatedness to one postcode.
 *
 * @remarks
 * The postcode itself is excluded explicitly. It is usually, but not always, its
 * own strongest link: at 300 years East London is closer to South West London.
 *
 * @param values - A complete matrix.
 * @param from - Matrix index of the postcode to rank against.
 * @param generations - Time depth in generations.
 * @returns The other usable postcodes, most closely related first.
 */
export function rank(
  values: Float32Array,
  from: number,
  generations: number,
): Ranked[] {
  const ranked: Ranked[] = []
  for (const index of usableIndices) {
    if (index === from) continue
    const interval = intervalAt(values, from, index, generations)
    if (interval) ranked.push({ index, interval })
  }
  return ranked.sort((a, b) => b.interval.mean - a.interval.mean)
}
