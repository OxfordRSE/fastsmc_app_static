import { afterEach, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import { ShareLink } from './ShareLink'

const link = 'https://example.org/map/?postcode=B'

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderLink() {
  const screen = await render(
    <>
      <label htmlFor="share">{en.controls.shareLink}</label>
      <ShareLink id="share" link={link} />
    </>,
  )
  const field = screen.getByRole('textbox', { name: en.controls.shareLink })
  const button = screen.getByRole('button', { name: en.controls.copyLink })
  return { screen, field, button }
}

it('shows the link, read-only', async () => {
  const { field } = await renderLink()
  await expect.element(field).toHaveValue(link)
  await expect.element(field).toHaveAttribute('readonly')
})

it('copies the link and says so', async () => {
  const writeText = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockResolvedValue(undefined)
  const { screen, button } = await renderLink()
  await button.click()
  expect(writeText).toHaveBeenCalledWith(link)
  await expect
    .element(screen.getByRole('status'))
    .toHaveTextContent(en.controls.linkCopied)
})

it('selects the link to copy by hand if the clipboard is refused', async () => {
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
    new DOMException('Denied', 'NotAllowedError'),
  )
  const { field, button } = await renderLink()
  await button.click()
  await expect.element(field).toHaveFocus()
  await expect
    .poll(() => {
      const input = field.element()
      return input instanceof HTMLInputElement
        ? input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0)
        : ''
    })
    .toBe(link)
  await expect
    .element(page.getByText(en.controls.linkCopied))
    .not.toBeInTheDocument()
})
