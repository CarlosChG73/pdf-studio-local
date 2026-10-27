import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

export interface PageSize {
  width: number;
  height: number;
}

export interface RenderResult {
  task: RenderTask;
  width: number;
  height: number;
}

export async function getPageSize(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<PageSize> {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });

  return { width: viewport.width, height: viewport.height };
}

export async function renderPage(
  document: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<RenderResult> {
  const page = await document.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const pixelRatio = window.devicePixelRatio || 1;

  const width = Math.max(1, Math.floor(viewport.width));
  const height = Math.max(1, Math.floor(viewport.height));

  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo obtener el contexto de dibujo del canvas.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const task = page.render({
    canvas,
    canvasContext: context,
    viewport,
    transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
  });

  return { task, width, height };
}
