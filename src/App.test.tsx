import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import App from './App'

it('shows the app title', async () => {
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('heading', { name: 'UK Ancestry Map' }))
    .toBeVisible()
})
