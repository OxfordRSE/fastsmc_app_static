import { useEffect, useReducer } from 'react'
import { useCopy } from './content/useCopy'
import { useMatrices } from './hooks/useMatrices'
import { appReducer, initialState } from './lib/appState'
import { serialiseViewState } from './lib/urlState'

/**
 * The root component: loads the data and holds the app's state.
 *
 * @returns The whole app.
 */
export default function App() {
  const copy = useCopy()
  const matrices = useMatrices()
  const [state] = useReducer(appReducer, window.location.search, initialState)

  // Pathname included: an empty string would keep the current query.
  useEffect(() => {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + serialiseViewState(state.view),
    )
  }, [state.view])

  if (matrices.status === 'loading') {
    return <p role="status">{copy.loading}</p>
  }
  if (matrices.status === 'error') {
    return <p role="alert">{copy.loadError}</p>
  }
  return <h1>{copy.appTitle}</h1>
}
