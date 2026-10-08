// Ports the credit line in App.js from the original frontend
// (OxfordRSE/fastsmc_app_frontend), adding the dataset's DOI and the
// attribution that the map boundaries' licence requires.

import { dataUrl } from '../content/links'
import { useCopy } from '../content/useCopy'
import { LinkedText } from './LinkedText'

/**
 * The credits at the foot of the side panel.
 *
 * @returns The authors, the data's DOI and the map's attribution.
 */
export function Credits() {
  const copy = useCopy()
  return (
    <footer className="flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground">
      <p>
        <span className="block">{copy.credits.copyright}</span>
        <span className="block">{copy.credits.developers}</span>
      </p>
      <p>
        <LinkedText
          text={copy.credits.data}
          link={copy.credits.dataLink}
          href={dataUrl}
        />
      </p>
      <p>
        {copy.credits.map.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    </footer>
  )
}
