// New: the original frontend (OxfordRSE/fastsmc_app_frontend) wrote each
// hovered area's raw values in its details box. Those values now appear only
// here, on request, for every area at once; the table is also the text
// alternative to the map and the chart.

import { cn } from 'cn'
import { useId } from 'react'
import { useCopy } from '../content/useCopy'
import {
  generationsFromYears,
  indexOf,
  intervalAt,
  isUsable,
  type Measure,
  rank,
  relativeInterval,
} from '../lib/postcodeData'
import { areasByCode, areasByIndex } from '../lib/postcodeMap'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

/** Props of {@link DataTable}. */
export interface DataTableProps {
  /** Code of the selected area. */
  readonly selected: string
  /** The matrix of the measure being shown. */
  readonly values: Float32Array
  /** Which measure the matrix holds. */
  readonly measure: Measure
  /** Time threshold in years. */
  readonly years: number
}

// Areas on the map without data, which close the table.
const areasWithoutData = [...areasByCode.values()]
  .filter(({ code }) => !isUsable(code))
  .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'))

// Numbers line up on the right, with an even gap before each column. Each
// number column shrinks to fit its contents (w-px), leaving the spare width to
// the area column.
const numeric = 'w-px pl-4 text-right tabular-nums'
// The header stays at the top as the rows scroll beneath it. Its rule is a
// shadow on each cell, since a table's borders do not move with a sticky header.
const header = 'sticky top-0 z-10 bg-popover'
const headerRow =
  '*:align-bottom *:whitespace-normal *:shadow-[inset_0_-1px_0_var(--color-border)]'
// The rows only display values, so they do not light up under the pointer.
const bodyRow = 'hover:bg-transparent'
// Area names stay in view when a narrow screen scrolls the table sideways, and
// wrap when short of room, to leave it for the numbers.
const areaColumn = 'sticky left-0 h-auto bg-popover whitespace-normal'

/**
 * The "Show all values" button and the dialog it opens.
 *
 * @param props - See {@link DataTableProps}.
 * @returns The button; the dialog opens over the page.
 */
export function DataTable(props: DataTableProps) {
  const copy = useCopy()
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        {copy.dataTable.open}
      </DialogTrigger>
      {/* A column whose table scrolls, so the title and the close button stay in view. */}
      <DialogContent
        closeLabel={copy.info.close}
        className="flex max-h-[85dvh] flex-col sm:max-w-2xl"
      >
        <DataTableContent {...props} />
      </DialogContent>
    </Dialog>
  )
}

// Rendered only while the dialog is open, so the rows are worked out only then.
function DataTableContent({
  selected,
  values,
  measure,
  years,
}: DataTableProps) {
  const copy = useCopy()
  const titleId = useId()

  const from = indexOf(selected)
  if (from === undefined) throw new Error(`No data row for ${selected}`)
  const generations = generationsFromYears(years)
  const own = intervalAt(values, from, from, generations)
  if (!own || !(own.mean > 0)) {
    throw new RangeError(`No relatedness of ${selected} to itself`)
  }
  const labelOf = (code: string) => {
    const area = areasByCode.get(code)
    return area ? copy.controls.area(area.name, code) : code
  }
  const selectedName = areasByCode.get(selected)?.name ?? selected

  const rows = [
    { code: selected, rank: null, interval: own },
    ...rank(values, from, generations).flatMap(({ index, interval }, i) => {
      const area = areasByIndex.get(index)
      return area ? [{ code: area.code, rank: i + 1, interval }] : []
    }),
  ]

  return (
    <>
      <DialogHeader>
        <DialogTitle id={titleId}>
          {copy.dataTable.title(labelOf(selected))}
        </DialogTitle>
        <DialogDescription>
          {copy.dataTable.description(
            selectedName,
            copy.measures[measure],
            years,
          )}
        </DialogDescription>
      </DialogHeader>
      {/* The scrolling box takes focus, so the keyboard can scroll it (WCAG 2.1.1). */}
      <Table
        aria-labelledby={titleId}
        containerProps={{
          className:
            'min-h-0 overflow-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          tabIndex: 0,
          role: 'region',
          'aria-labelledby': titleId,
        }}
      >
        <TableHeader className={header}>
          <TableRow className={headerRow}>
            {/* Minimum widths keep the longer headings to two lines. */}
            <TableHead scope="col" className={areaColumn}>
              {copy.dataTable.area}
            </TableHead>
            <TableHead scope="col" className={numeric}>
              {copy.dataTable.rank}
            </TableHead>
            <TableHead scope="col" className={cn(numeric, 'min-w-32')}>
              {copy.dataTable.share(selected)}
            </TableHead>
            <TableHead scope="col" className={numeric}>
              {copy.dataTable.interval}
            </TableHead>
            <TableHead scope="col" className={cn(numeric, 'min-w-32')}>
              {copy.dataTable.mean[measure]}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ code, rank: position, interval }) => {
            const relative = relativeInterval(interval, own.mean)
            return (
              <TableRow
                key={code}
                className={cn(bodyRow, position === null && 'font-semibold')}
              >
                <TableHead scope="row" className={areaColumn}>
                  {labelOf(code)}
                </TableHead>
                <TableCell className={numeric}>{position}</TableCell>
                <TableCell className={numeric}>
                  {copy.dataTable.percent(relative.mean)}
                </TableCell>
                <TableCell className={numeric}>
                  {copy.dataTable.intervalValue(relative.lower, relative.upper)}
                </TableCell>
                <TableCell className={numeric}>
                  {copy.dataTable.value(interval.mean)}
                </TableCell>
              </TableRow>
            )
          })}
          {areasWithoutData.map(({ code }) => (
            <TableRow key={code} className={bodyRow}>
              <TableHead scope="row" className={areaColumn}>
                {labelOf(code)}
              </TableHead>
              <TableCell />
              <TableCell colSpan={3} className="text-muted-foreground">
                {copy.dataTable.noData}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DialogFooter showCloseButton closeLabel={copy.info.close} />
    </>
  )
}
