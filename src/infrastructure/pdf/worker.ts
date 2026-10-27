import { GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configuración del procesamiento de PDF
GlobalWorkerOptions.workerSrc = workerUrl;
