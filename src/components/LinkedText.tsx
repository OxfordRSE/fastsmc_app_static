/** Props of {@link LinkedText}. */
export interface LinkedTextProps {
  /** A sentence from the copy, with `{link}` where the link goes. */
  readonly text: string
  /** The link's own text. */
  readonly link: string
  /** Where the link goes. */
  readonly href: string
}

/**
 * A sentence from the copy with a link inside it.
 *
 * @param props - See {@link LinkedTextProps}.
 * @returns The sentence, with the link in place of `{link}`.
 */
export function LinkedText({ text, link, href }: LinkedTextProps) {
  const [before = '', after = ''] = text.split('{link}')
  return (
    <>
      {before}
      <a
        href={href}
        className="underline underline-offset-4 hover:text-foreground"
      >
        {link}
      </a>
      {after}
    </>
  )
}
