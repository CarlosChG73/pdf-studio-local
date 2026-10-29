// Gestiona el estado y el resultado OCR de una página, ligado al documento vigente.
import { recognizePage } from '../infrastructure/ocr/engine';

export type OcrStatus = 'idle' | 'working' | 'done' | 'empty' | 'error';

export interface OcrSource {
  canvas: HTMLCanvasElement;
  page: number;
  token: number;
}

export interface OcrState {
  status: OcrStatus;
  documentToken: number;
  page: number | null;
  progress: number;
  label: string;
  text: string;
  confidence: number | null;
  error: string | null;
}

const INITIAL_STATE: OcrState = {
  status: 'idle',
  documentToken: 0,
  page: null,
  progress: 0,
  label: '',
  text: '',
  confidence: null,
  error: null,
};

function translateStatus(status: string): string {
  if (status.includes('recognizing')) return 'Reconociendo texto';
  if (status.includes('language') || status.includes('initializing api')) {
    return 'Preparando el idioma';
  }
  if (status.includes('core')) return 'Cargando el motor OCR';

  return 'Procesando la página';
}

/**
 * Estado del reconocimiento de una página.
 * Los resultados se descartan si cambia el documento o si el usuario los borra.
 */
export class OcrSession {
  private state: OcrState = INITIAL_STATE;
  private generation = 0;

  constructor(private readonly notify: (state: OcrState) => void) {}

  get snapshot(): OcrState {
    return this.state;
  }

  /** Reinicia el resultado cuando se abre o se cierra un documento. */
  setDocument(token: number): void {
    if (token === this.state.documentToken) return;

    this.generation += 1;
    this.state = { ...INITIAL_STATE, documentToken: token };
    this.emit();
  }

  async recognize(source: OcrSource): Promise<void> {
    if (source.token !== this.state.documentToken) return;
    if (this.state.status === 'working') return;

    const generation = ++this.generation;

    this.state = {
      status: 'working',
      documentToken: source.token,
      page: source.page,
      progress: 0,
      label: 'Preparando el motor OCR',
      text: '',
      confidence: null,
      error: null,
    };
    this.emit();

    try {
      const result = await recognizePage(source.canvas, (progress) => {
        if (generation !== this.generation) return;

        const recognizing = progress.status.includes('recognizing');

        this.state = {
          ...this.state,
          progress: recognizing
            ? 0.15 + progress.progress * 0.85
            : progress.progress * 0.15,
          label: translateStatus(progress.status),
        };
        this.emit();
      });

      if (generation !== this.generation) return;

      if (result.text.length === 0) {
        this.state = {
          ...this.state,
          status: 'empty',
          progress: 1,
          label: '',
        };
      } else {
        this.state = {
          ...this.state,
          status: 'done',
          progress: 1,
          label: '',
          text: result.text,
          confidence: result.confidence,
        };
      }
    } catch {
      if (generation !== this.generation) return;

      this.state = {
        ...this.state,
        status: 'error',
        label: '',
        error:
          'No se pudo reconocer el texto. Comprueba que los recursos de OCR estén disponibles e inténtalo de nuevo.',
      };
    }

    this.emit();
  }

  /** Descarta el resultado visible sin mezclarlo con otro documento. */
  discard(): void {
    if (this.state.status === 'working') return;

    this.generation += 1;
    this.state = { ...INITIAL_STATE, documentToken: this.state.documentToken };
    this.emit();
  }

  private emit(): void {
    this.notify(this.state);
  }
}
