// Run: node --test tests/pdf-opening.test.mjs
// Session tests: PDF loading, rendering and OCR are controlled substitutes.
// No PDF parsing, browser rendering or files generated at runtime.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

const root = new URL('../src/', import.meta.url).href;
const bridgeKey = '__pdfOpeningTestBridge';
const bridge = {};
globalThis[bridgeKey] = bridge;
const substitutes = {
  'infrastructure/pdf/document.ts': ['openPdf'],
  'infrastructure/pdf/renderer.ts': [
    'createTextLayer', 'drawHighlights', 'extractPageText', 'getPageSize',
    'renderPage', 'renderPageImage',
  ],
  'infrastructure/ocr/engine.ts': ['recognizePage'],
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(root) && specifier.startsWith('.')) {
      const url = new URL(specifier, context.parentURL).href;
      return { url: url.endsWith('.ts') ? url : `${url}.ts`, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(root) || !url.endsWith('.ts')) return nextLoad(url, context);
    const names = substitutes[url.slice(root.length)];
    const source = names
      ? names.map(name => `export const ${name} = (...args) => globalThis.${bridgeKey}.${name}(...args);`).join('\n')
      : stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' });
    return { format: 'module', source, shortCircuit: true };
  },
});
const { PdfSession } = await import('../src/application/pdf-session.ts');
const { OcrSession } = await import('../src/application/ocr-session.ts');
after(() => {
  hooks.deregister();
  delete globalThis[bridgeKey];
});

function loaded(name, numPages) {
  return {
    document: { name, numPages },
    task: { destroyed: false, async destroy() { this.destroyed = true; } },
  };
}

function harness(t, openPdf) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  });
  globalThis.window = { addEventListener() {}, innerHeight: 900 };
  Object.assign(bridge, {
    openPdf,
    getPageSize: async () => ({ width: 600, height: 800 }),
    renderPage: async (document, page, canvas, scale) => ({
      task: { promise: Promise.resolve(), cancel() {} },
      viewport: { scale },
    }),
    createTextLayer: async (document, page) => ({ document: document.name, page }),
    drawHighlights: () => null,
    extractPageText: async document => ({ text: document.name, boxes: [] }),
    renderPageImage: async () => ({}),
    recognizePage: async () => ({ text: 'Resultado anterior', confidence: 90 }),
  });
  const canvas = { style: { removeProperty() {} } };
  const host = { children: [], replaceChildren(...children) { this.children = children; } };
  const scroller = { clientWidth: 632, clientHeight: 800, scrollTop: 0 };
  const ocr = new OcrSession(() => {});
  const session = new PdfSession(canvas, host, scroller, state => ocr.setDocument(state.token));
  t.after(() => session.close());
  return { session, ocr, host };
}

// Tests are sequential because the module bridge and window are process globals.
test('apertura: muestra la primera pagina del documento cargado', async t => {
  const pdf = loaded('A', 3);
  const { session, host } = harness(t, async () => pdf);
  await session.open(new File([], 'A.pdf', { type: 'application/pdf' }));
  assert.equal(session.state.fileName, 'A.pdf');
  assert.equal(session.state.pages, 3);
  assert.equal(session.state.page, 1);
  assert.equal(session.state.busy, false);
  assert.deepEqual(host.children, [{ document: 'A', page: 1 }]);
});

test('cambio: reinicia pagina, busqueda, cache de texto y resultado OCR', async t => {
  const a = loaded('A', 3);
  const b = loaded('B', 2);
  const { session, ocr, host } = harness(t, async file => file.name === 'A.pdf' ? a : b);
  await session.open(new File([], 'A.pdf'));
  await session.goToPage(2);
  await session.search('A');
  await ocr.recognize({ canvas: {}, page: 1, token: session.state.token });
  assert.equal(session.state.matches, 3);
  assert.equal(ocr.snapshot.status, 'done');
  const previousToken = session.state.token;
  await session.open(new File([], 'B.pdf'));
  assert.equal(a.task.destroyed, true);
  assert.equal(session.state.fileName, 'B.pdf');
  assert.equal(session.state.page, 1);
  assert.equal(session.state.pages, 2);
  assert.equal(session.state.query, '');
  assert.equal(session.state.matches, 0);
  assert.equal(session.state.matchIndex, -1);
  assert.equal(session.state.searching, false);
  assert.ok(session.state.token > previousToken);
  assert.equal(await session.currentPageText(), 'B');
  assert.equal(ocr.snapshot.status, 'idle');
  assert.equal(ocr.snapshot.text, '');
  assert.equal(ocr.snapshot.page, null);
  assert.deepEqual(host.children, [{ document: 'B', page: 1 }]);
});

test('aperturas inversas: prevalece el ultimo documento seleccionado', async t => {
  const a = loaded('A', 3);
  const b = loaded('B', 2);
  const first = Promise.withResolvers();
  const entered = Promise.withResolvers();
  const { session, host } = harness(t, file => {
    if (file.name === 'A.pdf') {
      entered.resolve();
      return first.promise;
    }
    return Promise.resolve(b);
  });
  const openingA = session.open(new File([], 'A.pdf'));
  await entered.promise;
  await session.open(new File([], 'B.pdf'));
  assert.equal(session.state.fileName, 'B.pdf');
  first.resolve(a);
  await openingA;
  assert.equal(session.state.fileName, 'B.pdf', 'Una apertura anterior no debe reemplazar la ultima seleccion');
  assert.equal(a.task.destroyed, true, 'La carga obsoleta debe liberarse');
  assert.equal(b.task.destroyed, false, 'La carga vigente debe conservarse');
  assert.deepEqual(host.children, [{ document: 'B', page: 1 }]);
});

test('cierre lento: no borra el visor ni inicia una apertura ya obsoleta', async t => {
  const previous = loaded('Anterior', 1);
  const b = loaded('B', 2);
  const destroying = Promise.withResolvers();
  const calls = [];
  const { session, host } = harness(t, async file => {
    calls.push(file.name);
    return file.name === 'Anterior.pdf' ? previous : b;
  });
  await session.open(new File([], 'Anterior.pdf'));
  previous.task.destroy = async () => {
    await destroying.promise;
    previous.task.destroyed = true;
  };
  const openingA = session.open(new File([], 'A.pdf'));
  await session.open(new File([], 'B.pdf'));
  destroying.resolve();
  await openingA;
  assert.deepEqual(calls, ['Anterior.pdf', 'B.pdf']);
  assert.equal(previous.task.destroyed, true);
  assert.equal(b.task.destroyed, false);
  assert.equal(session.state.fileName, 'B.pdf');
  assert.deepEqual(host.children, [{ document: 'B', page: 1 }]);
});

test('error de apertura obsoleta: no se propaga sobre el documento vigente', async t => {
  const first = Promise.withResolvers();
  const entered = Promise.withResolvers();
  const b = loaded('B', 2);
  const { session, host } = harness(t, file => {
    if (file.name === 'A.pdf') {
      entered.resolve();
      return first.promise;
    }
    return Promise.resolve(b);
  });
  const openingA = session.open(new File([], 'A.pdf'));
  await entered.promise;
  await session.open(new File([], 'B.pdf'));
  first.reject(new Error('Carga anterior fallida'));
  await assert.doesNotReject(openingA);
  assert.equal(session.state.fileName, 'B.pdf');
  assert.deepEqual(host.children, [{ document: 'B', page: 1 }]);
});

test('error de apertura vigente: conserva la notificacion del fallo', async t => {
  const error = new Error('Carga vigente fallida');
  const { session } = harness(t, async () => { throw error; });
  await assert.rejects(session.open(new File([], 'A.pdf')), value => value === error);
  assert.equal(session.state.fileName, null);
});
