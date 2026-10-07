import { useCopy } from './content/useCopy'

/**
 * The root component.
 *
 * @returns The whole app.
 */
export default function App() {
  const copy = useCopy()
  return <h1>{copy.appTitle}</h1>
}
