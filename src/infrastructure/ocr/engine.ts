import { createWorker } from 'tesseract.js';

/**
 * OCR local con Tesseract.js.
 *
 * El worker, el núcleo WASM y el modelo de español se sirven desde `public/ocr`,
 * así que el documento nunca sale del dispositivo y el reconocimiento puede
 * funcionar sin conexión una vez cargados los recursos.
 */

const BASE = import.meta.env.BASE_URL;
const LANGUAGE = 'spa';

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

let workerPromise: Promise<OcrWorker> | null = null;
let progressListener: ((progress: OcrProgress) => void) | null = null;

/** Serializa los trabajos para no usar el mismo worker en paralelo. */
let queue: Promise<unknown> = Promise.resolve();

function createOcrWorker(): Promise<OcrWorker> {
  return createWorker(LANGUAGE, 1, {
    workerPath: `${BASE}ocr/worker.min.js`,
    corePath: `${BASE}ocr/core`,
    langPath: `${BASE}ocr/lang`,
    gzip: true,
    logger: (message) => {
      progressListener?.({
        status: message.status,
        progress: message.progress,
      });
    },
  });
}

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = createOcrWorker().catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}

async function runRecognition(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  progressListener = onProgress ?? null;

  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(canvas);

    return {
      text: data.text.trim(),
      confidence: Math.round(data.confidence),
    };
  } catch (error) {
    const worker = workerPromise;

    workerPromise = null;
    await worker?.then((value) => value.terminate()).catch(() => undefined);

    throw error;
  } finally {
    progressListener = null;
  }
}

export function recognizePage(
  canvas: HTMLCanvasElement,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  const job = queue.then(() => runRecognition(canvas, onProgress));

  queue = job.catch(() => undefined);

  return job;
}
