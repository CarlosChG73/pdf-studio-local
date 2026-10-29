// Coordina el documento activo, navegación, búsqueda y renderizado; descarta trabajo obsoleto.
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import {
  clampPage, editorialToPhysical, physicalToEditorial, validEditorialReference,
  type EditorialPageReference,
} from '../domain/pagination';
import { findMatchRanges } from '../domain/search';
import { openPdf } from '../infrastructure/pdf/document';
import {
  createTextLayer,
  drawHighlights,
  extractPageText,
  getPageSize,
  renderPage,
  renderPageImage,
  type HighlightRect,
  type PageText,
  type PageViewport,
} from '../infrastructure/pdf/renderer';

export type ZoomMode = 'fit-width' | 'fit-page' | 'manual';
export type PdfBookmark = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>[number];

export interface SearchMatch {
  page: number;
  start: number;
  end: number;
}

export interface SessionState {
  fileName: string | null;
  pages: number;
  page: number;
  pageLabel: string | null;
  hasPageLabels: boolean;
  manualReference: EditorialPageReference | null;
  manualPageLabel: string | null;
  outline: PdfBookmark[];
  zoom: number;
  mode: ZoomMode;
  busy: boolean;
  searching: boolean;
  query: string;
  matches: number;
  matchIndex: number;
  token: number;
}

export interface OcrPageSource {
  canvas: HTMLCanvasElement;
  page: number;
  token: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
const VIEWER_PADDING = 32;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export class PdfSession {
  private document: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private renderTask: RenderTask | null = null;
  private renderGeneration = 0;
  private searchGeneration = 0;
  private fileName: string | null = null;
  private page = 1;
  private pageLabels: string[] | null = null;
  private manualReference: EditorialPageReference | null = null;
  private outline: PdfBookmark[] = [];
  private navigationGeneration = 0;
  private mode: ZoomMode = 'fit-width';
  private manualZoom = 1;
  private zoom = 1;
  private busy = false;
  private searching = false;
  private query = '';
  private searchOriginPage: number | null = null;
  private matches: SearchMatch[] = [];
  private matchIndex = -1;
  private documentToken = 0;
  private readonly textCache = new Map<number, PageText>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly textLayerHost: HTMLElement,
    private readonly scroller: HTMLElement,
    private readonly notify: (state: SessionState) => void,
  ) {
    let resizeTimer: number | undefined;

    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);

      resizeTimer = window.setTimeout(() => {
        if (this.document && this.mode !== 'manual') {
          void this.render().catch(() => undefined);
        }
      }, 150);
    });
  }

  get state(): SessionState {
    return {
      fileName: this.fileName,
      pages: this.pageCount,
      page: this.page,
      pageLabel: this.pageLabels?.[this.page - 1] || null,
      hasPageLabels: this.pageLabels !== null,
      manualReference: this.manualReference ? { ...this.manualReference } : null,
      manualPageLabel: physicalToEditorial(this.page, this.manualReference) !== null
        ? String(physicalToEditorial(this.page, this.manualReference)) : null,
      outline: this.outline,
      zoom: this.zoom,
      mode: this.mode,
      busy: this.busy,
      searching: this.searching,
      query: this.query,
      matches: this.matches.length,
      matchIndex: this.matchIndex,
      token: this.documentToken,
    };
  }

  get pageCount(): number {
    return this.document?.numPages ?? 0;
  }

  get currentPage(): number {
    return this.page;
  }

  async open(file: File): Promise<void> {
    // close() increments the token synchronously, before its first await.
    const closing = this.close();
    const token = this.documentToken;

    try {
      await closing;
      if (token !== this.documentToken) return;

      const { task, document } = await openPdf(file);
      if (token !== this.documentToken) {
        await task.destroy();
        return;
      }

      this.loadingTask = task;
      // Labels are optional metadata: failure must not prevent physical navigation.
      let labels: string[] | null = null;
      try {
        labels = await document.getPageLabels?.() ?? null;
      } catch (error) {
        if (token === this.documentToken) console.warn('No se pudieron leer las etiquetas de página.', error);
      }
      if (token !== this.documentToken) return;
      let outline: PdfBookmark[] | null = null;
      try {
        outline = await document.getOutline?.() ?? null;
      } catch (error) {
        if (token === this.documentToken) console.warn('No se pudieron leer los marcadores.', error);
      }
      if (token !== this.documentToken) return;
      this.outline = Array.isArray(outline) ? outline : [];
      this.pageLabels = Array.isArray(labels) && labels.length === document.numPages
        && labels.every(label => typeof label === 'string')
        && labels.some(label => label.trim().length > 0) ? [...labels] : null;
      this.document = document;
      this.fileName = file.name;
      this.page = 1;
      this.mode = 'fit-width';
      this.zoom = 1;

      await this.render();
    } catch (error) {
      // An obsolete opening must not report errors for the current document.
      if (token !== this.documentToken) return;
      throw error;
    }
  }

  async close(): Promise<void> {
    this.renderGeneration += 1;
    this.searchGeneration += 1;
    this.documentToken += 1;
    this.navigationGeneration += 1;
    const token = this.documentToken;
    this.renderTask?.cancel();
    this.renderTask = null;

    const task = this.loadingTask;
    this.loadingTask = null;
    this.document = null;
    this.fileName = null;
    this.page = 1;
    this.pageLabels = null;
    this.manualReference = null;
    this.outline = [];
    this.busy = false;
    this.searching = false;
    this.query = '';
    this.searchOriginPage = null;
    this.matches = [];
    this.matchIndex = -1;
    this.textCache.clear();

    if (task) {
      await task.destroy();
    }

    if (token !== this.documentToken) return;

    this.resetCanvas();
    this.textLayerHost.replaceChildren();
    this.emit();
  }

  async goToPage(pageNumber: number): Promise<void> {
    this.navigationGeneration += 1;
    if (!this.document) return;

    const target = clampPage(pageNumber, this.pageCount);

    if (target === this.page) {
      this.emit();
      return;
    }

    this.page = target;
    this.scroller.scrollTop = 0;
    await this.render();
  }

  async goToPageLabel(label: string): Promise<'navigated' | 'not-found' | 'ambiguous' | 'unavailable'> {
    this.navigationGeneration += 1;
    if (!this.pageLabels && !this.manualReference) return 'unavailable';
    const value = label.trim();
    if (!value) return 'not-found';
    const targets = new Set<number>();
    for (let index = 0; index < (this.pageLabels?.length ?? 0); index += 1) {
      if (this.pageLabels?.[index]?.trim() === value) targets.add(index + 1);
    }
    const manualTarget = editorialToPhysical(value, this.manualReference);
    if (manualTarget !== null) targets.add(manualTarget);
    if (targets.size > 1) return 'ambiguous';
    const target = targets.values().next().value;
    if (target === undefined) return 'not-found';
    await this.goToPage(target);
    return 'navigated';
  }

  setManualPageNumber(editorialPage: number | null): boolean {
    if (!this.document || this.busy) return false;
    const reference = editorialPage === null ? null : { physicalPage: this.page, editorialPage };
    if (reference && !validEditorialReference(reference, this.pageCount)) return false;
    this.manualReference = reference;
    this.emit();
    return true;
  }

  async goToDestination(destination: unknown, token = this.documentToken): Promise<'navigated' | 'invalid' | 'obsolete'> {
    const document = this.document;
    if (!document || token !== this.documentToken) return 'obsolete';
    const generation = ++this.navigationGeneration;
    const obsolete = () => token !== this.documentToken || generation !== this.navigationGeneration;
    try {
      const explicit = typeof destination === 'string'
        ? await document.getDestination(destination) : destination;
      if (obsolete()) return 'obsolete';
      if (!Array.isArray(explicit) || explicit.length < 2) return 'invalid';
      const fit = explicit[1];
      if (!fit || typeof fit !== 'object'
        || !['XYZ', 'Fit', 'FitH', 'FitV', 'FitR', 'FitB', 'FitBH', 'FitBV'].includes(fit.name)) return 'invalid';
      const reference: unknown = explicit[0];
      let index: number;
      if (typeof reference === 'number' && Number.isInteger(reference)) index = reference;
      else if (reference && typeof reference === 'object'
        && 'num' in reference && 'gen' in reference
        && Number.isInteger(reference.num) && Number.isInteger(reference.gen)
        && Number(reference.num) >= 0 && Number(reference.gen) >= 0) {
        index = await document.getPageIndex(reference as { num: number; gen: number });
      } else return 'invalid';
      if (obsolete()) return 'obsolete';
      if (!Number.isInteger(index) || index < 0 || index >= document.numPages) return 'invalid';
      await this.goToPage(index + 1);
      return token === this.documentToken ? 'navigated' : 'obsolete';
    } catch (error) {
      if (obsolete()) return 'obsolete';
      throw error;
    }
  }

  async zoomIn(): Promise<void> {
    if (!this.document) return;
    this.mode = 'manual';
    this.manualZoom = clampZoom(this.zoom * ZOOM_STEP);
    await this.render();
  }

  async zoomOut(): Promise<void> {
    if (!this.document) return;
    this.mode = 'manual';
    this.manualZoom = clampZoom(this.zoom / ZOOM_STEP);
    await this.render();
  }

  async fitWidth(): Promise<void> {
    if (!this.document) return;
    this.mode = 'fit-width';
    await this.render();
  }

  async fitPage(): Promise<void> {
    if (!this.document) return;
    this.mode = 'fit-page';
    await this.render();
  }

  async search(query: string): Promise<void> {
    this.query = query;
    const generation = ++this.searchGeneration;

    this.matches = [];
    this.matchIndex = -1;

    if (!this.document || query.trim().length === 0) {
      this.searching = false;
      if (this.document && this.searchOriginPage !== null) {
        this.page = this.searchOriginPage;
        this.scroller.scrollTop = 0;
      }
      this.searchOriginPage = null;
      await this.render();
      return;
    }

    if (this.searchOriginPage === null) this.searchOriginPage = this.page;

    this.searching = true;
    this.emit();

    const document = this.document;
    const found: SearchMatch[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const pageText = await this.getPageText(pageNumber);

        if (generation !== this.searchGeneration) return;

        for (const range of findMatchRanges(pageText.text, query)) {
          found.push({ page: pageNumber, ...range });
        }
      }

      this.searching = false;
      this.matches = found;

      if (found.length > 0) {
        this.matchIndex = 0;
        this.page = found[0].page;
        this.scroller.scrollTop = 0;
      }

      await this.render();
    } finally {
      if (generation === this.searchGeneration && this.searching) {
        this.searching = false;
        this.emit();
      }
    }
  }

  async nextMatch(): Promise<void> {
    await this.moveMatch(1);
  }

  async previousMatch(): Promise<void> {
    await this.moveMatch(-1);
  }

  async currentPageText(): Promise<string> {
    if (!this.document) return '';

    const pageText = await this.getPageText(this.page);

    return pageText.text;
  }

  /**
   * Prepara una imagen limpia de la página actual para OCR.
   * Devuelve también el token del documento para descartar resultados obsoletos.
   */
  async prepareOcrPage(): Promise<OcrPageSource | null> {
    const document = this.document;

    if (!document) return null;

    const page = this.page;
    const token = this.documentToken;
    const canvas = await renderPageImage(document, page);

    if (token !== this.documentToken) return null;

    return { canvas, page, token };
  }

  private async moveMatch(step: number): Promise<void> {
    if (this.matches.length === 0) return;

    this.matchIndex =
      (this.matchIndex + step + this.matches.length) % this.matches.length;

    const match = this.matches[this.matchIndex];

    if (!match) return;

    if (match.page !== this.page) {
      this.page = match.page;
      this.scroller.scrollTop = 0;
    }

    await this.render();
  }

  private async render(): Promise<void> {
    const document = this.document;

    if (!document) return;

    const generation = ++this.renderGeneration;
    this.renderTask?.cancel();
    this.renderTask = null;
    this.busy = true;
    this.emit();

    try {
      const size = await getPageSize(document, this.page);

      if (generation !== this.renderGeneration) return;

      const scale = this.resolveScale(size);
      const { task, viewport } = await renderPage(
        document,
        this.page,
        this.canvas,
        scale,
      );

      if (generation !== this.renderGeneration) {
        task.cancel();
        return;
      }

      this.renderTask = task;
      await task.promise;

      if (generation !== this.renderGeneration) return;

      this.renderTask = null;
      this.zoom = scale;

      const textLayer = await createTextLayer(document, this.page, viewport);

      if (generation !== this.renderGeneration) return;

      this.textLayerHost.replaceChildren(textLayer);

      const activeRect = await this.paintHighlights(viewport);

      if (generation !== this.renderGeneration) return;

      if (activeRect) {
        this.scrollToHighlight(activeRect);
      }

      this.busy = false;
      this.emit();
    } catch (error) {
      if ((error as { name?: string }).name === 'RenderingCancelledException') return;
      if (generation !== this.renderGeneration) return;

      this.busy = false;
      this.emit();
      throw error;
    }
  }

  private async paintHighlights(
    viewport: PageViewport,
  ): Promise<HighlightRect | null> {
    if (this.matches.length === 0) return null;

    const pageMatches = this.matches.filter((match) => match.page === this.page);

    if (pageMatches.length === 0) return null;

    const pageText = await this.getPageText(this.page);
    const activeMatch = this.matchIndex >= 0 ? this.matches[this.matchIndex] : undefined;
    const activeIndex = activeMatch ? pageMatches.indexOf(activeMatch) : -1;

    return drawHighlights(this.canvas, viewport, pageText, pageMatches, activeIndex);
  }

  private scrollToHighlight(rect: HighlightRect): void {
    const scrollerRect = this.scroller.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    const top =
      canvasRect.top - scrollerRect.top + this.scroller.scrollTop + rect.y;
    const bottom = top + rect.height;
    const visibleTop = this.scroller.scrollTop;
    const visibleBottom = visibleTop + this.scroller.clientHeight;

    if (top >= visibleTop + 8 && bottom <= visibleBottom - 8) return;

    this.scroller.scrollTo({
      top: Math.max(0, top - this.scroller.clientHeight / 2 + rect.height / 2),
      behavior: 'smooth',
    });
  }

  private async getPageText(pageNumber: number): Promise<PageText> {
    const cached = this.textCache.get(pageNumber);

    if (cached) return cached;

    const document = this.document;

    if (!document) {
      throw new Error('No hay ningún documento abierto.');
    }

    const token = this.documentToken;
    const pageText = await extractPageText(document, pageNumber);
    if (token === this.documentToken) this.textCache.set(pageNumber, pageText);

    return pageText;
  }

  private resolveScale(size: { width: number; height: number }): number {
    if (this.mode === 'manual') return clampZoom(this.manualZoom);

    const availableWidth = Math.max(160, this.scroller.clientWidth - VIEWER_PADDING);
    const widthScale = availableWidth / size.width;

    if (this.mode === 'fit-width') return clampZoom(widthScale);

    const availableHeight = Math.max(
      160,
      window.innerHeight - this.scroller.getBoundingClientRect().top - VIEWER_PADDING,
    );

    return clampZoom(Math.min(widthScale, availableHeight / size.height));
  }

  private resetCanvas(): void {
    this.canvas.style.removeProperty('width');
    this.canvas.style.removeProperty('height');
    this.canvas.width = 300;
    this.canvas.height = 150;
  }

  private emit(): void {
    this.notify(this.state);
  }
}
