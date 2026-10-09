// Draws public/favicon.svg: the map as the app shows it with Oxford (OX)
// selected, in the light theme's colours, and the dark theme's where the
// browser is dark. Run it after changing the map's data or colours:
//
//   npm run favicon
//
// It starts the development server and reads the map from the app itself, so
// the icon always matches what the app draws.

import { writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const output = new URL('../public/favicon.svg', import.meta.url)
// The icon's size in units: rounded to whole units, the map keeps four times
// the detail a 16 px icon can show.
const size = 64

// The map's areas and Oxford's outline, as the app draws them in one theme.
async function readMap(browser, url, colorScheme) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme,
  })
  const page = await context.newPage()
  await page.goto(url)
  await page.waitForFunction(() =>
    document.querySelector('path[data-code]')?.getAttribute('d'),
  )
  const map = await page.evaluate(() => {
    const svg = document.querySelector('svg[role="listbox"]')
    const hatch = svg.querySelector('[data-no-data-pattern] rect')
    const fillOf = (path) => {
      const fill = path.getAttribute('fill')
      // The hatch pattern is too fine for an icon: use its grey alone.
      return fill.startsWith('url(') ? hatch.getAttribute('fill') : fill
    }
    const box = svg.querySelector(':scope > g').getBBox()
    return {
      areas: [...svg.querySelectorAll('path[data-code]')].map((path) => ({
        code: path.dataset.code,
        d: path.getAttribute('d'),
        fill: fillOf(path),
      })),
      selected: svg
        .querySelector('[data-outline="selected"]')
        .getAttribute('d'),
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
    }
  })
  await context.close()
  return map
}

// rgb(r, g, b) or a hex colour, as #rrggbb.
function hex(colour) {
  const rgb = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(colour)
  if (!rgb) return colour
  return `#${rgb
    .slice(1)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

// A path moved and scaled into the icon's square, rounded to whole units,
// without the points that rounding repeats.
function compact(d, { x, y, scale }) {
  let out = ''
  let last = ''
  for (const [, command, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (command === 'Z') {
      out += 'Z'
      last = ''
      continue
    }
    const [px = 0, py = 0] = args.split(',').map(Number)
    const point = `${String(Math.round((px - x) * scale))},${String(Math.round((py - y) * scale))}`
    if (command === 'L' && point === last) continue
    out += command + point
    last = point
  }
  return out
}

const server = await createServer({ server: { port: 0 }, logLevel: 'error' })
await server.listen()
const url = `${server.resolvedUrls.local[0]}?postcode=OX`
const browser = await chromium.launch()
try {
  const light = await readMap(browser, url, 'light')
  const dark = await readMap(browser, url, 'dark')
  const darkFill = new Map(dark.areas.map(({ code, fill }) => [code, fill]))

  // The map, scaled so its longer side fills the icon less a small margin,
  // and centred in it.
  const { x, y, width, height } = light.box
  const margin = size * 0.02
  const scale = (size - 2 * margin) / Math.max(width, height)
  const place = {
    x: x - (size / scale - width) / 2,
    y: y - (size / scale - height) / 2,
    scale,
  }
  const viewBox = `0 0 ${String(size)} ${String(size)}`
  const outline = size / 24
  const areas = light.areas.map(({ code, d, fill }) => ({
    d: compact(d, place),
    light: hex(fill),
    dark: hex(darkFill.get(code)),
  }))

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">`,
    '<style>.a{fill:var(--l)}@media (prefers-color-scheme:dark){.a{fill:var(--d)}}</style>',
    // A grey coastline, so the map stands out from light and dark tab bars:
    // every area drawn again underneath with a stroke, by reference to save
    // repeating it, its inner half hidden by the areas drawn on top.
    `<g stroke="#8c8c8c" stroke-width="2" stroke-linejoin="round">${areas.map((_, i) => `<use href="#a${String(i)}"/>`).join('')}</g>`,
    ...areas.map(
      ({ d, light: l, dark: k }, i) =>
        `<path id="a${String(i)}" class="a" style="--l:${l};--d:${k}" d="${d}"/>`,
    ),
    // Oxford, outlined in the app's orange over a dark halo.
    `<path d="${compact(light.selected, place)}" fill="none" stroke="#000" stroke-width="${(outline * 1.8).toFixed(1)}" stroke-linejoin="round"/>`,
    `<path d="${compact(light.selected, place)}" fill="none" stroke="#e69f00" stroke-width="${outline.toFixed(1)}" stroke-linejoin="round"/>`,
    '</svg>',
    '',
  ].join('\n')
  await writeFile(output, svg)
  console.log(`Wrote ${output.pathname} (${(svg.length / 1024).toFixed(1)} kB)`)
} finally {
  await browser.close()
  await server.close()
}
