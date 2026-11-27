#!/usr/bin/env node
/* DOPPEL build: inline all JS modules + CSS into a single self-contained HTML. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');

const JS = [
  '01-core.js', '02-catalog.js', '03-generate.js', '04-agent.js',
  '05-ui.js', '06-editor.js', '07-playground.js', '08-views.js',
  '09-live.js', '10-app.js',
];

const css = readFileSync(join(srcDir, 'styles.css'), 'utf8');
let js = '';
for (const f of JS) {
  const code = readFileSync(join(srcDir, f), 'utf8');
  js += `\n/* ================= ${f} ================= */\n${code}\n`;
}

js = js.replace(/<\/script>/gi, '<\\/script>');

const tpl = readFileSync(join(root, 'index.template.html'), 'utf8').replace(/<!--[\s\S]*?-->\s*/g, '');
let out = tpl.replace('<style>\n/*__CSS__*/\n</style>', `<style>\n${css}\n</style>`);
if (out === tpl) {
  out = readFileSync(join(root, 'index.template.html'), 'utf8').replace('/*__CSS__*/', css);
}
out = out.replace('/*__JS__*/', () => js);

const target = join(root, 'doppel.html');
writeFileSync(target, out, 'utf8');
console.log('built', (out.length / 1024).toFixed(0) + ' KB', '→', target);
