// Every piece of user-visible text in the app. Components read it through
// useCopy(); none is written anywhere else, and lint rejects text in JSX.
//
// To add a language, copy this file (for example to cy.ts), declare the object
// as `Copy` so the compiler rejects missing or misspelled entries, and translate.
//
// Has no imports, because vite.config.ts also reads it to set the page title.
//
// Ports help_text.js from the original frontend (OxfordRSE/fastsmc_app_frontend):
// help_dataset, help_datatype and help_mode became help.dataset, help.measure and
// help.colourRange.

/** All user-visible text, for one language. */
export interface Copy {
  /** The app's name: the page title and main heading. */
  readonly appTitle: string
  /** Shown while the data downloads. */
  readonly loading: string
  /** Shown if the data cannot be downloaded. */
  readonly loadError: string
  /** Names of the two measures, as offered in the measure selector. */
  readonly measures: {
    readonly ancestors: string
    readonly genome: string
  }
  /** Names of the colour-range modes, as offered in the advanced settings. */
  readonly colourRangeModes: {
    readonly 'second-largest': string
    readonly percentiles: string
    readonly custom: string
  }
  /** Explanations shown in the help popovers. */
  readonly help: {
    /** Overview of what the map shows. */
    readonly dataset: string
    /** The measure selector. */
    readonly measure: string
    /** The colour-range settings. */
    readonly colourRange: string
  }
}

// One sentence per line, joined for display, so edits produce clean diffs.
const sentences = (...lines: string[]) => lines.join(' ')

/** English text. */
export const en: Copy = {
  appTitle: 'UK Ancestry Map',
  loading: 'Loading the map...',
  loadError:
    'The map data could not be loaded. Please check your connection and reload the page.',

  measures: {
    ancestors: 'number of ancestors',
    genome: 'percent shared genome',
  },

  colourRangeModes: {
    'second-largest': 'second largest',
    percentiles: '95% percentiles',
    custom: 'set by user',
  },

  help: {
    dataset: sentences(
      'Select the type of data to display on the map.',
      '"IBD" (identity-by-descent, currently the only option) shows genetic relationships between UK postcode areas over the past 300 to 1,500 years, depending on the "Time threshold" set below.',
      'The intensity of the colour reflects how closely related the selected area, outlined in red, is to every other area.',
      'Areas shown in grey have too little data for this analysis.',
      'Move the mouse over an area to highlight it in green.',
      'More detail appears in the box below.',
      'Use "Show advanced" to reveal additional settings.',
    ),

    measure: sentences(
      'Select which measure of shared genetic ancestry to display.',
      'With "percent shared genome", the colours and numbers show the percentage of the genome that two typical individuals from the two areas share identical-by-descent, inherited from common ancestors who lived between today and the selected time threshold.',
      'This is usually a very small fraction, because little of the genome is inherited from ancestors who lived in recent centuries.',
      'With "number of ancestors", the map shows how many genetic ancestors two typical individuals from the two areas share on average over the same period.',
      'These numbers are also usually small.',
    ),

    colourRange: sentences(
      'This option sets the colour range used on the map, which can magnify patterns within a particular band of genetic relatedness.',
      'Clicking on different areas shows that the strongest genetic relationships are almost always between individuals living in the same postcode area.',
      'For instance, individuals from Birmingham (B) are more closely related to other individuals from Birmingham than to individuals from any other area.',
      'The pattern holds across nearly all areas, even cosmopolitan ones such as London.',
      'It reflects limited movement of genetic ancestors ("gene flow") in recent centuries, known as isolation by distance.',
      'If the lightest colour meant no shared ancestry and the darkest meant the largest value for the selected area, the map would be almost white everywhere except the selected area itself, hiding the patterns between different areas.',
      'You can see this by choosing "set by user" and dragging the range to its full extent.',
      'To bring out intermediate relationships, choose "second largest" or "95% percentiles".',
      '"Second largest" sets the lightest colour to zero shared ancestry and the darkest to the second largest value for the selected area.',
      '"95% percentiles" ignores the lowest and highest 5% of areas, setting the lightest colour to the 5th percentile and the darkest to the 95th.',
    ),
  },
}
