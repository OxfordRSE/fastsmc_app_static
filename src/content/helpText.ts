// One sentence per line, joined for display, so edits produce clean diffs.
const sentences = (...lines: string[]) => lines.join(' ')

/** Text for the help popovers, one entry per control. */
export const helpText = {
  dataset: sentences(
    'Select the type of data to display on the map.',
    '"IBD" (identity-by-descent, currently the only option) shows genetic relationships between UK postcode areas over the past 300 to 1,500 years, depending on the "Time threshold" set below.',
    'The intensity of the colour reflects how closely related the selected area, outlined in red, is to every other area.',
    'Areas shown in grey have too little data for this analysis.',
    'Move the mouse over an area to highlight it in green.',
    'More detail appears in the box below.',
    'Use "Show advanced" to reveal additional settings.',
  ),

  datatype: sentences(
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
} as const
