# PDF Studio Local

Lector de PDF locales con navegación, búsqueda, selección, copia y OCR en español.
Los documentos se procesan en el dispositivo, sin enviarlos a un servicio de
lectura u OCR externo.

**Estado:** versión de desarrollo `0.1.0`. La futura primera versión oficial
`v1.0.0` está en preparación; no se anuncia su publicación ni una fecha.
Los cambios disponibles se describen en [CHANGELOG.md](CHANGELOG.md).

## Funciones

- Abrir y cambiar PDF locales; navegar, introducir un número de página, cambiar
  zoom y ajustar al ancho o a la página completa.
- Buscar, resaltar y recorrer coincidencias. La búsqueda ignora mayúsculas y
  distingue acentos. Borrarla restaura la página original, aunque se haya
  navegado manualmente durante la búsqueda.
- Seleccionar y copiar fragmentos, o copiar el texto de la página actual.
- Reconocer una página mediante OCR en español, consultar progreso y confianza,
  copiar el resultado o descartarlo.
- Herramientas PDF en una barra lateral contraíble en escritorio y en un menú
  superpuesto al visor en pantallas estrechas.
- Temas Claro/Oscuro mediante el interruptor sol/luna. La preferencia se conserva
  en `localStorage` cuando está disponible; el modo inicial es Claro. No existe
  modo Automático y no se alteran los colores originales del PDF.
- Instalación como PWA, preparación para uso offline y aviso de nuevas versiones.

Los PDF abiertos y los resultados OCR pertenecen a la sesión en memoria; no se
guardan como documentos de la aplicación. Recargar o cerrar requiere reabrir el
PDF y conservar antes el texto OCR que se necesite.

## Instalación y ejecución local

Para reproducir el entorno comprobado, utilizar **Node.js 24**; hay resultados
registrados con **24.21.0**. También se necesita npm. En `package-lock.json`,
Vite declara `^20.19.0 || >=22.12.0` y PDF.js `>=22.13.0 || >=24`: su
intersección excluye Node 20. Son rangos declarados, no versiones todas probadas.

Las pruebas utilizan `module.registerHooks`, disponible desde Node 22.15.0, y
transformación TypeScript en memoria. Node 22.13.0 no basta para toda la suite
aunque cumpla el rango de PDF.js ([Node.js](https://nodejs.org/docs/latest-v24.x/api/module.html#moduleregisterhooksoptions)).

Desde la raíz del proyecto:

```bash
npm install
npm run dev
```

Abrir la dirección que muestra Vite, normalmente `http://localhost:5173`.
El servidor de desarrollo actualiza la interfaz, pero no registra la PWA de
producción. Para usar la compilación con service worker:

```bash
npm run typecheck
npm run build
npm run preview
```

`build` comprueba tipos y genera `dist/`. Abrir la dirección indicada por
`preview`, normalmente `http://localhost:4173`. Los cambios en el código necesitan
otra compilación para aparecer allí. `preview` permite revisar el build localmente;
no se presenta como configuración de alojamiento público.

## Uso

1. Pulsar **Abrir PDF** y seleccionar un archivo local. En móvil, abrir primero
   el menú hamburguesa para acceder a las herramientas.
2. Utilizar navegación, número de página, zoom o ajustes de ancho/página.
3. Escribir una búsqueda y pulsar Enter, o esperar su ejecución. Recorrer las
   coincidencias con las flechas; borrar la consulta para regresar a su página
   de origen.
4. Seleccionar texto y pulsar **Copiar texto**; sin selección, se obtiene el texto
   de la página actual. El acceso al portapapeles depende del navegador.

Tab y Shift+Tab recorren controles. Los botones admiten teclado; Escape cierra
las ayudas o el menú según el contexto. Las ayudas flotantes se utilizan en
escritorio y se ocultan en pantallas táctiles o estrechas.

## OCR local

**Reconocer página** procesa la página actual en español con un canvas aparte,
sin resaltados de búsqueda. El panel muestra texto, página, confianza media y
acciones para copiar o descartar. Cambiar de documento elimina el resultado
asociado al anterior.

Tesseract.js, sus núcleos y el modelo `spa` se sirven desde `public/ocr`, sin CDN.
La primera ejecución carga los recursos; el worker se reutiliza en la sesión.
El resultado OCR no se incorpora a la búsqueda del PDF ni modifica el archivo.
La confianza no garantiza exactitud: revisar el texto antes de reutilizarlo.
Los orígenes y licencias declarados de los recursos están en
[public/ocr/README.md](public/ocr/README.md).

## Instalación PWA y funcionamiento sin conexión

El service worker necesita un contexto seguro, como HTTPS o `localhost`
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)).
Las opciones de instalación dependen del navegador:

- Chrome/Edge/Android: opción o icono de instalar, cuando el navegador lo ofrezca.
- iPhone/iPad: Compartir → «Añadir a la pantalla de inicio».

Estas indicaciones no acreditan una validación de instalación en cada plataforma.
Para preparar el funcionamiento offline:

1. Abrir la compilación de producción con conexión y permitir el registro del
   service worker y el almacenamiento de la interfaz y el worker de PDF.js.
2. Abrir un PDF de prueba y ejecutar OCR con conexión. Sus recursos se almacenan
   bajo demanda en `ocr-recursos`; no forman parte del precache inicial.
3. Esperar a que termine la carga antes de desconectar. Reabrir la aplicación
   y seleccionar el PDF local que se quiera consultar.

Se almacena la interfaz y sus recursos, no los PDF seleccionados. El OCR offline
necesita el worker, el núcleo utilizado y el idioma previamente disponibles.
El navegador puede eliminar almacenamiento: instalar no garantiza conservar las
cachés indefinidamente. Cambiar de puerto o de `localhost` a `127.0.0.1` cambia
el origen y separa los registros y cachés de la PWA.

## Actualizaciones

Con conexión y el servidor disponible, se comprueban versiones al registrar el
service worker, recuperar conexión, volver a una pestaña visible y cada hora
mientras la aplicación está abierta. Los errores de red no interrumpen la consulta.

- Escritorio: aviso **Actualizar / Más tarde**.
- Móvil: **Nueva versión disponible · Ver** bajo la cabecera. La franja reserva
  temporalmente una pequeña altura, sin tapar menú ni visor. **Ver** abre los
  detalles; **Cerrar**, Escape o **Más tarde** retiran el aviso y recuperan el
  espacio. Su aprobación visual definitiva sigue pendiente.
- **Actualizar** solicita confirmación: hay que reabrir el PDF y copiar antes
  los resultados OCR que se deseen conservar. Solo se recarga la pestaña que consiente.
- **Más tarde** permite continuar; el aviso no vuelve a mostrarse en esa sesión
  de la página. Al abrir de nuevo se utilizará la versión disponible según el
  estado del service worker.

La actualización conserva `ocr-recursos`, sin borrados generales. Si una
instalación anterior todavía no muestra el aviso, permitir que descargue la
actualización con conexión, cerrar todas sus ventanas/pestañas y reabrirla.
No es necesario borrar datos ni utilizar herramientas de desarrollador.

Referencias: [aviso de Vite PWA](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)
y [comprobaciones periódicas](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates).

## Verificación

Resultado registrado con Node.js 24.21.0: **29 pruebas aprobadas, 0 fallidas**;
`npm run typecheck` y `npm run build` correctos. Son ejecuciones anteriores;
esta edición documental no constituye una nueva ejecución.

| Archivo | Pruebas | Alcance |
|---|---:|---|
| `tests/pdf-opening.test.mjs` | 6 | Apertura, cambio, cargas obsoletas y errores |
| `tests/pdf-search-navigation.test.mjs` | 11 | Límites, coincidencias y restauración al borrar búsqueda |
| `tests/pdf-concurrency-errors.test.mjs` | 9 | Concurrencia, caché de texto y recuperación |
| `tests/e2e/offline.test.mjs` | 1 | PDF.js, búsqueda y OCR reales online y offline con servidor detenido |
| `tests/e2e/update.test.mjs` | 2 | Migración, varias pestañas, consentimiento, aviso móvil y PDF/OCR offline |

Las primeras 26 pruebas usan infraestructura simulada. Las 3 E2E utilizan
Chromium real y PDF sintéticos sin datos personales. La emulación móvil no
equivale a dispositivos físicos. El aviso se comprobó en ambos temas y en
393×852 y 320×240, con herramientas abiertas/cerradas, teclado y cierre.

### Preparar y ejecutar las pruebas

Las E2E requieren Git, el historial que incluye `a91ac75`, un build previo y
Chromium de Playwright. Usan perfiles y servidores locales aislados, sin tocar
la instalación habitual. El navegador se busca en `node_modules/.cache/ms-playwright`;
temporales y capturas quedan en `node_modules/.cache/e2e-tmp`, ignorados por Git.

Preparación de Chromium tras `npm install`, desde la raíz (PowerShell):

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/node_modules/.cache/ms-playwright"
New-Item -ItemType Directory -Force node_modules/.cache/e2e-tmp | Out-Null
$env:TEMP = (Resolve-Path node_modules/.cache/e2e-tmp).Path
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
node node_modules/playwright/cli.js install chromium --no-shell
```

Alternativa POSIX, no validada en dispositivos de esas plataformas:

```bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/ms-playwright"
mkdir -p node_modules/.cache/e2e-tmp
export TMPDIR="$PWD/node_modules/.cache/e2e-tmp"
node node_modules/playwright/cli.js install chromium --no-shell
```

Estos comandos descargan Chromium y sus archivos auxiliares gestionados por
Playwright dentro del proyecto, sin instalar dependencias del sistema. Consultar
los [requisitos de Playwright](https://playwright.dev/docs/browsers) para el sistema
utilizado. Los scripts E2E configuran sus rutas antes de abrir Chromium.

```bash
npm run build
node --test
```

Para ejecutar solo las 26 pruebas con infraestructura simulada:

```bash
node --test tests/pdf-opening.test.mjs tests/pdf-search-navigation.test.mjs tests/pdf-concurrency-errors.test.mjs
```

## Límites y validaciones pendientes

- Aprobación visual definitiva del aviso compacto de actualización móvil.
- Instalación PWA y comportamiento en otros navegadores y dispositivos físicos;
  no se declara compatibilidad universal.
- Fidelidad visual, selección y portapapeles con muestras variadas de PDF reales;
  calidad OCR comparada con transcripciones revisadas.
- Rendimiento, memoria y límites de tamaño/páginas con documentos extensos.
  No hay máximos medidos ni mejoras de productividad demostradas.
- Conservación de cachés a largo plazo y condiciones de almacenamiento de cada navegador.

## Arquitectura y documentación

Aplicación de navegador con Vite, TypeScript, PDF.js y Tesseract.js, sin backend
propio. `src/domain/` contiene búsqueda y paginación; `src/application/`, sesiones
PDF/OCR; `src/infrastructure/`, integración de motores. `index.html`, `src/main.ts`
y `src/styles.css` conectan y presentan la interfaz. `vite.config.ts` configura
la PWA y `public/` contiene iconos y recursos OCR.

El README es la guía pública de instalación y uso; el [changelog](CHANGELOG.md)
resume cambios para usuarios. `AGENTS.md` contiene instrucciones internas para
Codex; `docs/` conserva antecedentes, planificación y registros internos
identificados como tales. No son requisitos adicionales para usar el producto.

La preparación de v1.0.0 sigue [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
La decisión de publicar, su fecha y la licencia del proyecto siguen pendientes.
Publicar el repositorio o una [release en GitHub](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
no equivale a desplegar la PWA en un alojamiento web.
