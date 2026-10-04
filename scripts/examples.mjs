// Shared list of example apps that receive models, wasm and sample assets.
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const root = fileURLToPath(new URL('..', import.meta.url));
export const EXAMPLES = ['playground', 'nextjs-app', 'remix-app', 'vanilla-html'];
export const publicDir = (example) => join(root, 'examples', example, 'public');
