# Validación técnica — 29 de octubre de 2026

Registro interno de evidencias. No sustituye una prueba de usuarios, una auditoría
completa de accesibilidad ni la aprobación visual del propietario del proyecto.
La versión declarada permanece en `0.1.0`; no se ha publicado v1.0.0.

## Suite y comprobaciones

Ejecución final del 29 de octubre: **41 aprobadas, 0 fallidas**, mediante
`node --test`; duración observada 32,73 s. `npm run typecheck` y `npm run build`
terminaron correctamente. `node --check` validó el script de medición y la prueba
de actualización. No se instalaron dependencias ni se crearon commits.

La suite contiene 41 casos: 34 de sesiones/dominio simulados, 3 de carga/liberación
y 4 E2E Chromium. Las primeras tres suites usan dobles de carga, renderizado,
extracción y OCR. Los casos de carga usan PDF.js real para PDF válido/inválido y
una contraseña simulada. Ver el desglose en [README](../README.md#verificación).

Durante esta revisión se reprodujo el fallo de `registration.waiting`:
la lectura instantánea devolvía falso mientras el worker aún se observaba como
`installing`; 500 ms después, en esa observación, aparecía como `waiting: installed`,
con el mismo controlador y `performance.timeOrigin`. Ese intervalo se utilizó solo
para diagnóstico; la prueba corregida usa `expect.poll`, no una pausa fija. Verifica
además que el controlador antiguo no se sustituye y que las sesiones PDF continúan.

Una ejecución completa posterior dio 40 aprobadas y 1 fallo de foco al cerrar el
aviso móvil. Se observó el foco transitorio en el botón «Ver» ya oculto. La interfaz
restaura ahora el foco también al recibir el evento nativo `close`, con el menú
como alternativa visible. La comprobación espera la finalización observable del
cierre. Ambas correcciones pasaron en la ejecución final, incluida la migración
desde `a91ac75`, el consentimiento por pestaña, el cierre del aviso y el OCR offline.

La advertencia de carga WASM en la prueba de decodificadores es intencional:
se bloquea ese recurso para verificar la alternativa JavaScript. El PDF inválido
también provoca una advertencia de análisis; Node avisa que la transformación
TypeScript en memoria es experimental. No se presentan como fallos funcionales.

Fuentes: [MDN: waiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/waiting),
[Playwright: expect.poll](https://playwright.dev/docs/test-assertions#expectpoll),
[MDN: close](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event),
[Vite PWA: prompt](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).

## Medición puntual con PDF públicos

Entorno: Windows, Node.js 24.21.0, Chromium 156.0.8078.4 headless con viewport 1366×900 y DPR 1.
Una ejecución por muestra; tiempos de pared observados desde la automatización.
No son promedios, límites admitidos ni comparación con otros visores. El informe
bruto guarda la versión exacta de Chromium y los hashes de los archivos.

| Muestra | Tamaño | Páginas | Apertura | Búsqueda «JavaScript» | Coincidencias | Salto a última página |
|---|---:|---:|---:|---:|---:|---:|
| Adobe PDF Reference 1.7 | 32.453.129 bytes | 1.310 | 3.341 ms | 3.957 ms | 148 | 56 ms |
| Mozilla TraceMonkey | 1.016.315 bytes | 14 | 327 ms | 214 ms | 42 | 115 ms |

En ambas muestras, la última página tenía píxeles dibujados y no hubo excepciones
no controladas ni advertencias de consola capturadas. Esto no compara todos sus
gráficos con un visor de referencia.

La lectura aproximada `performance.memory.usedJSHeapSize` después de buscar fue
163.154.340 y 31.879.209 bytes, respectivamente. Es una API no estándar de Chromium;
no mide la RAM total, las superficies gráficas ni todos los workers ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory)). No acredita
ausencia de fugas ni establece un presupuesto de memoria.

En la primera página de TraceMonkey, el OCR español tardó 4.484 ms y reconoció
el título publicado «Trace-based Just-in-Time Type Specialization for Dynamic
Languages» tras normalizar mayúsculas, espacios y puntuación. Las primeras líneas
también contienen ruido y errores en símbolos de autores. No se calculó precisión
de la página completa. Esta muestra nace digital: no representa escaneos borrosos,
inclinados, manuscritos, ni la calidad general en español.

### Reproducción

Las muestras provienen de [Adobe](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.7old.pdf)
y [Mozilla](https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf).
Descargarlas con autorización en `node_modules/.cache/e2e-tmp/public-samples/`
como `adobe-pdf-reference.pdf` y `mozilla-tracemonkey.pdf`, respectivamente. No se
redistribuyen como parte del repositorio. SHA-256 observados:

- Adobe: `4aa598e7e2cc88867565fae793db38c140a10ca2b5551dccdb45e2124282ce29`.
- Mozilla: `3662ff519e485810520552bf301d8c3b2b917fd2f83303f4965d7abed367e113`.

Con build y Chromium local preparados, ejecutar:

```bash
node scripts/validate-samples.mjs
```

El resultado se escribe en esa misma carpeta como `report.json`. El script no
descarga archivos ni instala dependencias y requiere ejecución local autorizada.

## Estado de los pendientes

| Punto | Estado y alcance |
|---|---|
| Sincronización de migración y foco del aviso | Corregidos y aprobados por las E2E de la suite final |
| Decodificación JPEG2000 | Prueba real de OpenJPEG en desarrollo, producción, alternativa JS y offline |
| Portada del PDF original de 764 páginas | Pendiente: no se dispone de ese documento |
| Navegación editorial, marcadores y equivalencia puntual | Pruebas directas y comprobaciones previas en Chromium; 1366×900, 393×852 y 320×240 |
| Búsqueda sobre resultados OCR | Fuera del alcance confirmado; se busca texto original |
| Conservación de PDF/OCR tras recargar | Fuera del alcance confirmado; sesión en memoria |
| Rendimiento con documentos extensos | Medición puntual con 1.310 páginas; otros tamaños, dispositivos y uso prolongado pendientes |
| Calidad OCR general | Título concreto y recorrido sintético comprobados; falta corpus escaneado y transcripción revisada |
| Aviso compacto móvil | Verificado técnicamente; aprobación visual definitiva del usuario pendiente |
| Plataformas y almacenamiento a largo plazo | Sin garantía universal; faltan dispositivos físicos, otros navegadores y pruebas prolongadas |
| Reducción de tiempo/errores en el trabajo | Sin evidencia; permanecen vacías las mediciones históricas de la problemática |

Conclusión: existe evidencia para un MVP de evaluación controlada. Una presentación
profesional debe declarar estas limitaciones y no anunciar validación institucional,
productividad demostrada, compatibilidad universal ni una versión oficial publicada.

## Revisión final del MVP — 29 de octubre de 2026

Tras unificar el nombre **PDF Studio Local** en pestaña, cabecera y manifest,
se repitieron `npm run typecheck`, `npm run build` y `node --test`: **41 aprobadas,
0 fallidas**, en 33,98 s para la suite. La denominación del manifest sigue la
[referencia de MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/name).
No se alteraron motores, navegación, búsqueda, OCR ni políticas de actualización.

### Presentación, teclado y contraste

Comprobación adicional en Chromium de 1366×900, 768×1024, 667×375, 393×852 y
320×240, en Claro y Oscuro: **10 recorridos completados**, sin excepciones no
controladas. Se verificaron acceso a herramientas con desplazamiento, búsqueda
real «JavaScript» en el PDF de Mozilla, equivalencia puntual, menú, teclado y
persistencia del tema después de recargar. A 393×852 se utilizó DPR 2. No hubo
desbordamiento horizontal del documento ni del panel.

La comprobación de Escape contempla que una ayuda contextual activa puede cerrarse
primero y el menú después. El foco volvió al botón del menú al cerrarlo.
Se inspeccionaron capturas de escritorio y móvil; no equivale a aprobación visual
del usuario ni a probar lectores de pantalla o dispositivos físicos.

Contraste calculado sobre los pares de colores base, sin abarcar cada estado,
imagen, resaltado ni control de todo el producto:

| Par | Claro | Oscuro |
|---|---:|---:|
| Texto / superficie | 16,41:1 | 14,34:1 |
| Texto secundario / superficie | 7,61:1 | 9,31:1 |
| Texto / botón secundario | 14,60:1 | 11,21:1 |
| Texto / botón principal | 6,18:1 | 5,80:1 |

Los cuatro pares superan 4,5:1. No se declara conformidad WCAG completa: esta
requiere revisar también comportamiento y contenido de forma manual
([W3C](https://www.w3.org/WAI/WCAG22/quickref/),
[alcance de automatización según Playwright](https://playwright.dev/docs/accessibility-testing)).

No se observaron peticiones a orígenes externos en estos diez recorridos. Esto
describe el recorrido comprobado y acompaña la revisión del procesamiento local;
no es una auditoría exhaustiva de seguridad o privacidad.

Las capturas y el informe temporal están en
`node_modules/.cache/e2e-tmp/mvp-review/`, excluidos de Git. Los PDF públicos
siguen en la caché; no se añadieron a la distribución.

### Dependencias: hallazgo conocido de compilación

`npm audit --json --cache node_modules/.cache/npm` informó **4 avisos bajos**,
sin avisos moderados, altos o críticos. Son entradas de una misma cadena:
`vite-plugin-pwa@2.0.0 → workbox-build@7.4.1 → @rollup/plugin-node-resolve@16.0.3
→ deepmerge@4.3.1`. El aviso raíz es
[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

`npm audit --omit=dev --json --cache node_modules/.cache/npm` devolvió **0 avisos**
para dependencias de producción en esa consulta. No acredita ausencia de
vulnerabilidades desconocidas. La cadena señalada corresponde a herramientas
de compilación; no se ha demostrado una explotación sobre esta aplicación.

El aviso consultado no publica una versión corregida de `deepmerge`. npm propone
degradar Vite PWA a `0.2.1`, un cambio incompatible de herramientas que no se aplicó.
No se ejecutó `npm audit fix`, ni se modificaron dependencias/lockfile. Debe
reevaluarse el aviso antes de una publicación o al actualizar herramientas con
una corrección compatible. Fuente: [documentación oficial de npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

### Dictamen y alcance de entrega

**Apto técnicamente para una demostración y un piloto controlado del MVP en el
entorno comprobado**, manteniendo visible la limitación de seguridad de las
herramientas de compilación. Se verifican el flujo principal, manejo de errores,
build, offline, migración, presentación adaptable y documentación de uso y código.
Este dictamen es una evaluación del proyecto; ninguna fuente consultada concede
una certificación «MVP profesional».

No son condiciones verificadas: compatibilidad universal, exactitud OCR general,
la portada original de 764 páginas, aprobación visual humana ni productividad
institucional. La publicación, alojamiento HTTPS y licencia del proyecto siguen
sin decidirse. `vite preview` sirve para revisar el build localmente y no debe
presentarse como servidor de producción
([Vite](https://vite.dev/guide/static-deploy.html)).
