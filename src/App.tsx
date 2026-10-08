import { useEffect, useReducer } from 'react'
import { Controls } from './components/Controls'
import { Credits } from './components/Credits'
import { InfoDialog } from './components/InfoDialog'
import { PostcodeInfo } from './components/PostcodeInfo'
import { UkMap } from './components/UkMap'
import { Spinner } from './components/ui/spinner'
import { useCopy } from './content/useCopy'
import { useMatrices } from './hooks/useMatrices'
import { appReducer, initialState } from './lib/appState'
import { colourRange, valueExtent } from './lib/colourRange'
import { generationsFromYears, indexOf, relatedness } from './lib/postcodeData'
import { serialiseViewState } from './lib/urlState'

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
  const { view, hovered } = state

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
  const values = relatedness(matrix, from, generations)
  const rangeValues = [...values.values()]
  const range = colourRange(view.range, rangeValues)
  const hover = (postcode: string) => {
    dispatch({ type: 'hover-postcode', postcode })
  }

  return (
    // Narrow screens: the map, then the panel below it, scrolling as one page.
    // From the md breakpoint up: side by side, filling the window.
    <main className="flex flex-col md:h-dvh md:flex-row">
      <div className="h-[70dvh] md:h-auto md:min-w-0 md:flex-1">
        <UkMap
          values={values}
          range={range}
          selected={view.postcode}
          hovered={hovered}
          onSelect={(postcode) => {
            dispatch({ type: 'select-postcode', postcode })
          }}
          onHover={hover}
        />
      </div>
      <aside className="flex flex-col gap-6 border-t p-4 md:w-96 md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l">
        <h1 className="text-2xl font-semibold">{copy.appTitle}</h1>
        <Controls
          view={view}
          range={range}
          extent={valueExtent(rangeValues)}
          dispatch={dispatch}
        />
        <PostcodeInfo
          selected={view.postcode}
          hovered={hovered}
          values={matrix}
          generations={generations}
          onHover={hover}
        />
        <div>
          <InfoDialog />
        </div>
        <Credits />
      </aside>
    </main>
  )
}
