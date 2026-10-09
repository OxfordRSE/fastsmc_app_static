// Ports UserInterface.js from the original frontend (OxfordRSE/fastsmc_app_frontend):
// the display options (datatype, time threshold, postcode) and the advanced ones
// (colour range mode and slider, and the parameters URL). The dataset selector is
// gone, and the range slider no longer writes into its props (the old
// color_range clamping bug).

import { useId, useMemo, useState } from 'react'
import { useCopy } from '../content/useCopy'
import type { Action } from '../lib/appState'
import { at } from '../lib/arrays'
import type { ColourRange, ColourRangeMode } from '../lib/colourRange'
import { type Measure, yearsExtent } from '../lib/postcodeData'
import { postcodeAreas } from '../lib/postcodeMap'
import { type ViewState, serialiseViewState } from '../lib/urlState'
import { Help } from './Help'
import { ShareLink } from './ShareLink'
import { Checkbox } from './ui/checkbox'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from './ui/combobox'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from './ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Slider } from './ui/slider'

const measures: readonly Measure[] = ['ancestors', 'genome']
const modes: readonly ColourRangeMode[] = [
  'second-largest',
  'percentiles',
  'custom',
]

// Steps of the time slider, in years; the old app used a fiftieth of the range.
const yearsStep = 10
const yearsLargeStep = 100

// Steps of the colour range slider, as a fraction of the values' extent, as in the old app.
const rangeSteps = 400

// The slider reports one number or several; it is always given a list here.
const asList = (value: number | readonly number[]) =>
  typeof value === 'number' ? [value] : value

/** An entry in the postcode list. */
interface AreaItem {
  /** The area's code, such as `HA`. */
  readonly value: string
  /** What the list shows, and what typing filters on. */
  readonly label: string
  /** Areas without data are listed, so searching for them explains why they cannot be chosen. */
  readonly disabled: boolean
}

/** Props of {@link Controls}. */
export interface ControlsProps {
  /** The current settings. */
  readonly view: ViewState
  /** The colour range in effect, in percent of the selected area's link with itself; the range slider shows it. */
  readonly range: ColourRange
  /** The smallest and largest values on the map, in the same percent: the range slider's limits. */
  readonly extent: ColourRange
  /** Receives the change when a control is used. */
  readonly dispatch: (action: Action) => void
}

/**
 * The side panel's controls: what the map shows and how it is coloured.
 *
 * @param props - See {@link ControlsProps}.
 * @returns The controls, with the advanced ones hidden until asked for.
 */
export function Controls({ view, range, extent, dispatch }: ControlsProps) {
  const copy = useCopy()
  const id = useId()
  const [advanced, setAdvanced] = useState(false)

  const areas = useMemo(
    () =>
      postcodeAreas.features
        .map(({ properties: { code, name, hasData } }) => ({
          value: code,
          label: hasData
            ? copy.controls.area(name, code)
            : copy.controls.areaWithoutData(name, code),
          disabled: !hasData,
        }))
        .toSorted((a, b) => a.label.localeCompare(b.label)),
    [copy],
  )
  const selectedArea = areas.find((area) => area.value === view.postcode)

  const shareLink =
    window.location.origin + window.location.pathname + serialiseViewState(view)

  return (
    <FieldGroup>
      <Field>
        <div className="flex items-center gap-1">
          <FieldLabel htmlFor={`${id}-measure`}>
            {copy.controls.measure}
          </FieldLabel>
          <Help topic={copy.controls.measure} text={copy.help.measure} />
        </div>
        <Select
          items={copy.measures}
          value={view.measure}
          onValueChange={(measure) => {
            if (measure !== null) dispatch({ type: 'set-measure', measure })
          }}
        >
          <SelectTrigger id={`${id}-measure`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {measures.map((measure) => (
              <SelectItem key={measure} value={measure}>
                {copy.measures[measure]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <div className="flex items-baseline justify-between">
          <FieldLabel id={`${id}-years`}>{copy.controls.years}</FieldLabel>
          <span className="text-sm text-muted-foreground tabular-nums">
            {copy.controls.yearsValue(view.years)}
          </span>
        </div>
        <Slider
          aria-labelledby={`${id}-years`}
          min={yearsExtent.min}
          max={yearsExtent.max}
          step={yearsStep}
          largeStep={yearsLargeStep}
          value={[view.years]}
          onValueChange={(value) => {
            dispatch({ type: 'set-years', years: at(asList(value), 0) })
          }}
        />
        <FieldDescription>{copy.controls.yearsDescription}</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-postcode`}>
          {copy.controls.postcode}
        </FieldLabel>
        <Combobox<AreaItem>
          items={areas}
          value={selectedArea ?? null}
          onValueChange={(area) => {
            if (area !== null) {
              dispatch({ type: 'select-postcode', postcode: area.value })
            }
          }}
        >
          <ComboboxInput
            id={`${id}-postcode`}
            placeholder={copy.controls.postcodePlaceholder}
            triggerLabel={copy.controls.postcodeList}
          />
          <ComboboxContent>
            <ComboboxEmpty>{copy.controls.noMatch}</ComboboxEmpty>
            <ComboboxList>
              {(area: AreaItem) => (
                <ComboboxItem
                  key={area.value}
                  value={area}
                  disabled={area.disabled}
                >
                  {area.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <FieldDescription>{copy.controls.postcodeDescription}</FieldDescription>
      </Field>

      <Field orientation="horizontal">
        <Checkbox
          id={`${id}-advanced`}
          checked={advanced}
          onCheckedChange={setAdvanced}
        />
        <FieldLabel htmlFor={`${id}-advanced`}>
          {copy.controls.showAdvanced}
        </FieldLabel>
      </Field>

      {advanced && (
        <>
          <FieldSet>
            <Field>
              <div className="flex items-center gap-1">
                <FieldLabel htmlFor={`${id}-mode`}>
                  {copy.controls.colourRangeMode}
                </FieldLabel>
                <Help
                  topic={copy.controls.colourRange}
                  text={copy.help.colourRange}
                />
              </div>
              <Select
                items={copy.colourRangeModes}
                value={view.range.mode}
                onValueChange={(mode) => {
                  if (mode === null) return
                  dispatch({
                    type: 'set-range',
                    range:
                      mode === 'custom'
                        ? { mode, low: range.low, high: range.high }
                        : { mode },
                  })
                }}
              >
                <SelectTrigger id={`${id}-mode`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {copy.colourRangeModes[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <div className="flex items-baseline justify-between">
                <FieldLabel id={`${id}-range`}>
                  {copy.controls.colourRange}
                </FieldLabel>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {copy.controls.rangeValues(range.low, range.high)}
                </span>
              </div>
              <Slider
                aria-labelledby={`${id}-range`}
                getAriaLabel={(index) =>
                  index === 0 ? copy.controls.lightest : copy.controls.darkest
                }
                min={extent.low}
                max={extent.high}
                step={(extent.high - extent.low) / rangeSteps}
                value={[range.low, range.high]}
                disabled={view.range.mode !== 'custom'}
                onValueChange={(value) => {
                  const values = asList(value)
                  dispatch({
                    type: 'set-range',
                    range: {
                      mode: 'custom',
                      low: at(values, 0),
                      high: at(values, 1),
                    },
                  })
                }}
              />
              <FieldDescription>
                {copy.controls.colourRangeDescription}
              </FieldDescription>
            </Field>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor={`${id}-share`}>
              {copy.controls.shareLink}
            </FieldLabel>
            <ShareLink id={`${id}-share`} link={shareLink} />
            <FieldDescription>
              {copy.controls.shareLinkDescription}
            </FieldDescription>
          </Field>
        </>
      )}
    </FieldGroup>
  )
}
