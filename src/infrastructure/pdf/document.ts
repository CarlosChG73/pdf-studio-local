import './worker';
import { getDocument } from 'pdfjs-dist';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

export interface OpenedPdf {
  task: PDFDocumentLoadingTask;
  document: PDFDocumentProxy;
}

export async function openPdf(file: File): Promise<OpenedPdf> {
  const data = new Uint8Array(await file.arrayBuffer());
  const task = getDocument({ data });
  const document = await task.promise;

  return { task, document };
}

export function describePdfError(error: unknown): string {
  const name = (error as { name?: string }).name;

  switch (name) {
    case 'InvalidPDFException':
      return 'El archivo no parece un PDF válido.';
    case 'PasswordException':
      return 'El PDF está protegido con contraseña.';
    case 'MissingPDFException':
      return 'No se encontró el archivo.';
    default:
      return 'No se pudo abrir el documento. Prueba con otro archivo.';
  }
}
