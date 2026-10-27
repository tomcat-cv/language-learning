import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const expected = (await readFile(new URL('.nvmrc', root), 'utf8')).trim();
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert.equal(pkg.engines.node, expected, 'package.json engines.node must match .nvmrc');
assert.equal(process.versions.node, expected,
  `Expected Node.js ${expected}, found ${process.versions.node}. Run nvm install && nvm use.`);
console.log(`Node.js ${expected}: environment check passed`);
