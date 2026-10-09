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
  isUsable,
  rank,
  relativeInterval,
} from '../lib/postcodeData'
import { areasByCode, areasByIndex } from '../lib/postcodeMap'
import { inspectedColour, selectedColour } from './palette'
import { type ChartEntry, TopPostcodesChart } from './TopPostcodesChart'
import { Button } from './ui/button'

const chartLength = 10

/** Props of {@link PostcodeInfo}. */
export interface PostcodeInfoProps {
  /** Code of the selected area. */
  readonly selected: string
  /** Code of the inspected area, if any. */
  readonly inspected: string | null
  /** Whether to offer a button that selects the inspected area: after a tap. */
  readonly offerSelect: boolean
  /** The matrix of the measure being shown. */
  readonly values: Float32Array
  /** Time depth in generations. */
  readonly generations: number
  /** Called to select an area. */
  readonly onSelect: (code: string) => void
  /** Called when the pointer moves onto a bar of the chart. */
  readonly onInspect: (code: string) => void
  /** Called when the pointer leaves the chart. */
  readonly onClearInspection: () => void
}

function Swatch({ colour }: { readonly colour: string }) {
  return (
    // Keeps its colour in forced-colours mode, on a light square so the black
    // swatch shows against a dark theme, as the map's outlines keep theirs.
    <span
      aria-hidden
      className="inline-block size-3 shrink-0 rounded-sm border-2 forced-color-adjust-none forced-colors:bg-background"
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
  inspected,
  offerSelect,
  values,
  generations,
  onSelect,
  onInspect,
  onClearInspection,
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

  const inspectedIndex =
    inspected === null || inspected === selected
      ? undefined
      : indexOf(inspected)
  const inspectedLine = (() => {
    if (inspected === null || inspectedIndex === undefined) return null
    const interval = intervalAt(values, from, inspectedIndex, generations)
    if (!interval) return copy.details.inspectedNoData(labelOf(inspected))
    const position = ranked.findIndex((entry) => entry.index === inspectedIndex)
    return copy.details.inspectedLink(
      selectedName,
      labelOf(inspected),
      percentOf(interval.mean),
      position + 1,
      ranked.length,
    )
  })()
  // The area a button may select: one tapped, with data, and not already selected.
  const selectable =
    offerSelect &&
    inspected !== null &&
    inspected !== selected &&
    isUsable(inspected)
      ? inspected
      : null

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
        {inspectedLine === null ? (
          <p className="text-muted-foreground">{copy.details.inspectPrompt}</p>
        ) : (
          <p className="flex items-baseline gap-2">
            <Swatch colour={inspectedColour} />
            <span>
              {inspectedLine}
              {/* After a tap, which cannot hover, a second tap or this selects it. */}
              {selectable !== null && (
                <Button
                  variant="outline"
                  size="xs"
                  className="ml-2 align-baseline"
                  aria-label={copy.details.selectLabel(labelOf(selectable))}
                  onClick={() => {
                    onSelect(selectable)
                  }}
                >
                  {copy.details.select}
                </Button>
              )}
            </span>
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
        inspected={inspected}
        label={copy.details.chartLabel(selectedLabel)}
        onInspect={onInspect}
        onLeave={onClearInspection}
      />
    </section>
  )
}
