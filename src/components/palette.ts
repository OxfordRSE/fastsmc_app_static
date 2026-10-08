// Colours shared by the map, the details panel and the chart, so that each
// means the same thing everywhere. The fills are those of UkMap.js in the
// original frontend (OxfordRSE/fastsmc_app_frontend). Its red and green marks
// became Okabe-Ito orange and black, distinguishable with any common
// colour-vision deficiency and by lightness alone, each drawn over a halo that
// contrasts with both ends of the white-to-blue fill scale.

/** Fill of the least related areas. */
export const lightest = 'white'

/** Fill of the most related areas, and of the chart's bars. */
export const darkest = 'blue'

/** Fill of areas without data. */
export const noData = '#c8c8c8'

/** Outline of every area. */
export const border = 'rgba(0, 0, 0, 0.5)'

/** Marks the selected area: Okabe-Ito orange. */
export const selectedColour = '#e69f00'

/** Drawn under the selected area's outline, so it shows against white fills. */
export const selectedHalo = 'black'

/** Marks the area under the pointer. */
export const hoveredColour = 'black'

/** Drawn under the hovered area's outline, so it shows against dark blue fills. */
export const hoveredHalo = 'white'
