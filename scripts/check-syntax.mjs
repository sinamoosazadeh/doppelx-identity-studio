#!/usr/bin/env node
/** Run Node's parser over every first-party JavaScript module. */
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['.git', 'node_modules', 'build', 'dist', 'coverage']);
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) walk(file);
    else if (stat.isFile() && /\.(?:js|mjs)$/.test(name)) files.push(file);
  }
}

walk(path.join(root, 'android'));
walk(path.join(root, 'web'));
walk(path.join(root, 'scripts'));

let failures = 0;
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status === 0) continue;
  failures += 1;
  process.stderr.write(`\n✗ ${path.relative(root, file)}\n${result.stderr || result.stdout}`);
}
if (failures) process.exit(1);
console.log(`✓ JavaScript syntax: ${files.length} files`);
