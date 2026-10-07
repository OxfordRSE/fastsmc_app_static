import { describe, expect, it } from 'vitest'
import { defaultColourRangeMode } from './colourRange'
import { indexOf, usableIndices, yearsExtent } from './postcodeData'
import {
  type ViewState,
  defaultViewState,
  parseViewState,
  serialiseViewState,
} from './urlState'

function withDefaults(overrides: Partial<ViewState>): ViewState {
  return { ...defaultViewState, ...overrides }
}

describe('defaultViewState', () => {
  it('matches the original app: Harrow, number of ancestors, 300 years, percentiles', () => {
    expect(defaultViewState).toEqual({
      postcode: 'HA',
      measure: 'ancestors',
      years: 300,
      range: { mode: defaultColourRangeMode },
    })
  })

  it('selects a postcode the app can show', () => {
    const index = indexOf(defaultViewState.postcode)
    expect(index !== undefined && usableIndices.includes(index)).toBe(true)
  })

  it('starts at the shortest time depth, 300 years', () => {
    expect(yearsExtent).toEqual({ min: 300, max: 1500 })
  })
})

describe('serialiseViewState', () => {
  it.each<[string, ViewState]>([
    ['', defaultViewState],
    ['?postcode=B', withDefaults({ postcode: 'B' })],
    [
      '?postcode=LL&measure=genome&years=1500',
      withDefaults({ postcode: 'LL', measure: 'genome', years: 1500 }),
    ],
    [
      '?postcode=ZE&range=second-largest',
      withDefaults({ postcode: 'ZE', range: { mode: 'second-largest' } }),
    ],
    [
      '?range=custom&low=0.007&high=0.009',
      withDefaults({ range: { mode: 'custom', low: 0.007, high: 0.009 } }),
    ],
  ])('writes %j', (query, state) => {
    expect(serialiseViewState(state)).toBe(query)
  })

  it('writes a custom range to 4 significant figures', () => {
    const state = withDefaults({
      range: { mode: 'custom', low: 0.007043176472187042, high: 0.0123456789 },
    })
    expect(serialiseViewState(state)).toBe(
      '?range=custom&low=0.007043&high=0.01235',
    )
  })

  it('rounds years to whole years', () => {
    expect(serialiseViewState(withDefaults({ years: 612.4 }))).toBe(
      '?years=612',
    )
  })
})

describe('parseViewState', () => {
  it('gives the default view for an empty query', () => {
    expect(parseViewState('')).toEqual(defaultViewState)
    expect(parseViewState('?')).toEqual(defaultViewState)
  })

  it('reads every parameter', () => {
    expect(
      parseViewState(
        '?postcode=LL&measure=genome&years=1234&range=second-largest',
      ),
    ).toEqual({
      postcode: 'LL',
      measure: 'genome',
      years: 1234,
      range: { mode: 'second-largest' },
    })
  })

  it('accepts the query string without a leading ?', () => {
    expect(parseViewState('postcode=B').postcode).toBe('B')
  })

  it('accepts lower-case postcodes', () => {
    expect(parseViewState('?postcode=ze').postcode).toBe('ZE')
  })

  it('reads a custom range', () => {
    expect(parseViewState('?range=custom&low=0.007&high=0.009').range).toEqual({
      mode: 'custom',
      low: 0.007,
      high: 0.009,
    })
  })

  describe('falls back per parameter, keeping the valid ones', () => {
    it.each([
      ['unknown code', 'XX'],
      ['no data (Croydon)', 'CR'],
      ['no data (Brighton)', 'BN'],
      ['no map shape (Belfast)', 'BT'],
      ['no map shape', 'NPT'],
      ['empty', ''],
    ])('postcode: %s', (_, postcode) => {
      expect(parseViewState(`?postcode=${postcode}&years=600`)).toEqual(
        withDefaults({ years: 600 }),
      )
    })

    it.each(['Genome', 'ibd_segments', 'genome_fraction', ''])(
      'measure: %j',
      (measure) => {
        expect(parseViewState(`?measure=${measure}&postcode=B`)).toEqual(
          withDefaults({ postcode: 'B' }),
        )
      },
    )

    it.each(['299', '1501', '450.5', '1e3', '-300', '+600', ' 600', 'abc', ''])(
      'years: %j',
      (years) => {
        expect(
          parseViewState(`?years=${encodeURIComponent(years)}&postcode=B`),
        ).toEqual(withDefaults({ postcode: 'B' }))
      },
    )

    it.each([
      ['unknown mode', '?range=second_largest'],
      ['old internal name', '?range=user&low=1&high=2'],
      ['wrong case', '?range=Custom&low=1&high=2'],
      ['custom without values', '?range=custom'],
      ['custom missing high', '?range=custom&low=1'],
      ['custom with low equal to high', '?range=custom&low=1&high=1'],
      ['custom with low above high', '?range=custom&low=2&high=1'],
      ['custom with empty value', '?range=custom&low=&high=2'],
      ['custom with non-numeric value', '?range=custom&low=abc&high=2'],
      ['custom with infinite value', '?range=custom&low=1&high=Infinity'],
    ])('range: %s', (_, query) => {
      expect(parseViewState(`${query}&postcode=B`)).toEqual(
        withDefaults({ postcode: 'B' }),
      )
    })
  })

  it('ignores low and high unless the range is custom', () => {
    expect(parseViewState('?range=percentiles&low=1&high=2').range).toEqual({
      mode: 'percentiles',
    })
  })

  it("opens the default view for the original app's links", () => {
    const old =
      '?selected_postcode_index=30&display_data_index=1&display_pop_index=0' +
      '&display_timespan=20&color_range=0.1&color_range=0.5&color_range_mode=2'
    expect(parseViewState(old)).toEqual(defaultViewState)
  })
})

describe('round trip', () => {
  it.each<ViewState>([
    defaultViewState,
    withDefaults({ postcode: 'ZE', measure: 'genome', years: 1500 }),
    withDefaults({ years: 924, range: { mode: 'second-largest' } }),
    withDefaults({ range: { mode: 'custom', low: 0.00702, high: 0.009 } }),
  ])('preserves %j', (state) => {
    expect(parseViewState(serialiseViewState(state))).toEqual(state)
  })

  it('writes parameters in a fixed order and drops unknown ones', () => {
    expect(
      serialiseViewState(parseViewState('?years=600&utm_source=x&postcode=B')),
    ).toBe('?postcode=B&years=600')
  })
})
