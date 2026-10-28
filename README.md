# Proyecto PDF

Aplicación de consulta local de documentos PDF, con navegación, búsqueda, selección de texto, copia y reconocimiento óptico de páginas escaneadas. Implementa procesamiento en el dispositivo y configuración PWA para instalación y uso sin conexión; estos últimos requieren validación real.

## Estado

Implementados en código: visor, navegación, zoom, búsqueda con resaltados,
selección, copia, OCR local en español y configuración PWA. Hay CSS para móvil
y tema automático; su compatibilidad y usabilidad necesitan validación real.

El commit `6a7b570` (rama `mejoras`) incorpora las pruebas automatizadas y corrige
aperturas simultáneas, retorno a la página original al borrar una búsqueda,
contaminación de caché entre documentos y restablecimiento del estado de búsqueda
ante errores de extracción. La referencia de página original se conserva aunque
el usuario navegue manualmente durante la búsqueda.

La implementación y las comprobaciones descritas abajo no acreditan todavía
funcionamiento offline, compatibilidad multiplataforma ni rendimiento real.

## Requisitos

- Node.js **22.13.0 o superior**, según los rangos declarados por las dependencias
  fijadas en `package-lock.json`. Entorno verificado para pruebas, tipos y build:
  **Node.js 24.21.0**.
- npm 10 o superior.

Vite declara `^20.19.0 || >=22.12.0` ([guía oficial](https://vite.dev/guide/));
PDF.js declara `>=22.13.0 || >=24`, tanto en el paquete instalado
`pdfjs-dist@6.4.299` como en el [generador oficial del paquete](https://github.com/mozilla/pdf.js/blob/master/gulpfile.mjs).
La intersección de esos rangos excluye Node 20. Esto expresa compatibilidad
declarada, no pruebas realizadas en todas las versiones.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run typecheck  # comprobación de tipos
npm run build      # comprobación de tipos + build de producción en dist/
npm run preview    # servir el build localmente (necesario para probar la PWA)
node --test        # ejecutar las pruebas automatizadas existentes
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
  pdf-session.ts              Sesión: abrir, navegar, zoom, buscar, obtener texto
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
tests/                        Pruebas de apertura, búsqueda, navegación y concurrencia
```

## Verificación disponible

Última ejecución registrada durante las correcciones: **26 pruebas aprobadas,
0 fallidas**, con el [ejecutor integrado de Node.js](https://nodejs.org/docs/latest-v24.x/api/test.html).
También finalizaron correctamente `npm run typecheck` y `npm run build`.

| Archivo | Pruebas | Cobertura |
|---|---:|---|
| `tests/pdf-opening.test.mjs` | 6 | Apertura, cambio, cargas obsoletas, cierre lento y errores de apertura |
| `tests/pdf-search-navigation.test.mjs` | 11 | Límites, coincidencias, recorrido de resultados y retorno al borrar búsqueda |
| `tests/pdf-concurrency-errors.test.mjs` | 9 | Operaciones simultáneas, aislamiento de caché y recuperación ante errores |

Se ejecutan dominio y sesiones reales con carga PDF, extracción, renderizado,
OCR y navegador simulados. No son pruebas E2E ni validan PDF.js, selección,
portapapeles u OCR con documentos reales. El cargador transforma TypeScript en
memoria mediante una API experimental de Node; no genera archivos compilados.

Pendientes: fidelidad visual y de copia, calidad OCR, instalación/offline,
compatibilidad entre dispositivos y navegadores, tiempos y memoria con PDF
reales y extensos. No se han establecido límites medidos de tamaño o páginas.

## OCR local

El botón «Reconocer página» procesa la página actual en un canvas aparte, sin
resaltados de búsqueda. Tesseract.js y el modelo `spa` se cargan desde
`public/ocr`, no desde un CDN. La primera ejecución tarda más (carga del motor y
del idioma); las siguientes reutilizan el worker y la caché del navegador.

El resultado indica la página y la confianza media, y puede copiarse o
descartarse. Al abrir otro documento se elimina automáticamente para no mezclar
resultados.

La búsqueda distingue acentos e ignora mayúsculas. El resultado OCR permanece
separado: no se añade al texto buscable del PDF. La calidad del reconocimiento
y su rendimiento requieren validación con muestras reales.

## Instalación y uso sin conexión

`npm run build` genera manifest, service worker y precache. La configuración
incluye interfaz y worker de PDF.js (unos 1,7 MB en el build verificado).
Los recursos OCR están excluidos del precache y usan caché bajo demanda
`CacheFirst`: worker, núcleo seleccionado y modelo (aproximadamente 6 MB).
Antes de intentar OCR sin conexión, deben haberse solicitado y almacenado bajo
control del service worker. La disponibilidad depende de las cachés del navegador.

El service worker requiere HTTPS o `localhost`
([documentación de Mozilla](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)).
Las instrucciones de instalación existentes son:

- **Chrome/Edge/Android:** icono de instalar en la barra de direcciones.
- **iPhone/iPad:** Compartir → «Añadir a la pantalla de inicio».

La generación del build está verificada. Instalación, actualización, conservación
de cachés y recorrido completo sin conexión siguen pendientes de pruebas reales
en cada plataforma; las instrucciones anteriores no constituyen una matriz de
compatibilidad validada.

Los PDF que se abren no se guardan ni se envían: solo se leen en memoria durante
la sesión.

## Hoja de ruta

Las casillas completadas indican implementación, no validación integral. Los
identificadores RF/RC se conservan como referencias anteriores; no existen sus
definiciones en los documentos actuales y no se infieren requisitos a partir de ellos.

- [x] 1. Esqueleto del proyecto y selección de archivo
- [x] 2. Abrir PDF, renderizar páginas, navegar y zoom (RF-01, RF-02)
- [x] 3. Búsqueda de texto con resaltado y navegación de coincidencias (RF-03)
- [x] 4. Selección y copia de fragmentos y de la página completa (RF-04)
- [x] 5. Reconocimiento de una página en español (RF-09)
- [x] 6. Ciclo de vida de resultados: copiar, descartar y no mezclar documentos (RF-10)
- [x] 7. Configuración PWA y cachés para uso sin conexión (RC-01); validación real pendiente
- [ ] 8. Completar validación de adaptación móvil y temas; CSS ya implementado
- [ ] 9. Pruebas E2E y documentación de límites

Verificación automatizada actual: 26 pruebas de dominio y sesiones aprobadas,
independientes del pendiente de pruebas E2E.
