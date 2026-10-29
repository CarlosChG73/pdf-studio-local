# Historial de cambios

Este documento registra los cambios relevantes de PDF Studio Local siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y tomando como referencia [Semantic Versioning](https://semver.org/lang/es/).

**Estado:** versión de desarrollo `0.1.0`. La primera versión oficial `v1.0.0` está en preparación y todavía no se ha publicado.

## [Unreleased]

### Añadido

- Lector de documentos PDF locales con navegación, zoom y ajuste de visualización.
- Búsqueda de texto con resaltado y navegación entre resultados.
- Selección y copia de texto.
- Reconocimiento de texto (OCR) en español mediante Tesseract.js.
- Navegación mediante etiquetas editoriales y marcadores internos disponibles en los documentos.
- Correspondencia manual puntual entre numeración editorial y página física.
- Interfaz responsiva con menú de herramientas y temas Claro/Oscuro.
- Ayudas contextuales para los controles de escritorio.
- Instalación como aplicación web progresiva (PWA), con funcionamiento offline cuando los recursos necesarios estén disponibles.
- Aviso de actualizaciones con consentimiento del usuario.
- Decodificación JPEG2000 mediante recursos locales de OpenJPEG.
- Pruebas automatizadas de navegación, búsqueda, OCR, carga de PDF, actualizaciones y funcionamiento offline.

### Corregido

- Liberación de recursos cuando falla la apertura de un PDF.
- Manejo de operaciones simultáneas y resultados obsoletos al cambiar de documento.
- Restauración de la página de origen al borrar una búsqueda.
- Presentación y accesibilidad del aviso de actualización en pantallas pequeñas.

La documentación técnica, las evidencias de pruebas y las limitaciones conocidas están disponibles en [docs/validacion.md](docs/validacion.md) y [README.md](README.md).