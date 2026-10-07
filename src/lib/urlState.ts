// Replaces the URL parameters of App.js in the original frontend
// (OxfordRSE/fastsmc_app_frontend). Those were: selected_postcode_index (a
// position in its map file), display_data_index (0 ancestors, 1 genome),
// display_pop_index (dataset, always 0), display_timespan (in generations),
// color_range (two numbers) and color_range_mode (0 second largest,
// 1 percentiles, 2 set by user). Old links are deliberately not supported.

import { type RangeSetting, defaultColourRangeMode } from './colourRange'
import { type Measure, isUsable, yearsExtent } from './postcodeData'

/** The parts of the view that a URL records. */
export interface ViewState {
  /** Code of the selected postcode area, such as `HA`. */
  readonly postcode: string
  /** Which measure of shared ancestry the map shows. */
  readonly measure: Measure
  /** Time depth in whole years. */
  readonly years: number
  /** How the colour scale is set. */
  readonly range: RangeSetting
}

/** The view shown when the URL specifies nothing, matching the original app. */
export const defaultViewState: ViewState = {
  postcode: 'HA',
  measure: 'ancestors',
  years: yearsExtent.min,
  range: { mode: defaultColourRangeMode },
}

const measures: readonly Measure[] = ['ancestors', 'genome']
const wholeNumber = /^\d+$/

function parsePostcode(text: string | null): string {
  const code = text?.toUpperCase()
  return code !== undefined && isUsable(code) ? code : defaultViewState.postcode
}

function parseMeasure(text: string | null): Measure {
  return (
    measures.find((measure) => measure === text) ?? defaultViewState.measure
  )
}

function parseYears(text: string | null): number {
  if (text === null || !wholeNumber.test(text)) return defaultViewState.years
  const years = Number(text)
  return years >= yearsExtent.min && years <= yearsExtent.max
    ? years
    : defaultViewState.years
}

function parseNumber(text: string | null): number | undefined {
  if (text === null || text === '' || text.trim() !== text) return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

function parseRange(params: URLSearchParams): RangeSetting {
  const mode = params.get('range')
  if (mode === 'percentiles' || mode === 'second-largest') return { mode }
  if (mode === 'custom') {
    const low = parseNumber(params.get('low'))
    const high = parseNumber(params.get('high'))
    if (low !== undefined && high !== undefined && low < high) {
      return { mode, low, high }
    }
  }
  return defaultViewState.range
}

function formatRangeValue(value: number): string {
  return String(Number(value.toPrecision(4)))
}

/**
 * Reads the view from a URL's query string.
 *
 * @remarks
 * Each parameter falls back to its own default when missing or invalid, so one
 * bad value does not discard the others. Unknown parameters are ignored.
 *
 * @param search - The query string, with or without its leading `?`.
 * @returns A complete, valid view state.
 */
export function parseViewState(search: string): ViewState {
  const params = new URLSearchParams(search)
  return {
    postcode: parsePostcode(params.get('postcode')),
    measure: parseMeasure(params.get('measure')),
    years: parseYears(params.get('years')),
    range: parseRange(params),
  }
}

/**
 * Writes the view as a URL query string.
 *
 * @remarks
 * Settings equal to their defaults are left out, parameters always appear in
 * the same order, years are rounded to whole years, and a custom range is
 * written to 4 significant figures.
 *
 * @param state - The view to record.
 * @returns The query string with its leading `?`, or an empty string for the
 *   default view.
 */
export function serialiseViewState(state: ViewState): string {
  const params = new URLSearchParams()
  if (state.postcode !== defaultViewState.postcode) {
    params.set('postcode', state.postcode)
  }
  if (state.measure !== defaultViewState.measure) {
    params.set('measure', state.measure)
  }
  const years = Math.round(state.years)
  if (years !== defaultViewState.years) {
    params.set('years', String(years))
  }
  if (state.range.mode !== defaultViewState.range.mode) {
    params.set('range', state.range.mode)
  }
  if (state.range.mode === 'custom') {
    params.set('low', formatRangeValue(state.range.low))
    params.set('high', formatRangeValue(state.range.high))
  }
  const query = params.toString()
  return query === '' ? '' : `?${query}`
}
