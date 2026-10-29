# PDF Studio Local

**Lector de archivos PDF con búsqueda, navegación y reconocimiento de texto (OCR) en español.**

PDF Studio Local es una aplicación web progresiva (PWA) que permite consultar documentos PDF directamente desde el navegador. Los archivos se procesan localmente, sin enviarlos a servidores externos de lectura u OCR.

Su interfaz se adapta a computadoras y dispositivos móviles, y permite trabajar sin conexión después de almacenar los recursos necesarios.

## Características

- **Lectura de PDF:** apertura de documentos, navegación entre páginas, zoom y ajustes de visualización.
- **Búsqueda de texto:** localización y resaltado de palabras, con navegación entre resultados.
- **Copia de contenido:** selección y copia de texto disponible en el PDF.
- **OCR en español:** reconocimiento de texto en páginas escaneadas mediante Tesseract.js.
- **Navegación avanzada:** etiquetas editoriales, marcadores internos y correspondencia puntual de páginas, cuando corresponda.
- **Diseño responsivo:** interfaz adaptable, temas claro y oscuro y ayudas contextuales.
- **Funcionamiento offline:** instalación como PWA y uso sin conexión con los recursos previamente almacenados.
- **Actualizaciones:** aviso para instalar nuevas versiones sin interrumpir el trabajo.

## Tecnologías

TypeScript, Vite, Mozilla PDF.js, Tesseract.js y Vite PWA.

La aplicación no requiere un backend propio para procesar documentos.

## Instalación local

**Requisito recomendado:** Node.js 24 y npm.

Desde la carpeta raíz del proyecto:

```bash
npm install
npm run dev
```

Abrir la dirección indicada por Vite, normalmente `http://localhost:5173/`.

Para consultar la versión compilada de producción:

```bash
npm run build
npm run preview
```

Abrir la dirección indicada, normalmente `http://localhost:4173/`.

El servidor de vista previa permite comprobar la PWA localmente; no constituye un alojamiento público.

## Uso básico

1. Seleccionar **Abrir PDF** y elegir un documento del dispositivo.
2. Utilizar las herramientas de navegación, zoom y búsqueda.
3. Seleccionar y copiar texto, o utilizar **Reconocer página** para documentos escaneados.
4. Instalar la PWA desde el navegador compatible si se desea utilizarla como aplicación.

**Nota:** la numeración editorial de un libro puede diferir de la posición física de sus páginas. Los marcadores y las etiquetas dependen de la información incluida en cada PDF.

## Privacidad y funcionamiento offline

Los documentos se procesan localmente. Los archivos abiertos y los resultados OCR no se almacenan automáticamente como documentos de la aplicación.

Para utilizar el OCR sin conexión, sus recursos deben haberse cargado previamente. La disponibilidad offline depende del almacenamiento del navegador.

## Documentación

- [Arquitectura del proyecto](docs/arquitectura.md)
- [Pruebas y validación](docs/validacion.md)
- [Historial de cambios](CHANGELOG.md)

## Estado del proyecto

**Versión actual:** `0.1.0` — desarrollo y preparación de la primera publicación oficial.

La compatibilidad se ha comprobado principalmente con Chromium; no se garantiza un comportamiento idéntico en todos los navegadores y dispositivos.

El proyecto todavía no tiene una licencia propia definida. Las bibliotecas y recursos de terceros conservan sus respectivas licencias.