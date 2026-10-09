# fastsmc_app_static

A static site re-write of the ukancestrymap.github.io app.

The site visualises genetic relatedness between UK postcode areas, measured as identity-by-descent sharing in the UK Biobank cohort.
All of its data is precomputed and bundled, so there is no backend.

## Requirements

Node 24, which is pinned in `.nvmrc`.
Run `nvm use` in this directory to select it.

Regenerating the data additionally needs [uv](https://docs.astral.sh/uv/) 0.12.23 or newer.
uv installs the pinned Python, 3.14.8 from `.python-version`, automatically.

## Getting started

```bash
nvm use
npm ci
npm run dev
```

The component tests, the smoke test and the accessibility checks run in Chromium, which Playwright downloads separately.
Install it once, and again after Playwright is upgraded:

```bash
npx playwright install chromium
```

## Commands

| Command                      | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                | Start the development server with hot reload                       |
| `npm run build`              | Type-check and build into `dist/`                                  |
| `npm run preview`            | Serve the built site locally                                       |
| `npm run typecheck`          | Type-check without building                                        |
| `npm run lint`               | Run ESLint                                                         |
| `npm run format`             | Format with Prettier                                               |
| `npm run format:check`       | Check formatting without writing                                   |
| `npm test`                   | Run the unit and component tests once                              |
| `npm run test:watch`         | Run the unit and component tests on change                         |
| `npm run test:smoke`         | Build the site and smoke-test it in Chromium                       |
| `npm run test:accessibility` | Build the site and check it for accessibility problems (see below) |

## Accessibility

The site aims to meet [WCAG 2.2](https://www.w3.org/TR/WCAG22/) at level AA.
Three kinds of check cover it, and the Test and Deploy workflows run the first two on every change.

- **Automated rules.**
  `npm run test:accessibility` (`e2e/accessibility.spec.ts`) scans the built site with [axe-core](https://github.com/dequelabs/axe-core), in Chromium.
  It applies every axe-core rule tagged for WCAG 2.0, 2.1 and 2.2 at levels A and AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`), such as colour contrast, names for buttons and form fields, valid ARIA, and scrolling regions that the keyboard can reach.
  It scans six states: the page as it opens, the map in keyboard use while zoomed in, the advanced settings, and each of the three dialogs.
  Rules that are best practice rather than WCAG requirements are not applied.
- **Behaviour, in the component tests.**
  `npm test` checks what a rule scanner cannot, for example: that the map works by keyboard (arrow keys, typing a code or name, Enter and Escape) and by touch (a tap inspects, a second tap selects); that it is a list box of areas, each named with its value; that zooming has button and keyboard alternatives to pinching and dragging; and that the selected and inspected outlines keep enough contrast against every map colour.
- **A person.**
  Automated checks find perhaps a third of accessibility problems.
  The rest need someone to try the site with a screen reader (NVDA or VoiceOver), with the keyboard alone, and on a touch screen, after any change to how it is used.

## Data

`data/` holds the source data and `src/data/` holds the generated files the app loads.
See `data/PROVENANCE.md` for sources, licences and the required attribution.

The generated files are committed, so building the site does not require Python.
They only need regenerating if the source data changes:

```bash
uv run scripts/build_data.py
```

To confirm the committed files match their sources without writing anything:

```bash
uv run scripts/build_data.py --check
```

It exits non-zero if any file is missing, out of date or unexpected.

The script's dependencies are declared at its top and pinned exactly in `scripts/build_data.py.lock`, so regenerating always uses the same numpy.
After changing the declared dependencies, or to deliberately upgrade them, refresh the lock:

```bash
uv lock --script scripts/build_data.py            # after editing the declared dependencies
uv lock --script scripts/build_data.py --upgrade  # to move to the newest allowed versions
```

## UI components

The interface uses [shadcn/ui](https://ui.shadcn.com/) components, built on Base UI and styled with Tailwind CSS.
Their source is copied into `src/components/ui/` by the shadcn CLI and is ours to keep.
That folder is exempt from the strict ESLint rules, the TSDoc rules and Prettier, so it stays as the CLI wrote it.
It still must not contain user-visible text, which belongs in `src/content/en.ts`.

To add a component, run the CLI at the version recorded in the header of `src/components/ui/shadcn.css`:

```bash
npx shadcn@4.21.4 add slider
```

Review the diff before committing.
The CLI may try to add `shadcn` as a dependency or add `@import "shadcn/tailwind.css"` to `src/index.css`; revert both, since that stylesheet is vendored as described below.

### Charts

The top-10 chart is drawn by hand as SVG, with d3-scale computing its layout and axis ticks, in the same way as the map.
For one small chart this avoids a large dependency.
If more charts are added later, adopt [Recharts](https://recharts.github.io/) instead: it is the most widely used React charting library, and shadcn/ui's chart component builds on it.

### Upgrading the vendored stylesheet

shadcn ships a stylesheet that its components rely on, inside the CLI package.
Rather than depend on the whole CLI, it is copied to `src/components/ui/shadcn.css`, below a header recording its version and MIT licence.
To upgrade it to a newer shadcn version, extract the file from that version's package:

```bash
cd "$(mktemp -d)"
npm pack shadcn@<version>
tar -xzf shadcn-<version>.tgz package/dist/tailwind.css package/LICENSE.md
```

Then replace everything below the header of `src/components/ui/shadcn.css` with `package/dist/tailwind.css`.
Update the version in the header, and the licence text if `package/LICENSE.md` has changed.
Use the same version when adding components afterwards, and run all the checks before committing.

## Licence

GPL-3.0, see `LICENSE`.
The bundled data carries its own licences and attribution requirements, recorded in `data/PROVENANCE.md`.
