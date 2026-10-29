# Problemática — Proyecto PDF

> **Antecedente interno conservado.** Este borrador recoge observaciones y planes
> del 27 de octubre de 2026, no una validación del producto ni requisitos nuevos.
> Su versión `0.1` identifica el documento. Las tablas vacías y los criterios
> originales se mantienen; no se dan por cumplidos. La presentación y el estado
> actuales están en [README.md](../README.md).

| | |
|---|---|
| Versión | 0.1 |
| Fecha | 27 de octubre de 2026 |
| Estado | Borrador para completar con medición propia |
| Método | Observación directa en el entorno laboral (sin entrevistas) |
| Alcance | Consulta y recuperación de información de PDF |

---

## 1. Resumen

Docentes y personal administrativo de un entorno educativo consultan y reutilizan información contenida en documentos PDF. Cuando el archivo es extenso o incluye páginas escaneadas, y cuando la conexión no está disponible o es restringida, la tarea se interrumpe y obliga a transcribir manualmente.

El problema está **observado directamente**, pero todavía **no medido**. Este documento registra lo observado, separa los supuestos y define cómo se completará la evidencia.

---

## 2. Contexto

- **Entorno:** institución educativa; trabajo docente y administrativo.
- **Usuarios observados:** docentes que preparan planes de trabajo y personal administrativo que prepara documentación.
- **Documentos habituales:** reglamentos, planes de estudio, libros y material académico en PDF.
- **Conectividad:** sin red en aulas; red estable pero restringida en oficinas; disponibilidad personal desconocida.
- **Herramientas actuales:** visores y servicios en línea, suites ofimáticas y visores de escritorio.

---

## 3. Situación actual

1. Se localiza el documento en el equipo, en una carpeta compartida o en una plataforma.
2. Se abre con un visor o se sube a una herramienta en línea.
3. Se busca el apartado mediante el buscador del visor.
4. Si la página está escaneada, no hay texto: se lee en pantalla y se transcribe.
5. El fragmento se copia o se reescribe en el documento de trabajo.

**Puntos de fricción observados:** carga fallida de archivos grandes, ausencia de texto en páginas escaneadas, dependencia de la conexión y repetición del proceso al cambiar de documento.

---

## 4. Enunciado del problema

> Al consultar y reutilizar información de PDF extensos o con páginas escaneadas, en un entorno con conexión limitada, se pierde tiempo, se interrumpe la tarea y se asume riesgo de error al transcribir información que ya está en el documento.

---

## 5. Evidencia

Actualización técnica del 29 de octubre: [Validación](validacion.md) registra dos
muestras públicas y mediciones de la aplicación. No sustituyen una bitácora de
trabajo real, una muestra escaneada/mixta representativa ni una comparación de
productividad. Las tablas originales permanecen sin completar donde no hay datos.

| Afirmación | Estado | Cómo se comprobará |
|---|---|---|
| Existen PDF extensos (referencia: ~500 páginas) | Observado | Muestra de 3 documentos |
| Hay páginas escaneadas sin texto buscable | Observado | Prueba de búsqueda y copia en la muestra |
| Las herramientas en línea fallan con archivos grandes | Observado | Cronometraje y registro de fallos |
| En aulas no hay conexión | Observado | Registro de contexto |
| La conexión de oficina es restringida | Observado | Registro de contexto |
| La tarea consume tiempo relevante | **Por medir** | Bitácora (apartado 8) |
| El error de transcripción es frecuente | **Por medir** | Bitácora |
| El problema afecta a más personas | **Supuesto** | Prueba informal con 1–2 compañeros |

---

## 6. Impacto

- Tiempo dedicado a localizar y transcribir.
- Interrupciones por fallos de carga o falta de red.
- Riesgo de trasladar datos incorrectos a documentos oficiales.
- Dependencia de herramientas sobre las que no se tiene control.

No se afirma una magnitud: falta medirla.

---

## 7. Límites

**Este problema no es:**
- Edición del contenido del PDF.
- Firma electrónica o incorporación de firmas.
- Conversión de Word o PowerPoint a PDF.
- Creación o llenado de formularios.
- Gestión o archivo de documentos.

Es **consulta y recuperación de información** de un PDF local.

---

## 8. Método de validación

### 8.1. Bitácora personal (1–2 semanas)

Registrar cada vez que se consulte un PDF para una tarea real.

| Fecha | Documento | Páginas | ¿Escaneado? | Tarea | Tiempo | ¿Funcionó? | Incidencia |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
| | | | | | | | |
| | | | | | | | |

**Instrucción:** anotar el tiempo desde que se abre el archivo hasta que la información queda copiada o transcrita. Registrar también los reintentos.

### 8.2. Muestras

| Archivo | Tipo | Páginas | ¿Texto buscable? | Origen (sin datos personales) |
|---|---|---|---|---|
| | Extenso | | | |
| | Escaneado | | | |
| | Mixto | | | |

### 8.3. Comparación de alternativas

Misma tarea, mismos archivos, herramientas distintas.

| Herramienta | Tiempo | ¿Abrió? | ¿Buscó? | ¿Copió? | Observación |
|---|---|---|---|---|---|
| Visor en línea | | | | | |
| Visor de escritorio | | | | | |
| Suite ofimática | | | | | |

### 8.4. Prueba informal (opcional)

Una sesión de 10 minutos con 1–2 compañeros usando el prototipo. Se registra qué completaron y qué no. **No se presenta como estudio de usuarios.**

---

## 9. Criterio de cierre

La problemática se considera suficiente para continuar cuando existan:

- [ ] Al menos 5 registros de bitácora con tiempo medido.
- [ ] Tres muestras verificadas (extenso, escaneado, mixto).
- [ ] Comparación de al menos dos alternativas con la misma tarea.
- [ ] Un tiempo base documentado.
- [ ] Decisión escrita: continuar, ajustar el alcance o detener.

---

## 10. Qué no se afirma

- No hay entrevistas ni muestra representativa de usuarios.
- No hay usuarios reales del producto todavía.
- No se afirma una reducción de tiempo ni de errores.
- No se afirma adopción institucional.

El proyecto se presenta como **iniciativa personal basada en observación directa**, no como solución validada por una organización.
