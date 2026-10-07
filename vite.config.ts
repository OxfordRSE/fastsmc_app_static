import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Set in CI from actions/configure-pages, e.g. '/fastsmc_app_static'; unset locally.
  base: `${process.env.BASE_PATH ?? ''}/`,
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
