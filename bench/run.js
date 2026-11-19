#!/usr/bin/env node
'use strict';

/**
 * Runs bench/bench.html in headless Chrome and prints the result table.
 *
 *   node bench/run.js [--steps N] [--budget MS] [--json]
 *
 * Node built-ins only: there is no install step and no dependency to track.
 * What it prints holds numbers and a browser version, nothing about the
 * machine, so the table can be pasted into a pull request as it is.
 */

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const FRAME_BUDGET_MS = 1000 / 60;
const TIMEOUT_MS = 180000;
const MAX_RESULT_BYTES = 1024 * 1024;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

function usage() {
  return [
    'Usage: node bench/run.js [--steps N] [--budget MS] [--json]',
    '',
    '  --steps N    generations to grow, 1 to 20 (default 12)',
    '  --budget MS  stop once a frame takes longer than this (default 1000)',
    '  --json       print the raw result as JSON instead of a table',
    '',
    'Set CHROME_PATH to use a particular Chrome, Chromium or Edge.'
  ].join('\n');
}

function parseArgs(argv) {
  const options = { steps: 12, budget: 1000, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--steps' || arg === '--budget') {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isInteger(value) || value < 1) {
        fail(arg + ' needs a positive whole number.\n\n' + usage());
      }
      options[arg.slice(2)] = value;
    } else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      fail('Unknown option ' + arg + '\n\n' + usage());
    }
  }
  return options;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** The first Chromium-family browser found in the usual install places. */
function findChrome() {
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }
  const candidates = [];
  if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA];
    for (const suffix of ['Google\\Chrome\\Application\\chrome.exe', 'Microsoft\\Edge\\Application\\msedge.exe']) {
      for (const root of roots) {
        if (root) {
          candidates.push(path.join(root, suffix));
        }
      }
    }
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    );
  }
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * Every file the benchmark page may load, found once at start-up.
 *
 * A request is answered by looking its URL up in this list, so nothing a
 * request says is ever turned into a file path.
 */
function listServedFiles() {
  const served = new Map();
  const walk = (dir, urlPrefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      const full = path.join(dir, entry.name);
      const url = urlPrefix + '/' + entry.name;
      if (entry.isDirectory()) {
        walk(full, url);
      } else if (CONTENT_TYPES[path.extname(entry.name)]) {
        served.set(url, full);
      }
    }
  };
  walk(ROOT, '');
  return served;
}

function formatTable(result) {
  const columns = [
    ['step', 'step'],
    ['chars', 'chars'],
    ['segments', 'segments'],
    ['tips', 'tips'],
    ['generateMs', 'generate ms'],
    ['frameMs', 'frame ms'],
    ['hitchMs', 'hitch ms']
  ];
  // Counts as whole numbers, times with two decimals.
  const cell = (key, value) => (key.endsWith('Ms') ? value.toFixed(2) : String(value));
  const rows = result.rows.map((row) => columns.map(([key]) => cell(key, row[key])));
  const widths = columns.map(([, title], i) => Math.max(title.length, ...rows.map((row) => row[i].length)));
  const line = (cells) => '| ' + cells.map((text, i) => text.padStart(widths[i])).join(' | ') + ' |';

  const withinBudget = result.rows.filter((row) => row.frameMs <= FRAME_BUDGET_MS);
  const score = withinBudget.length ? withinBudget[withinBudget.length - 1].step : 0;
  const canvas = result.canvas;

  return [
    result.browser + ', canvas ' + canvas.width + 'x' + canvas.height + ' at ' + canvas.density + 'x, seed ' + result.seed + ', one plant',
    '',
    line(columns.map(([, title]) => title)),
    '|' + widths.map((width) => '-'.repeat(width + 1) + ':').join('|') + '|',
    ...rows.map(line),
    '',
    'Score: step ' + score + ' is the deepest generation whose frame fits 60 fps (' + FRAME_BUDGET_MS.toFixed(1) + ' ms).'
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const chromePath = findChrome();
  if (!chromePath) {
    fail('No Chrome, Chromium or Edge found. Set CHROME_PATH to the browser to use.');
  }

  const served = listServedFiles();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'time-decomposes-bench-'));
  let browser = null;
  let finished = false;

  const finish = (exitCode, output) => {
    if (finished) {
      return;
    }
    finished = true;
    clearTimeout(timer);
    server.close();
    const exit = () => {
      // The browser lets go of its profile a moment after it exits.
      fs.rm(profileDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }, () => {
        (exitCode === 0 ? console.log : console.error)(output);
        process.exit(exitCode);
      });
    };
    if (browser && browser.exitCode === null) {
      browser.once('exit', exit);
      browser.kill();
    } else {
      exit();
    }
  };

  const server = http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/result') {
      let body = '';
      request.on('data', (chunk) => {
        body += chunk;
        if (body.length > MAX_RESULT_BYTES) {
          request.destroy();
        }
      });
      request.on('end', () => {
        response.end();
        let result;
        try {
          result = JSON.parse(body);
        } catch (error) {
          return finish(1, 'The benchmark page sent a result that is not JSON.');
        }
        if (result.error || !Array.isArray(result.rows)) {
          return finish(1, 'The benchmark page failed: ' + (result.error || 'no rows in the result'));
        }
        finish(0, options.json ? JSON.stringify(result, null, 2) : formatTable(result));
      });
      return;
    }

    const file = request.method === 'GET' ? served.get(request.url.split('?')[0]) : undefined;
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    fs.readFile(file, (error, content) => {
      if (error) {
        response.writeHead(500).end();
        return;
      }
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[path.extname(file)],
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        // These two make the page "cross-origin isolated", which gives it a
        // much finer clock (5 microseconds instead of 100).
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      });
      response.end(content);
    });
  });

  const timer = setTimeout(() => {
    finish(1, 'No result after ' + TIMEOUT_MS / 1000 + ' seconds. Try fewer --steps or a lower --budget.');
  }, TIMEOUT_MS);

  // Loopback only, on a port the system picks.
  server.listen(0, '127.0.0.1', () => {
    const url = 'http://127.0.0.1:' + server.address().port +
      '/bench/bench.html?steps=' + options.steps + '&budget=' + options.budget;
    browser = spawn(chromePath, [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--user-data-dir=' + profileDir,
      '--window-size=1280,720',
      '--force-device-scale-factor=1',
      url
    ], { stdio: 'ignore' });
    browser.on('error', () => finish(1, 'The browser could not be started. Check CHROME_PATH.'));
    browser.on('exit', () => finish(1, 'The browser closed before the benchmark finished.'));
  });
}

main();
