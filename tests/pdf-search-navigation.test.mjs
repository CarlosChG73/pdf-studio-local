// Verifica búsqueda, posiciones físicas, etiquetas, marcadores y equivalencias puntuales con dobles controlados.
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

async function harness(t, labels = null, metadata = {}) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  globalThis.window = { addEventListener() {}, innerHeight: 900 };
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  });
  const texts = ['Inicio sin coincidencias', 'PDF pdf sesión', 'Final PDF'];
  const highlights = [];
  Object.assign(bridge, {
    openPdf: async () => ({ document: { numPages: texts.length,
      getPageLabels: async () => labels, ...metadata }, task: { async destroy() {} } }),
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

test('etiquetas válidas: navegación editorial y física; descarta metadatos obsoletos', async t => {
  const { session } = await harness(t, ['i', '1', 'A-2']);
  assert.equal(session.state.hasPageLabels, true);
  assert.equal(session.state.pageLabel, 'i');
  assert.equal(await session.goToPageLabel('1'), 'navigated');
  assert.equal(session.currentPage, 2, 'La etiqueta numérica no es una posición física');
  await session.goToPage(1);
  assert.equal(session.state.pageLabel, 'i');
  assert.equal(await session.goToPageLabel('A-2'), 'navigated');
  assert.equal(session.currentPage, 3);
  assert.equal(await session.goToPageLabel('inexistente'), 'not-found');
  assert.equal(session.currentPage, 3);

  const deferred = Promise.withResolvers();
  const entered = Promise.withResolvers();
  let oldDestroyed = false;
  bridge.openPdf = async file => file.name === 'anterior.pdf'
    ? { document: { numPages: 3, getPageLabels() { entered.resolve(); return deferred.promise; } },
      task: { async destroy() { oldDestroyed = true; } } }
    : { document: { numPages: 1, getPageLabels: async () => ['Nueva'] }, task: { async destroy() {} } };
  const obsoleteOpening = session.open(new File([], 'anterior.pdf'));
  await entered.promise;
  assert.equal(session.state.hasPageLabels, false, 'El cambio elimina las etiquetas anteriores inmediatamente');
  await session.open(new File([], 'actual.pdf'));
  deferred.resolve(['Vieja', '1', '2']);
  await obsoleteOpening;
  assert.equal(oldDestroyed, true);
  assert.equal(session.state.fileName, 'actual.pdf');
  assert.equal(session.state.pageLabel, 'Nueva');
  assert.equal(await session.goToPageLabel('Vieja'), 'not-found');
  await session.close();
  assert.equal(session.state.hasPageLabels, false);
  assert.equal(session.state.pageLabel, null);
});

test('etiquetas ausentes o inválidas: conserva navegación física', async t => {
  for (const labels of [null, [], ['i'], ['i', 2, 'iii'], ['', '', '']]) {
    const { session } = await harness(t, labels);
    assert.equal(session.state.hasPageLabels, false);
    assert.equal(session.state.pageLabel, null);
    assert.equal(await session.goToPageLabel('2'), 'unavailable');
    await session.goToPage(2);
    assert.equal(session.currentPage, 2);
    assert.equal(session.state.pageLabel, null);
  }
});

test('etiquetas duplicadas: informa ambigüedad sin mover la página y permite número físico', async t => {
  const { session } = await harness(t, ['1', '1', 'A']);
  await session.goToPage(3);
  assert.equal(await session.goToPageLabel('1'), 'ambiguous');
  assert.equal(session.currentPage, 3);
  await session.goToPage(2);
  assert.equal(session.state.pageLabel, '1');
  assert.equal(await session.goToPageLabel('A'), 'navigated');
  assert.equal(session.currentPage, 3);
});

test('marcadores: destinos por nombre, referencia y posición; rechaza destinos inválidos', async t => {
  const reference = { num: 10, gen: 0 };
  const child = { title: 'Sección', dest: [1, { name: 'Fit' }], items: [] };
  const outline = [{ title: 'Capítulo', dest: 'capitulo', items: [child] }];
  const { session } = await harness(t, null, {
    getOutline: async () => outline,
    getDestination: async name => name === 'capitulo' ? [reference, { name: 'XYZ' }, 0, 100, null] : null,
    getPageIndex: async ref => { assert.equal(ref, reference); return 2; },
  });
  assert.equal(session.state.outline, outline);
  assert.equal(await session.goToDestination('capitulo'), 'navigated');
  assert.equal(session.currentPage, 3);
  assert.equal(await session.goToDestination(child.dest), 'navigated');
  assert.equal(session.currentPage, 2);
  for (const invalid of [null, 'inexistente', [], [-1, { name: 'Fit' }], [3, { name: 'Fit' }],
    [0, { name: 'Desconocido' }], [{ num: '10', gen: 0 }, { name: 'Fit' }]]) {
    assert.equal(await session.goToDestination(invalid), 'invalid');
    assert.equal(session.currentPage, 2, 'No debe limitar un destino inválido a una página arbitraria');
  }
  await session.close();
  assert.deepEqual(session.state.outline, []);
});

test('marcadores: descarta resoluciones y metadatos obsoletos', async t => {
  const destination = Promise.withResolvers();
  const reference = Promise.withResolvers();
  const { session } = await harness(t, null, {
    getDestination: () => destination.promise,
    getPageIndex: () => reference.promise,
  });
  const old = session.goToDestination('lento');
  await session.goToPage(2);
  destination.resolve([0, { name: 'Fit' }]);
  assert.equal(await old, 'obsolete');
  assert.equal(session.currentPage, 2);
  const token = session.state.token;
  const oldReference = session.goToDestination([{ num: 4, gen: 0 }, { name: 'Fit' }]);
  bridge.openPdf = async () => ({ document: { numPages: 3, getOutline: async () => null }, task: { async destroy() {} } });
  await session.open(new File([], 'nuevo.pdf'));
  reference.resolve(2);
  assert.equal(await oldReference, 'obsolete');
  assert.equal(await session.goToDestination([2, { name: 'Fit' }], token), 'obsolete');
  assert.equal(session.currentPage, 1);

  const outline = Promise.withResolvers();
  const entered = Promise.withResolvers();
  bridge.openPdf = async file => ({ document: { numPages: 3,
    getOutline: () => file.name === 'anterior.pdf' ? (entered.resolve(), outline.promise) : null },
    task: { async destroy() {} } });
  const opening = session.open(new File([], 'anterior.pdf'));
  await entered.promise;
  await session.open(new File([], 'vigente.pdf'));
  outline.resolve([{ title: 'Viejo', dest: [2, { name: 'Fit' }], items: [] }]);
  await opening;
  assert.equal(session.state.fileName, 'vigente.pdf');
  assert.deepEqual(session.state.outline, []);
});

test('sin marcadores o con error de metadatos: mantiene navegación física', async t => {
  const warn = t.mock.method(console, 'warn', () => {});
  const { session } = await harness(t, null, { getOutline: async () => { throw new Error('Metadatos dañados'); } });
  assert.deepEqual(session.state.outline, []);
  assert.equal(warn.mock.calls.length, 1);
  await session.goToPage(3);
  assert.equal(session.currentPage, 3);
});

test('correspondencia puntual: página encontrada, sin extrapolación, validación y limpieza', async t => {
  const { session } = await harness(t);
  await session.search('pdf');
  assert.equal(session.currentPage, 2, 'Parte de la página encontrada por la búsqueda');
  assert.equal(session.state.manualReference, null);
  assert.equal(session.setManualPageNumber(22), true);
  assert.deepEqual(session.state.manualReference, { physicalPage: 2, editorialPage: 22 });
  const copy = session.state.manualReference;
  copy.physicalPage = 1;
  assert.equal(session.state.manualReference.physicalPage, 2);
  assert.equal(session.state.manualPageLabel, '22');
  for (const label of ['21', '23', 'i', '22.5']) {
    assert.equal(await session.goToPageLabel(label), 'not-found');
    assert.equal(session.currentPage, 2);
  }
  await session.goToPage(1);
  assert.equal(session.state.manualPageLabel, null, 'No extrapola a la página anterior');
  assert.equal(await session.goToPageLabel('22'), 'navigated');
  assert.equal(session.currentPage, 2);
  for (const invalid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(session.setManualPageNumber(invalid), false);
    assert.equal(session.state.manualReference.editorialPage, 22);
  }
  await session.goToPage(3);
  assert.equal(session.state.manualPageLabel, null, 'No extrapola a la página siguiente');
  assert.equal(session.setManualPageNumber(null), true);
  assert.equal(await session.goToPageLabel('22'), 'unavailable');
  assert.equal(session.setManualPageNumber(30), true);
  await session.open(new File([], 'otro.pdf'));
  assert.equal(session.state.manualReference, null);
  assert.equal(session.state.manualPageLabel, null);
  await session.close();
  assert.equal(session.setManualPageNumber(22), false);
});

test('correspondencia y etiquetas: no navega ante conflicto; coincidencia idéntica no es ambigua', async t => {
  const { session } = await harness(t, ['1', '2', '3']);
  await session.goToPage(2);
  session.setManualPageNumber(1);
  await session.goToPage(3);
  assert.equal(await session.goToPageLabel('1'), 'ambiguous');
  assert.equal(session.currentPage, 3);
  await session.goToPage(2);
  session.setManualPageNumber(2);
  await session.goToPage(3);
  assert.equal(await session.goToPageLabel('2'), 'navigated');
  assert.equal(session.currentPage, 2);
  assert.equal(session.state.pageLabel, '2');
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
