import './styles.css';
import { OcrSession, type OcrState } from './application/ocr-session';
import { PdfSession, type SessionState } from './application/pdf-session';
import { describePdfError } from './infrastructure/pdf/document';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Falta el elemento ${selector} en la interfaz.`);
  }

  return element;
}

const input = requireElement<HTMLInputElement>('#pdf-file');
const status = requireElement<HTMLParagraphElement>('#pdf-status');
const canvas = requireElement<HTMLCanvasElement>('#pdf-canvas');
const scroller = requireElement<HTMLElement>('#viewer');

const prevButton = requireElement<HTMLButtonElement>('#prev-page');
const nextButton = requireElement<HTMLButtonElement>('#next-page');
const pageInput = requireElement<HTMLInputElement>('#page-number');
const pageTotal = requireElement<HTMLSpanElement>('#page-total');

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

  const hasDocument = state.pages > 0;
  const idle = hasDocument && !state.busy;

  prevButton.disabled = !idle || state.page <= 1;
  nextButton.disabled = !idle || state.page >= state.pages;
  pageInput.disabled = !hasDocument || state.busy;

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
    pageTotal.textContent = `de ${state.pages}`;
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

const session = new PdfSession(canvas, scroller, (state) => {
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

copyButton.addEventListener('click', async () => {
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
