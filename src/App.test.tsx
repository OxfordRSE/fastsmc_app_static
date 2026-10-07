import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import App from './App'
import { en } from './content/en'

it('shows the app title', async () => {
  const screen = await render(<App />)
  await expect
    .element(screen.getByRole('heading', { name: en.appTitle }))
    .toBeVisible()
})
