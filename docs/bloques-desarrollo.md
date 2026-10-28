# Bloques de desarrollo — Proyecto PDF

## Estado vigente — 27 de octubre de 2026

El proyecto supera el esqueleto inicial: existen visor PDF, búsqueda, selección,
copia, OCR y configuración PWA. La existencia de código no implica que todos los
criterios de aceptación de la planificación histórica estén verificados.

Esta sección describe el código y la evidencia disponibles. La planificación
original se conserva íntegra más abajo como antecedente; sus entregables y reglas
no constituyen evidencia de ejecución ni nuevos requisitos aprobados.

### Arquitectura existente

Aplicación de navegador con Vite y TypeScript, PDF.js para PDF y Tesseract.js para
OCR, según `package.json`. No hay backend propio en el código revisado.

| Ubicación | Responsabilidad actual |
|---|---|
| `index.html`, `src/main.ts` | Interfaz, eventos, conexión de sesiones y copia al portapapeles |
| `src/styles.css` | Presentación, tema según preferencia del sistema y adaptación por tamaño de pantalla |
| `src/domain/` | Reglas puras de paginación y búsqueda |
| `src/application/pdf-session.ts` | Documento activo, navegación, zoom, búsqueda, caché de texto y preparación de página para OCR |
| `src/application/ocr-session.ts` | Estado, progreso y ciclo de resultados OCR asociados al documento |
| `src/infrastructure/pdf/` | Apertura con PDF.js, worker, renderizado, extracción, capa de texto y resaltados |
| `src/infrastructure/ocr/engine.ts` | Worker OCR reutilizable, trabajos serializados y recursos locales en español |
| `vite.config.ts`, `public/` | Configuración PWA, iconos y recursos OCR locales |
| `tests/` | Pruebas automatizadas de dominio y sesiones con infraestructura simulada |

La separación es por capas; las sesiones dependen directamente de infraestructura
y de APIs del navegador. La estructura propuesta en el apartado histórico no es
la estructura implementada ni una instrucción de reorganización.

### Funcionalidades implementadas en código

| Funcionalidad | Archivos que la sustentan | Alcance de la comprobación |
|---|---|---|
| Abrir PDF local y cambiar de documento | `src/infrastructure/pdf/document.ts`, `src/application/pdf-session.ts` | Sesiones probadas con cargas simuladas; falta validación de lectura real con muestras |
| Navegar, saltar de página, zoom y ajustes de ancho/página | `src/application/pdf-session.ts`, `src/main.ts` | Límites de navegación probados; fidelidad visual y zoom real pendientes |
| Buscar, resaltar y recorrer coincidencias | `src/domain/search.ts`, `src/application/pdf-session.ts`, `src/infrastructure/pdf/renderer.ts` | Reglas y sesiones probadas; renderizado de resaltados simulado |
| Volver a la página original al borrar búsqueda | `src/application/pdf-session.ts` | Probado incluso tras editar consulta o navegar manualmente; estado limpiado al cambiar o cerrar PDF |
| Seleccionar y copiar texto | `src/infrastructure/pdf/renderer.ts`, `src/main.ts`, `src/styles.css` | Implementado; selección y portapapeles reales pendientes de validación |
| OCR de una página en español, progreso, confianza, copia y descarte | `src/application/ocr-session.ts`, `src/infrastructure/ocr/engine.ts`, `src/main.ts` | Reinicio de resultado al cambiar de documento probado con OCR simulado; calidad OCR real pendiente |
| PWA y recursos offline | `vite.config.ts`, `public/ocr/`, `public/icons/` | Compilación genera manifest y service worker; recorrido offline e instalación reales pendientes |
| Adaptación móvil y tema automático | `src/styles.css` | Implementación parcial observable en CSS; compatibilidad y contraste pendientes |

La búsqueda ignora mayúsculas y distingue acentos (`src/domain/search.ts`). El
texto OCR se presenta como resultado separado: no se incorpora a la búsqueda del
PDF. Estas descripciones registran el comportamiento existente.

### Historial y verificaciones disponibles

- Los seis commits anteriores a `6a7b570` registran la evolución desde el
  esqueleto hasta la configuración PWA; el último de ellos es `fa43536`.
- Commit `6a7b570`, en `mejoras`: **Corregir concurrencia y navegación PDF;
  agregar pruebas automatizadas**. Incluye `src/application/pdf-session.ts` y
  los tres archivos de prueba siguientes.

| Archivo | Pruebas aprobadas | Cobertura principal |
|---|---:|---|
| `tests/pdf-opening.test.mjs` | 6 | Apertura y cambio, aperturas inversas, liberación de cargas obsoletas, cierre lento y errores de apertura |
| `tests/pdf-search-navigation.test.mjs` | 11 | Límites, coincidencias, recorrido circular, búsqueda vacía y retorno a la página original |
| `tests/pdf-concurrency-errors.test.mjs` | 9 | Búsquedas y renders simultáneos, caché entre documentos, recuperación y estado ante errores |
| **Total (`node --test`)** | **26** | **0 fallidas en la última ejecución registrada** |

Última verificación realizada durante las correcciones: Node.js `v24.21.0`,
`node --test`, `npm run typecheck` y `npm run build` finalizaron correctamente.
Este registro recoge ejecuciones anteriores; la actualización documental no
supone una nueva ejecución. El cargador de pruebas utiliza transformación
TypeScript en memoria mediante una API experimental de Node.

**Límite de la evidencia:** las pruebas ejecutan lógica real de dominio y sesiones,
pero sustituyen carga PDF, renderizado, extracción, OCR y elementos del navegador.
No son E2E ni acreditan el funcionamiento de PDF.js o Tesseract.js con archivos
reales. La comprobación de tipos y el build tampoco demuestran compatibilidad,
calidad OCR ni funcionamiento offline.

### Validaciones y documentación pendientes

- Fidelidad de visualización, zoom, selección y copia con PDF reales.
- OCR en español comparado con transcripción revisada.
- Instalación, preparación de cachés, actualización y recorrido sin conexión.
- Documentos extensos, tiempos y memoria; dispositivos y navegadores reales,
  adaptación móvil y contraste. No existen límites medidos documentados aquí.
- Pruebas E2E: los archivos actuales de `tests/` no sustituyen `tests/e2e/`.
- Los documentos de análisis, decisión, requisitos, trazabilidad, diseño,
  verificación, uso y mantenimiento enumerados en la planificación original no
  están presentes en `docs/`. Tampoco están las muestras propuestas, ADR ni una
  matriz de compatibilidad. Se registran como ausencias, sin aprobar su creación.
- `docs/01-problematica.md` existe como borrador con tablas sin completar y método
  de observación sin entrevistas. Las entrevistas de la planificación histórica
  no se consideran realizadas ni obligatorias por esta actualización.
- El README documenta las 26 pruebas automatizadas aprobadas, su alcance simulado
  y las correcciones del commit `6a7b570`. Distingue la configuración offline
  implementada de la instalación y el recorrido sin conexión pendientes de
  validación real; también reconoce el CSS móvil/temas existente y su validación
  pendiente.

Las referencias RF/RC del README no tienen definiciones en los documentos
presentes. No se infiere su contenido ni se declara cerrado ningún bloque por
la sola existencia de código. El siguiente trabajo debe acordarse sobre los
pendientes anteriores, sin aplicar automáticamente el «Próximo paso» histórico.

---

## Antecedentes y planificación original — histórico

**Nota de lectura:** todo el contenido que sigue se conserva sin cambios como
planificación original. «Estado actual», «Próximo paso», casillas, estructura
propuesta y reglas pertenecen a ese contexto anterior; no describen el estado
vigente. La propuesta de 5–8 entrevistas también difiere de las tres entrevistas
del cierre original y del método sin entrevistas de `01-problematica.md`.

**Versión:** 1.0 · **Fecha:** 27 de octubre de 2026
**Estado actual:** Paso 1 completado (esqueleto Vite + TypeScript, UI base y selección de archivo). Sin lectura de PDF todavía.

---

## Resumen

| # | Bloque | Pregunta que responde | Entrega | Se cierra cuando |
|---|---|---|---|---|
| 0 | Descubrimiento y decisión | ¿El problema existe y merece la pena? | Problemática + análisis | Hay Go/No-Go escrito |
| 1 | Requisitos y alcance | ¿Qué entra y cómo se verifica? | Alcance + requisitos | Cada requisito es verificable |
| 2 | Diseño técnico y de interfaz | ¿Cómo se construye? | Diseño + decisiones + spikes | Decisiones justificadas y riesgos probados |
| 3 | Construcción incremental | ¿Funciona por partes? | 9 incrementos demoables | Todo el alcance implementado |
| 4 | Verificación integral | ¿Cumple lo especificado? | Informe de evidencia | Criterios de aceptación cumplidos |
| 5 | Despliegue y mantenimiento | ¿Se puede usar y sostener? | Versión + guías | Usable en condiciones reales |

---

## Bloque 0 — Descubrimiento y decisión

**Objetivo:** confirmar el problema antes de invertir en producto.

**Qué crear**

- [ ] `docs/01-problematica.md` — 1 página: segmento, situación actual, problema en una frase, evidencia, impacto, límites.
- [ ] `docs/02-analisis.md` — 3–5 páginas: causas, coste actual, alternativas, hipótesis, riesgos.
- [ ] `docs/03-decision.md` — Go / No-Go / investigar más, con criterios.
- [ ] `docs/pruebas/` — 3 PDF de muestra: texto, escaneado, mixto (sin datos personales).
- [ ] Tabla de medición: minutos, pasos y errores de la tarea actual.

**Actividades:** 5–8 entrevistas, observación de tareas, prueba de 2–3 alternativas existentes.

**Cierre:** decisión escrita. Si es No-Go, el proyecto se detiene aquí.

---

## Bloque 1 — Requisitos y alcance

**Objetivo:** convertir la necesidad validada en requisitos verificables.

**Qué crear**

- [ ] `docs/04-alcance.md` — dentro / fuera de la primera versión.
- [ ] `docs/05-requisitos.md` — RF y RC, cada uno con criterio de aceptación.
- [ ] `docs/06-trazabilidad.md` — necesidad → requisito → prueba.

**Reglas:** sin tecnología ni diseño; un requisito = una frase verificable.

**Cierre:** el promotor valida que los requisitos reflejan la necesidad y que son comprobables.

---

## Bloque 2 — Diseño técnico y de interfaz

**Objetivo:** decidir cómo se construye y probar lo riesgoso antes de programar.

**Qué crear**

- [ ] `docs/07-diseno.md` — módulos, responsabilidades, flujo de datos y estados de error.
- [ ] `docs/adr/` — una decisión por archivo (formato, stack, almacenamiento, offline).
- [ ] Bocetos de escritorio y móvil.
- [ ] Spikes con resultado medido: PDF de ~500 páginas, OCR real en español, memoria en móvil.
- [ ] `docs/08-plan-pruebas.md` — qué se prueba, con qué y cómo.

**Estructura de código propuesta** (a confirmar aquí):

```
src/
  app/         arranque y estado general
  pdf/         apertura, render, navegación, búsqueda, texto
  ocr/         reconocimiento de una página
  session/     documento activo y ciclo de resultados
  ui/          controles, temas, accesibilidad
  offline/     service worker y recursos
```

**Cierre:** diseño revisado y riesgos técnicos con evidencia.

---

## Bloque 3 — Construcción incremental

**Objetivo:** construir el producto por incrementos demoables.

| # | Incremento | Se cierra cuando |
|---|---|---|
| 1 | Abrir PDF y renderizar página 1 | Se ve igual que el original |
| 2 | Navegación y salto a página | Límites y entradas inválidas controlados |
| 3 | Zoom y ajuste de visualización | No deforma el documento |
| 4 | Búsqueda con siguiente/anterior | Acentos, mayúsculas y sin resultados |
| 5 | Selección y copia | Texto pegado idéntico |
| 6 | OCR de una página (español) | Comparado con transcripción revisada |
| 7 | Resultados y descarte | No se mezclan documentos |
| 8 | Funcionamiento sin conexión | Recorrido completo sin red |
| 9 | Interfaz adaptable y temas | Móvil simulado y contraste |

**Por cada incremento:** requisito asociado, pruebas, demo y commit.

**Cierre:** todo el alcance implementado y con pruebas.

---

## Bloque 4 — Verificación integral

**Objetivo:** demostrar que se cumple lo especificado.

**Qué crear**

- [ ] Pruebas E2E del recorrido (`tests/e2e/`).
- [ ] `docs/09-verificacion.md` — requisito → prueba → resultado → evidencia.
- [ ] Tabla de límites medidos: tamaño máximo, páginas, tiempos, memoria.
- [ ] Matriz de compatibilidad (equipo real vs. simulado).
- [ ] Registro de defectos y correcciones.

**Cierre:** criterios de aceptación cumplidos o desviación documentada y aprobada.

---

## Bloque 5 — Despliegue y mantenimiento

**Objetivo:** poner la versión en uso y sostenerla.

**Qué crear**

- [ ] Build de producción y versión etiquetada.
- [ ] `docs/10-uso.md` — instalación, preparación inicial, límites y problemas conocidos.
- [ ] `docs/11-mantenimiento.md` — actualizaciones, rollback, incidencias y dependencias.
- [ ] Registro de licencias de terceros.

**Cierre:** la versión se usa siguiendo las instrucciones, dentro de las condiciones verificadas.

---

## Reglas comunes

1. Ningún bloque avanza sin validación del anterior.
2. Todo cambio de alcance entra como propuesta escrita.
3. Cada requisito tiene una prueba y una evidencia.
4. No se declara compatibilidad, rendimiento o capacidad sin medirlo.
5. La planificación vive dentro de cada bloque; no es un bloque aparte.

---

## Próximo paso

Terminar el **Bloque 0**: tres entrevistas, tres PDF de muestra y la decisión Go/No-Go. El esqueleto de código ya existe; no se amplía hasta que el problema esté validado.
