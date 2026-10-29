// Recorre PDF, búsqueda y OCR reales; después repite sin red y con el servidor detenido.
// Prerequisite: npm run build
// Run: node --test tests/e2e/offline.test.mjs
// One end-to-end test using real PDF.js, OCR and a synthetic non-personal PDF.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary = join(root, 'node_modules', '.cache', 'e2e-tmp');
process.env.PLAYWRIGHT_BROWSERS_PATH = join(root, 'node_modules', '.cache', 'ms-playwright');
process.env.TEMP = temporary;
process.env.TMP = temporary;
process.env.TMPDIR = temporary;
await mkdir(temporary, { recursive: true });
const { chromium, expect } = await import('@playwright/test');

function syntheticPdf() {
  const content = 'BT /F1 32 Tf 50 650 Td (PRUEBA PDF LOCAL) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { name: 'prueba-local.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) };
}

test('PWA: abrir, buscar y reconocer PDF online y offline con servidor detenido', { timeout: 240_000 }, async t => {
  const origin = 'http://127.0.0.1:4178';
  const server = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'),
    'preview', '--host', '127.0.0.1', '--port', '4178', '--strictPort'],
  { cwd: root, env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverOutput = '';
  server.stdout.on('data', data => { serverOutput += data; });
  server.stderr.on('data', data => { serverOutput += data; });
  let serverError;
  server.on('error', error => { serverError = error; });
  async function stopServer() {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, 'exit');
      server.kill();
      await exited;
    }
  }
  t.after(stopServer);
  await expect.poll(async () => {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error(serverOutput);
    try { return (await fetch(origin)).status; } catch { return 0; }
  }, { timeout: 20_000 }).toBe(200);

  const browser = await chromium.launch({ channel: 'chromium', headless: true,
    downloadsPath: temporary, tracesDir: temporary });
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  let page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  t.diagnostic('Service worker activo y controlando la pagina');

  async function exercise(currentPage, phase) {
    await currentPage.locator('#pdf-file').setInputFiles(syntheticPdf());
    await expect(currentPage.locator('#page-total')).toHaveText('de 1');
    await expect(currentPage.locator('#ocr-page')).toBeEnabled();
    // Assert actual ink, not merely a canvas element or extracted text.
    assert.equal(await currentPage.locator('#pdf-canvas').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0 && pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100) return true;
      }
      return false;
    }), true, `${phase}: PDF.js debe dibujar texto`);
    await currentPage.locator('#search-input').fill('PRUEBA');
    await currentPage.locator('#search-input').press('Enter');
    await expect(currentPage.locator('#match-count')).toHaveText('1/1');
    t.diagnostic(`${phase}: apertura, renderizado y busqueda correctos`);
    await currentPage.locator('#ocr-page').click();
    await expect(currentPage.locator('#ocr-text')).toBeVisible({ timeout: 120_000 });
    await expect(currentPage.locator('#ocr-text')).toHaveValue(/PRUEBA\s+PDF\s+LOCAL/i);
    t.diagnostic(`${phase}: OCR real reconoce PRUEBA PDF LOCAL`);
  }

  await exercise(page, 'ONLINE');
  // Wait for runtime cache writes before removing network access.
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open('ocr-recursos');
    const urls = (await cache.keys()).map(request => request.url);
    return urls.some(url => url.endsWith('/ocr/worker.min.js'))
      && urls.some(url => url.includes('/ocr/core/') && url.endsWith('.wasm.js'))
      && urls.some(url => url.endsWith('/ocr/lang/spa.traineddata.gz'));
  })).toBe(true);
  t.diagnostic('Worker, nucleo OCR y modelo espanol almacenados en Cache Storage');

  await page.close();
  await context.setOffline(true);
  await stopServer();
  await assert.rejects(fetch(origin), 'El servidor debe estar inaccesible');
  page = await context.newPage();
  const response = await page.goto(origin);
  assert.equal(response.fromServiceWorker(), true, 'La reapertura debe proceder del service worker');
  await expect(page.locator('#pdf-file')).toBeAttached();
  await exercise(page, 'OFFLINE');
  assert.deepEqual(errors, [], 'No debe haber excepciones no controladas en las paginas');
});
