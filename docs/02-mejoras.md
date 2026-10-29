# Mejoras: observaciones y cambios pendientes

Registro interno de las observaciones realizadas durante el desarrollo de PDF Studio Local.

Este documento conserva antecedentes, decisiones y resultados históricos. No sustituye la documentación vigente del [README](../README.md), el [historial de cambios](../CHANGELOG.md) ni las evidencias de [validación técnica](validacion.md).

Las observaciones registradas no constituyen automáticamente requisitos ni autorizan modificaciones.

## Estado actualizado — 29 de octubre de 2026

Durante el desarrollo se incorporaron y verificaron las siguientes mejoras:

- Navegación por etiquetas editoriales y marcadores internos de PDF.
- Correspondencia puntual entre una página física y su numeración editorial, con vista previa y confirmación explícita, sin extrapolación a otras páginas.
- Decodificación de imágenes JPEG2000 mediante recursos locales OpenJPEG y una alternativa JavaScript.
- Correcciones de sincronización y gestión del foco en los avisos de actualización de la PWA.
- Mejoras de presentación, contraste, controles y adaptación a pantallas pequeñas.

**Aprobación visual:** el diseño actualizado de PDF Studio Local, incluido el aviso compacto de actualización móvil, fue aprobado por el usuario del proyecto.

Las pruebas automatizadas, verificaciones de navegador, limitaciones conocidas y resultados posteriores se documentan en [Validación técnica](validacion.md).

Se conserva el registro histórico que aparece a continuación, sin presentar sus resultados como verificaciones nuevas.

## Estado histórico del registro — 28 de octubre de 2026

Este apartado corresponde a las observaciones y decisiones registradas durante esa etapa del desarrollo.

- **Evidencia registrada:** commit `5474919`, con 29 pruebas aprobadas y ninguna fallida, `typecheck` y `build` correctos. Incluía 26 pruebas con infraestructura simulada y 3 pruebas E2E en Chromium.
- **Aprobación visual del aviso móvil:** estaba pendiente en esa fecha; posteriormente fue confirmada por el usuario.
- **Evidencia anterior:** las 26 pruebas mencionadas en la resolución de la búsqueda corresponden al commit `6a7b570`.

Estos resultados se mantienen como antecedentes y no representan el estado más reciente de la suite.

## Cómo registrar observaciones

Anotar una observación por elemento, identificando el comportamiento actual y el esperado.

Formato orientativo:

```text
Momento: qué sucede → qué debería suceder (tipo, prioridad)
```

**Momento:** abrir, navegar, zoom, buscar, seleccionar, copiar, OCR, móvil, sin conexión, instalar u otro.

**Tipo:**

- `fallo`: una función no trabaja correctamente.
- `lógica`: funciona, pero su comportamiento no es el esperado.
- `diseño`: dificulta el uso o presenta problemas visuales.
- `falta`: función que no existe y cuya necesidad debe evaluarse.

**Prioridad:**

- `alta`: impide realizar una tarea importante.
- `media`: afecta frecuentemente la experiencia.
- `baja`: detalle menor o mejora opcional.

La prioridad puede quedar sin asignar hasta que se revise la observación.

## Registro de observaciones

### 1. Restauración de página después de buscar

**Observación original:**

Al borrar una búsqueda, la aplicación permanecía en la página de una coincidencia, en lugar de regresar a la página desde la cual comenzó la búsqueda.

**Clasificación:** lógica, prioridad media.

**Estado:** resuelta en el commit `6a7b570`.

**Solución registrada:**

Al borrar la consulta se restaura la página original, incluso después de navegar manualmente o modificar el texto buscado.

**Evidencias históricas:**

Archivo: `tests/pdf-search-navigation.test.mjs`.

Se comprobaron los siguientes escenarios:

- Borrar la búsqueda y regresar a la página previa.
- Conservar el origen después de editar la consulta, recorrer coincidencias y navegar manualmente.
- Restaurar la página original cuando una búsqueda no encuentra resultados.
- Limpiar el origen al cambiar de documento.
- Limpiar el origen al cerrar y volver a abrir un documento.

**Resultado histórico:** 26 pruebas aprobadas, ninguna fallida, mediante `node --test`.

Las verificaciones posteriores y el estado actual se encuentran en [docs/validacion.md](validacion.md).

## Nuevas observaciones

Utilizar esta sección para registrar incidencias futuras, sin asumir que deberán implementarse.

| Fecha | Función | Comportamiento observado | Comportamiento esperado | Tipo | Prioridad | Estado |
|---|---|---|---|---|---|---|
| | | | | | | |

## Dudas pendientes

Registrar aquí preguntas que requieran aclaración, sin considerarlas automáticamente solicitudes de cambio.

Actualmente no hay dudas adicionales documentadas en este registro.

## Ideas descartadas o reservadas para el futuro

Esta sección permite conservar propuestas que no forman parte del alcance aprobado.

Actualmente no hay propuestas adicionales registradas en esta sección.

---

**Nota de mantenimiento:** este documento conserva observaciones históricas. Las características actuales de PDF Studio Local se describen en el [README](../README.md), y las evidencias de funcionamiento se mantienen en [Validación técnica](validacion.md).