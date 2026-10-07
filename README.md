# fastsmc_app_static

A static site re-write of the ukancestrymap.github.io app.

The site visualises genetic relatedness between UK postcode areas, measured as identity-by-descent sharing in the UK Biobank cohort.
All of its data is precomputed and bundled, so there is no backend.

## Requirements

Node 24, which is pinned in `.nvmrc`.
Run `nvm use` in this directory to select it.

## Getting started

```bash
nvm use
npm ci
npm run dev
```

## Commands

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the development server with hot reload |
| `npm run build`        | Type-check and build into `dist/`            |
| `npm run preview`      | Serve the built site locally                 |
| `npm run typecheck`    | Type-check without building                  |
| `npm run lint`         | Run ESLint                                   |
| `npm run format`       | Format with Prettier                         |
| `npm run format:check` | Check formatting without writing             |
| `npm test`             | Run the unit tests once                      |
| `npm run test:watch`   | Run the unit tests on change                 |

## Data

`data/` holds the source data and `src/data/` holds the generated files the app loads.
See `data/PROVENANCE.md` for sources, licences and the required attribution.

The generated files are committed, so building the site does not require Python.
They only need regenerating if the source data changes:

```bash
uv run scripts/build_data.py
```

## Licence

GPL-3.0, see `LICENSE`.
The bundled data carries its own licences and attribution requirements, recorded in `data/PROVENANCE.md`.
