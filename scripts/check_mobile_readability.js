#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const targetArg = process.argv[2] || 'games/_template';
const target = path.resolve(process.cwd(), targetArg);
const results = [];

function add(id, ok, detail, severity = 'error') {
  results.push({ id, ok, severity, detail });
}
function read(relative) {
  const p = path.join(target, relative);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(`Mobile check target is not a directory: ${targetArg}`);
  process.exit(2);
}

const html = read('index.html');
const cssCandidates = [
  'src/styles.css',
  'styles.css'
].map(read).filter(Boolean);
const css = cssCandidates.join('\n');

add('viewport-meta', /<meta\s+name=["']viewport["'][^>]*width=device-width/i.test(html), 'index.html declares a responsive viewport.');
add('touch-target', /min-height\s*:\s*(4[4-9]|[5-9]\d|\d{3,})px/i.test(css), 'CSS contains a minimum touch target of at least 44px.');
add('responsive-width', /(width\s*:\s*min\(|max-width\s*:|width\s*:\s*100%)/i.test(css), 'CSS contains a responsive width/max-width rule.');
add('small-screen-media', /@media\s*\([^)]*(max-width|max-inline-size)/i.test(css), 'CSS includes a small-screen media query.', 'warning');
add('focus-visible', /:focus-visible/i.test(css), 'CSS includes visible keyboard focus styling.', 'warning');
add('reduced-motion', /prefers-reduced-motion/i.test(css), 'CSS respects reduced-motion preference.', 'warning');
add('safe-area', /safe-area-inset/i.test(css), 'CSS accounts for phone safe areas.', 'warning');
add('readable-line-length', /(max-width\s*:\s*(6\d{2}|7\d{2})px|width\s*:\s*min\([^,]+,\s*100%\))/i.test(css), 'Primary content width is bounded for readable line length.', 'warning');

const errors = results.filter(r => !r.ok && r.severity === 'error');
const warnings = results.filter(r => !r.ok && r.severity === 'warning');

console.log(`PixelForge mobile readability check: ${targetArg}`);
for (const r of results) {
  const mark = r.ok ? 'PASS' : (r.severity === 'warning' ? 'WARN' : 'FAIL');
  console.log(`${mark.padEnd(4)}  ${r.id} — ${r.detail}`);
}

const receiptDir = path.resolve(process.cwd(), 'exports', 'qa');
fs.mkdirSync(receiptDir, { recursive: true });
const slug = path.basename(target);
const receiptPath = path.join(receiptDir, `${slug}.mobile-readability.v5.4.json`);
const receipt = {
  schema: 'pixelforge.mobile-readability.v5.4',
  target: path.relative(process.cwd(), target) || '.',
  checked_at: new Date().toISOString(),
  passed: errors.length === 0,
  error_count: errors.length,
  warning_count: warnings.length,
  checks: results
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`Receipt: ${path.relative(process.cwd(), receiptPath)}`);

if (errors.length) process.exit(1);
