# Dependencies

Versions verified with `npm view <pkg> version` on 2026-10-03 when this project was created.

## Published runtime dependencies

| Package          | Runtime dependencies                              | Peer dependencies                             |
| ---------------- | ------------------------------------------------- | --------------------------------------------- |
| `@tryonit/core`  | none                                              | none                                          |
| `@tryonit/web`   | `@tryonit/core`, `@mediapipe/tasks-vision@^1.0.1` | `three >= 0.160.0` (optional, 3D assets only) |
| `@tryonit/react` | `@tryonit/web`, `@tryonit/core`                   | `react >= 18`, `react-dom >= 18`              |

No state, validation, styling, icon or UI libraries are shipped.

## Verified versions

| Package                                                                  | Version | Used by                                              |
| ------------------------------------------------------------------------ | ------- | ---------------------------------------------------- |
| @mediapipe/tasks-vision                                                  | 1.0.1   | web (runtime)                                        |
| three                                                                    | 0.186.1 | web (optional peer), examples, asset generator       |
| @types/three                                                             | 0.186.0 | web (dev)                                            |
| react, react-dom                                                         | 19.3.0  | react (dev and peer), examples                       |
| @types/react, @types/react-dom                                           | 19.3.0  | dev                                                  |
| typescript                                                               | 5.9.3   | all (latest 5.x as required; 7.0.2 also exists)      |
| tsdown                                                                   | 0.23.0  | library builds                                       |
| vite                                                                     | 8.3.2   | examples                                             |
| @vitejs/plugin-react                                                     | 6.1.1   | playground                                           |
| @vitejs/plugin-basic-ssl                                                 | 2.3.0   | playground (phone testing over HTTPS)                |
| vitest, @vitest/coverage-v8                                              | 5.0.3   | tests                                                |
| jsdom                                                                    | 30.1.1  | web and react tests                                  |
| @testing-library/react                                                   | 16.3.3  | react tests                                          |
| @testing-library/jest-dom                                                | 7.0.1   | react tests                                          |
| @testing-library/user-event                                              | 14.6.7  | react tests                                          |
| @playwright/test                                                         | 1.63.0  | end to end test                                      |
| eslint                                                                   | 10.12.0 | lint                                                 |
| @eslint/js                                                               | 10.0.1  | lint                                                 |
| typescript-eslint                                                        | 8.71.0  | lint                                                 |
| eslint-plugin-react-hooks                                                | 7.1.1   | lint                                                 |
| globals                                                                  | 17.13.0 | lint                                                 |
| prettier                                                                 | 3.9.9   | format                                               |
| size-limit, @size-limit/preset-small-lib                                 | 14.1.0  | bundle budgets                                       |
| publint                                                                  | 0.3.25  | package checks                                       |
| @arethetypeswrong/cli                                                    | 0.18.5  | package checks                                       |
| next                                                                     | 16.3.8  | nextjs-app example                                   |
| react-router, @react-router/dev, @react-router/node, @react-router/serve | 7.18.4  | remix-app example (v7 framework mode; v8.4.0 exists) |
| isbot                                                                    | 5.2.2   | remix-app example                                    |
| @types/node                                                              | 26.6.4  | dev                                                  |
| pnpm                                                                     | 12.8.1  | package manager                                      |

## Notes

- TypeScript 7 (the native compiler) was available, but the build prompt requires TypeScript 5.x, so 5.9.3 is pinned.
- React Router 8 was available, but the example targets React Router v7 framework mode (the Remix successor) as required.
- The MediaPipe wasm default URL is pinned to `MEDIAPIPE_VERSION` in `packages/web/src/config.ts`. A unit test fails if it drifts from the installed package.
