import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { ColourRangeMode } from '../lib/colourRange'
import type { Measure } from '../lib/postcodeData'
import { type Copy, en } from './en'

// Every string in a copy object, with its path, such as 'help.measure'.
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => leaves(child, path === '' ? key : `${path}.${key}`),
  )
}

describe('Copy', () => {
  // Checked by the type checker: en.ts has no imports, so it cannot use these types itself.
  it('names exactly the measures the app has', () => {
    expectTypeOf<keyof Copy['measures']>().toEqualTypeOf<Measure>()
  })

  it('names exactly the colour-range modes the app has', () => {
    expectTypeOf<
      keyof Copy['colourRangeModes']
    >().toEqualTypeOf<ColourRangeMode>()
  })
})

describe('en', () => {
  it.each(leaves(en))('%s is non-empty and trimmed', (_, text) => {
    expect(text).not.toBe('')
    expect(text).toBe(text.trim())
  })

  it('joins help sentences with single spaces', () => {
    for (const [, text] of leaves(en.help)) {
      expect(text).not.toMatch(/\s{2}/)
    }
  })

  it.each(leaves(en).filter(([, text]) => /[{}]/.test(text)))(
    '%s marks one link and nothing else in braces',
    (_, text) => {
      expect(text.split('{link}')).toHaveLength(2)
      expect(text.replace('{link}', '')).not.toMatch(/[{}]/)
    },
  )

  it('attributes the map exactly as its licence requires', () => {
    const provenance = readFileSync(
      new URL('../../data/PROVENANCE.md', import.meta.url),
      'utf8',
    )
    const quoted = provenance
      .split('\n')
      .filter((line) => line.startsWith('> '))
      .map((line) => line.slice(2))
    expect(en.credits.map).toEqual(quoted)
  })
})
