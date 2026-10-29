// Medición manual reproducible con dos PDF públicos; no es una garantía de rendimiento ni una prueba de usuarios.
// Requiere npm run build y las muestras descritas en docs/validacion.md dentro de node_modules/.cache.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = join(root, 'node_modules/.cache/e2e-tmp');
const samplesDirectory = join(temporary, 'public-samples');
await mkdir(samplesDirectory, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = join(root, 'node_modules/.cache/ms-playwright');
process.env.TEMP = process.env.TMP = process.env.TMPDIR = temporary;
const { chromium, expect } = await import('@playwright/test');
const { preview } = await import('vite');
const samples = [
  { file: 'adobe-pdf-reference.pdf', query: 'JavaScript',
    source: 'https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.7old.pdf' },
  { file: 'mozilla-tracemonkey.pdf', query: 'JavaScript',
    source: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    title: 'Trace-based Just-in-Time Type Specialization for Dynamic Languages' },
];
const report = { date: new Date().toISOString(), node: process.version,
  viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, samples: [] };
const server = await preview({ root, preview: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  browser = await chromium.launch({ channel: 'chromium', headless: true,
    downloadsPath: temporary, tracesDir: temporary });
  report.chromium = browser.version();
  for (const sample of samples) {
    const bytes = await readFile(join(samplesDirectory, sample.file));
    const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      const errors = [];
      const warnings = new Set();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'warning' || message.type() === 'error') warnings.add(message.text());
      });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);
      const result = { file: sample.file, source: sample.source, bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex') };
      let started = performance.now();
      await page.locator('#pdf-file').setInputFiles({ name: sample.file, mimeType: 'application/pdf', buffer: bytes });
      await expect(page.locator('#ocr-page')).toBeEnabled({ timeout: 120_000 });
      result.openMs = Math.round(performance.now() - started);
      result.pages = Number((await page.locator('#page-total').innerText()).match(/\d+$/)[0]);
      started = performance.now();
      await page.locator('#search-input').fill(sample.query);
      await page.locator('#search-input').press('Enter');
      await expect(page.locator('#match-count')).toHaveText(/^\d+\/\d+$/, { timeout: 180_000 });
      await expect(page.locator('#ocr-page')).toBeEnabled({ timeout: 30_000 });
      result.searchMs = Math.round(performance.now() - started);
      result.matches = await page.locator('#match-count').innerText();
      result.jsHeapBytesAfterSearch = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
      // Salta a una página distante para comprobar navegación tras indexar el documento.
      started = performance.now();
      await page.locator('#page-number').fill(String(result.pages));
      await page.locator('#page-number').press('Enter');
      await expect(page.locator('#ocr-page')).toBeEnabled({ timeout: 30_000 });
      result.lastPageMs = Math.round(performance.now() - started);
      result.lastPageHasInk = await page.locator('#pdf-canvas').evaluate(canvas => {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 200 && Math.min(data[i], data[i + 1], data[i + 2]) < 180) return true;
        }
        return false;
      });
      assert.equal(result.lastPageHasInk, true);
      if (sample.title) {
        await page.locator('#search-input').fill('');
        await page.locator('#search-input').press('Enter');
        await expect(page.locator('#ocr-page')).toBeEnabled();
        await page.locator('#page-number').fill('1');
        await page.locator('#page-number').press('Enter');
        await expect(page.locator('#ocr-page')).toBeEnabled();
        started = performance.now();
        await page.locator('#ocr-page').click();
        await expect(page.locator('#ocr-text')).not.toHaveValue('', { timeout: 120_000 });
        const text = await page.locator('#ocr-text').inputValue();
        result.ocrMs = Math.round(performance.now() - started);
        // Se contrasta solo el título publicado; no se atribuye precisión a la página completa.
        const normalize = value => value.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
        result.expectedTitle = sample.title;
        result.titleRecognized = normalize(text).includes(normalize(sample.title));
        result.ocrFirstLines = text.split('\n').slice(0, 4).join('\n');
      }
      assert.deepEqual(errors, []);
      result.warnings = [...warnings];
      report.samples.push(result);
      console.log(JSON.stringify(result));
    } finally {
      await context.close();
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
  await writeFile(join(samplesDirectory, 'report.json'), JSON.stringify(report, null, 2));
}
