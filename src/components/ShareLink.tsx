// The parameters URL from UserInterface.js in the original frontend
// (OxfordRSE/fastsmc_app_frontend), with a button that copies it.

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCopy } from '../content/useCopy'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from './ui/input-group'

// How long the copied state shows before the button resets.
const confirmationMs = 2000

/** Props of {@link ShareLink}. */
export interface ShareLinkProps {
  /** Id of the text field, for its label. */
  readonly id: string
  /** The link to show and copy. */
  readonly link: string
}

/**
 * A read-only link with a copy button.
 *
 * @remarks
 * If the browser refuses clipboard access, the link is selected instead, ready
 * to copy by hand.
 *
 * @param props - See {@link ShareLinkProps}.
 * @returns The field and its button.
 */
export function ShareLink({ id, link }: ShareLinkProps) {
  const copy = useCopy()
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => {
      setCopied(false)
    }, confirmationMs)
    return () => {
      clearTimeout(timer)
    }
  }, [copied])

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true)
      },
      () => {
        input.current?.focus()
        input.current?.select()
      },
    )
  }

  return (
    <InputGroup>
      <InputGroupInput
        ref={input}
        id={id}
        readOnly
        value={link}
        onFocus={(event) => {
          event.currentTarget.select()
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={copy.controls.copyLink}
          onClick={copyLink}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
      <span role="status" className="sr-only">
        {copied ? copy.controls.linkCopied : ''}
      </span>
    </InputGroup>
  )
}
