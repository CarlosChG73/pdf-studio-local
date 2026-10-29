// Verifica imágenes JPEG2000 reales y los decodificadores locales en desarrollo, producción y offline.
// Prerequisite: npm run build. Run: node --test tests/e2e/pdf-decoders.test.mjs
// JPEG2000 fixture from Mozilla PDF.js (not the user's private PDF):
// https://github.com/mozilla/pdf.js/blob/master/test/pdfs/bug_jpx.pdf
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary = join(root, 'node_modules', '.cache', 'e2e-tmp');
await mkdir(temporary, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = join(root, 'node_modules', '.cache', 'ms-playwright');
process.env.TEMP = process.env.TMP = process.env.TMPDIR = temporary;
const { chromium, expect } = await import('@playwright/test');
const { createServer, preview } = await import('vite');
const fixture = join(root, 'tests', 'fixtures', 'bug_jpx.pdf');

test('JPEG2000: decodificador local en desarrollo, producción y offline', { timeout: 120_000 }, async t => {
  for (const name of ['openjpeg.wasm', 'openjpeg_nowasm_fallback.js']) {
    assert.deepEqual(await readFile(join(root, 'public/pdfjs/wasm', name)),
      await readFile(join(root, 'node_modules/pdfjs-dist/wasm', name)));
  }
  const browser = await chromium.launch({ channel: 'chromium', headless: true,
    downloadsPath: temporary, tracesDir: temporary });
  t.after(() => browser.close());

  for (const development of [true, false]) {
    const server = development
      ? await createServer({ root, server: { host: '127.0.0.1', port: 0 } })
      : await preview({ root, preview: { host: '127.0.0.1', port: 0 } });
    if (development) await server.listen();
    let stopped = false;
    async function stop() {
      if (stopped) return;
      stopped = true;
      if (development) await server.close();
      else await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
    }
    t.after(stop);
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    const messages = [];
    const errors = [];
    context.on('page', page => {
      page.on('console', message => messages.push(message.text()));
      page.on('pageerror', error => errors.push(error.message));
    });
    let page = await context.newPage();
    await page.goto(origin);
    if (!development) {
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      // Both decoder paths must already be precached before first PDF use.
      assert.equal(await page.evaluate(async () => {
        const urls = (await Promise.all((await caches.keys()).map(async name =>
          (await (await caches.open(name)).keys()).map(request => request.url)))).flat();
        return ['openjpeg.wasm', 'openjpeg_nowasm_fallback.js'].every(name =>
          urls.some(url => new URL(url).pathname.endsWith(`/pdfjs/wasm/${name}`)));
      }), true);
    }
    async function exercise(phase, decoder) {
      const response = page.waitForResponse(response => response.url().endsWith(`/pdfjs/wasm/${decoder}`));
      await page.locator('#pdf-file').setInputFiles(fixture);
      const loaded = await response;
      assert.equal(loaded.status(), 200, phase);
      if (phase === 'OFFLINE') assert.equal(loaded.fromServiceWorker(), true);
      await expect(page.locator('#page-total')).toHaveText('de 1');
      await expect(page.locator('#ocr-page')).toBeEnabled();
      // This fixture consists of an image, not selectable text: blank decoding fails.
      await expect.poll(() => page.locator('#pdf-canvas').evaluate(canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 200 && pixels[i] < 180 && pixels[i + 1] < 180 && pixels[i + 2] < 180) ink++;
        }
        return ink;
      })).toBeGreaterThan(100);
      t.diagnostic(`${phase}: recurso ${decoder} y píxeles JPEG2000 comprobados`);
    }
    await exercise(development ? 'DEV' : 'PRODUCTION', 'openjpeg.wasm');
    if (development) {
      // Exercise the bundled fallback in a fresh worker after a controlled WASM failure.
      await page.reload();
      await context.route('**/pdfjs/wasm/openjpeg.wasm', route => route.abort());
      await exercise('JS FALLBACK', 'openjpeg_nowasm_fallback.js');
      await context.unroute('**/pdfjs/wasm/openjpeg.wasm');
    } else {
      await page.close();
      await context.setOffline(true);
      await stop();
      page = await context.newPage();
      const response = await page.goto(origin);
      assert.equal(response.fromServiceWorker(), true);
      await exercise('OFFLINE', 'openjpeg.wasm');
    }
    assert.deepEqual(errors, []);
    assert.equal(messages.some(message => /Ensure that.*wasmUrl|OpenJPEG failed to initialize|Unable to decode image/.test(message)), false,
      messages.join('\n'));
    await context.close();
    await stop();
  }
});
