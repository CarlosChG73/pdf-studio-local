import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { openPdf } from '../pdf/load';
import { getPageSize, renderPage } from '../pdf/render';

export type ZoomMode = 'fit-width' | 'fit-page' | 'manual';

export interface ViewerState {
  pages: number;
  page: number;
  zoom: number;
  mode: ZoomMode;
  busy: boolean;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.25;
const VIEWER_PADDING = 32;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export class PdfViewer {
  private document: PDFDocumentProxy | null = null;
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private renderTask: RenderTask | null = null;
  private generation = 0;
  private page = 1;
  private mode: ZoomMode = 'fit-width';
  private manualZoom = 1;
  private zoom = 1;
  private busy = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scroller: HTMLElement,
    private readonly notify: (state: ViewerState) => void,
  ) {
    window.addEventListener('resize', () => {
      if (this.document && this.mode !== 'manual') {
        void this.render().catch(() => undefined);
      }
    });
  }

  get pageCount(): number {
    return this.document?.numPages ?? 0;
  }

  get currentPage(): number {
    return this.page;
  }

  async open(file: File): Promise<void> {
    await this.close();

    const { task, document } = await openPdf(file);
    this.loadingTask = task;
    this.document = document;
    this.page = 1;
    this.mode = 'fit-width';
    this.zoom = 1;

    await this.render();
  }

  async goToPage(pageNumber: number): Promise<void> {
    if (!this.document) return;

    const target = Math.min(Math.max(1, Math.trunc(pageNumber)), this.document.numPages);

    if (target === this.page) {
      this.emit();
      return;
    }

    this.page = target;
    this.scroller.scrollTop = 0;
    await this.render();
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

  async close(): Promise<void> {
    this.generation += 1;
    this.renderTask?.cancel();
    this.renderTask = null;

    const task = this.loadingTask;
    this.loadingTask = null;
    this.document = null;
    this.page = 1;
    this.busy = false;

    if (task) {
      await task.destroy();
    }

    this.resetCanvas();
    this.emit();
  }

  private async render(): Promise<void> {
    const document = this.document;

    if (!document) return;

    const generation = ++this.generation;
    this.renderTask?.cancel();
    this.renderTask = null;
    this.busy = true;
    this.emit();

    try {
      const size = await getPageSize(document, this.page);

      if (generation !== this.generation) return;

      const scale = this.resolveScale(size);
      const { task } = await renderPage(document, this.page, this.canvas, scale);

      if (generation !== this.generation) {
        task.cancel();
        return;
      }

      this.renderTask = task;
      await task.promise;

      if (generation !== this.generation) return;

      this.renderTask = null;
      this.zoom = scale;
      this.busy = false;
      this.emit();
    } catch (error) {
      if ((error as { name?: string }).name === 'RenderingCancelledException') return;
      if (generation !== this.generation) return;

      this.busy = false;
      this.emit();
      throw error;
    }
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
    this.notify({
      pages: this.pageCount,
      page: this.page,
      zoom: this.zoom,
      mode: this.mode,
      busy: this.busy,
    });
  }
}
