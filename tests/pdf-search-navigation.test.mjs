// Run: node --test tests/pdf-search-navigation.test.mjs
// Real session and domain logic; controlled PDF text and browser/render substitutes.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

const root = new URL('../src/', import.meta.url).href;
const key = '__pdfSearchNavigationTests';
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
const { findMatchRanges } = await import('../src/domain/search.ts');
after(() => { hooks.deregister(); delete globalThis[key]; });

async function harness(t) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  globalThis.window = { addEventListener() {}, innerHeight: 900 };
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  });
  const texts = ['Inicio sin coincidencias', 'PDF pdf sesión', 'Final PDF'];
  const highlights = [];
  Object.assign(bridge, {
    openPdf: async () => ({ document: { numPages: texts.length }, task: { async destroy() {} } }),
    getPageSize: async () => ({ width: 600, height: 800 }),
    renderPage: async (document, page, canvas, scale) => ({
      task: { promise: Promise.resolve(), cancel() {} }, viewport: { scale },
    }),
    createTextLayer: async (document, page) => ({ page }),
    extractPageText: async (document, page) => ({ text: texts[page - 1], boxes: [] }),
    drawHighlights: (canvas, viewport, text, ranges, activeIndex) => {
      highlights.push({ text: text.text, ranges, activeIndex });
      return null;
    },
    renderPageImage: async () => ({}),
  });
  const host = { children: [], replaceChildren(...children) { this.children = children; } };
  const session = new PdfSession(
    { style: { removeProperty() {} } }, host,
    { clientWidth: 632, clientHeight: 800, scrollTop: 0 }, () => {},
  );
  t.after(() => session.close());
  await session.open(new File([], 'texto.pdf'));
  return { session, host, highlights };
}

test('navegacion: limita extremos y normaliza entradas no validas', async t => {
  const { session, host } = await harness(t);
  for (const [input, expected] of [[0, 1], [-5, 1], [4, 3], [999, 3], [2.9, 2], [NaN, 1], [Infinity, 1]]) {
    await session.goToPage(input);
    assert.equal(session.state.page, expected);
    assert.deepEqual(host.children, [{ page: expected }]);
    assert.equal(session.state.busy, false);
  }
});

test('busqueda: rangos exactos, mayusculas, acentos y consulta vacia', () => {
  assert.deepEqual(findMatchRanges('PDF pdf', ' PDF '), [{ start: 0, end: 3 }, { start: 4, end: 7 }]);
  assert.deepEqual(findMatchRanges('sesión', 'SESIÓN'), [{ start: 0, end: 6 }]);
  assert.deepEqual(findMatchRanges('sesión', 'sesion'), []);
  assert.deepEqual(findMatchRanges('PDF', '   '), []);
});

test('busqueda: cuenta todas las coincidencias y muestra la primera', async t => {
  const { session, host, highlights } = await harness(t);
  await session.search('pdf');
  assert.equal(session.state.matches, 3);
  assert.equal(session.state.matchIndex, 0);
  assert.equal(session.state.page, 2);
  assert.equal(session.state.searching, false);
  assert.deepEqual(host.children, [{ page: 2 }]);
  assert.deepEqual(highlights.at(-1), {
    text: 'PDF pdf sesión', activeIndex: 0,
    ranges: [{ page: 2, start: 0, end: 3 }, { page: 2, start: 4, end: 7 }],
  });
});

test('resultados: siguiente y anterior recorren coincidencias circularmente', async t => {
  const { session, highlights } = await harness(t);
  await session.search('pdf');
  for (const [operation, index, page, active] of [
    ['nextMatch', 1, 2, 1], ['nextMatch', 2, 3, 0], ['nextMatch', 0, 2, 0],
    ['previousMatch', 2, 3, 0], ['previousMatch', 1, 2, 1], ['previousMatch', 0, 2, 0],
  ]) {
    await session[operation]();
    assert.equal(session.state.matchIndex, index);
    assert.equal(session.state.page, page);
    assert.equal(highlights.at(-1).activeIndex, active);
  }
});

test('sin resultados: conserva pagina y permite siguiente/anterior sin cambios', async t => {
  const { session } = await harness(t);
  await session.goToPage(3);
  await session.search('inexistente');
  assert.equal(session.state.matches, 0);
  assert.equal(session.state.matchIndex, -1);
  assert.equal(session.state.searching, false);
  await session.nextMatch();
  await session.previousMatch();
  assert.equal(session.state.page, 3);
});

test('borrar busqueda: elimina coincidencias y resaltados activos', async t => {
  const { session, highlights } = await harness(t);
  await session.search('pdf');
  const painted = highlights.length;
  await session.search('');
  assert.equal(session.state.query, '');
  assert.equal(session.state.matches, 0);
  assert.equal(session.state.matchIndex, -1);
  assert.equal(session.state.searching, false);
  assert.equal(highlights.length, painted, 'El nuevo render no debe volver a pintar coincidencias');
});

// Behavior requested in docs/02-mejoras.md, item 1.
test('borrar busqueda vuelve a la pagina previa', async t => {
  const { session } = await harness(t);
  await session.goToPage(1);
  await session.search('pdf');
  assert.equal(session.state.page, 2);
  await session.search('');
  assert.equal(session.state.page, 1, 'Debe restaurar la pagina anterior a la busqueda segun docs/02-mejoras.md');
});

test('conserva origen tras editar consulta, recorrer resultados y navegar manualmente', async t => {
  const { session, host } = await harness(t);
  await session.search('pdf');
  await session.nextMatch();
  await session.nextMatch();
  await session.goToPage(2);
  await session.search('sesión');
  await session.goToPage(3);
  await session.search('   ');
  assert.equal(session.state.page, 1);
  assert.deepEqual(host.children, [{ page: 1 }]);
  await session.goToPage(3);
  await session.search('pdf');
  await session.search('');
  assert.equal(session.state.page, 3, 'Una nueva busqueda debe guardar un nuevo origen');
  await session.goToPage(2);
  await session.search('');
  assert.equal(session.state.page, 2, 'Borrar otra vez no debe reutilizar el origen anterior');
});

test('borrar una busqueda sin resultados tambien restaura el origen', async t => {
  const { session } = await harness(t);
  await session.goToPage(2);
  await session.search('inexistente');
  await session.goToPage(3);
  await session.search('');
  assert.equal(session.state.page, 2);
});

for (const closeFirst of [false, true]) {
  test(`limpia origen al ${closeFirst ? 'cerrar y reabrir' : 'cambiar de documento'}`, async t => {
    const { session } = await harness(t);
    await session.goToPage(3);
    await session.search('pdf');
    if (closeFirst) await session.close();
    await session.open(new File([], 'otro.pdf'));
    await session.search('');
    assert.equal(session.state.page, 1, 'No debe restaurar el origen del documento anterior');
    await session.goToPage(2);
    await session.search('pdf');
    await session.search('');
    assert.equal(session.state.page, 2);
  });
}
