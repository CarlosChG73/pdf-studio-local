// Comprueba la liberación de cargas PDF.js fallidas y la apertura posterior de un documento válido.
// Run: node --test tests/pdf-document.test.mjs
// Real PDF.js in Node for invalid/valid files. Password rejection is controlled.
// Use PDF.js's official Node/legacy entry; omit the Vite worker-URL import.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const documentUrl = new URL('../src/infrastructure/pdf/document.ts', import.meta.url).href;
const bridgeKey = '__pdfDocumentResourceTest';
const bridge = {};
globalThis[bridgeKey] = bridge;
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === documentUrl && specifier === './worker') {
      return { url: 'test:pdf-worker-config', shortCircuit: true };
    }
    if (context.parentURL === documentUrl && specifier === 'pdfjs-dist') {
      return { url: 'test:pdf-document-api', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'test:pdf-worker-config') {
      return { format: 'module', source: 'export {};', shortCircuit: true };
    }
    if (url === 'test:pdf-document-api') {
      return { format: 'module',
        source: `export const getDocument = (...args) => globalThis.${bridgeKey}.getDocument(...args);`,
        shortCircuit: true };
    }
    if (url === documentUrl) {
      return { format: 'module',
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' }),
        shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const { openPdf, describePdfError } = await import(documentUrl);
after(() => { hooks.deregister(); delete globalThis[bridgeKey]; });

test('PDF inválido: libera la tarea real de PDF.js y conserva el error original', async t => {
  let task;
  let originalError;
  bridge.getDocument = options => {
    task = getDocument(options);
    task.promise.catch(error => { originalError = error; });
    return task;
  };
  // Cleanup also runs if the regression assertion fails before the fix.
  t.after(async () => { if (task && !task.destroyed) await task.destroy(); });
  await assert.rejects(openPdf(new File(['contenido que no es PDF'], 'invalido.pdf')), error => {
    assert.equal(error.name, 'InvalidPDFException');
    assert.equal(error, originalError);
    assert.equal(describePdfError(error), 'El archivo no parece un PDF válido.');
    return true;
  });
  assert.equal(task.destroyed, true, 'La tarea fallida debe estar destruida al rechazar openPdf');
});

test('PDF protegido: espera la liberación antes de propagar PasswordException', async () => {
  const originalError = Object.assign(new Error('Contraseña requerida'), { name: 'PasswordException' });
  const destroying = Promise.withResolvers();
  const release = Promise.withResolvers();
  let destroyCalls = 0;
  bridge.getDocument = () => ({
    promise: Promise.reject(originalError),
    async destroy() {
      destroyCalls += 1;
      destroying.resolve();
      await release.promise;
    },
  });
  const opening = openPdf(new File(['PDF protegido simulado'], 'protegido.pdf'));
  let settled = false;
  const checked = assert.rejects(opening, error => {
    assert.equal(error, originalError);
    assert.equal(describePdfError(error), 'El PDF está protegido con contraseña.');
    return true;
  }).finally(() => { settled = true; });
  try {
    assert.equal(await Promise.race([
      destroying.promise.then(() => 'destroying'), checked.then(() => 'settled'),
    ]), 'destroying', 'destroy() debe comenzar antes de rechazar openPdf');
    assert.equal(settled, false, 'openPdf debe esperar destroy()');
  } finally {
    release.resolve();
  }
  await checked;
  assert.equal(destroyCalls, 1);
});

function validPdf() {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>'];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 4\n0000000000 65535 f \n';
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  return pdf + `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

test('PDF válido después del fallo: conserva la tarea hasta el cierre del llamador', async t => {
  bridge.getDocument = getDocument;
  const opened = await openPdf(new File([validPdf()], 'valido.pdf'));
  t.after(async () => { if (!opened.task.destroyed) await opened.task.destroy(); });
  assert.equal(opened.document.numPages, 1);
  assert.equal(opened.task.destroyed, false, 'La apertura correcta no debe liberar el documento');
  assert.equal((await opened.document.getPage(1)).pageNumber, 1);
  await opened.task.destroy();
  assert.equal(opened.task.destroyed, true);
});
