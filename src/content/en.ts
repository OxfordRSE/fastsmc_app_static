// Every piece of user-visible text in the app. Components read it through
// useCopy(); none is written anywhere else, and lint rejects text in JSX.
//
// To add a language, copy this file (for example to cy.ts), declare the object
// as `Copy` so the compiler rejects missing or misspelled entries, and translate.
//
// Has no imports, because vite.config.ts also reads it to set the page title.
//
// Ports help_text.js from the original frontend (OxfordRSE/fastsmc_app_frontend):
// help_datatype and help_mode became help.measure and help.colourRange, and
// help_dataset, reworded without the dropped dataset selector, became
// info.overview in the information dialog. The dialog and footer text come from
// UserInterface.js and App.js.
//
// Sentences containing a link mark its place with {link}; the link's text is a
// separate entry, so a translation can move the link within the sentence.

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
  /** Labels and descriptions of the controls in the side panel. */
  readonly controls: {
    /** Label of the measure selector. */
    readonly measure: string
    /** Label of the time slider; the help text refers to it by this name. */
    readonly years: string
    /** Explains the time slider. */
    readonly yearsDescription: string
    /** The time slider's current value, such as "600 years". */
    readonly yearsValue: (years: number) => string
    /** Label of the postcode entry. */
    readonly postcode: string
    /** Explains the postcode entry. */
    readonly postcodeDescription: string
    /** Shown in the empty postcode entry. */
    readonly postcodePlaceholder: string
    /** Shown when no area matches what was typed. */
    readonly noMatch: string
    /** An area in the postcode list, such as "Birmingham (B)". */
    readonly area: (name: string, code: string) => string
    /** An area in the postcode list that has no data and cannot be chosen. */
    readonly areaWithoutData: (name: string, code: string) => string
    /** Label of the checkbox revealing the advanced settings; the help text refers to it. */
    readonly showAdvanced: string
    /** Heading of the colour range settings. */
    readonly colourRange: string
    /** Explains the colour range settings. */
    readonly colourRangeDescription: string
    /** Label of the colour range mode selector. */
    readonly colourRangeMode: string
    /** Name of the colour range slider's lower handle, for screen readers. */
    readonly lightest: string
    /** Name of the colour range slider's upper handle, for screen readers. */
    readonly darkest: string
    /** The colour range slider's current values. */
    readonly rangeValues: (low: number, high: number) => string
    /** Label of the shareable link to the current view. */
    readonly shareLink: string
    /** Explains the shareable link. */
    readonly shareLinkDescription: string
    /** Name of a help button, for screen readers, such as "Help: Measure". */
    readonly help: (topic: string) => string
  }
  /** The details box below the controls. */
  readonly details: {
    /** Labels the relatedness of the selected area to itself. */
    readonly within: (area: string) => string
    /** Labels the relatedness of the selected area to the area under the pointer. */
    readonly between: (selected: string, hovered: string) => string
    /** Shown until the pointer has been over an area. */
    readonly hoverPrompt: string
    /** Shown in place of a value for an area without data. */
    readonly noData: string
    /** A value with its 95% interval. */
    readonly estimate: (mean: number, lower: number, upper: number) => string
    /** Heading of the chart. */
    readonly topAreas: string
    /** Describes the chart for screen readers. */
    readonly chartLabel: (area: string) => string
    /** One bar of the chart, for screen readers. */
    readonly chartEntry: (area: string, estimate: string) => string
  }
  /** The information dialog. */
  readonly info: {
    /** Label of the button that opens the dialog. */
    readonly open: string
    /** The dialog's title. */
    readonly title: string
    /** Label of the buttons that close the dialog. */
    readonly close: string
    /** How to read the map. */
    readonly overview: string
    /** Who made the site, and the data it shows. */
    readonly about: string
    /** An invitation to send feedback. */
    readonly feedback: string
    /** Points to the paper; `{link}` marks where {@link Copy.info.paperLink} goes. */
    readonly paper: string
    /** The paper's citation, linked to it. */
    readonly paperLink: string
    /** How to get in touch. */
    readonly contact: string
  }
  /** The credits at the foot of the side panel. */
  readonly credits: {
    /** The copyright notice: the legal owner, not the authors. */
    readonly copyright: string
    /** The people who made the site. */
    readonly developers: string
    /** Cites the dataset; `{link}` marks where {@link Copy.credits.dataLink} goes. */
    readonly data: string
    /** The dataset's DOI, linked to it. */
    readonly dataLink: string
    /** The map boundaries' attribution, required by their licence: exactly as in data/PROVENANCE.md. */
    readonly map: readonly string[]
  }
  /** Explanations shown in the help popovers. */
  readonly help: {
    /** The measure selector. */
    readonly measure: string
    /** The colour-range settings. */
    readonly colourRange: string
  }
}

// One sentence per line, joined for display, so edits produce clean diffs.
const sentences = (...lines: string[]) => lines.join(' ')

// Relatedness values span several orders of magnitude, so show 2 significant figures.
const value = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 2 })
const years = new Intl.NumberFormat('en-GB')

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

  controls: {
    measure: 'Measure',
    years: 'Time threshold',
    yearsDescription: 'Ancestry calculated this many years in the past.',
    yearsValue: (count) => `${years.format(count)} years`,
    postcode: 'Postcode area',
    postcodeDescription: 'Type an area code, such as S or HA, or a place name.',
    postcodePlaceholder: 'Enter postcode...',
    noMatch: 'No matching area.',
    area: (name, code) => `${name} (${code})`,
    areaWithoutData: (name, code) => `${name} (${code}): no data`,
    showAdvanced: 'Show advanced',
    colourRange: 'Colour range',
    colourRangeDescription:
      'Select the range of colours to display in the map.',
    colourRangeMode: 'Mode',
    lightest: 'Value shown in the lightest colour',
    darkest: 'Value shown in the darkest colour',
    rangeValues: (low, high) => `${value.format(low)} to ${value.format(high)}`,
    shareLink: 'Copy parameters',
    shareLinkDescription: 'Use this URL to save your current parameters.',
    help: (topic) => `Help: ${topic}`,
  },

  details: {
    within: (area) => `Within ${area}`,
    between: (selected, hovered) => `Between ${selected} and ${hovered}`,
    hoverPrompt:
      'Point at an area on the map, or a bar in the chart, to compare it with the selected area.',
    noData: 'no data',
    estimate: (mean, lower, upper) =>
      `${value.format(mean)} (95% interval ${value.format(lower)} to ${value.format(upper)})`,
    topAreas: 'Top 10 most related areas',
    chartLabel: (area) =>
      `Bar chart of the 10 areas most related to ${area}, with 95% intervals`,
    chartEntry: (area, estimate) => `${area}: ${estimate}`,
  },

  info: {
    open: 'More information',
    title: 'More information',
    close: 'Close',
    overview: sentences(
      'The map shows genetic relationships between UK postcode areas, measured by identity-by-descent (IBD) over the past 300 to 1,500 years, depending on the "Time threshold".',
      'The intensity of the colour reflects how closely related the selected area, outlined in red, is to every other area.',
      'Areas shown in grey have too little data for this analysis.',
      'Move the mouse over an area to highlight it in green.',
      'More detail appears in the box below the controls.',
      'Use "Show advanced" to reveal additional settings.',
    ),
    about: sentences(
      'This website was developed by Fergus Cooper, Martin Robinson, Juba Nait Saada, and Pier Palamara, as part of research done at the University of Oxford, UK.',
      'The data reflects genetic relatedness in the past 1,500 years among samples from the UK Biobank data set, which contains the genomes of about 500,000 donors from the UK.',
    ),
    feedback:
      'We welcome feedback, bug reports, and comments on patterns reflecting historical or demographic events you may find in the data.',
    paper: 'Additional details on the analysis are in {link}.',
    paperLink: 'Nait Saada et al., Nature Communications 11, 6130 (2020)',
    contact:
      'To contact us, please write to Pier using <lastnamelowercase>@stats.ox.ac.uk.',
  },

  credits: {
    copyright: '© 2019-2026 University of Oxford.',
    developers:
      'Developed by Fergus Cooper, Martin Robinson, Juba Nait Saada and Pier Palamara.',
    data: 'Data: {link}, licensed under CC BY 4.0.',
    dataLink: 'doi:10.5281/zenodo.4012677',
    map: [
      'Postal Boundaries © GeoLytix copyright and database right 2012.',
      'Contains Ordnance Survey data © Crown copyright and database right 2012.',
      'Contains Royal Mail data © Royal Mail copyright and database right 2012.',
      'Contains National Statistics data © Crown copyright and database right 2012.',
    ],
  },

  help: {
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
