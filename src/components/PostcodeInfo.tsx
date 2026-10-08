// Ports PostcodeInfo.js from the original frontend (OxfordRSE/fastsmc_app_frontend):
// the selected area's name, its relatedness to itself and to the area under the
// pointer, and the chart of its most related areas. Areas without data now say
// so, where the original showed 0.0.

import { useId } from 'react'
import { useCopy } from '../content/useCopy'
import { type Interval, indexOf, intervalAt, rank } from '../lib/postcodeData'
import { areasByCode, areasByIndex } from '../lib/postcodeMap'
import { hoveredColour, selectedColour } from './palette'
import { type ChartEntry, TopPostcodesChart } from './TopPostcodesChart'

const chartLength = 10

/** Props of {@link PostcodeInfo}. */
export interface PostcodeInfoProps {
  /** Code of the selected area. */
  readonly selected: string
  /** Code of the area under the pointer, if any. */
  readonly hovered: string | null
  /** The matrix of the measure being shown. */
  readonly values: Float32Array
  /** Time depth in generations. */
  readonly generations: number
  /** Called when the pointer moves onto a bar of the chart. */
  readonly onHover: (code: string) => void
}

function Swatch({ colour }: { readonly colour: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-3 shrink-0 rounded-sm border-2"
      style={{ borderColor: colour }}
    />
  )
}

/**
 * Details of the selected area, below the controls.
 *
 * @param props - See {@link PostcodeInfoProps}.
 * @returns The details, including the chart of the most related areas.
 */
export function PostcodeInfo({
  selected,
  hovered,
  values,
  generations,
  onHover,
}: PostcodeInfoProps) {
  const copy = useCopy()
  const headingId = useId()

  const from = indexOf(selected)
  if (from === undefined) throw new Error(`No data row for ${selected}`)
  const labelOf = (code: string) => {
    const area = areasByCode.get(code)
    return area ? copy.controls.area(area.name, code) : code
  }
  const describe = (interval: Interval | null) =>
    interval
      ? copy.details.estimate(interval.mean, interval.lower, interval.upper)
      : copy.details.noData

  const selectedLabel = labelOf(selected)
  const hoveredIndex =
    hovered === null || hovered === selected ? undefined : indexOf(hovered)

  const entries: ChartEntry[] = rank(values, from, generations)
    .slice(0, chartLength)
    .flatMap(({ index, interval }) => {
      const area = areasByIndex.get(index)
      return area
        ? [{ code: area.code, label: labelOf(area.code), interval }]
        : []
    })

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <Swatch colour={selectedColour} />
        {selectedLabel}
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        <div>
          <dt className="font-medium">{copy.details.within(selectedLabel)}</dt>
          <dd className="text-muted-foreground tabular-nums">
            {describe(intervalAt(values, from, from, generations))}
          </dd>
        </div>
        {hovered !== null && hoveredIndex !== undefined && (
          <div>
            <dt className="flex items-center gap-2 font-medium">
              <Swatch colour={hoveredColour} />
              {copy.details.between(selectedLabel, labelOf(hovered))}
            </dt>
            <dd className="text-muted-foreground tabular-nums">
              {describe(intervalAt(values, from, hoveredIndex, generations))}
            </dd>
          </div>
        )}
      </dl>
      {hoveredIndex === undefined && (
        <p className="text-sm text-muted-foreground">
          {copy.details.hoverPrompt}
        </p>
      )}
      <h3 className="text-sm font-medium">{copy.details.topAreas}</h3>
      <TopPostcodesChart
        entries={entries}
        hovered={hovered}
        label={copy.details.chartLabel(selectedLabel)}
        onHover={onHover}
      />
    </section>
  )
}
