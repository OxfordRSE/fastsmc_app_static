// Ports the Help component in UserInterface.js from the original frontend
// (OxfordRSE/fastsmc_app_frontend): an icon that opens an explanation.

import { CircleQuestionMarkIcon } from 'lucide-react'
import { useCopy } from '../content/useCopy'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

/** Props of {@link Help}. */
export interface HelpProps {
  /** What the explanation is about, such as the label of the control it sits beside. */
  readonly topic: string
  /** The explanation. */
  readonly text: string
}

/**
 * A help button that opens an explanation in a popover.
 *
 * @param props - See {@link HelpProps}.
 * @returns The button; the popover opens beside it.
 */
export function Help({ topic, text }: HelpProps) {
  const copy = useCopy()
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={copy.controls.help(topic)}
          />
        }
      >
        <CircleQuestionMarkIcon />
      </PopoverTrigger>
      <PopoverContent className="w-80">{text}</PopoverContent>
    </Popover>
  )
}
