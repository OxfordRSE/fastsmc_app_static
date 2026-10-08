// Ports PostcodeInfo.js from the original frontend (OxfordRSE/fastsmc_app_frontend):
// the selected area's name, its links with other areas, and the chart of its
// most related areas. Links are now percentages of the selected area's link
// with itself, with ranks, rather than raw values; areas without data say so,
// where the original showed 0.0.

import { useId } from 'react'
import { useCopy } from '../content/useCopy'
import {
  indexOf,
  intervalAt,
  rank,
  relativeInterval,
} from '../lib/postcodeData'
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
  const selectedLabel = labelOf(selected)
  const selectedName = areasByCode.get(selected)?.name ?? selected

  const own = intervalAt(values, from, from, generations)?.mean
  if (own === undefined || !(own > 0)) {
    throw new RangeError(`No relatedness of ${selected} to itself`)
  }
  const percentOf = (mean: number) => copy.percent((100 * mean) / own)

  const ranked = rank(values, from, generations)
  const top = ranked[0]
  const topArea = top && areasByIndex.get(top.index)

  const hoveredIndex =
    hovered === null || hovered === selected ? undefined : indexOf(hovered)
  const hoveredLine = (() => {
    if (hovered === null || hoveredIndex === undefined) return null
    const interval = intervalAt(values, from, hoveredIndex, generations)
    if (!interval) return copy.details.hoveredNoData(labelOf(hovered))
    const position = ranked.findIndex((entry) => entry.index === hoveredIndex)
    return copy.details.hoveredLink(
      selectedName,
      labelOf(hovered),
      percentOf(interval.mean),
      position + 1,
      ranked.length,
    )
  })()

  const entries: ChartEntry[] = ranked
    .slice(0, chartLength)
    .flatMap(({ index, interval }) => {
      const area = areasByIndex.get(index)
      return area
        ? [
            {
              code: area.code,
              label: labelOf(area.code),
              interval: relativeInterval(interval, own),
            },
          ]
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
      {/* Heights reserved in lines of text, so the chart below never moves. */}
      <p className="min-h-[2lh] text-sm">
        {top &&
          topArea &&
          copy.details.topLink(
            selectedName,
            labelOf(topArea.code),
            percentOf(top.interval.mean),
          )}
      </p>
      <div className="min-h-[3lh] text-sm">
        {hoveredLine === null ? (
          <p className="text-muted-foreground">{copy.details.hoverPrompt}</p>
        ) : (
          <p className="flex items-baseline gap-2">
            <Swatch colour={hoveredColour} />
            <span>{hoveredLine}</span>
          </p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium">{copy.details.topAreas}</h3>
        <p className="text-xs text-muted-foreground">
          {copy.details.chartUnit(selectedName)}
        </p>
      </div>
      <TopPostcodesChart
        entries={entries}
        hovered={hovered}
        label={copy.details.chartLabel(selectedLabel)}
        onHover={onHover}
      />
    </section>
  )
}
