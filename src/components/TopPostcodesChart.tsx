// Replaces TopHistogram in PostcodeInfo.js from the original frontend
// (OxfordRSE/fastsmc_app_frontend), drawn with react-vis there. The 95% interval
// is now an error bar rather than a solid box over a translucent bar, and the
// values are percentages of the selected area's link with itself.

import { scaleBand, scaleLinear } from 'd3-scale'
import { useCopy } from '../content/useCopy'
import { useElementSize } from '../hooks/useElementSize'
import type { Interval } from '../lib/postcodeData'
import { darkest, hoveredColour } from './palette'

const height = 200
const margin = { top: 8, right: 8, bottom: 24, left: 48 }
const tickCount = 4
// Half the width of an error bar's caps, as a fraction of a bar's width.
const capFraction = 0.2

/** One bar of {@link TopPostcodesChart}. */
export interface ChartEntry {
  /** The area's code, shown under its bar. */
  readonly code: string
  /** The area's name and code, read out by screen readers. */
  readonly label: string
  /** Its relatedness to the selected area, in percent of the selected area's link with itself. */
  readonly interval: Interval
}

/** Props of {@link TopPostcodesChart}. */
export interface TopPostcodesChartProps {
  /** The bars, in order. */
  readonly entries: readonly ChartEntry[]
  /** Code of the area under the pointer, whose bar is outlined like it is on the map, if any. */
  readonly hovered: string | null
  /** Describes the chart for screen readers. */
  readonly label: string
  /** Called when the pointer moves onto a bar. */
  readonly onHover: (code: string) => void
}

/**
 * Bar chart of mean relatedness, with error bars for the 95% intervals.
 *
 * @param props - See {@link TopPostcodesChartProps}.
 * @returns The chart, as wide as its container.
 */
export function TopPostcodesChart({
  entries,
  hovered,
  label,
  onHover,
}: TopPostcodesChartProps) {
  const copy = useCopy()
  const [ref, { width }] = useElementSize<HTMLDivElement>()
  const innerWidth = Math.max(width - margin.left - margin.right, 0)
  const innerHeight = height - margin.top - margin.bottom

  const x = scaleBand()
    .domain(entries.map((entry) => entry.code))
    .range([0, innerWidth])
    .padding(0.2)
  const top = Math.max(0, ...entries.map((entry) => entry.interval.upper))
  const y = scaleLinear().domain([0, top]).range([innerHeight, 0]).nice()
  const ticks = y.ticks(tickCount)
  // As many decimals as the spacing of the ticks needs, as d3's tickFormat does.
  const step = (ticks[1] ?? 1) - (ticks[0] ?? 0)
  const fractionDigits = Math.max(0, -Math.floor(Math.log10(step)))
  const formatTick = (tick: number) => copy.percentTick(tick, fractionDigits)

  const barWidth = x.bandwidth()
  const cap = barWidth * capFraction

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="img" aria-label={label}>
        <g
          transform={`translate(${String(margin.left)},${String(margin.top)})`}
        >
          {ticks.map((tick) => (
            <g
              key={tick}
              data-tick={tick}
              transform={`translate(0,${String(y(tick))})`}
            >
              <line
                x2={innerWidth}
                stroke="currentColor"
                className="text-border"
              />
              <text
                x={-6}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-xs tabular-nums"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}
          {entries.map(({ code, interval }) => {
            const left = x(code) ?? 0
            const centre = left + barWidth / 2
            const isHovered = code === hovered
            return (
              <g
                key={code}
                data-code={code}
                data-hovered={isHovered || undefined}
                onMouseEnter={() => {
                  onHover(code)
                }}
              >
                {/* Full height and including the gaps, so short bars are easy to point at. */}
                <rect
                  x={left - (x.step() - barWidth) / 2}
                  width={x.step()}
                  height={innerHeight}
                  fill="transparent"
                />
                <rect
                  data-bar
                  x={left}
                  y={y(interval.mean)}
                  width={barWidth}
                  height={y(0) - y(interval.mean)}
                  fill={darkest}
                  fillOpacity={0.5}
                  stroke={isHovered ? hoveredColour : 'none'}
                  strokeWidth={2}
                />
                <g
                  data-error-bar
                  stroke="currentColor"
                  className="text-foreground"
                  pointerEvents="none"
                >
                  <line
                    x1={centre}
                    x2={centre}
                    y1={y(interval.lower)}
                    y2={y(interval.upper)}
                  />
                  <line
                    x1={centre - cap}
                    x2={centre + cap}
                    y1={y(interval.lower)}
                    y2={y(interval.lower)}
                  />
                  <line
                    x1={centre - cap}
                    x2={centre + cap}
                    y1={y(interval.upper)}
                    y2={y(interval.upper)}
                  />
                </g>
                <text
                  x={centre}
                  y={innerHeight + 16}
                  textAnchor="middle"
                  className="fill-foreground text-xs"
                >
                  {code}
                </text>
              </g>
            )
          })}
          <line
            x2={innerWidth}
            y1={innerHeight}
            y2={innerHeight}
            stroke="currentColor"
            className="text-muted-foreground"
          />
        </g>
      </svg>
      <ol className="sr-only">
        {entries.map(({ code, label: area, interval }) => (
          <li key={code}>
            {copy.details.chartEntry(area, copy.percent(interval.mean))}
          </li>
        ))}
      </ol>
    </div>
  )
}
