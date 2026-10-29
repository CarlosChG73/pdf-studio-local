# Recursos locales PDF.js

`wasm/openjpeg.wasm` y `wasm/openjpeg_nowasm_fallback.js` se copiaron de
`pdfjs-dist@6.4.299/wasm/`. Se conservan `LICENSE_OPENJPEG` y
`LICENSE_PDFJS_OPENJPEG`. No son código propio y no se editan ni comentan.

`src/infrastructure/pdf/document.ts` define `wasmUrl` con barra final. Vite sirve
esta carpeta en desarrollo y la copia a producción; Workbox incluye el WASM y el
JavaScript en la precaché. No se utiliza CDN ni se cambian los colores del canvas.

Estos recursos solucionan la inicialización de OpenJPEG para JPEG2000. No se
añadió `iccUrl`: no era necesario para el fallo confirmado. Esto no acredita
compatibilidad completa con todos los perfiles de color de cualquier documento.

La prueba `tests/e2e/pdf-decoders.test.mjs` compara ambos archivos con la dependencia
instalada y verifica una imagen real online/offline. Si se actualiza PDF.js en el
futuro, revisar estas copias y sus licencias en el mismo cambio autorizado.

Fuente: [DocumentInitParameters de PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html).
