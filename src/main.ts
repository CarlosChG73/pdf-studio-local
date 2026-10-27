import './styles.css';
import { PdfViewer } from './app/viewer';
import { describePdfError } from './pdf/load';

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
const zoomLevel = requireElement<HTMLSpanElement>('#zoom-level');
const zoomOutButton = requireElement<HTMLButtonElement>('#zoom-out');
const zoomInButton = requireElement<HTMLButtonElement>('#zoom-in');
const fitWidthButton = requireElement<HTMLButtonElement>('#fit-width');
const fitPageButton = requireElement<HTMLButtonElement>('#fit-page');

const viewer = new PdfViewer(canvas, scroller, (state) => {
  const hasDocument = state.pages > 0;

  prevButton.disabled = !hasDocument || state.page <= 1 || state.busy;
  nextButton.disabled = !hasDocument || state.page >= state.pages || state.busy;
  pageInput.disabled = !hasDocument || state.busy;
  zoomOutButton.disabled = !hasDocument || state.zoom <= 0.25;
  zoomInButton.disabled = !hasDocument || state.zoom >= 4;
  fitWidthButton.disabled = !hasDocument;
  fitPageButton.disabled = !hasDocument;

  if (hasDocument) {
    pageInput.max = String(state.pages);
    if (!state.busy) pageInput.value = String(state.page);
    pageTotal.textContent = `de ${state.pages}`;
    zoomLevel.textContent = `${Math.round(state.zoom * 100)} %`;
  } else {
    pageTotal.textContent = 'de —';
    zoomLevel.textContent = '—';
  }
});

input.addEventListener('change', async () => {
  const file = input.files?.[0];

  if (!file) return;

  status.textContent = `Cargando «${file.name}»…`;

  try {
    await viewer.open(file);
    const pages = viewer.pageCount;
    status.textContent = `«${file.name}» — ${pages} ${pages === 1 ? 'página' : 'páginas'}`;
  } catch (error) {
    status.textContent = describePdfError(error);
  }
});

prevButton.addEventListener('click', () => {
  void viewer.goToPage(viewer.currentPage - 1);
});

nextButton.addEventListener('click', () => {
  void viewer.goToPage(viewer.currentPage + 1);
});

const commitPage = (): void => {
  const value = Number.parseInt(pageInput.value, 10);

  if (Number.isNaN(value)) {
    pageInput.value = String(viewer.currentPage);
    return;
  }

  void viewer.goToPage(value);
};

pageInput.addEventListener('change', commitPage);
pageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitPage();
  }
});

zoomInButton.addEventListener('click', () => {
  void viewer.zoomIn();
});

zoomOutButton.addEventListener('click', () => {
  void viewer.zoomOut();
});

fitWidthButton.addEventListener('click', () => {
  void viewer.fitWidth();
});

fitPageButton.addEventListener('click', () => {
  void viewer.fitPage();
});
