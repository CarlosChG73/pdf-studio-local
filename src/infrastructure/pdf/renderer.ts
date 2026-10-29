// Adaptador PDF.js: canvas, capa de texto, extracción, resaltados e imagen independiente para OCR.
import { TextLayer, Util } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import type { TextRange } from '../../domain/search';

export interface PageSize {
  width: number;
  height: number;
}

export type PageViewport = ReturnType<PDFPageProxy['getViewport']>;

export interface RenderResult {
  task: RenderTask;
  viewport: ReturnType<PDFPageProxy['getViewport']>;
  width: number;
  height: number;
}

export interface TextBox {
  start: number;
  end: number;
  text: string;
  transform: number[];
  width: number;
  height: number;
}

export interface PageText {
  text: string;
  boxes: TextBox[];
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

  return { task, viewport, width, height };
}

const MAX_OCR_SIDE = 2400;
const OCR_SCALE = 2.5;

/**
 * Crea una capa de texto transparente superpuesta al canvas.
 *
 * Se devuelve un elemento nuevo en lugar de reutilizar un contenedor para que
 * un render cancelado no pueda mezclar sus fragmentos con los de la página
 * siguiente.
 */
export async function createTextLayer(
  document: PDFDocumentProxy,
  pageNumber: number,
  viewport: ReturnType<PDFPageProxy['getViewport']>,
): Promise<HTMLElement> {
  const page = await document.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const container = window.document.createElement('div');

  container.className = 'textLayer';
  container.style.setProperty('--total-scale-factor', String(viewport.scale));
  container.style.setProperty('--scale-round-x', '1px');
  container.style.setProperty('--scale-round-y', '1px');

  const layer = new TextLayer({
    textContentSource: textContent,
    container,
    viewport,
  });

  await layer.render();

  return container;
}
/**
 * Renderiza una página en un canvas independiente, sin resaltados,
 * para alimentar el motor de OCR.
 */
export async function renderPageImage(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<HTMLCanvasElement> {
  const page = await document.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(
    OCR_SCALE,
    MAX_OCR_SIDE / Math.max(base.width, base.height),
  );
  const viewport = page.getViewport({ scale });
  const canvas = window.document.createElement('canvas');

  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo preparar la imagen para OCR.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;

  return canvas;
}

export async function extractPageText(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<PageText> {
  const page = await document.getPage(pageNumber);
  const content = await page.getTextContent();

  let text = '';
  const boxes: TextBox[] = [];

  for (const item of content.items) {
    if (!('str' in item) || item.str.length === 0) continue;

    const start = text.length;
    text += item.str;

    boxes.push({
      start,
      end: text.length,
      text: item.str,
      transform: item.transform,
      width: item.width,
      height: Math.abs(item.height) || 10,
    });

    if (item.hasEOL) {
      text += '\n';
    }
  }

  return { text, boxes };
}

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pinta los resaltados sobre el canvas ya renderizado.
 * Devuelve el rectángulo de la coincidencia activa para poder desplazarse hasta ella.
 */
export function drawHighlights(
  canvas: HTMLCanvasElement,
  viewport: ReturnType<PDFPageProxy['getViewport']>,
  pageText: PageText,
  ranges: TextRange[],
  activeIndex: number,
): HighlightRect | null {
  if (ranges.length === 0) return null;

  const context = canvas.getContext('2d');

  if (!context) return null;

  const pixelRatio = window.devicePixelRatio || 1;
  let activeRect: HighlightRect | null = null;

  context.save();
  context.scale(pixelRatio, pixelRatio);

  ranges.forEach((range, index) => {
    context.fillStyle =
      index === activeIndex ? 'rgba(255, 159, 10, 0.55)' : 'rgba(255, 214, 10, 0.35)';

    const rects = rangeRects(pageText, viewport, range);

    for (const rect of rects) {
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    if (index === activeIndex && rects.length > 0) {
      activeRect = rects[0] ?? null;
    }
  });

  context.restore();

  return activeRect;
}

function rangeRects(
  pageText: PageText,
  viewport: ReturnType<PDFPageProxy['getViewport']>,
  range: TextRange,
): Array<{ x: number; y: number; width: number; height: number }> {
  const rects: Array<{ x: number; y: number; width: number; height: number }> = [];
  const scale = viewport.scale;

  for (const box of pageText.boxes) {
    const start = Math.max(range.start, box.start);
    const end = Math.min(range.end, box.end);

    if (start >= end) continue;

    const matrix = Util.transform(viewport.transform, box.transform);
    const charWidth = (box.width * scale) / Math.max(1, box.text.length);

    rects.push({
      x: matrix[4] + (start - box.start) * charWidth,
      y: matrix[5] - box.height * scale,
      width: (end - start) * charWidth,
      height: box.height * scale,
    });
  }

  return rects;
}
