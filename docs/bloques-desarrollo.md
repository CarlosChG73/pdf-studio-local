# Bloques de desarrollo — PDF Studio Local

## Propósito

Este documento resume las etapas de desarrollo de PDF Studio Local y su estado documentado.

La aplicación se encuentra en la versión de desarrollo `0.1.0`, en preparación para su primera publicación oficial. La versión `v1.0.0` todavía no se ha publicado.

Este registro es una referencia interna de planificación y seguimiento. No sustituye la documentación de [uso](../README.md), [arquitectura](arquitectura.md), [validación técnica](validacion.md) ni el [historial de cambios](../CHANGELOG.md).

## Etapas del proyecto

| Bloque | Objetivo | Estado documentado |
|---|---|---|
| 0. Identificación del problema | Identificar las dificultades al consultar y recuperar información de documentos PDF | Antecedentes registrados; mediciones de productividad pendientes |
| 1. Requisitos y alcance | Delimitar las funciones del lector y sus restricciones | Alcance funcional implementado; no existe una matriz formal completa de trazabilidad |
| 2. Diseño técnico | Definir arquitectura, herramientas y organización del proyecto | Arquitectura implementada y documentada |
| 3. Desarrollo | Construir lectura PDF, navegación, búsqueda, OCR e interfaz | Funcionalidades principales implementadas |
| 4. Validación | Comprobar funcionamiento, errores, navegación y uso offline | Pruebas automatizadas y verificaciones registradas; compatibilidad universal no acreditada |
| 5. Despliegue y mantenimiento | Preparar distribución, actualizaciones y mantenimiento | Compilación PWA disponible; publicación oficial pendiente |

Los estados anteriores reflejan el alcance documentado, no certificaciones externas ni requisitos adicionales de publicación.

## Funcionalidades implementadas

PDF Studio Local incluye las siguientes capacidades:

- Apertura y visualización de archivos PDF locales.
- Navegación física, etiquetas editoriales y marcadores internos cuando existen.
- Correspondencia puntual opcional entre una página física y su numeración editorial.
- Zoom y ajustes de visualización.
- Búsqueda, resaltado, selección y copia de texto.
- Reconocimiento OCR de la página actual en español.
- Diseño responsivo con temas Claro y Oscuro.
- Funcionamiento como PWA con recursos preparados para uso sin conexión.
- Actualizaciones de la aplicación mediante aviso y consentimiento del usuario.
- Decodificación local de imágenes JPEG2000.

Las características y sus limitaciones se describen en el [README](../README.md).

## Arquitectura

La aplicación utiliza Vite, TypeScript, PDF.js y Tesseract.js, sin backend propio para procesar los documentos.

El código se organiza principalmente en tres capas:

- `src/domain/`: reglas de búsqueda y paginación.
- `src/application/`: coordinación de sesiones PDF y OCR.
- `src/infrastructure/`: integración con los motores y recursos necesarios.

La estructura completa, las responsabilidades y los flujos están documentados en [Arquitectura y mantenimiento](arquitectura.md).

## Validación registrada

La última verificación documentada, correspondiente al **29 de octubre de 2026**, registra:

- **41 pruebas automatizadas aprobadas y ninguna fallida.**
- Comprobación satisfactoria de tipos y compilación.
- Pruebas E2E en Chromium, incluyendo lectura, búsqueda, OCR y funcionamiento offline.
- Verificación de decodificación JPEG2000.
- Revisión del diseño en distintos tamaños de pantalla y en ambos temas.
- Aprobación visual del diseño actualizado por el usuario del proyecto.

Estas evidencias corresponden a los entornos y documentos comprobados. No garantizan compatibilidad universal, rendimiento máximo ni precisión general del OCR.

Consultar [Validación técnica](validacion.md) para conocer los resultados, procedimientos, incidencias y limitaciones.

## Aspectos pendientes de validación

La documentación técnica identifica los siguientes límites:

- Comportamiento en navegadores y dispositivos físicos todavía no evaluados.
- Calidad OCR con una muestra representativa de documentos escaneados.
- Rendimiento, memoria y uso prolongado con documentos de distintas características.
- Conservación de recursos offline a largo plazo.
- Ausencia de una medición concluyente de mejoras de productividad.

Estos puntos constituyen límites de evidencia, no requisitos nuevos ni cambios automáticamente autorizados.

## Preparación de la primera versión oficial

PDF Studio Local conserva actualmente la versión `0.1.0`.

Antes de anunciar una publicación oficial deben tomarse las decisiones correspondientes sobre la versión, el alojamiento y las condiciones de distribución.

La documentación de instalación y uso se mantiene en el [README](../README.md), mientras que los cambios relevantes se registran en [CHANGELOG.md](../CHANGELOG.md).

## Historial y mantenimiento

El historial Git conserva las etapas anteriores de construcción, decisiones y correcciones del proyecto.

Los documentos [Problemática](01-problematica.md) y [Mejoras](02-mejoras.md) mantienen las observaciones iniciales y las decisiones históricas.

Para futuras modificaciones:

- Consultar primero la documentación técnica vigente y el código correspondiente.
- Distinguir hechos comprobados de hipótesis y propuestas.
- Respetar el alcance aprobado y conservar las funcionalidades existentes.
- Registrar las verificaciones pertinentes sin atribuir resultados de ejecuciones anteriores a nuevas versiones.

Las instrucciones específicas para Codex se encuentran en [AGENTS.md](../AGENTS.md).