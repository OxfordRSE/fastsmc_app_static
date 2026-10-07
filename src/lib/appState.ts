// Replaces the state held in the App class component of the original frontend
// (OxfordRSE/fastsmc_app_frontend): selected_postcode_index,
// mouseover_postcode_index, display_data_index, display_timespan, color_range
// and color_range_mode. display_pop_index is gone with the dataset selector.

import type { RangeSetting } from './colourRange'
import { type Measure, isUsable, yearsExtent } from './postcodeData'
import { type ViewState, defaultViewState, parseViewState } from './urlState'

/** Everything the app tracks: what the URL records, plus the hovered area. */
export interface AppState {
  /** The settings a URL records. */
  readonly view: ViewState
  /** Code of the area under the pointer, or `null` if there is none. */
  readonly hovered: string | null
}

/** A change to the app's state. */
export type Action =
  | { readonly type: 'select-postcode'; readonly postcode: string }
  | { readonly type: 'hover-postcode'; readonly postcode: string | null }
  | { readonly type: 'set-measure'; readonly measure: Measure }
  | { readonly type: 'set-years'; readonly years: number }
  | { readonly type: 'set-range'; readonly range: RangeSetting }

/**
 * The state the app starts in.
 *
 * @param search - The page's query string, with or without its leading `?`.
 * @returns The view the URL describes, with nothing hovered.
 */
export function initialState(search: string): AppState {
  return { view: parseViewState(search), hovered: null }
}

/**
 * Applies an action, keeping the state valid.
 *
 * @remarks
 * Only usable postcodes can be selected, years are clamped to the data's range,
 * and switching measure resets a custom colour range to the default mode,
 * because the two measures differ in scale.
 *
 * @param state - The current state.
 * @param action - The change to apply.
 * @returns The new state, or `state` itself if nothing changed.
 */
export function appReducer(state: AppState, action: Action): AppState {
  const { view } = state
  switch (action.type) {
    case 'select-postcode':
      if (!isUsable(action.postcode) || action.postcode === view.postcode) {
        return state
      }
      return { ...state, view: { ...view, postcode: action.postcode } }
    case 'hover-postcode':
      if (action.postcode === state.hovered) return state
      return { ...state, hovered: action.postcode }
    case 'set-measure': {
      if (action.measure === view.measure) return state
      const range =
        view.range.mode === 'custom' ? defaultViewState.range : view.range
      return { ...state, view: { ...view, measure: action.measure, range } }
    }
    case 'set-years': {
      const years = Math.min(
        Math.max(action.years, yearsExtent.min),
        yearsExtent.max,
      )
      if (years === view.years) return state
      return { ...state, view: { ...view, years } }
    }
    case 'set-range':
      return { ...state, view: { ...view, range: action.range } }
  }
}
