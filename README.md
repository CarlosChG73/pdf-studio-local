# Proyecto PDF

Aplicación local e instalable para consultar documentos PDF, con navegación, búsqueda, selección de texto, copia y reconocimiento óptico de páginas escaneadas. Todo el procesamiento ocurre en el dispositivo y funciona sin conexión.

## Estado

Paso 6 completado: PWA instalable con funcionamiento sin conexión. El documento, la búsqueda, la selección y el OCR se procesan localmente; la aplicación y los recursos de PDF.js quedan en caché tras la primera visita, y los de OCR tras el primer reconocimiento. Todo el procesamiento ocurre en el dispositivo.

## Requisitos

- Node.js 20 o superior (probado con Node 24).
- npm 10 o superior.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run typecheck  # comprobación de tipos
npm run build      # comprobación de tipos + build de producción en dist/
npm run preview    # servir el build localmente (necesario para probar la PWA)
```

La PWA solo se registra sobre el build de producción, no en `npm run dev`.

## Estructura

```
index.html                    Interfaz (barra, visor, búsqueda, OCR, estado)
vite.config.ts                Configuración de Vite y de la PWA
src/main.ts                   Punto de entrada: conecta la interfaz con la sesión
src/domain/                   Reglas puras, sin dependencias del navegador
  search.ts                   Búsqueda de coincidencias
  pagination.ts               Límites de página
src/application/
  pdf-session.ts              Casos de uso: abrir, navegar, zoom, buscar, copiar
  ocr-session.ts              Estado del OCR, progreso y descarte de resultados
src/infrastructure/pdf/
  document.ts                 Apertura del PDF y mensajes de error
  renderer.ts                 Render, capa de texto, extracción y resaltados
  worker.ts                   Configuración del worker de PDF.js
src/infrastructure/ocr/
  engine.ts                   Tesseract.js en español con recursos locales
public/ocr/                   Worker, núcleos WASM y modelo de español
public/icons/                 Iconos de instalación
src/styles.css                Estilos, tema claro/oscuro y adaptación móvil
src/vite-env.d.ts             Tipos de Vite
```

## OCR local

El botón «Reconocer página» procesa la página actual en un canvas aparte, sin
resaltados de búsqueda. Tesseract.js y el modelo `spa` se cargan desde
`public/ocr`, no desde un CDN. La primera ejecución tarda más (carga del motor y
del idioma); las siguientes reutilizan el worker y la caché del navegador.

El resultado indica la página y la confianza media, y puede copiarse o
descartarse. Al abrir otro documento se elimina automáticamente para no mezclar
resultados.

## Instalación y uso sin conexión

`npm run build` genera la PWA (manifest, service worker y precache). La primera
visita guarda la interfaz y el worker de PDF.js (unos 1,7 MB); el OCR se cachea
la primera vez que se usa (worker, un núcleo WASM y el modelo, unos 6 MB). A
partir de ahí la aplicación se puede abrir e instalar sin conexión (el service
worker necesita HTTPS o `localhost`, como cualquier PWA):

- **Chrome/Edge/Android:** icono de instalar en la barra de direcciones.
- **iPhone/iPad:** Compartir → «Añadir a la pantalla de inicio».

Los PDF que se abren no se guardan ni se envían: solo se leen en memoria durante
la sesión.

## Hoja de ruta

- [x] 1. Esqueleto del proyecto y selección de archivo
- [x] 2. Abrir PDF, renderizar páginas, navegar y zoom (RF-01, RF-02)
- [x] 3. Búsqueda de texto con resaltado y navegación de coincidencias (RF-03)
- [x] 4. Selección y copia de fragmentos y de la página completa (RF-04)
- [x] 5. Reconocimiento de una página en español (RF-09)
- [x] 6. Ciclo de vida de resultados: copiar, descartar y no mezclar documentos (RF-10)
- [x] 7. PWA instalable y funcionamiento sin conexión (RC-01)
- [ ] 8. Adaptación a móviles y temas
- [ ] 9. Pruebas E2E y documentación de límites
