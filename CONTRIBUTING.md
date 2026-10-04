# Contributing to TryOnIt

Thanks for helping make virtual try-on free and private for everyone.

## Setup

```bash
pnpm install
pnpm setup:examples   # build packages, fetch models, generate sample assets
pnpm dev              # playground at http://localhost:5173
```

See [docs/LOCAL_TESTING.md](./docs/LOCAL_TESTING.md) for phone testing over HTTPS and every example app.

## Before you open a pull request

```bash
pnpm verify   # lint, typecheck, test, build, size
pnpm e2e      # optional locally, runs in CI
```

## Project rules

- **Layers**: core (pure TypeScript, no DOM) -> web (browser) -> react. A layer may only import from lower layers. ESLint enforces it.
- **No new runtime dependencies** in published packages without discussion. State management, validation, icons and styling are custom on purpose.
- **TypeScript strict**, no `any`, no `@ts-ignore`.
- **Per frame data never goes into the store.**
- **Writing style**: no em dashes or en dashes in docs, comments or UI strings (`pnpm lint` checks). Use commas, colons or periods.
- **Tests**: core changes need unit tests (coverage stays at or above 85 percent). UI changes need component tests.
- **Bundle budgets**: `pnpm size` must pass. Load new heavy code with dynamic `import()`.

## Adding an asset type

Follow the 6 steps in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#adding-a-new-asset-type-in-6-steps) and open an issue with the `new_asset_type` template first.

## Commit and release

Maintainers handle versioning, tags and npm publishing. Please do not bump versions in pull requests. Add a line to `CHANGELOG.md` under "Unreleased".
