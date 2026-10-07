import { describe, expect, it } from 'vitest'
import meta from '../data/meta.json'
import { usableIndices } from './postcodeData'
import { postcodeAreas } from './postcodeMap'

describe('postcodeAreas', () => {
  const areas = postcodeAreas.features.map((f) => f.properties)

  it('has one shape per postcode area', () => {
    const codes = areas.map((a) => a.code)
    expect(codes).toHaveLength(120)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('points each shape at its own row of the matrices', () => {
    for (const { code, matrixIndex } of areas) {
      expect(meta.postcodes[matrixIndex]).toBe(code)
    }
  })

  it('marks only Croydon and Brighton as having no data', () => {
    const noData = areas.filter((a) => !a.hasData).map((a) => a.code)
    expect(noData.sort()).toEqual(['BN', 'CR'])
  })

  it('has a shape for every usable postcode', () => {
    const shown = areas.filter((a) => a.hasData).map((a) => a.matrixIndex)
    expect(shown.sort((a, b) => a - b)).toEqual(usableIndices)
  })
})
