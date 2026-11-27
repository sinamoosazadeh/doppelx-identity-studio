#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const assets = join(root, 'app', 'assets');

let html = readFileSync(join(assets, 'index.html'), 'utf8');
const css = readFileSync(join(assets, 'css', 'styles.css'), 'utf8');

html = html.replace('<link rel="stylesheet" href="css/styles.css">', `<style>\n${css}\n</style>`);

const scripts = [
  'js/catalog.js', 'js/engine.js', 'js/spoof.js', 'js/spoof-src.js',
  'js/exporters.js', 'js/zip.js', 'js/store.js', 'js/ui.js',
  'js/screens.js', 'js/screens2.js', 'js/app.js',
];
for (const s of scripts) {
  const code = readFileSync(join(assets, s), 'utf8').replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(`<script src="${s}"></script>`, `<script>\n${code}\n</script>`);
}

const outputDir = join(root, 'dist');
const output = join(outputDir, 'doppelx-preview.html');
mkdirSync(outputDir, { recursive: true });
writeFileSync(output, html, 'utf8');
console.log('Built preview:', (html.length / 1024).toFixed(1), 'KB -> ' + output);
