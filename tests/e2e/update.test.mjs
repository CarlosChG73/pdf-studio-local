// Prerequisite: npm run build. All browser/build artifacts stay in node_modules/.cache.
// Real Chromium/SW/PDF.js/OCR; an isolated origin never touches the installed PWA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temporary = join(root, 'node_modules', '.cache', 'e2e-tmp');
await mkdir(temporary, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH = join(root, 'node_modules', '.cache', 'ms-playwright');
process.env.TEMP = process.env.TMP = process.env.TMPDIR = temporary;
const { chromium, expect } = await import('@playwright/test');
const { build } = await import('vite');

function pdf() {
  const stream = 'BT /F1 32 Tf 50 650 Td (PRUEBA PDF LOCAL) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(text));
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(text);
  text += 'xref\n0 6\n0000000000 65535 f \n';
  text += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  text += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return { name: 'prueba-actualizacion.pdf', mimeType: 'application/pdf', buffer: Buffer.from(text) };
}

async function setup(t, initialDirectory) {
  let directory = initialDirectory;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(resolve(directory) + sep)) throw new Error('Outside fixture');
      const bytes = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store' });
      response.end(bytes);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chromium', headless: true,
    downloadsPath: temporary, tracesDir: temporary });
  t.after(() => browser.close());
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  t.after(() => assert.deepEqual(errors, [], 'Sin excepciones en las páginas'));
  async function open() {
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    return page;
  }
  return { context, origin, open, deploy(next) { directory = next; } };
}

async function exercise(page, ocr = false) {
  // Opening the mobile panel changes no PDF/OCR logic.
  if (!await page.locator('#pdf-file').isVisible()) {
    if (await page.locator('#tools-panel').isHidden()) await page.locator('#tools-toggle').click();
  }
  await page.locator('#pdf-file').setInputFiles(pdf());
  await expect(page.locator('#page-total')).toHaveText('de 1');
  await page.locator('#search-input').fill('PRUEBA');
  await page.locator('#search-input').press('Enter');
  await expect(page.locator('#match-count')).toHaveText('1/1');
  // Match count is emitted before the asynchronous repaint finishes.
  await expect(page.locator('#ocr-page')).toBeEnabled();
  await expect.poll(() => page.locator('#pdf-canvas').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] && pixels[i] < 100 && pixels[i + 1] < 100 && pixels[i + 2] < 100) return true;
    }
    return false;
  }), { message: 'PDF.js dibuja contenido real tras el repintado responsivo' }).toBe(true);
  if (ocr) {
    await page.locator('#ocr-page').click();
    await expect(page.locator('#ocr-text')).toHaveValue(/PRUEBA\s+PDF\s+LOCAL/i, { timeout: 120_000 });
  }
}

async function cachedOcr(page) {
  // Inspect an existing cache; never clear or unregister anything.
  return page.evaluate(async () => {
    if (!(await caches.keys()).includes('ocr-recursos')) return [];
    const cache = await caches.open('ocr-recursos');
    return (await cache.keys()).map(request => request.url).sort();
  });
}

async function requestUpdate(page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.waiting);
}

async function sameDocument(page, originalTime) {
  assert.equal(await page.evaluate(() => performance.timeOrigin), originalTime, 'No debe recargar sin consentimiento');
  await expect(page.locator('#page-total')).toHaveText('de 1');
  await expect(page.locator('#match-count')).toHaveText('1/1');
}

test('PWA: migrar desde a91ac75 autoUpdate sin recargas ni pérdida de OCR offline', { timeout: 240_000 }, async t => {
  const fixture = await mkdtemp(join(temporary, 'migration-'));
  const legacy = join(fixture, 'legacy');
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'a91ac75'], { cwd: root, encoding: 'utf8' })
    .trim().split('\n').filter(file => /^(src\/|public\/|index.html$|vite.config.ts$|tsconfig.json$|package.json$)/.test(file));
  for (const file of files) {
    const target = join(legacy, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, execFileSync('git', ['show', `a91ac75:${file}`], { cwd: root, maxBuffer: 20 * 1024 * 1024 }));
  }
  const oldDist = join(fixture, 'old-dist');
  await build({ root: legacy, configFile: join(legacy, 'vite.config.ts'),
    build: { outDir: oldDist }, logLevel: 'warn' });
  const site = await setup(t, oldDist);
  const first = await site.open();
  const second = await site.open();
  await exercise(first, true);
  await exercise(second);
  await expect.poll(async () => (await cachedOcr(first)).length).toBeGreaterThanOrEqual(3);
  const cached = await cachedOcr(first);
  const firstTime = await first.evaluate(() => performance.timeOrigin);
  const secondTime = await second.evaluate(() => performance.timeOrigin);

  site.deploy(join(root, 'dist'));
  await requestUpdate(first);
  // Observe an actual waiting worker, then continue both PDF sessions.
  await sameDocument(first, firstTime);
  await sameDocument(second, secondTime);
  await first.close();
  await sameDocument(second, secondTime);
  assert.equal(await second.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)), true);
  // The legacy shell has no update UI: closing ALL legacy clients activates
  // the prompt worker naturally. This one-time handoff needs no DevTools.
  await second.close();
  await expect.poll(async () => {
    for (const worker of site.context.serviceWorkers()) {
      try {
        if (await worker.evaluate(() => self.registration.active?.state === 'activated'
          && !self.registration.waiting)) return true;
      } catch {
        // Closing the last legacy client can restart the worker mid-observation.
      }
    }
    return false;
  }, { timeout: 15_000 }).toBe(true);
  await site.context.setOffline(true);
  const current = await site.open();
  await expect(current.locator('#pwa-update')).toBeHidden();
  await exercise(current, true);
  assert.deepEqual(await cachedOcr(current), cached, 'Se conservan los recursos OCR de la instalación anterior');
  t.diagnostic('Migración real desde a91ac75: espera segura con dos pestañas; cierre/reapertura inicial; PDF, búsqueda y OCR offline');
});

test('PWA: aviso, aplazamiento y consentimiento por pestaña; actualización y OCR offline', { timeout: 240_000 }, async t => {
  const fixture = await mkdtemp(join(temporary, 'update-'));
  const nextDist = join(fixture, 'next-dist');
  // Produce a real second build and real Workbox revisions; no source edits.
  await build({ root, configFile: join(root, 'vite.config.ts'), logLevel: 'warn',
    build: { outDir: nextDist }, plugins: [{ name: 'e2e-version-marker',
      transformIndexHtml: html => html.replace('</head>', '<meta name="e2e-version" content="next"></head>') }] });
  const site = await setup(t, join(root, 'dist'));
  const first = await site.open();
  const second = await site.open();
  await exercise(first, true);
  await exercise(second);
  await expect.poll(async () => (await cachedOcr(first)).length).toBeGreaterThanOrEqual(3);
  const cached = await cachedOcr(first);
  const firstTime = await first.evaluate(() => performance.timeOrigin);
  const secondTime = await second.evaluate(() => performance.timeOrigin);
  site.deploy(nextDist);
  await requestUpdate(first);
  await expect(first.locator('#pwa-update')).toBeVisible();
  await expect(second.locator('#pwa-update')).toBeVisible();

  // Desktop keeps the original notice and its controls.
  for (const [width, height] of [[1366, 900]]) {
    await first.setViewportSize({ width, height });
    for (const dark of [false, true]) {
      if ((await first.locator('#appearance-toggle').getAttribute('aria-checked') === 'true') !== dark) {
        await first.locator('#appearance-toggle').click();
      }
      for (const id of ['pwa-update-now', 'pwa-update-later']) {
        const control = first.locator(`#${id}`);
        await control.scrollIntoViewIfNeeded();
        assert.equal(await control.evaluate(button => {
          const rect = button.getBoundingClientRect();
          const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
            && (top === button || button.contains(top));
        }), true, `${id} accesible en ${width}×${height}, oscuro=${dark}`);
      }
    }
  }

  // Mobile uses a real, in-flow strip and details only after explicit action.
  // Keep the original two tabs open so closing these clients never activates SW.
  for (const [width, height] of [[393, 852], [320, 240]]) {
    for (const dark of [false, true]) {
      const mobile = await site.open();
      await mobile.setViewportSize({ width, height });
      if ((await mobile.locator('#appearance-toggle').getAttribute('aria-checked') === 'true') !== dark) {
        await mobile.locator('#appearance-toggle').click();
      }
      await exercise(mobile);
      const originalTime = await mobile.evaluate(() => performance.timeOrigin);
      await expect(mobile.locator('.pwa-update-summary')).toBeVisible();
      await expect(mobile.locator('#pwa-update-details')).not.toBeVisible();
      const strip = await mobile.locator('#pwa-update').boundingBox();
      assert.ok(strip.height <= 40, 'La franja ocupa solo una línea compacta');
      for (const menuOpen of [true, false]) {
        if ((await mobile.locator('#tools-panel').isVisible()) !== menuOpen) {
          await mobile.locator('#tools-toggle').click();
        }
        const header = await mobile.locator('.app-header').boundingBox();
        const viewer = await mobile.locator('#viewer').boundingBox();
        assert.ok(strip.y >= header.y + header.height - 1, 'La franja queda bajo la cabecera');
        assert.ok(viewer.y >= strip.y + strip.height, 'La franja no se superpone al visor');
        if (menuOpen) {
          for (const selector of ['#tools-close', 'label[for="pdf-file"]', '#page-number', '#ocr-page']) {
            const control = mobile.locator(selector);
            await control.scrollIntoViewIfNeeded();
            assert.equal(await control.evaluate(element => {
              const rect = element.getBoundingClientRect();
              const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
              return top === element || element.contains(top);
            }), true, `${selector} accesible con la franja en ${width}×${height}`);
          }
        }
        await mobile.screenshot({ path: join(fixture, `${width}-${dark ? 'dark' : 'light'}-${menuOpen ? 'menu' : 'viewer'}.png`) });
      }
      const reducedViewer = await mobile.locator('#viewer').boundingBox();
      await mobile.locator('#pwa-update-view').focus();
      await mobile.keyboard.press('Enter');
      await expect(mobile.locator('#pwa-update-details')).toBeVisible();
      await expect(mobile.locator('#pwa-update-close')).toBeFocused();
      assert.equal(await mobile.locator('#pwa-update-details').evaluate(element => element.matches(':modal')), true);
      for (const id of ['pwa-update-close', 'pwa-update-now', 'pwa-update-later']) {
        const control = mobile.locator(`#${id}`);
        await control.scrollIntoViewIfNeeded();
        await control.click({ trial: true });
      }
      await mobile.screenshot({ path: join(fixture, `${width}-${dark ? 'dark' : 'light'}-details.png`) });
      // Exercise all dismissal paths without activating or reloading the SW.
      if (width === 320 && !dark) await mobile.locator('#pwa-update-later').click();
      else if (dark && width === 393) await mobile.locator('#pwa-update-close').click();
      else await mobile.keyboard.press('Escape');
      await expect(mobile.locator('#pwa-update')).toBeHidden();
      await expect(mobile.locator('#pwa-update-details')).not.toBeVisible();
      await expect(mobile.locator('#ocr-page')).toBeEnabled();
      const restoredViewer = await mobile.locator('#viewer').boundingBox();
      assert.ok(Math.abs(restoredViewer.height - reducedViewer.height - strip.height) < 2,
        'Cerrar o aplazar recupera toda la altura reservada');
      await sameDocument(mobile, originalTime);
      assert.equal(await mobile.evaluate(() => Boolean(document.activeElement?.closest('#pwa-update'))), false,
        'El foco no queda dentro del aviso oculto');
      await mobile.close();
    }
  }
  await first.setViewportSize({ width: 1366, height: 900 });
  await first.locator('#pwa-update-later').focus();
  await first.keyboard.press('Enter');
  await expect(first.locator('#pwa-update')).toBeHidden();
  await sameDocument(first, firstTime);
  // Accept in another tab only after seeing the explicit PDF/OCR warning.
  second.once('dialog', async dialog => {
    assert.match(dialog.message(), /reabrir el PDF/);
    assert.match(dialog.message(), /OCR/);
    await dialog.dismiss();
  });
  await second.locator('#pwa-update-now').click();
  await sameDocument(second, secondTime);
  second.once('dialog', dialog => dialog.accept());
  await second.locator('#pwa-update-now').focus();
  await second.keyboard.press('Enter');
  await expect(second.locator('meta[name="e2e-version"]')).toHaveAttribute('content', 'next');
  await expect(second.locator('#page-total')).toHaveText('de —');
  await sameDocument(first, firstTime);
  await expect(first.locator('#pwa-update')).toBeHidden();
  assert.deepEqual(await cachedOcr(second), cached);
  // A deferred tab can still use OCR after another tab changes the controller.
  await exercise(first, true);
  await site.context.setOffline(true);
  await first.close();
  await second.close();
  const offline = await site.open();
  await expect(offline.locator('meta[name="e2e-version"]')).toHaveAttribute('content', 'next');
  await exercise(offline, true);
  assert.deepEqual(await cachedOcr(offline), cached);
  t.diagnostic('Ambos temas, 393×852/320×240, franja sin superposiciones, herramientas/OCR accesibles, Ver/Cerrar/Escape/Más tarde, altura restaurada, consentimiento por pestaña y PDF/búsqueda/OCR offline');
});
