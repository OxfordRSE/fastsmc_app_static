import { useEffect, useState } from 'react'
import { type Measure, loadMatrix } from '../lib/postcodeData'

/** Both measures' matrices, keyed by measure. */
export type Matrices = Readonly<Record<Measure, Float32Array>>

/** Progress of loading the matrices. */
export type MatricesState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly matrices: Matrices }

/**
 * Loads both measures' matrices once, in parallel.
 *
 * @remarks
 * Both are loaded up front so switching measure is instant; together they are
 * about 1.5 MB compressed.
 *
 * @returns Whether loading is in progress, has failed, or is complete.
 */
export function useMatrices(): MatricesState {
  const [state, setState] = useState<MatricesState>({ status: 'loading' })

  useEffect(() => {
    // Ignore a result that arrives after the component has unmounted.
    let current = true
    Promise.all([loadMatrix('ancestors'), loadMatrix('genome')]).then(
      ([ancestors, genome]) => {
        if (current) {
          setState({ status: 'ready', matrices: { ancestors, genome } })
        }
      },
      () => {
        if (current) setState({ status: 'error' })
      },
    )
    return () => {
      current = false
    }
  }, [])

  return state
}
