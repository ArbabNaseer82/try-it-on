# Contributing to TryOnIt

Thanks for helping improve TryOnIt. This guide explains how to set up the repo, how to name your branch and commits, and the one extra file every package change needs (a **changeset**), so your fix ends up in a proper npm release.

## Quick start

Requirements: Node.js 22 or newer, and pnpm (the exact version is pinned in `package.json` under `packageManager`).

```bash
corepack enable
git clone https://github.com/ArbabNaseer82/try-it-on.git
cd try-it-on
pnpm install
pnpm verify          # lint, build, typecheck, test, bundle size
```

To see your changes in a browser:

```bash
pnpm setup:examples  # builds the packages, downloads the MediaPipe models, generates sample assets
pnpm dev             # playground at http://localhost:5173
```

[docs/LOCAL_TESTING.md](./docs/LOCAL_TESTING.md) covers every example app and testing on a phone over HTTPS.

Useful commands:

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `pnpm verify`         | Runs every check. Must pass before you open a PR        |
| `pnpm format`         | Formats all files with Prettier                         |
| `pnpm setup:examples` | Downloads models and sample assets for the example apps |
| `pnpm dev`            | Starts the playground                                   |
| `pnpm e2e`            | Runs the browser end to end tests                       |
| `pnpm changeset`      | Creates a changeset file (see below)                    |

## Repository layout

| Folder                                  | Published to npm?            | Needs a changeset when changed? |
| --------------------------------------- | ---------------------------- | ------------------------------- |
| `packages/core`                         | Yes, `@tryonit/core`         | Yes                             |
| `packages/web`                          | Yes, `@tryonit/web`          | Yes                             |
| `packages/react`                        | Yes, `@tryonit/react`        | Yes                             |
| `packages/react-native`                 | Yes, `@tryonit/react-native` | Yes                             |
| `examples/*`                            | No (private)                 | No                              |
| `docs/`, `scripts/`, `e2e/`, `.github/` | No                           | No                              |

## Project rules

- **Layers**: core (pure TypeScript, no DOM) -> web (browser) -> react and react-native. A layer may only import from lower layers. ESLint enforces it.
- **No new runtime dependencies** in published packages without discussing it in an issue first. State management, validation, icons and styling are custom on purpose.
- **TypeScript strict**: no `any`, no `@ts-ignore`.
- **Per frame data never goes into the store.**
- **Tests**: core changes need unit tests (coverage stays at or above 85 percent). UI changes need component tests.
- **Bundle budgets**: `pnpm size` must pass. Load new heavy code with dynamic `import()`.
- **Writing style**: no em dashes or en dashes in docs, comments or UI strings (`pnpm lint` checks). Use commas, colons or periods.

To add a new product type, follow [Adding a new asset type in 6 steps](./docs/ARCHITECTURE.md#adding-a-new-asset-type-in-6-steps) and open an issue with the `new_asset_type` template first.

## The workflow at a glance

1. **Open an issue first** for new features or big changes, so we can agree on the approach before you write code. Small bug fixes can go straight to a PR.
2. **Create a branch** with the naming rules below.
3. **Make your change** and add or update tests.
4. **Add a changeset** if you touched anything inside `packages/`.
5. **Commit** with the commit message rules below.
6. **Open a pull request.** CI must be green.
7. **The maintainer reviews and merges.** Releases to npm then happen automatically.

## 1. Branch names

Format: `type/short-description` in lowercase, words joined with hyphens.

| Type       | Use it for                          | Example branch                |
| ---------- | ----------------------------------- | ----------------------------- |
| `fix`      | A bug fix                           | `fix/glasses-tilt-offset`     |
| `feat`     | A new feature                       | `feat/necklace-asset-type`    |
| `perf`     | A performance improvement           | `perf/skip-idle-frames`       |
| `refactor` | Code change with no behavior change | `refactor/split-face-anchors` |
| `docs`     | Documentation only                  | `docs/theming-examples`       |
| `test`     | Tests only                          | `test/hand-anchor-fixtures`   |
| `chore`    | Tooling, dependencies, housekeeping | `chore/update-tsdown`         |
| `ci`       | GitHub Actions and workflows        | `ci/cache-playwright`         |

## 2. Commit messages and PR titles

We use [Conventional Commits](https://www.conventionalcommits.org). Format:

```
type(scope): short summary in present tense
```

- **type**: same list as branch types above.
- **scope**: the area you changed: `core`, `web`, `react`, `react-native`, `examples`, `docs`, `ci`, or `deps`.
- **summary**: what the change does, starting with a lowercase verb, no period at the end, under 72 characters.

Good examples:

```
fix(web): keep glasses aligned when the head tilts
feat(core): add necklace asset type
perf(web): skip detection on frames with no movement
docs(react): add headless hook example
```

Bad examples, and why:

```
fixed stuff                 (no type, no scope, says nothing)
fix: Bug                    (which bug? where?)
feat(web): Added new things and also fixed the camera and updated docs.
                            (several changes in one, past tense, too long)
```

PRs are squash merged, so your **PR title becomes the final commit message** on `main`. Write the PR title with the same rules.

## 3. Changesets: the one extra file

### What is it?

A changeset is a small Markdown file inside the `.changeset/` folder. It tells the release bot three things:

1. **Which package** changed
2. **How big** the change is (patch, minor, or major)
3. **What changed**, in one or two sentences that go straight into the package `CHANGELOG.md` and the GitHub release notes

### When do I need one?

| You changed                                               | Changeset needed? |
| --------------------------------------------------------- | ----------------- |
| Code inside any `packages/*/src`                          | **Yes**           |
| A package `package.json` (dependencies, exports)          | **Yes**           |
| Package CSS, types, or the runtime it ships               | **Yes**           |
| Only tests inside a package                               | No                |
| Only `examples/`, `docs/`, `scripts/`, `e2e/`, `.github/` | No                |
| Only a README                                             | No                |

If you are unsure, add one. The maintainer will tell you if it is not needed.

### How to create one

```bash
pnpm changeset
```

The tool asks three questions:

1. **Which packages changed?** Use the arrow keys and Space to select, Enter to confirm. Pick only the packages whose code you edited. Packages that depend on them (for example `web`, `react` and `react-native` depend on `core`) are bumped automatically.
2. **Major bump? Minor bump?** Press Enter to skip each one if your change is a patch.
3. **Summary.** One or two sentences. See the writing rules below.

### File name

The tool creates a file with a random name such as `.changeset/brave-lions-dance.md`. That works fine. To make the folder easier to read, you may rename it to describe the change, using lowercase words with hyphens:

```
.changeset/fix-glasses-tilt-offset.md
.changeset/feat-necklace-asset-type.md
```

A good habit is to reuse your branch name, replacing the slash with a hyphen.

### Choosing patch, minor, or major

| Bump      | Version change                | Use it when                                                             | Examples                                                                                                  |
| --------- | ----------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **patch** | 0.1.0 to 0.1.1                | You fixed a bug or improved something internally. Users change nothing. | Fix lipstick bleeding onto teeth. Reduce CPU usage on low end phones. Fix wrong TypeScript type.          |
| **minor** | 0.1.0 to 0.2.0                | You added something new. Existing code keeps working.                   | New asset type. New prop or option. New hook or component. New theme token.                               |
| **major** | 0.x to 1.0.0, or 1.x to 2.0.0 | Existing user code breaks or behaves differently after updating.        | Renamed or removed a prop. Changed a default value. Changed the manifest format. Dropped a React version. |

**While the project is on `0.x`:** breaking changes are released as **minor**, not major. Mark them clearly in the summary with the word `BREAKING:` and explain how to migrate.

### Writing the summary

The summary is written for **people using the package**, not for people reading the code. A user should understand what changed and whether they need to do anything.

Rules:

1. Start with a verb in the present tense: `Fix`, `Add`, `Improve`, `Remove`, `Change`.
2. Say **what** changed and **where** the user notices it.
3. For new features, show the new API name.
4. For breaking changes, start with `BREAKING:` and give the migration steps.
5. Do not mention internal file names, variable names, or "refactored X" unless it affects users.

Good versus bad:

| Bad                       | Good                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fix bug`                 | `Fix glasses sliding down the nose when the head tilts sideways.`                                    |
| `updated face-anchors.ts` | `Improve face anchor accuracy so hats sit correctly on the forehead.`                                |
| `new prop`                | `Add the mirror prop to TryOnView so apps can disable front camera mirroring.`                       |
| `changed api`             | `BREAKING: Rename the assetUrl prop to asset. Replace assetUrl="..." with asset="..." in your code.` |

### Example changeset files

**Patch (bug fix):** `.changeset/fix-glasses-tilt-offset.md`

```md
---
'@tryonit/web': patch
---

Fix glasses sliding down the nose when the head tilts sideways.
```

**Minor (new feature):** `.changeset/feat-necklace-asset-type.md`

```md
---
'@tryonit/core': minor
'@tryonit/web': minor
---

Add the `necklace` asset type. Necklaces anchor to the neck using pose tracking. See docs/CREATING_PRODUCTS.md for the manifest fields.
```

**Breaking change while on 0.x:** `.changeset/change-asset-prop-name.md`

```md
---
'@tryonit/react': minor
---

BREAKING: Rename the `assetUrl` prop to `asset` on `TryOnButton` and `TryOn`. The new prop also accepts a manifest object or an async function.

Migration: replace `assetUrl="/x.json"` with `asset="/x.json"`.
```

**One PR, two separate changes:** run `pnpm changeset` twice. Each change gets its own file and its own CHANGELOG line.

## 4. Full example from start to finish

You found that lipstick color bleeds onto the teeth:

```bash
git checkout main && git pull
git checkout -b fix/lipstick-teeth-bleed

# edit packages/web/src/renderers/makeup-renderer.ts
# add a test in packages/web/test/

pnpm changeset
#   select: @tryonit/web
#   bump:   patch
#   summary: Fix lipstick color bleeding onto the teeth when the mouth is open.

mv .changeset/<random-name>.md .changeset/fix-lipstick-teeth-bleed.md   # optional

pnpm format
pnpm verify

git add -A
git commit -m "fix(web): stop lipstick bleeding onto teeth"
git push -u origin fix/lipstick-teeth-bleed
```

Then open a PR titled `fix(web): stop lipstick bleeding onto teeth`.

## 5. Pull request checklist

Before you request a review, confirm:

- [ ] Branch name follows `type/short-description`
- [ ] PR title follows `type(scope): summary`
- [ ] A changeset is included if anything inside `packages/` changed
- [ ] The changeset summary is written for users and uses the right bump
- [ ] Tests added or updated for the change
- [ ] `pnpm verify` passes locally
- [ ] No em dashes or en dashes in docs or user facing text (CI checks this)

## 6. How releases happen (maintainer notes)

Contributors never publish to npm. The flow is fully automated:

1. A PR with a changeset is merged into `main`.
2. The **Release** workflow opens (or updates) a PR called **"chore: version packages"**. It contains the new version numbers and the updated `CHANGELOG.md` files. Changesets from several PRs are collected into this one PR.
3. When the maintainer merges that PR, the workflow publishes the changed packages to npm using npm trusted publishing (no tokens) with provenance, and creates GitHub releases.

Rules for maintainers:

- Never run `npm publish` or `pnpm publish` by hand for a normal release.
- CI checks do not run on the "version packages" PR because a bot created it. This is expected. The release workflow runs `pnpm verify` again before publishing.
- If a release goes wrong, do not unpublish. Fix forward with a new patch changeset.

## Questions

Open an issue or start a discussion on GitHub. For security problems, follow [SECURITY.md](./SECURITY.md) and do not open a public issue.
