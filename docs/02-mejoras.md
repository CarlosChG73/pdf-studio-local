# Mejoras: observaciones y cambios pendientes

Registro de todo lo observado usando la aplicación, antes de congelar el alcance
de la v1. Se escribe en bruto; la clasificación y el orden se hacen después.

## Estado del registro — 28 de octubre de 2026

Documento interno de observaciones; no sustituye la guía pública del
[README](../README.md) ni el [changelog](../CHANGELOG.md). Se conservan la lista,
la resolución y los resultados históricos originales. Anotar una observación
no autoriza su implementación ni añade requisitos a v1.0.0.

- **Pendiente de revisión:** aprobación visual definitiva del aviso compacto de
  actualización móvil. Está implementado y probado en ambos temas y en
  393×852/320×240; no se clasifica como un nuevo fallo ni se da por aprobado.
- **Evidencia actual registrada:** commit `5474919`, 29 pruebas aprobadas,
  0 fallidas, typecheck y build correctos. Incluye 26 pruebas simuladas y 3 E2E
  Chromium. Esta actualización documental no reejecuta comprobaciones.
- El resultado de 26 pruebas que aparece en la resolución siguiente pertenece
  al commit `6a7b570`; se conserva como evidencia de aquel momento.

## Cómo anotar

Una línea por cosa. Formato libre, por ejemplo:

```
momento: qué pasa ahora → qué debería pasar (tipo, prioridad)
```

**Momento** (dónde estabas):

- abrir · navegar · zoom · buscar · seleccionar · copiar · OCR · móvil · sin conexión · instalar · otro

**Tipo**:

- `fallo` — no funciona o da error
- `lógica` — funciona, pero no como quiero
- `diseño` — se ve mal o se usa incómodo
- `falta` — no existe y lo necesito

**Prioridad**:

- `alta` — me impide trabajar
- `media` — me molesta a menudo
- `baja` — detalle o capricho

Si no sabes el tipo o la prioridad, se deja en blanco: eso lo decido yo.

## Lista

1. buscar: al borrar la búsqueda me quedo en la página de la coincidencia → volver a la página donde estaba antes de buscar (lógica, media)
   - **Resuelta** en el commit `6a7b570`: al borrar la búsqueda se restaura la página original, incluso después de navegar manualmente o editar la consulta.
   - **Evidencia:** `tests/pdf-search-navigation.test.mjs`, pruebas «borrar busqueda vuelve a la pagina previa», «conserva origen tras editar consulta, recorrer resultados y navegar manualmente», «borrar una busqueda sin resultados tambien restaura el origen», «limpia origen al cambiar de documento» y «limpia origen al cerrar y reabrir».
   - **Resultado de la suite completa:** 26 pruebas aprobadas, 0 fallidas (`node --test`).
2.
3.
4.
5.
6.
7.
8.
9.
10.
11.
12.
13.
14.
15.
16.
17.
18.
19.
20.

## Dudas

Preguntas que no son cambios, sino cosas que no tengo claras.

-

## Descartado / trabajo futuro

Ideas que aparecen pero que no entran en la v1.

-
