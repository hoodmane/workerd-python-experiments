// register-hooks.js
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const __filename = new URL('', import.meta.url).pathname;
register('./hooks.mjs', pathToFileURL(__filename));
