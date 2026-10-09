// Replaces the map data handling in App.js of the original frontend
// (OxfordRSE/fastsmc_app_frontend): its uk-postcode-area.json and
// calculate_index_mapping give way to the GeoLytix boundaries, where each shape
// already carries its matrix index.

import type { FeatureCollection, Geometry, MultiLineString } from 'geojson'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import topology from '../data/uk-postcode-areas.topo.json'

/** What each map shape carries besides its outline. */
export interface AreaProperties {
  /** Postcode area code, such as `HA`. */
  readonly code: string
  /** Place name, such as `Harrow`. */
  readonly name: string
  /** The area's row and column in the matrices. */
  readonly matrixIndex: number
  /** Whether the matrices hold data for the area. */
  readonly hasData: boolean
}

type PostcodeTopology = Topology<{
  postcode_areas: GeometryCollection<AreaProperties>
}>

// JSON imports widen literal fields such as "type": "Topology" to string.
const postcodeTopology = topology as unknown as PostcodeTopology

/** Every postcode area on the map, as GeoJSON features. */
export const postcodeAreas: FeatureCollection<Geometry, AreaProperties> =
  feature(postcodeTopology, postcodeTopology.objects.postcode_areas)

/**
 * Every boundary between areas, and the coastline, each line once, as one shape.
 *
 * @remarks
 * Drawn separately from the areas' fills, as d3 maps do, so a shared boundary
 * is one line rather than two overlapping edges.
 */
export const boundaries: MultiLineString = mesh(
  postcodeTopology,
  postcodeTopology.objects.postcode_areas,
)

/** Each area's properties, keyed by its code. */
export const areasByCode: ReadonlyMap<string, AreaProperties> = new Map(
  postcodeAreas.features.map(({ properties }) => [properties.code, properties]),
)

/** Each area's properties, keyed by its row and column in the matrices. */
export const areasByIndex: ReadonlyMap<number, AreaProperties> = new Map(
  postcodeAreas.features.map(({ properties }) => [
    properties.matrixIndex,
    properties,
  ]),
)
