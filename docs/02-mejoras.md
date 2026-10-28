# Mejoras: observaciones y cambios pendientes

Registro de todo lo observado usando la aplicación, antes de congelar el alcance
de la v1. Se escribe en bruto; la clasificación y el orden se hacen después.

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
