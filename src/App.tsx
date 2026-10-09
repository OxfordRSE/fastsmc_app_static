import { useEffect, useReducer } from 'react'
import { Controls } from './components/Controls'
import { Credits } from './components/Credits'
import { DataTable } from './components/DataTable'
import { InfoDialog } from './components/InfoDialog'
import { Legend } from './components/Legend'
import { PostcodeInfo } from './components/PostcodeInfo'
import { UkMap } from './components/UkMap'
import { Spinner } from './components/ui/spinner'
import { useCopy } from './content/useCopy'
import { useElementSize } from './hooks/useElementSize'
import { useMatrices } from './hooks/useMatrices'
import { appReducer, type InspectMethod, initialState } from './lib/appState'
import { colourRange, valueExtent } from './lib/colourRange'
import {
  generationsFromYears,
  indexOf,
  relatedness,
  relativeToSelf,
} from './lib/postcodeData'
import { sideSpace } from './lib/mapLayout'
import { areasByCode } from './lib/postcodeMap'
import { serialiseViewState } from './lib/urlState'

// Space the legend needs beside the map: its width (w-52, 208 px), its 12 px
// offset from the corner (right-3), and 12 px clear of the map.
const legendRoomPx = 232

/**
 * The root component: loads the data and holds the app's state.
 *
 * @returns The whole app.
 */
export default function App() {
  const copy = useCopy()
  const matrices = useMatrices()
  const [state, dispatch] = useReducer(
    appReducer,
    window.location.search,
    initialState,
  )
  const { view, inspected } = state
  const [mapAreaRef, mapArea] = useElementSize<HTMLDivElement>()
  const legendBeside = sideSpace(mapArea.width, mapArea.height) >= legendRoomPx

  // Pathname included: an empty string would keep the current query.
  useEffect(() => {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + serialiseViewState(view),
    )
  }, [view])

  if (matrices.status === 'loading') {
    return (
      <p
        role="status"
        className="flex h-dvh items-center justify-center gap-2 text-muted-foreground"
      >
        <Spinner aria-hidden className="size-6" />
        {copy.loading}
      </p>
    )
  }
  if (matrices.status === 'error') {
    return <p role="alert">{copy.loadError}</p>
  }

  const from = indexOf(view.postcode)
  if (from === undefined) {
    throw new Error(`No data row for selected postcode ${view.postcode}`)
  }
  const matrix = matrices.matrices[view.measure]
  const generations = generationsFromYears(view.years)
  // Percentages of the selected area's link with itself, for the map and its colour range.
  const values = relativeToSelf(relatedness(matrix, from, generations), from)
  const rangeValues = [...values.values()]
  const range = colourRange(view.range, rangeValues)
  const extent = valueExtent(rangeValues)
  const select = (postcode: string) => {
    dispatch({ type: 'select-postcode', postcode })
  }
  const inspect = (postcode: string, by: InspectMethod) => {
    dispatch({ type: 'inspect-postcode', postcode, by })
  }
  const clearInspection = () => {
    dispatch({ type: 'clear-inspection' })
  }

  return (
    // Narrow screens: the map, then the panel below it, scrolling as one page.
    // From the md breakpoint up: side by side, filling the window.
    <main className="flex flex-col md:h-dvh md:flex-row">
      <div
        ref={mapAreaRef}
        className="relative flex h-[70dvh] flex-col md:h-auto md:min-w-0 md:flex-1"
      >
        <div className="min-h-0 flex-1">
          <UkMap
            values={values}
            range={range}
            selected={view.postcode}
            inspected={inspected}
            onSelect={select}
            onInspect={inspect}
            onClearInspection={clearInspection}
          />
        </div>
        {/* In the bottom-right corner when the space beside the map fits it;
            otherwise below the map, so it never covers an area. */}
        <div
          data-legend-placement={legendBeside ? 'corner' : 'below'}
          className={
            legendBeside
              ? 'absolute right-3 bottom-3'
              : 'flex justify-center px-3 pb-3'
          }
        >
          <Legend
            range={range}
            extent={extent}
            selected={areasByCode.get(view.postcode)?.name ?? view.postcode}
          />
        </div>
      </div>
      <aside className="flex flex-col gap-6 border-t p-4 md:w-96 md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l">
        <h1 className="text-2xl font-semibold">{copy.appTitle}</h1>
        <Controls
          view={view}
          range={range}
          extent={extent}
          dispatch={dispatch}
        />
        <div className="flex flex-col gap-3">
          <PostcodeInfo
            selected={view.postcode}
            inspected={inspected?.postcode ?? null}
            offerSelect={inspected?.by === 'touch'}
            values={matrix}
            generations={generations}
            onSelect={select}
            onInspect={(postcode) => {
              inspect(postcode, 'pointer')
            }}
            onClearInspection={() => {
              if (inspected?.by === 'pointer') clearInspection()
            }}
          />
          {/* Side by side, to keep the panel short enough not to scroll. */}
          <div className="flex flex-wrap gap-2">
            <DataTable
              selected={view.postcode}
              values={matrix}
              measure={view.measure}
              years={view.years}
            />
            <InfoDialog />
          </div>
        </div>
        <Credits />
      </aside>
    </main>
  )
}
