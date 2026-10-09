// Moving between the map's areas from the keyboard. New: the original frontend
// (OxfordRSE/fastsmc_app_frontend) could only be used with a mouse.

/** A direction on screen, from an arrow key. */
export type Direction = 'left' | 'right' | 'up' | 'down'

const unit: Readonly<Record<Direction, readonly [number, number]>> = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
}

/**
 * The area to move to with an arrow key: the nearest one in that direction.
 *
 * @remarks
 * Areas within 45 degrees of the direction are preferred; if there are none,
 * any area ahead will do. Among those, distance across the direction counts
 * double, so a key goes straight on rather than veering to a nearer area off
 * to one side.
 *
 * @param from - Code of the area to move from.
 * @param centres - Each area's centre on screen, keyed by code.
 * @param direction - Which way to move.
 * @returns The code of the area to move to, or `undefined` if none lies that way.
 */
export function nearestInDirection(
  from: string,
  centres: ReadonlyMap<string, readonly [number, number]>,
  direction: Direction,
): string | undefined {
  const origin = centres.get(from)
  if (!origin) return undefined
  const [ux, uy] = unit[direction]
  const ahead = [...centres]
    .filter(([code]) => code !== from)
    .map(([code, [x, y]]) => {
      const dx = x - origin[0]
      const dy = y - origin[1]
      const along = dx * ux + dy * uy
      const across = Math.abs(dx * uy - dy * ux)
      return { code, along, across }
    })
    .filter(({ along }) => along > 0)
  const withinCone = ahead.filter(({ along, across }) => across <= along)
  const candidates = withinCone.length > 0 ? withinCone : ahead
  let best: { code: string; score: number } | undefined
  for (const { code, along, across } of candidates) {
    const score = along + 2 * across
    if (!best || score < best.score) best = { code, score }
  }
  return best?.code
}

/**
 * The area that typed letters pick out, as in a list that jumps to an entry as
 * its first letters are typed.
 *
 * @param typed - The letters typed so far, in any case.
 * @param areas - Every area's code and name, in the order to search.
 * @returns The area whose code is exactly what was typed, else the first whose
 *   name starts with it, else the first whose code starts with it.
 */
export function matchTyped(
  typed: string,
  areas: readonly { readonly code: string; readonly name: string }[],
): string | undefined {
  const query = typed.toLowerCase()
  if (query === '') return undefined
  return (
    areas.find(({ code }) => code.toLowerCase() === query) ??
    areas.find(({ name }) => name.toLowerCase().startsWith(query)) ??
    areas.find(({ code }) => code.toLowerCase().startsWith(query))
  )?.code
}
