import { chromium as playwright } from '@playwright/test';
import chromium from '@sparticuz/chromium';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
// The npm-distributed browser and its NSS dependencies keep sandbox smoke tests self-contained.
export async function launchBrowser() {
  if (process.platform !== 'linux') return playwright.launch({ headless: true });
  const executablePath = await chromium.executablePath();
  const libraryRoot = path.join(os.tmpdir(), 'blackline-browser-libs');
  try { await fs.access(path.join(libraryRoot, 'lib/libnss3.so')); }
  catch {
    const entry = fileURLToPath(import.meta.resolve('@sparticuz/chromium'));
    const packed = path.resolve(path.dirname(entry), '../bin/al2023.tar.br');
    await fs.mkdir(libraryRoot, { recursive: true });
    const tar = path.join(libraryRoot, 'libraries.tar'); await fs.writeFile(tar, brotliDecompressSync(await fs.readFile(packed)));
    execFileSync('tar', ['-xf', tar, '-C', libraryRoot]); await fs.unlink(tar);
  }
  return playwright.launch({ executablePath, args: [...chromium.args, '--enable-unsafe-swiftshader'], headless: true,
    env: { ...process.env, LD_LIBRARY_PATH: [path.join(libraryRoot, 'lib'), os.tmpdir(), process.env.LD_LIBRARY_PATH || ''].join(':') } });
}
