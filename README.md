# Proyecto PDF

Aplicación local para consultar documentos PDF, con navegación, búsqueda, copia de texto y reconocimiento óptico de páginas escaneadas. Todo el procesamiento ocurre en el dispositivo.

## Estado

Paso 4 completado: OCR local de una página en español y ciclo de vida de resultados. El texto reconocido se puede copiar o descartar, y se borra automáticamente al abrir otro documento. La selección de fragmentos con el ratón sigue pendiente (requiere capa de texto sobre el canvas). Todo el procesamiento ocurre en el dispositivo.

## Requisitos

- Node.js 20 o superior (probado con Node 24).
- npm 10 o superior.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run typecheck  # comprobación de tipos
npm run build      # comprobación de tipos + build de producción en dist/
npm run preview    # servir el build localmente
```

## Estructura

```
index.html                    Interfaz (barra, visor, búsqueda, OCR, estado)
src/main.ts                   Punto de entrada: conecta la interfaz con la sesión
src/domain/                   Reglas puras, sin dependencias del navegador
  search.ts                   Búsqueda de coincidencias
  pagination.ts               Límites de página
src/application/
  pdf-session.ts              Casos de uso: abrir, navegar, zoom, buscar, copiar
  ocr-session.ts              Estado del OCR, progreso y descarte de resultados
src/infrastructure/pdf/
  document.ts                 Apertura del PDF y mensajes de error
  renderer.ts                 Render, extracción de texto y resaltados
  worker.ts                   Configuración del worker de PDF.js
src/infrastructure/ocr/
  engine.ts                   Tesseract.js en español con recursos locales
public/ocr/                   Worker, núcleos WASM y modelo de español
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

## Hoja de ruta

- [x] 1. Esqueleto del proyecto y selección de archivo
- [x] 2. Abrir PDF, renderizar páginas, navegar y zoom (RF-01, RF-02)
- [x] 3. Búsqueda de texto con resaltado y navegación de coincidencias (RF-03)
- [ ] 4. Selección y copia (RF-04): copia de página lista; falta selección de fragmentos
- [x] 5. Reconocimiento de una página en español (RF-09)
- [x] 6. Ciclo de vida de resultados: copiar, descartar y no mezclar documentos (RF-10)
- [ ] 7. Funcionamiento sin conexión (RC-01)
- [ ] 8. Adaptación a móviles y temas
- [ ] 9. Pruebas E2E y documentación de límites
