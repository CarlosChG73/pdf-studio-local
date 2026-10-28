// Run: node --test
// Real session, controlled infrastructure and browser. No real PDF rendering.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

const root = new URL('../src/', import.meta.url).href;
const key = '__pdfConcurrencyTests';
const bridge = {};
globalThis[key] = bridge;
const substitutes = {
  'infrastructure/pdf/document.ts': ['openPdf'],
  'infrastructure/pdf/renderer.ts': ['createTextLayer', 'drawHighlights',
    'extractPageText', 'getPageSize', 'renderPage', 'renderPageImage'],
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(root) && specifier.startsWith('.')) {
      const url = new URL(specifier, context.parentURL).href;
      return { url: url.endsWith('.ts') ? url : `${url}.ts`, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith(root) || !url.endsWith('.ts')) return next(url, context);
    const names = substitutes[url.slice(root.length)];
    const source = names
      ? names.map(name => `export const ${name} = (...args) => globalThis.${key}.${name}(...args);`).join('\n')
      : stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'transform' });
    return { format: 'module', source, shortCircuit: true };
  },
});
const { PdfSession } = await import('../src/application/pdf-session.ts');
after(() => { hooks.deregister(); delete globalThis[key]; });

function harness(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  globalThis.window = { addEventListener() {}, innerHeight: 900 };
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  });
  const text = value => ({ text: value, boxes: [] });
  Object.assign(bridge, {
    openPdf: async file => ({ document: { name: file.name, numPages: 3 }, task: { async destroy() {} } }),
    getPageSize: async () => ({ width: 600, height: 800 }),
    renderPage: async (document, page, canvas, scale) => ({
      task: { promise: Promise.resolve(), cancel() {} }, viewport: { scale },
    }),
    createTextLayer: async (document, page) => ({ name: document.name, page }),
    extractPageText: async (document, page) => text(`${document.name} pagina ${page}`),
    drawHighlights: () => null,
    renderPageImage: async () => ({}),
  });
  const host = { children: [], replaceChildren(...children) { this.children = children; } };
  const states = [];
  const session = new PdfSession({ style: { removeProperty() {} } }, host,
    { clientWidth: 632, clientHeight: 800, scrollTop: 0 }, state => states.push(state));
  t.after(() => session.close());
  return { session, host, text, states };
}

test('busquedas simultaneas: prevalece la consulta mas reciente', async t => {
  const { session, text } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const pending = Promise.withResolvers();
  const entered = Promise.withResolvers();
  let first = true;
  bridge.extractPageText = async (document, page) => {
    if (first) { first = false; entered.resolve(); return pending.promise; }
    return text(`nuevo ${page}`);
  };
  const oldSearch = session.search('anterior');
  await entered.promise;
  await session.search('nuevo');
  pending.resolve(text('anterior'));
  await oldSearch;
  assert.equal(session.state.query, 'nuevo');
  assert.equal(session.state.matches, 3);
  assert.equal(session.state.searching, false);
});

test('renders simultaneos: cancela el anterior y conserva la ultima pagina', async t => {
  const { session, host } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const pending = Promise.withResolvers();
  const entered = Promise.withResolvers();
  let cancelled = false;
  bridge.renderPage = async (document, page, canvas, scale) => {
    if (page === 2) {
      entered.resolve();
      return { viewport: { scale }, task: {
        promise: pending.promise,
        cancel() {
          cancelled = true;
          pending.reject(Object.assign(new Error('Cancelado'), { name: 'RenderingCancelledException' }));
        },
      } };
    }
    return { viewport: { scale }, task: { promise: Promise.resolve(), cancel() {} } };
  };
  const oldRender = session.goToPage(2);
  await entered.promise;
  // Let render() retain the returned RenderTask before starting the next render.
  await Promise.resolve();
  await session.goToPage(3);
  await oldRender;
  assert.equal(cancelled, true);
  assert.equal(session.state.page, 3);
  assert.equal(session.state.busy, false);
  assert.deepEqual(host.children, [{ name: 'A.pdf', page: 3 }]);
});

test('cambio durante busqueda: descarta resultados y texto cacheado del PDF anterior', async t => {
  const { session, host, text } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const pending = Promise.withResolvers();
  const entered = Promise.withResolvers();
  const extract = bridge.extractPageText;
  bridge.extractPageText = (document, page) => {
    if (document.name === 'A.pdf') { entered.resolve(); return pending.promise; }
    return extract(document, page);
  };
  const oldSearch = session.search('A.pdf');
  await entered.promise;
  await session.open(new File([], 'B.pdf'));
  pending.resolve(text('A.pdf pagina 1'));
  await oldSearch;
  assert.equal(session.state.fileName, 'B.pdf');
  assert.equal(session.state.query, '');
  assert.equal(session.state.matches, 0);
  assert.equal(session.state.searching, false);
  assert.deepEqual(host.children, [{ name: 'B.pdf', page: 1 }]);
  assert.equal(await session.currentPageText(), 'B.pdf pagina 1', 'La cache no debe contener texto de A.pdf');
});

test('error de carga: permite abrir otro PDF despues del fallo', async t => {
  const { session, host } = harness(t);
  const open = bridge.openPdf;
  const error = new Error('Fallo de carga simulado');
  bridge.openPdf = async () => { throw error; };
  await assert.rejects(session.open(new File([], 'error.pdf')), value => value === error);
  assert.equal(session.state.busy, false);
  bridge.openPdf = open;
  await session.open(new File([], 'B.pdf'));
  assert.equal(session.state.fileName, 'B.pdf');
  assert.deepEqual(host.children, [{ name: 'B.pdf', page: 1 }]);
});

test('error de extraccion: no deja el estado buscando activo', async t => {
  const { session, states } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const error = new Error('Fallo de extraccion simulado');
  bridge.extractPageText = async () => { throw error; };
  await assert.rejects(session.search('pagina'), value => value === error);
  assert.equal(session.state.searching, false, 'La busqueda fallida debe terminar su estado de actividad');
  assert.equal(states.at(-1).searching, false, 'La interfaz debe recibir el estado restablecido');
});

test('error de busqueda anterior: no desactiva una busqueda posterior pendiente', async t => {
  const { session, text, states } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const old = Promise.withResolvers();
  const current = Promise.withResolvers();
  const oldEntered = Promise.withResolvers();
  const currentEntered = Promise.withResolvers();
  let calls = 0;
  bridge.extractPageText = async () => {
    calls += 1;
    if (calls === 1) { oldEntered.resolve(); return old.promise; }
    if (calls === 2) { currentEntered.resolve(); return current.promise; }
    return text('nuevo');
  };
  const oldSearch = session.search('viejo');
  const error = new Error('Extraccion anterior fallida');
  const oldRejected = assert.rejects(oldSearch, value => value === error);
  await oldEntered.promise;
  const newSearch = session.search('nuevo');
  await currentEntered.promise;
  const notifications = states.length;
  old.reject(error);
  await oldRejected;
  assert.equal(session.state.searching, true);
  assert.equal(session.state.query, 'nuevo');
  assert.equal(states.length, notifications, 'El fallo antiguo no debe emitir cambios de estado');
  current.resolve(text('nuevo'));
  await newSearch;
  assert.equal(session.state.searching, false);
  assert.equal(session.state.matches, 3);
});

test('extraccion antigua: no sobrescribe texto ya cacheado del documento vigente', async t => {
  const { session, text } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const pending = Promise.withResolvers();
  const entered = Promise.withResolvers();
  const extract = bridge.extractPageText;
  bridge.extractPageText = (document, page) => {
    if (document.name === 'A.pdf') { entered.resolve(); return pending.promise; }
    return extract(document, page);
  };
  const oldSearch = session.search('A.pdf');
  await entered.promise;
  await session.open(new File([], 'B.pdf'));
  await session.search('B.pdf');
  assert.equal(await session.currentPageText(), 'B.pdf pagina 1');
  pending.resolve(text('A.pdf pagina 1'));
  await oldSearch;
  assert.equal(await session.currentPageText(), 'B.pdf pagina 1');
  assert.equal(session.state.query, 'B.pdf');
  assert.equal(session.state.matches, 3);
});

test('error de extraccion: una nueva busqueda puede recuperarse', async t => {
  const { session } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const extract = bridge.extractPageText;
  bridge.extractPageText = async () => { throw new Error('Fallo simulado'); };
  await assert.rejects(session.search('pagina'));
  bridge.extractPageText = extract;
  await session.search('pagina');
  assert.equal(session.state.matches, 3);
  assert.equal(session.state.searching, false);
});

test('error de renderizado: libera busy y permite volver a navegar', async t => {
  const { session, host } = harness(t);
  await session.open(new File([], 'A.pdf'));
  const render = bridge.renderPage;
  const error = new Error('Fallo de renderizado simulado');
  bridge.renderPage = async () => ({ viewport: { scale: 1 },
    task: { promise: Promise.reject(error), cancel() {} } });
  await assert.rejects(session.goToPage(2), value => value === error);
  assert.equal(session.state.busy, false);
  bridge.renderPage = render;
  await session.goToPage(3);
  assert.equal(session.state.page, 3);
  assert.equal(session.state.busy, false);
  assert.deepEqual(host.children, [{ name: 'A.pdf', page: 3 }]);
});
