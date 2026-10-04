# Publishing to npm

This is the maintainer checklist for releasing `@tryonit/core`, `@tryonit/web`, `@tryonit/react` and `@tryonit/react-native` from the npm account [arbab-naseer](https://www.npmjs.com/~arbab-naseer).

## What gets published (and what never does)

You never upload folders by hand. Each package is published from its own folder, and its `files` list in `package.json` is a whitelist: only those paths go into the tarball.

| Folder you publish from | npm package             | Contents of the tarball                                                                                                                                  |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`         | `@tryonit/core`         | `dist/` (JS, types, source maps, `manifest.v1.schema.json`), `bin/tryonit-validate.mjs`, `README.md`, `LICENSE`, `package.json`                          |
| `packages/web`          | `@tryonit/web`          | `dist/` (JS entry plus lazy chunks, types, source maps, `tryonit-web.css`), `README.md`, `LICENSE`, `package.json`                                       |
| `packages/react`        | `@tryonit/react`        | `dist/` (JS, types, source maps, `tryonit.css`), `README.md`, `LICENSE`, `package.json`                                                                  |
| `packages/react-native` | `@tryonit/react-native` | `dist/` (JS with the embedded WebView engine, types), `app.plugin.js` and `app.plugin.d.ts` (Expo config plugin), `README.md`, `LICENSE`, `package.json` |

**Never published**, by design:

- The repository root (`package.json` has `"private": true`), so `docs/`, `scripts/`, `schema/`, `e2e/`, `.github/`, configs and the lockfile stay on GitHub only.
- Every app in `examples/` (all marked `"private": true`, including the Expo app), downloaded models and generated sample assets.
- `samples/` (served from GitHub by jsDelivr for demos, not part of any package).
- Inside each package: `src/`, `test/`, `tsconfig*.json`, `tsdown.config.ts`, `vitest.config.ts`, `coverage/` (not in `files`).

Preview the exact contents at any time:

```bash
pnpm -r --filter "./packages/*" exec pnpm pack --dry-run
```

`LICENSE` inside each package is copied from the root `LICENSE` by the package build.

## One time setup

1. **Log in** with the account that should own the packages:

   ```bash
   npm login            # opens the browser, account: arbab-naseer
   npm whoami           # must print arbab-naseer
   ```

2. **Enable two factor authentication** on npmjs.com (Account Settings > Two-Factor Authentication). Publishing then asks for a one time code.

3. **Create the `tryonit` organization** (free for public packages): <https://www.npmjs.com/org/create>, name `tryonit`, plan "Unlimited public packages". Scoped names like `@tryonit/core` can only be published by a member of that organization.

   If the name `tryonit` is already taken, pick another scope (for example `@arbab-naseer`) and replace `@tryonit/` in every `package.json`, in imports, and in the docs before publishing.

4. **Install pnpm 12** if needed: `npm install -g pnpm@12`. Always publish with pnpm (see below).

## Release steps

1. **Set the version** (all packages share one version):

   ```bash
   pnpm version:set 0.1.0     # already 0.1.0 for the first release
   ```

2. **Update `CHANGELOG.md`**: move "Unreleased" notes under the new version and date.

3. **Run every check** (lint, types, tests, build, bundle size, publint, attw, tarball preview):

   ```bash
   pnpm install
   pnpm release:check
   pnpm e2e                  # optional but recommended, needs network the first time
   ```

4. **Commit and push** (pnpm refuses to publish with uncommitted changes or from a branch other than `main`):

   ```bash
   git add -A
   git commit -m "release: v0.1.0"
   git push origin main
   ```

5. **Publish** every package in dependency order (core, web, react, react-native). Versions already on npm are skipped, so a first release of `@tryonit/react-native` next to existing 0.1.0 packages publishes only the new package:

   ```bash
   pnpm release:publish
   ```

   This runs `pnpm -r --filter "./packages/*" publish --access public`. For each package, `prepublishOnly` rebuilds it and runs `scripts/prepublish-check.mjs`, which stops the publish if a build file is missing or if you used npm instead of pnpm. Versions that are already on npm are skipped.

   Publishing one package at a time also works:

   ```bash
   cd packages/core  && pnpm publish --access public
   cd ../web         && pnpm publish --access public
   cd ../react       && pnpm publish --access public
   cd ../react-native && pnpm publish --access public
   ```

6. **Tag the release**:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

   Then create a GitHub release from the tag and paste the changelog section.

### Why pnpm and not `npm publish`

Inside the monorepo, packages depend on each other with `"@tryonit/core": "workspace:^"`. `pnpm publish` rewrites that to a real range (`^0.1.0`) in the published `package.json`. `npm publish` would upload `workspace:^` unchanged and break every install. The `prepublishOnly` guard blocks this mistake.

## After publishing

```bash
npm view @tryonit/react                       # version, dependencies, files
npm view @tryonit/react dependencies          # must show "^0.1.0", never "workspace:"
```

Quick smoke test in a new project:

```bash
npm create vite@latest tryon-smoke -- --template react-ts
cd tryon-smoke
npm install @tryonit/react three
npx -p @tryonit/core tryonit-validate --help
```

Also check:

- The README renders on <https://www.npmjs.com/package/@tryonit/react> (links point to GitHub, so the repository must be public).
- The JSON Schema loads: <https://unpkg.com/@tryonit/core/dist/manifest.v1.schema.json>.

## Next releases

| Change                            | Version bump                        |
| --------------------------------- | ----------------------------------- |
| Bug fixes only                    | patch: `0.1.0` to `0.1.1`           |
| New features, backward compatible | minor: `0.1.1` to `0.2.0`           |
| Breaking changes                  | minor while on 0.x, major after 1.0 |

Repeat the release steps. Always release all packages together with the same version so their `^` ranges stay aligned.

## Fixing a bad release

- Within 72 hours and with no dependents: `npm unpublish @tryonit/<name>@<version>` (npm forbids reusing that version number).
- Otherwise publish a fixed patch version and mark the bad one: `npm deprecate @tryonit/<name>@<version> "Broken release, use <fixed version>"`.

## Optional: provenance

To show the "Built and signed on GitHub Actions" badge, publish from a GitHub Actions workflow with `id-token: write` permission and `pnpm publish --provenance --access public`, using an npm automation token stored as a repository secret. The current CI workflow only verifies and never publishes.
