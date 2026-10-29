// Conecta la interfaz con las sesiones PDF/OCR; también controla temas, ayudas y avisos PWA.
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { OcrSession, type OcrState } from './application/ocr-session';
import { PdfSession, type PdfBookmark, type SessionState } from './application/pdf-session';
import { describePdfError } from './infrastructure/pdf/document';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Falta el elemento ${selector} en la interfaz.`);
  }

  return element;
}

type Appearance = 'light' | 'dark';
const appearanceToggle = requireElement<HTMLButtonElement>('#appearance-toggle');
const APPEARANCE_KEY = 'pdf-studio-appearance';
let appearance: Appearance = 'light';

function isAppearance(value: string | null): value is Appearance {
  return value === 'light' || value === 'dark';
}

try {
  const saved = localStorage.getItem(APPEARANCE_KEY);
  if (isAppearance(saved)) appearance = saved;
} catch {
  // Storage may be unavailable; appearance still works for this session.
}

function applyAppearance(): void {
  document.documentElement.dataset.theme = appearance;
  appearanceToggle.setAttribute('aria-checked', String(appearance === 'dark'));
}

appearanceToggle.addEventListener('click', () => {
  appearance = appearance === 'light' ? 'dark' : 'light';
  applyAppearance();
  try { localStorage.setItem(APPEARANCE_KEY, appearance); } catch {
    // A blocked store must not interrupt PDF or OCR operations.
  }
});
applyAppearance();

const toolsToggle = requireElement<HTMLButtonElement>('#tools-toggle');
const toolsClose = requireElement<HTMLButtonElement>('#tools-close');
const toolsPanel = requireElement<HTMLElement>('#tools-panel');
const app = requireElement<HTMLElement>('#app');
const compactTools = window.matchMedia('(max-width: 900px)');

function setToolsOpen(open: boolean, moveFocus = false): void {
  if (!open && toolsPanel.contains(document.activeElement)) toolsToggle.focus();
  toolsPanel.hidden = !open;
  app.dataset.toolsOpen = String(open);
  toolsToggle.setAttribute('aria-expanded', String(open));
  toolsToggle.setAttribute('aria-label', open ? 'Ocultar herramientas' : 'Mostrar herramientas');
  if (open && moveFocus) toolsClose.focus();
  // Reuse the existing resize handler to fit the PDF to the available width.
  window.dispatchEvent(new Event('resize'));
}

toolsToggle.addEventListener('click', () => setToolsOpen(Boolean(toolsPanel.hidden), Boolean(toolsPanel.hidden)));
toolsClose.addEventListener('click', () => setToolsOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !event.defaultPrevented && !toolsPanel.hidden) {
    event.preventDefault();
    setToolsOpen(false);
    toolsToggle.focus();
  }
});
compactTools.addEventListener('change', () => setToolsOpen(!compactTools.matches));
setToolsOpen(!compactTools.matches);

// Touch/narrow screens keep accessible descriptions without visible help text.
// Desktop tooltips are fixed so scroll containers cannot clip them.
const helpTexts: Record<string, string> = {
  'tools-toggle': 'Muestra u oculta las herramientas.',
  'tools-close': 'Cierra el panel de herramientas.',
  'appearance-toggle': 'Alterna entre modo claro y oscuro.',
  'pdf-file': 'Abre un PDF local.',
  'prev-page': 'Va a la página anterior.',
  'page-number': 'Escribe el número de página al que quieres ir.',
  'next-page': 'Va a la página siguiente.',
  'zoom-out': 'Reduce el tamaño del documento.',
  'zoom-in': 'Amplía el documento.',
  'fit-width': 'Ajusta la página al ancho del visor.',
  'fit-page': 'Ajusta la página completa al visor.',
  'copy-page': 'Copia la selección o el texto de la página.',
  'ocr-page': 'Reconoce el texto de esta página en español.',
  'search-input': 'Busca texto en el PDF.',
  'match-prev': 'Va a la coincidencia anterior.',
  'match-next': 'Va a la coincidencia siguiente.',
  'ocr-text': 'Texto reconocido de la página.',
  'ocr-copy': 'Copia el texto reconocido.',
  'ocr-discard': 'Descarta el resultado del reconocimiento.',
};
const inlineHelp = window.matchMedia('(max-width: 900px), (hover: none)');
const auxiliaryHints = requireElement<HTMLElement>('#auxiliary-hints');
const hintGroups = new Map<HTMLElement, HTMLElement>();
const helpEntries = Object.entries(helpTexts).map(([id, text]) => {
  const control = requireElement<HTMLElement>(`#${id}`);
  const tip = document.createElement('span');
  tip.id = `help-${id}`;
  tip.className = 'context-tooltip';
  tip.textContent = text;
  control.setAttribute('aria-describedby', [control.getAttribute('aria-describedby'), tip.id].filter(Boolean).join(' '));
  const label = id === 'pdf-file' ? requireElement<HTMLElement>('label[for="pdf-file"]') : null;
  const sources = label ? [control, label] : [control];
  sources.forEach((source) => source.removeAttribute('title'));
  let host = auxiliaryHints;
  const group = control.closest<HTMLElement>('.controls');
  if (group && toolsPanel.contains(control)) {
    if (!hintGroups.has(group)) {
      const hints = document.createElement('div');
      hints.className = 'control-hints';
      group.append(hints);
      hintGroups.set(group, hints);
    }
    host = hintGroups.get(group)!;
  } else if (id === 'pdf-file') {
    host = document.createElement('div');
    host.className = 'control-hints';
    control.insertAdjacentElement('afterend', host);
  }
  return { control, tip, host, sources };
});
type HelpEntry = typeof helpEntries[number];
let activeHelp: HelpEntry | null = null;
let dismissedHelp: HelpEntry | null = null;
let helpHideTimer: number | undefined;

function hideHelp(): void {
  window.clearTimeout(helpHideTimer);
  if (activeHelp) activeHelp.tip.hidden = true;
  activeHelp = null;
}

function showHelp(entry: HelpEntry): void {
  if (inlineHelp.matches || dismissedHelp === entry) return;
  hideHelp();
  const anchor = entry.sources[entry.sources.length - 1];
  const rect = anchor.getBoundingClientRect();
  if (!anchor.getClientRects().length || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
  const panel = anchor.closest<HTMLElement>('#tools-panel, #ocr-panel');
  const panelRect = panel?.getBoundingClientRect();
  if (panelRect && (rect.bottom <= panelRect.top || rect.top >= panelRect.bottom)) return;
  const gap = 10;
  const edge = 8;
  entry.tip.style.maxWidth = `${Math.min(260, window.innerWidth - edge * 2)}px`;
  entry.tip.hidden = false;
  const { width, height } = entry.tip.getBoundingClientRect();
  const cx = (rect.left + rect.right) / 2;
  const cy = (rect.top + rect.bottom) / 2;
  const candidates = [
    { side: 'top', x: cx - width / 2, y: rect.top - height - gap },
    { side: 'right', x: rect.right + gap, y: cy - height / 2 },
    ...(panelRect && panel?.id === 'tools-panel'
      ? [{ side: 'right', x: panelRect.right + gap, y: cy - height / 2 }] : []),
    { side: 'left', x: rect.left - width - gap, y: cy - height / 2 },
    { side: 'bottom', x: cx - width / 2, y: rect.bottom + gap },
    ...(anchor.closest('.app-header') ? [{
      side: 'right',
      x: requireElement<HTMLElement>('.app-header h1').getBoundingClientRect().right + gap,
      y: cy - height / 2,
    }] : []),
  ];
  const obstacles = Array.from(document.querySelectorAll<HTMLElement>(
    'button, input:not(.visually-hidden), textarea, label.file-button, .app-header h1, .tools-heading h2',
  )).filter((control) => control.getClientRects().length > 0)
    .map((control) => {
      const bounds = control.getBoundingClientRect();
      const clip = control.closest<HTMLElement>('#tools-panel, #ocr-panel')?.getBoundingClientRect();
      return {
        left: Math.max(bounds.left, clip?.left ?? 0, 0),
        right: Math.min(bounds.right, clip?.right ?? window.innerWidth, window.innerWidth),
        top: Math.max(bounds.top, clip?.top ?? 0, 0),
        bottom: Math.min(bounds.bottom, clip?.bottom ?? window.innerHeight, window.innerHeight),
      };
    }).filter((bounds) => bounds.right > bounds.left && bounds.bottom > bounds.top);
  // A neighboring button may occupy the first side position. Try just beyond
  // visible neighbors as well, without moving the tooltip to the panel's far edge.
  candidates.push(...obstacles.flatMap((obstacle) => [
    { side: 'right', x: obstacle.right + gap, y: cy - height / 2 },
    { side: 'left', x: obstacle.left - width - gap, y: cy - height / 2 },
  ]).filter(({ x }) =>
    (x >= rect.right + gap && x - rect.right <= 250)
    || (x + width <= rect.left - gap && rect.left - x - width <= 250),
  ).sort((a, b) => Math.min(Math.abs(a.x - rect.right), Math.abs(a.x + width - rect.left))
    - Math.min(Math.abs(b.x - rect.right), Math.abs(b.x + width - rect.left))));
  const position = candidates.map((candidate) => ({
    ...candidate,
    x: Math.max(edge, Math.min(candidate.x, window.innerWidth - width - edge)),
    y: Math.max(edge, Math.min(candidate.y, window.innerHeight - height - edge)),
  })).find(({ x, y }) => !obstacles.some((obstacle) =>
    x < obstacle.right + 4 && x + width > obstacle.left - 4
    && y < obstacle.bottom + 4 && y + height > obstacle.top - 4,
  ));
  if (!position) {
    entry.tip.hidden = true;
    return;
  }
  entry.tip.dataset.side = position.side;
  entry.tip.style.left = `${position.x}px`;
  entry.tip.style.top = `${position.y}px`;
  const horizontal = position.side === 'top' || position.side === 'bottom';
  const arrow = horizontal ? cx - position.x : cy - position.y;
  entry.tip.style.setProperty('--arrow-offset', `${Math.max(10, Math.min(arrow, (horizontal ? width : height) - 10))}px`);
  activeHelp = entry;
}

function leaveHelp(entry: HelpEntry): void {
  window.clearTimeout(helpHideTimer);
  helpHideTimer = window.setTimeout(() => {
    const engaged = entry.sources.some((source) => source.matches(':hover'))
      || entry.tip.matches(':hover') || document.activeElement === entry.control;
    if (!engaged) {
      if (activeHelp === entry) hideHelp();
      if (dismissedHelp === entry) dismissedHelp = null;
    }
  }, 200);
}

helpEntries.forEach((entry) => {
  entry.sources.forEach((source) => {
    source.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') showHelp(entry); });
    source.addEventListener('pointerleave', () => leaveHelp(entry));
  });
  entry.control.addEventListener('focus', () => showHelp(entry));
  entry.control.addEventListener('blur', () => leaveHelp(entry));
  entry.tip.addEventListener('pointerenter', () => window.clearTimeout(helpHideTimer));
  entry.tip.addEventListener('pointerleave', () => leaveHelp(entry));
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeHelp) {
    event.preventDefault();
    dismissedHelp = activeHelp;
    hideHelp();
  }
}, true);

function updateHelpMode(): void {
  hideHelp();
  dismissedHelp = null;
  helpEntries.forEach((entry) => {
    entry.tip.removeAttribute('style');
    entry.tip.hidden = true;
    if (inlineHelp.matches) {
      entry.tip.removeAttribute('role');
      entry.host.append(entry.tip);
    } else {
      entry.tip.setAttribute('role', 'tooltip');
      document.body.append(entry.tip);
    }
  });
}
inlineHelp.addEventListener('change', updateHelpMode);
window.addEventListener('resize', () => { if (activeHelp) showHelp(activeHelp); });
document.addEventListener('scroll', () => { if (activeHelp) showHelp(activeHelp); }, true);
updateHelpMode();

const input = requireElement<HTMLInputElement>('#pdf-file');
const status = requireElement<HTMLParagraphElement>('#pdf-status');
const canvas = requireElement<HTMLCanvasElement>('#pdf-canvas');
const textLayerHost = requireElement<HTMLElement>('#text-layer-host');
const scroller = requireElement<HTMLElement>('#viewer');

const prevButton = requireElement<HTMLButtonElement>('#prev-page');
const nextButton = requireElement<HTMLButtonElement>('#next-page');
const pageInput = requireElement<HTMLInputElement>('#page-number');
const pageTotal = requireElement<HTMLSpanElement>('#page-total');
const pageLabelControl = requireElement<HTMLLabelElement>('#page-label-control');
const pageLabelInput = requireElement<HTMLInputElement>('#page-label');
const outlinePanel = requireElement<HTMLDetailsElement>('#pdf-outline');
const outlineList = requireElement<HTMLUListElement>('#pdf-outline-list');
const manualPanel = requireElement<HTMLDetailsElement>('#manual-pagination');
const manualForm = requireElement<HTMLFormElement>('#manual-pagination-form');
const manualEditorialStart = requireElement<HTMLInputElement>('#manual-editorial-start');
const manualApply = requireElement<HTMLButtonElement>('#manual-pagination-apply');
const manualClear = requireElement<HTMLButtonElement>('#manual-pagination-clear');
const manualStatus = requireElement<HTMLParagraphElement>('#manual-pagination-status');
let navigationToken = -1;
let manualDraftPage = 0;
let renderedOutline: PdfBookmark[] | null = null;

function appendBookmarks(parent: HTMLUListElement, items: PdfBookmark[], token: number): void {
  // Los títulos se insertan como texto; no se ejecutan acciones o enlaces externos del PDF.
  for (const item of items) {
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.title || 'Sin título';
    button.disabled = !item.dest;
    button.addEventListener('click', async () => {
      if (token !== session.state.token) return;
      try {
        const result = await session.goToDestination(item.dest, token);
        if (result === 'invalid' && token === session.state.token) {
          showNotice('El marcador no tiene un destino interno válido.', 6000);
        }
      } catch {
        if (token === session.state.token) showNotice('No se pudo abrir el destino del marcador.', 6000);
      }
    });
    row.append(button);
    if (Array.isArray(item.items) && item.items.length > 0) {
      const children = document.createElement('ul');
      appendBookmarks(children, item.items, token);
      row.append(children);
    }
    parent.append(row);
  }
}

function renderNavigation(state: SessionState): void {
  if (navigationToken !== state.token || manualDraftPage !== state.page) manualForm.reset();
  manualDraftPage = state.page;
  if (navigationToken !== state.token) {
    navigationToken = state.token;
    manualForm.reset();
    manualPanel.open = false;
    outlinePanel.open = false;
  }
  if (renderedOutline !== state.outline) {
    renderedOutline = state.outline;
    outlineList.replaceChildren();
    appendBookmarks(outlineList, state.outline, state.token);
  }
  outlinePanel.hidden = state.outline.length === 0;
  manualPanel.hidden = state.pages === 0;
  manualEditorialStart.disabled = state.pages === 0 || state.busy;
  manualApply.disabled = state.pages === 0 || state.busy;
  manualClear.disabled = state.manualReference === null || state.busy;
  renderManualPreview(state);
}

function renderManualPreview(state: SessionState): void {
  // Una vista previa no guarda datos: solo el envío del formulario confirma esta página.
  const value = manualEditorialStart.valueAsNumber;
  const reference = state.manualReference;
  manualStatus.textContent = Number.isSafeInteger(value) && value >= 1
    ? `Vista previa: Página ${value} del libro = página ${state.page} del PDF. Sin guardar.`
    : reference
    ? `Guardada: Página ${reference.editorialPage} del libro = página ${reference.physicalPage} del PDF.`
    : 'Sin correspondencia manual.';
}

const zoomOutButton = requireElement<HTMLButtonElement>('#zoom-out');
const zoomInButton = requireElement<HTMLButtonElement>('#zoom-in');
const fitWidthButton = requireElement<HTMLButtonElement>('#fit-width');
const fitPageButton = requireElement<HTMLButtonElement>('#fit-page');
const zoomLevel = requireElement<HTMLSpanElement>('#zoom-level');

const searchInput = requireElement<HTMLInputElement>('#search-input');
const matchPrevButton = requireElement<HTMLButtonElement>('#match-prev');
const matchNextButton = requireElement<HTMLButtonElement>('#match-next');
const matchCount = requireElement<HTMLSpanElement>('#match-count');
const copyButton = requireElement<HTMLButtonElement>('#copy-page');

const ocrButton = requireElement<HTMLButtonElement>('#ocr-page');
const ocrPanel = requireElement<HTMLElement>('#ocr-panel');
const ocrMeta = requireElement<HTMLSpanElement>('#ocr-meta');
const ocrMessage = requireElement<HTMLParagraphElement>('#ocr-message');
const ocrProgress = requireElement<HTMLProgressElement>('#ocr-progress');
const ocrText = requireElement<HTMLTextAreaElement>('#ocr-text');
const ocrCopyButton = requireElement<HTMLButtonElement>('#ocr-copy');
const ocrDiscardButton = requireElement<HTMLButtonElement>('#ocr-discard');

let lastState: SessionState | null = null;
let notice: string | null = null;
let noticeTimer: number | undefined;
let selectionSnapshot = '';

function selectedTextInViewer(): string {
  const selection = window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0 ||
    selection.isCollapsed
  ) {
    return '';
  }

  const range = selection.getRangeAt(0);

  if (!textLayerHost.contains(range.commonAncestorContainer)) return '';

  return selection.toString();
}

function statusText(state: SessionState): string {
  if (!state.fileName) return 'Ningún documento seleccionado.';
  if (state.busy) return `Cargando «${state.fileName}»…`;
  if (state.searching) return `Buscando «${state.query}»…`;

  const pages = state.pages === 1 ? '1 página' : `${state.pages} páginas`;
  const base = `«${state.fileName}» — ${pages}`;

  if (state.query.trim().length > 0 && state.matches === 0) {
    return `Sin resultados para «${state.query}».`;
  }

  if (state.matches > 0) {
    return `${base} · coincidencia ${state.matchIndex + 1} de ${state.matches}`;
  }

  return base;
}

function renderOcr(state: OcrState): void {
  const hasDocument = (lastState?.pages ?? 0) > 0;
  const working = state.status === 'working';

  ocrButton.disabled =
    !hasDocument || (lastState?.busy ?? false) || working;
  ocrButton.textContent = working ? 'Reconociendo…' : 'Reconocer página';

  ocrPanel.hidden = state.status === 'idle';
  ocrProgress.hidden = !working;
  ocrText.hidden = state.status !== 'done';
  ocrCopyButton.disabled = state.status !== 'done';
  ocrDiscardButton.disabled = state.status === 'idle' || working;
  ocrMeta.textContent = state.page ? `Página ${state.page}` : '';
  ocrMessage.textContent = '';

  switch (state.status) {
    case 'working':
      ocrProgress.value = Math.round(state.progress * 100);
      ocrMessage.textContent = `${state.label}…`;

      if (ocrText.value.length > 0) ocrText.value = '';
      break;
    case 'done':
      ocrMeta.textContent = `Página ${state.page} · confianza ${
        state.confidence ?? 0
      } %`;

      if (ocrText.value !== state.text) ocrText.value = state.text;
      break;
    case 'empty':
      ocrMessage.textContent =
        'No se ha reconocido texto legible en esta página.';
      break;
    case 'error':
      ocrMessage.textContent =
        state.error ?? 'No se pudo reconocer el texto.';
      break;
    case 'idle':
      break;
  }
}

function render(state: SessionState): void {
  ocr.setDocument(state.token);
  renderNavigation(state);

  const hasDocument = state.pages > 0;
  const idle = hasDocument && !state.busy;

  prevButton.disabled = !idle || state.page <= 1;
  nextButton.disabled = !idle || state.page >= state.pages;
  pageInput.disabled = !hasDocument || state.busy;
  const hasEditorial = state.hasPageLabels || state.manualReference !== null;
  pageLabelControl.hidden = !hasEditorial;
  pageLabelInput.disabled = !hasDocument || state.busy;
  if (!state.busy) pageLabelInput.value = state.pageLabel ?? state.manualPageLabel ?? '';
  pageInput.setAttribute('aria-label', hasEditorial ? 'Número físico de página PDF' : 'Número de página');

  zoomOutButton.disabled = !idle || state.zoom <= 0.25;
  zoomInButton.disabled = !idle || state.zoom >= 4;
  fitWidthButton.disabled = !hasDocument;
  fitPageButton.disabled = !hasDocument;

  searchInput.disabled = !hasDocument;
  copyButton.disabled = !hasDocument || state.busy;
  ocrButton.disabled =
    !hasDocument || state.busy || ocr.snapshot.status === 'working';
  matchPrevButton.disabled = state.matches === 0;
  matchNextButton.disabled = state.matches === 0;

  if (hasDocument) {
    pageInput.max = String(state.pages);
    if (!state.busy) pageInput.value = String(state.page);
    pageTotal.textContent = hasEditorial ? `PDF · de ${state.pages}` : `de ${state.pages}`;
    zoomLevel.textContent = `${Math.round(state.zoom * 100)} %`;
    matchCount.textContent =
      state.matches > 0 ? `${state.matchIndex + 1}/${state.matches}` : '—';
  } else {
    pageTotal.textContent = 'de —';
    zoomLevel.textContent = '—';
    matchCount.textContent = '—';
  }

  status.textContent = notice ?? statusText(state);
  renderOcr(ocr.snapshot);
}

function showNotice(message: string, duration = 2500): void {
  notice = message;

  if (noticeTimer) window.clearTimeout(noticeTimer);

  if (lastState) render(lastState);

  noticeTimer = window.setTimeout(() => {
    notice = null;
    if (lastState) render(lastState);
  }, duration);
}

/**
 * Copia texto al portapapeles.
 * Usa la API moderna y recurre a un textarea temporal si el navegador la bloquea.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continúa con el método alternativo.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

const ocr = new OcrSession((state) => renderOcr(state));

const session = new PdfSession(canvas, textLayerHost, scroller, (state) => {
  lastState = state;
  render(state);
});

input.addEventListener('change', async () => {
  const file = input.files?.[0];

  if (!file) return;

  notice = null;

  try {
    await session.open(file);
  } catch (error) {
    showNotice(describePdfError(error), 6000);
  }
});

prevButton.addEventListener('click', () => {
  void session.goToPage(session.currentPage - 1);
});

nextButton.addEventListener('click', () => {
  void session.goToPage(session.currentPage + 1);
});

const commitPage = (): void => {
  const value = Number.parseInt(pageInput.value, 10);

  if (Number.isNaN(value)) {
    pageInput.value = String(session.currentPage);
    return;
  }

  void session.goToPage(value).then(() => {
    pageInput.value = String(session.currentPage);
  });
};

pageInput.addEventListener('change', commitPage);
pageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitPage();
  }
});

const commitPageLabel = async (): Promise<void> => {
  const token = session.state.token;
  try {
    const result = await session.goToPageLabel(pageLabelInput.value);
    if (token !== session.state.token) return;
    pageLabelInput.value = session.state.pageLabel ?? session.state.manualPageLabel ?? '';
    if (result === 'ambiguous') {
      showNotice('Etiqueta repetida o ambigua. Utiliza el número físico de página PDF.', 6000);
    } else if (result === 'not-found') {
      showNotice('Etiqueta no encontrada. Utiliza el número físico de página PDF.', 6000);
    }
  } catch {
    if (token === session.state.token) showNotice('No se pudo mostrar la página indicada.', 6000);
  }
};
pageLabelInput.addEventListener('change', () => void commitPageLabel());
pageLabelInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    void commitPageLabel();
  }
});

manualForm.addEventListener('submit', event => {
  event.preventDefault();
  const applied = session.setManualPageNumber(manualEditorialStart.valueAsNumber);
  if (applied) {
    manualForm.reset();
    renderManualPreview(session.state);
  } else showNotice('Indica un número de página del libro entero positivo.', 6000);
});
manualEditorialStart.addEventListener('input', () => renderManualPreview(session.state));
manualClear.addEventListener('click', () => {
  session.setManualPageNumber(null);
  manualForm.reset();
  renderManualPreview(session.state);
});

zoomInButton.addEventListener('click', () => void session.zoomIn());
zoomOutButton.addEventListener('click', () => void session.zoomOut());
fitWidthButton.addEventListener('click', () => void session.fitWidth());
fitPageButton.addEventListener('click', () => void session.fitPage());

let searchTimer: number | undefined;

searchInput.addEventListener('input', () => {
  if (searchTimer) window.clearTimeout(searchTimer);

  const value = searchInput.value;

  searchTimer = window.setTimeout(() => {
    void session.search(value);
  }, 350);
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;

  event.preventDefault();

  if (searchTimer) window.clearTimeout(searchTimer);

  void session.search(searchInput.value);
});

matchNextButton.addEventListener('click', () => void session.nextMatch());
matchPrevButton.addEventListener('click', () => void session.previousMatch());

copyButton.addEventListener('pointerdown', () => {
  selectionSnapshot = selectedTextInViewer();
});

copyButton.addEventListener('click', async () => {
  const selected = selectedTextInViewer() || selectionSnapshot;

  selectionSnapshot = '';

  if (selected.trim().length > 0) {
    const copied = await copyToClipboard(selected);

    showNotice(
      copied
        ? 'Selección copiada.'
        : 'No se pudo copiar el texto al portapapeles.',
    );

    return;
  }

  try {
    const text = await session.currentPageText();

    if (text.trim().length === 0) {
      showNotice('Esta página no contiene texto seleccionable.');
      return;
    }

    const copied = await copyToClipboard(text);

    showNotice(
      copied
        ? 'Texto de la página copiado.'
        : 'No se pudo copiar el texto al portapapeles.',
    );
  } catch {
    showNotice('No se pudo copiar el texto al portapapeles.');
  }
});

ocrButton.addEventListener('click', async () => {
  ocrButton.disabled = true;

  try {
    const source = await session.prepareOcrPage();

    if (!source) {
      renderOcr(ocr.snapshot);
      return;
    }

    await ocr.recognize(source);
  } catch {
    showNotice('No se pudo preparar la página para el OCR.', 5000);
  } finally {
    renderOcr(ocr.snapshot);
  }
});

ocrCopyButton.addEventListener('click', async () => {
  const text = ocr.snapshot.text;

  if (text.length === 0) return;

  const copied = await copyToClipboard(text);

  showNotice(
    copied
      ? 'Texto reconocido copiado.'
      : 'No se pudo copiar el texto al portapapeles.',
  );
});

ocrDiscardButton.addEventListener('click', () => ocr.discard());

// Updates affect the shell only. PDF/OCR sessions remain in memory until the
// user explicitly accepts a reload in THIS tab, including external SW updates.
const updateNotice = requireElement<HTMLElement>('#pwa-update');
const updateTitle = requireElement<HTMLElement>('#pwa-update-title');
const updateNow = requireElement<HTMLButtonElement>('#pwa-update-now');
const updateLater = requireElement<HTMLButtonElement>('#pwa-update-later');
const updateDetails = requireElement<HTMLDialogElement>('#pwa-update-details');
const updateView = requireElement<HTMLButtonElement>('#pwa-update-view');
const updateClose = requireElement<HTMLButtonElement>('#pwa-update-close');
let swRegistration: ServiceWorkerRegistration | undefined;
let reloadConsented = false;
let reloadStarted = false;
let checkingUpdate = false;
let updateDeferred = false;
let shellChanged = false;
let focusBeforeUpdate: HTMLElement | null = null;

function presentUpdate(): void {
  if (updateNotice.hidden) return;
  if (!compactTools.matches && !updateDetails.open) {
    const focused = document.activeElement as HTMLElement | null;
    updateDetails.show();
    // A passive desktop notice must not take focus away from PDF tools.
    focused?.focus({ preventScroll: true });
    if (updateDetails.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }
  updateView.setAttribute('aria-expanded', String(compactTools.matches && updateDetails.open));
}

function offerUpdate(): void {
  if (updateDeferred || reloadStarted) return;
  const wasHidden = updateNotice.hidden;
  if (wasHidden) focusBeforeUpdate = document.activeElement as HTMLElement | null;
  updateTitle.textContent = 'Hay una nueva versión disponible.';
  updateNotice.hidden = false;
  presentUpdate();
  if (wasHidden && compactTools.matches) window.dispatchEvent(new Event('resize'));
}

function shellUpdated(): void {
  shellChanged = true;
  if (reloadConsented && !reloadStarted) {
    reloadStarted = true;
    window.location.reload();
  } else {
    offerUpdate();
  }
}

async function checkForUpdate(): Promise<void> {
  if (!swRegistration || checkingUpdate || !navigator.onLine || swRegistration.installing) return;
  checkingUpdate = true;
  try {
    await swRegistration.update();
    if (swRegistration.waiting) offerUpdate();
  } catch {
    // Offline or an unavailable server must never interrupt PDF/OCR work.
  } finally {
    checkingUpdate = false;
  }
}

const activateUpdate = registerSW({
  immediate: true,
  onNeedRefresh: offerUpdate,
  // Override the plugin's default reload, also for updates accepted elsewhere.
  onNeedReload: shellUpdated,
  onRegisteredSW(_url, registration) {
    swRegistration = registration;
    if (!registration) return;
    if (registration.waiting) offerUpdate();
    // Native waiting detection also covers external installs and Workbox's
    // time-based update heuristic during closely spaced deployments.
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting) offerUpdate();
      });
    });
    void checkForUpdate();
    window.setInterval(() => void checkForUpdate(), 60 * 60 * 1000);
  },
});

if ('serviceWorker' in navigator) {
  let previousController = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const next = navigator.serviceWorker.controller;
    if (previousController && next && previousController !== next) shellUpdated();
    previousController = next;
  });
}
window.addEventListener('online', () => void checkForUpdate());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForUpdate();
});

function restoreUpdateFocus(): void {
  // Un <dialog> puede restaurar su foco al cerrar; nunca devolverlo al aviso oculto.
  if (focusBeforeUpdate?.isConnected && !updateNotice.contains(focusBeforeUpdate)
    && focusBeforeUpdate.getClientRects().length) {
    focusBeforeUpdate.focus({ preventScroll: true });
  }
  if (updateNotice.contains(document.activeElement) || document.activeElement === document.body) {
    toolsToggle.focus({ preventScroll: true });
  }
}

function dismissUpdate(): void {
  updateDeferred = true;
  if (updateDetails.open) updateDetails.close();
  updateView.setAttribute('aria-expanded', 'false');
  updateNotice.hidden = true;
  if (compactTools.matches) window.dispatchEvent(new Event('resize'));
  restoreUpdateFocus();
}
updateDetails.addEventListener('close', () => {
  if (updateNotice.hidden) restoreUpdateFocus();
});
updateLater.addEventListener('click', dismissUpdate);
updateClose.addEventListener('click', dismissUpdate);
updateDetails.addEventListener('cancel', (event) => {
  event.preventDefault();
  dismissUpdate();
});
updateDetails.addEventListener('keydown', (event) => {
  // Let the dialog's native Escape/cancel close the notice, not the tools menu.
  if (event.key === 'Escape') event.stopPropagation();
});
updateView.addEventListener('click', () => {
  hideHelp();
  if (!updateDetails.open) updateDetails.showModal();
  updateView.setAttribute('aria-expanded', 'true');
  updateClose.focus();
});
compactTools.addEventListener('change', () => {
  if (updateDetails.open) updateDetails.close();
  presentUpdate();
});
updateNow.addEventListener('click', async () => {
  if (!window.confirm('Se recargará esta pestaña y deberá reabrir el PDF. Copie antes los resultados OCR que necesite conservar. ¿Actualizar ahora?')) return;
  reloadConsented = true;
  updateNow.disabled = true;
  updateLater.disabled = true;
  try {
    if (shellChanged) shellUpdated();
    else if (swRegistration?.waiting) await activateUpdate();
    else throw new Error('La actualización todavía no está preparada.');
  } catch {
    reloadConsented = false;
    updateNow.disabled = false;
    updateLater.disabled = false;
    updateTitle.textContent = 'No se pudo actualizar. Puede intentarlo más tarde.';
  }
});
