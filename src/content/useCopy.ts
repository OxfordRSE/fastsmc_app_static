import { createContext, useContext } from 'react'
import { type Copy, en } from './en'

// Only English exists today. Adding a language means adding a provider for this
// context that supplies the chosen language's `Copy`.
const CopyContext = createContext<Copy>(en)

/**
 * Returns the user-visible text in the current language.
 *
 * @remarks
 * Components must take every piece of text from here, never write it inline.
 *
 * @returns The text for the current language.
 */
export function useCopy(): Copy {
  return useContext(CopyContext)
}
