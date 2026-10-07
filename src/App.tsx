import { useEffect, useReducer } from 'react'
import styles from './App.module.css'
import { UkMap } from './components/UkMap'
import { useCopy } from './content/useCopy'
import { useMatrices } from './hooks/useMatrices'
import { appReducer, initialState } from './lib/appState'
import { colourRange } from './lib/colourRange'
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
    return <p role="status">{copy.loading}</p>
  }
  if (matrices.status === 'error') {
    return <p role="alert">{copy.loadError}</p>
  }

  const from = indexOf(view.postcode)
  if (from === undefined) {
    throw new Error(`No data row for selected postcode ${view.postcode}`)
  }
  const values = relatedness(
    matrices.matrices[view.measure],
    from,
    generationsFromYears(view.years),
  )
  const range = colourRange(view.range, [...values.values()])

  return (
    <div className={styles.app}>
      <h1>{copy.appTitle}</h1>
      <div className={styles.map}>
        <UkMap
          values={values}
          range={range}
          selected={view.postcode}
          hovered={hovered}
          onSelect={(postcode) => {
            dispatch({ type: 'select-postcode', postcode })
          }}
          onHover={(postcode) => {
            dispatch({ type: 'hover-postcode', postcode })
          }}
        />
      </div>
    </div>
  )
}
