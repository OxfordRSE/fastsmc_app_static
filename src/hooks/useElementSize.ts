import { type RefCallback, useCallback, useState } from 'react'

/** Width and height in CSS pixels. */
export interface Size {
  /** Width in CSS pixels. */
  readonly width: number
  /** Height in CSS pixels. */
  readonly height: number
}

/**
 * Tracks an element's size as it changes.
 *
 * @remarks
 * Replaces the original app's window resize listeners, which missed changes in
 * layout that did not come from the window itself.
 *
 * @returns A ref to attach to the element, and its current content size, which
 *   is zero until the element has been measured.
 */
export function useElementSize<T extends Element>(): [RefCallback<T>, Size] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  const ref = useCallback((element: T | null) => {
    if (!element) return undefined
    const observer = new ResizeObserver((entries) => {
      const latest = entries.at(-1)
      if (latest) {
        const { width, height } = latest.contentRect
        setSize({ width, height })
      }
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  return [ref, size]
}
