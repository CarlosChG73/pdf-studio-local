import { GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Vite sirve el worker de la misma versión instalada de PDF.js, sin recurrir a CDN.
GlobalWorkerOptions.workerSrc = workerUrl;
