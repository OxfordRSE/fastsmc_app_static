/**
 * Reads an element, failing loudly on a bad index.
 *
 * @remarks
 * Plain indexing yields `undefined` for a bad index, which in numeric code
 * becomes `NaN` and is indistinguishable from missing data.
 *
 * @param values - The array to read.
 * @param index - Position of the element.
 * @returns The element.
 * @throws `RangeError` if there is no element at `index`.
 */
export function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index]
  if (value === undefined) {
    throw new RangeError(`Index ${String(index)} is out of range`)
  }
  return value
}
