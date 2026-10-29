# Arquitectura y guía de mantenimiento

Documento técnico del estado de desarrollo `0.1.0`. La guía de uso es
[README.md](../README.md); las evidencias se registran en [Validación](validacion.md).
No requiere nuevos servicios, dependencias ni cambios de arquitectura.

## Responsabilidades del código propio

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Estructura, controles con ID estables, nombres accesibles y diálogos |
| `src/main.ts` | Eventos DOM, presentación del estado, temas, ayudas, menú y consentimiento de actualización |
| `src/styles.css` | Temas y distribución responsiva; el PDF conserva sus colores |
| `src/vite-env.d.ts` | Tipos de los módulos de recursos Vite y registro PWA |
| `src/domain/pagination.ts` | Límites físicos y equivalencia editorial puntual sin extrapolación |
| `src/domain/search.ts` | Coincidencias de texto, ignorando mayúsculas y distinguiendo acentos |
| `src/application/pdf-session.ts` | Documento vigente, navegación, metadatos, búsqueda, caché de texto y coordinación de renderizado |
| `src/application/ocr-session.ts` | Estado, progreso, resultado OCR y descarte de respuestas de otro documento |
| `src/infrastructure/pdf/document.ts` | Carga local, ruta OpenJPEG, errores y liberación de cargas fallidas |
| `src/infrastructure/pdf/worker.ts` | Worker de la versión instalada de PDF.js, resuelto por Vite |
| `src/infrastructure/pdf/renderer.ts` | Dibujo HiDPI, capa seleccionable, extracción, resaltados y canvas limpio para OCR |
| `src/infrastructure/ocr/engine.ts` | Worker Tesseract reutilizable y cola de reconocimiento con recursos locales |
| `vite.config.ts` | Compilación, manifest, precaché PDF.js y caché OCR bajo demanda |
| `tests/pdf-opening.test.mjs` | Aperturas simultáneas, cambio y errores con infraestructura simulada |
| `tests/pdf-search-navigation.test.mjs` | Búsqueda, etiquetas, destinos y equivalencias, con infraestructura simulada |
| `tests/pdf-concurrency-errors.test.mjs` | Carreras, cachés y recuperación ante errores simulados |
| `tests/pdf-document.test.mjs` | Carga/liberación con PDF.js real; rechazo por contraseña controlado |
| `tests/e2e/offline.test.mjs` | PDF, búsqueda y OCR reales online y offline con servidor detenido |
| `tests/e2e/update.test.mjs` | Dos versiones reales, migración, varias pestañas, consentimiento, foco y OCR offline |
| `tests/e2e/pdf-decoders.test.mjs` | JPEG2000 real con OpenJPEG WASM, alternativa JavaScript y precaché |
| `scripts/validate-samples.mjs` | Medición manual con muestras públicas; informe local sin fijar umbrales universales |

`package.json` declara comandos y rangos; `package-lock.json` fija las versiones
resueltas; `tsconfig.json` define TypeScript estricto sin emitir JavaScript.
Se documentan aquí porque los JSON estrictos no admiten comentarios. Los archivos
propios TS/MJS/HTML/CSS contienen comentarios breves de responsabilidad; no se
modifican recursos minificados de terceros, licencias, dependencias ni builds.

## Flujos principales

1. La interfaz entrega un `File` a `PdfSession.open()`. La sesión cierra la anterior
   e incrementa su token; `openPdf()` crea la tarea PDF.js y libera una carga fallida.
2. Las etiquetas y los marcadores se leen del mismo documento. Los metadatos son
   opcionales: su ausencia/error no debe bloquear la navegación física.
3. `goToPage()` recibe posiciones físicas de base 1. Las etiquetas se resuelven
   por coincidencia; los destinos por nombre usan `getDestination()` y las
   referencias usan `getPageIndex() + 1`. Un destino fuera de rango no se recorta
   a otra página. Los marcadores llegan a la página y conservan el zoom actual;
   no implementan coordenadas/ajustes de destino ni acciones externas.
4. La búsqueda extrae texto original y conserva una caché por documento. No
   incorpora OCR. El OCR renderiza la página actual en un canvas independiente;
   su texto se conserva en la sesión OCR y puede copiarse.
5. La equivalencia manual vincula solo la página actual y un entero positivo
   introducido por el usuario. La vista previa no guarda. La navegación editorial
   reúne los destinos nativos y el manual; si hay dos posiciones, informa ambigüedad.
6. Cambiar/cerrar elimina metadatos, equivalencia, búsquedas y resultados OCR.
   Los tokens/generaciones evitan que respuestas antiguas alteren el documento vigente.

## Recursos y actualizaciones

- PDF, texto y OCR se procesan en el dispositivo. Los archivos seleccionados no
  se suben a un servidor de procesamiento.
- La PWA precachea la interfaz, worker PDF.js y OpenJPEG local. Los recursos OCR
  se cachean al usarlos y deben prepararse antes de desconectar.
- `prompt` espera consentimiento. La pestaña que acepta advierte sobre reabrir
  el PDF y conservar el OCR. Las otras pestañas no deben recargar voluntariamente.
- La migración desde el shell antiguo `autoUpdate` requiere cerrar todos sus
  clientes tras descargar la nueva versión. Las pruebas no borran cachés habituales.
- El aviso móvil reserva una franja temporal. El foco vuelve a un control visible
  cuando termina el cierre del diálogo; no debe permanecer en el aviso oculto.

## Comprobaciones antes de entregar

Ejecutar `npm run typecheck`, `npm run build` y `node --test`, respetando los
permisos de instalación/ejecución del proyecto. Las E2E usan orígenes aislados;
los navegadores, perfiles, capturas y mediciones quedan en `node_modules/.cache/`.
No confundir un test simulado, una emulación móvil o un canvas con contenido con
una validación general de fidelidad, accesibilidad, OCR o compatibilidad.

Referencias oficiales: [PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentProxy.html),
[Tesseract.js](https://github.com/naptha/tesseract.js),
[Vite PWA](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html),
[Playwright](https://playwright.dev/docs/test-assertions),
[cierre de diálogos](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event).
