// New: the original frontend (OxfordRSE/fastsmc_app_frontend) ignored clicks on
// areas without data. Selecting one now explains why it has none.

import { useCopy } from '../content/useCopy'
import { areasByCode } from '../lib/postcodeMap'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

/** Props of {@link NoDataDialog}. */
export interface NoDataDialogProps {
  /** Code of the area to explain, or `null` when the dialog is closed. */
  readonly area: string | null
  /** Called when the dialog closes. */
  readonly onClose: () => void
}

/**
 * Explains why an area has no data, when it is selected.
 *
 * @param props - See {@link NoDataDialogProps}.
 * @returns The dialog, open while there is an area to explain.
 */
export function NoDataDialog({ area, onClose }: NoDataDialogProps) {
  const copy = useCopy()
  const name = area === null ? undefined : areasByCode.get(area)?.name
  const label =
    area === null ? '' : name ? copy.controls.area(name, area) : area
  return (
    <Dialog
      open={area !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent closeLabel={copy.info.close}>
        <DialogHeader>
          <DialogTitle>{copy.noData.title(label)}</DialogTitle>
          <DialogDescription>{copy.noData.explanation}</DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton closeLabel={copy.info.close} />
      </DialogContent>
    </Dialog>
  )
}
