import { describe, expect, it } from 'vitest'
import {
  type Action,
  type AppState,
  appReducer,
  initialState,
} from './appState'
import { defaultViewState } from './urlState'

const start = initialState('')
const custom: AppState = {
  ...start,
  view: { ...start.view, range: { mode: 'custom', low: 0.01, high: 0.02 } },
}

function apply(state: AppState, ...actions: Action[]): AppState {
  return actions.reduce(appReducer, state)
}

describe('initialState', () => {
  it('starts from the view the URL describes, with nothing inspected', () => {
    expect(initialState('?postcode=B&years=600')).toEqual({
      view: { ...defaultViewState, postcode: 'B', years: 600 },
      inspected: null,
    })
  })
})

describe('select-postcode', () => {
  it('selects a usable postcode', () => {
    const state = apply(start, { type: 'select-postcode', postcode: 'B' })
    expect(state.view.postcode).toBe('B')
  })

  it.each(['CR', 'BN', 'BT', 'NPT', 'XX'])(
    'ignores %s, which the app cannot show',
    (postcode) => {
      expect(apply(start, { type: 'select-postcode', postcode })).toBe(start)
    },
  )
})

describe('inspect-postcode and clear-inspection', () => {
  it('sets and clears the inspected area, and how, without changing the view', () => {
    const inspected = apply(start, {
      type: 'inspect-postcode',
      postcode: 'B',
      by: 'touch',
    })
    expect(inspected.inspected).toEqual({ postcode: 'B', by: 'touch' })
    expect(inspected.view).toBe(start.view)
    expect(apply(inspected, { type: 'clear-inspection' }).inspected).toBeNull()
  })

  it('records a new way of inspecting the same area', () => {
    const byPointer = apply(start, {
      type: 'inspect-postcode',
      postcode: 'B',
      by: 'pointer',
    })
    expect(
      apply(byPointer, {
        type: 'inspect-postcode',
        postcode: 'B',
        by: 'keyboard',
      }).inspected,
    ).toEqual({ postcode: 'B', by: 'keyboard' })
  })
})

describe('set-measure', () => {
  it('switches measure', () => {
    const state = apply(start, { type: 'set-measure', measure: 'genome' })
    expect(state.view.measure).toBe('genome')
  })

  it('resets a custom colour range, which would not fit the other measure', () => {
    const state = apply(custom, { type: 'set-measure', measure: 'genome' })
    expect(state.view.range).toEqual(defaultViewState.range)
  })

  it('keeps an automatic colour range', () => {
    const secondLargest = apply(
      start,
      { type: 'set-range', range: { mode: 'second-largest' } },
      { type: 'set-measure', measure: 'genome' },
    )
    expect(secondLargest.view.range).toEqual({ mode: 'second-largest' })
  })

  it('keeps a custom range when the measure does not change', () => {
    expect(apply(custom, { type: 'set-measure', measure: 'ancestors' })).toBe(
      custom,
    )
  })
})

describe('set-years', () => {
  it('sets a time depth within the data', () => {
    expect(apply(start, { type: 'set-years', years: 900 }).view.years).toBe(900)
  })

  it('clamps to the data range', () => {
    expect(apply(start, { type: 'set-years', years: 50 }).view.years).toBe(300)
    expect(apply(start, { type: 'set-years', years: 5000 }).view.years).toBe(
      1500,
    )
  })
})

describe('set-range', () => {
  it('sets the colour range', () => {
    const range = { mode: 'custom', low: 0.1, high: 0.2 } as const
    expect(apply(start, { type: 'set-range', range }).view.range).toEqual(range)
  })
})

describe('unchanged state', () => {
  it('returns the same object when nothing changes, so React skips a re-render', () => {
    expect(apply(start, { type: 'select-postcode', postcode: 'HA' })).toBe(
      start,
    )
    expect(apply(start, { type: 'clear-inspection' })).toBe(start)
    const inspected = apply(start, {
      type: 'inspect-postcode',
      postcode: 'B',
      by: 'pointer',
    })
    expect(
      apply(inspected, {
        type: 'inspect-postcode',
        postcode: 'B',
        by: 'pointer',
      }),
    ).toBe(inspected)
    expect(apply(start, { type: 'set-years', years: 300 })).toBe(start)
  })
})
