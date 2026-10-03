#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { spawn } from 'node:child_process';

const [targetArg = '.', outputArg = 'exports/screenshots/pixelforge.png', ...rest] = process.argv.slice(2);
const width = Number((rest.find(v => v.startsWith('--width=')) || '').split('=')[1]) || 1440;
const height = Number((rest.find(v => v.startsWith('--height=')) || '').split('=')[1]) || 900;

function candidateBrowsers() {
  const env = process.env.CHROME_PATH ? [process.env.CHROME_PATH] : [];
  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    return [...env, ...roots.flatMap(root => [
      path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ])];
  }
  if (process.platform === 'darwin') {
    return [...env,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'];
  }
  return [...env, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
}

const browser = candidateBrowsers().find(p => p && fs.existsSync(p));
if (!browser) {
  console.error('Chrome/Chromium/Edge not found. Set CHROME_PATH to the browser executable.');
  process.exit(2);
}

const output = path.resolve(process.cwd(), outputArg);
fs.mkdirSync(path.dirname(output), { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

function serveDirectory(dir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const raw = decodeURIComponent((req.url || '/').split('?')[0]);
        const relative = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
        const file = path.resolve(dir, relative);
        if (!file.startsWith(path.resolve(dir) + path.sep) && file !== path.resolve(dir, 'index.html')) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        const finalFile = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
        if (!fs.existsSync(finalFile) || !fs.statSync(finalFile).isFile()) {
          res.writeHead(404); res.end('Not found'); return;
        }
        res.writeHead(200, { 'Content-Type': mime[path.extname(finalFile).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(finalFile).pipe(res);
      } catch (error) {
        res.writeHead(500); res.end(error.message);
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function runBrowser(url) {
  return new Promise((resolve, reject) => {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pixelforge-shot-'));
    const args = [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${profile}`, `--window-size=${width},${height}`, `--screenshot=${output}`, url
    ];
    if (process.platform !== 'win32') args.unshift('--no-sandbox');
    const child = spawn(browser, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      fs.rmSync(profile, { recursive: true, force: true });
      reject(new Error('Browser capture timed out after 20 seconds. Set CHROME_PATH to a working Chrome/Edge executable or capture manually.'));
    }, 20_000);
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', error => {
      if (settled) return;
      settled = true; clearTimeout(timer); fs.rmSync(profile, { recursive: true, force: true }); reject(error);
    });
    child.on('close', code => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      fs.rmSync(profile, { recursive: true, force: true });
      if (code === 0 && fs.existsSync(output)) resolve();
      else reject(new Error(stderr || `Browser exited with code ${code}`));
    });
  });
}

let server = null;
try {
  let url;
  if (/^https?:\/\//i.test(targetArg)) {
    url = targetArg;
  } else {
    let target = path.resolve(process.cwd(), targetArg);
    if (!fs.existsSync(target)) throw new Error(`Target not found: ${targetArg}`);
    if (fs.statSync(target).isFile()) target = path.dirname(target);

    // Vite source folders need a build before they can be served statically.
    if (fs.existsSync(path.join(target, 'src')) && fs.existsSync(path.join(target, 'package.json')) && !fs.existsSync(path.join(target, 'dist', 'index.html')) && target !== process.cwd()) {
      throw new Error(`No built cartridge found at ${path.relative(process.cwd(), target)}. Run npm install && npm run build inside that cartridge, then capture its dist folder.`);
    }
    if (fs.existsSync(path.join(target, 'dist', 'index.html'))) target = path.join(target, 'dist');
    if (!fs.existsSync(path.join(target, 'index.html'))) throw new Error(`No index.html found in ${target}`);

    server = await serveDirectory(target);
    const address = server.address();
    url = `http://127.0.0.1:${address.port}/`;
  }

  await runBrowser(url);
  console.log(`Screenshot saved: ${path.relative(process.cwd(), output)}`);
  console.log(`Viewport: ${width}x${height}`);
} catch (error) {
  console.error(`Screenshot failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
}
