# Recursos OCR locales

Estos archivos se sirven desde la propia aplicación para que el reconocimiento
no dependa de CDN ni envíe imágenes a terceros.

| Archivo | Origen | Licencia |
|---|---|---|
| `worker.min.js` | `tesseract.js@7.0.0/dist/worker.min.js` | Apache-2.0 |
| `core/tesseract-core-lstm.wasm.js` | `tesseract.js-core` | Apache-2.0 |
| `core/tesseract-core-simd-lstm.wasm.js` | `tesseract.js-core` | Apache-2.0 |
| `core/tesseract-core-relaxedsimd-lstm.wasm.js` | `tesseract.js-core` | Apache-2.0 |
| `lang/spa.traineddata.gz` | `@tesseract.js-data/spa@1.0.0` (`4.0.0_best_int`) | Apache-2.0 |

Los tres núcleos permiten que Tesseract elija la variante SIMD disponible en el
navegador. Solo se descarga la que se usa en cada equipo. El modelo de español
se carga la primera vez y después queda en la caché del navegador.
