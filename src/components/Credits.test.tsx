import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { en } from '../content/en'
import { dataUrl } from '../content/links'
import { Credits } from './Credits'

it.each([en.credits.copyright, en.credits.developers])(
  'shows "%s"',
  async (text) => {
    const screen = await render(<Credits />)
    await expect.element(screen.getByText(text, { exact: true })).toBeVisible()
  },
)

it('links to the dataset by its DOI, within its sentence', async () => {
  const screen = await render(<Credits />)
  const link = screen.getByRole('link', { name: en.credits.dataLink })
  await expect.element(link).toHaveAttribute('href', dataUrl)
  expect(link.element().parentElement?.textContent).toBe(
    en.credits.data.replace('{link}', en.credits.dataLink),
  )
})

it.each(en.credits.map)('shows the map attribution "%s"', async (line) => {
  const screen = await render(<Credits />)
  await expect.element(screen.getByText(line, { exact: true })).toBeVisible()
})
