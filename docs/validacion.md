# Validación técnica — 29 de octubre de 2026

Registro interno de evidencias de PDF Studio Local. No sustituye pruebas con usuarios, una auditoría completa de accesibilidad ni la validación en todos los navegadores y dispositivos.

La versión declarada permanece en `0.1.0`; `v1.0.0` todavía no se ha publicado.

## Suite y comprobaciones

La ejecución registrada el 29 de octubre de 2026 obtuvo **41 pruebas aprobadas y 0 fallidas**, mediante `node --test`, con una duración observada de 32,73 segundos.

También finalizaron correctamente:

- `npm run typecheck`
- `npm run build`
- `node --check` para el script de medición y la prueba de actualización.

La suite contiene 41 casos:

| Categoría | Pruebas |
|---|---:|
| Sesiones y dominio con infraestructura simulada | 34 |
| Carga y liberación de documentos | 3 |
| E2E en Chromium | 4 |
| **Total** | **41** |

Las pruebas simuladas sustituyen carga, renderizado, extracción y OCR. Las pruebas de carga utilizan PDF.js real con archivos válidos e inválidos y una simulación de contraseña.

### Correcciones verificadas

Durante las pruebas se detectó una condición de sincronización en la actualización de la PWA: la comprobación de `registration.waiting` ocurría mientras el service worker todavía estaba instalándose.

Se sustituyó la lectura instantánea por `expect.poll`, sin utilizar una espera fija. La prueba también comprueba que el controlador anterior no sea sustituido y que las sesiones PDF continúen.

Se identificó además un problema transitorio de foco al cerrar el aviso móvil. La interfaz restaura el foco al recibir el evento nativo `close`, utilizando el menú como alternativa visible.

La ejecución final confirmó ambas correcciones, incluyendo migración desde `a91ac75`, consentimiento por pestaña y funcionamiento offline de PDF y OCR.

Las advertencias esperadas en pruebas específicas no se consideran fallos funcionales. Entre ellas están la desactivación intencional de WASM para comprobar la alternativa JavaScript, el análisis de un PDF inválido y la advertencia experimental de transformación TypeScript en Node.js.

**Referencias oficiales:**

- [MDN — ServiceWorkerRegistration.waiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/waiting)
- [Playwright — expect.poll](https://playwright.dev/docs/test-assertions#expectpoll)
- [MDN — HTMLDialogElement close](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event)
- [Vite PWA — Prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)

## Medición puntual con documentos PDF públicos

**Entorno:** Windows, Node.js 24.21.0, Chromium 156.0.8078.4 en modo headless, viewport 1366 × 900 y DPR 1.

Se realizó una ejecución por muestra. Los tiempos corresponden a mediciones observadas durante la automatización; no representan promedios ni límites universales.

| Muestra | Tamaño | Páginas | Apertura | Búsqueda «JavaScript» | Coincidencias | Salto a última página |
|---|---:|---:|---:|---:|---:|---:|
| Adobe PDF Reference 1.7 | 32.453.129 bytes | 1.310 | 3.341 ms | 3.957 ms | 148 | 56 ms |
| Mozilla TraceMonkey | 1.016.315 bytes | 14 | 327 ms | 214 ms | 42 | 115 ms |

En ambas muestras se comprobó que la última página contenía píxeles dibujados, sin excepciones no controladas ni advertencias de consola capturadas.

Estas comprobaciones no demuestran fidelidad visual universal frente a otros visores PDF.

### Consumo de memoria

Después de realizar la búsqueda, `performance.memory.usedJSHeapSize` mostró:

| Documento | Memoria observada |
|---|---:|
| Adobe PDF Reference 1.7 | 163.154.340 bytes |
| Mozilla TraceMonkey | 31.879.209 bytes |

Esta API es específica de determinados navegadores y no representa la memoria total del proceso, los workers o las superficies gráficas.

No permite descartar fugas de memoria ni establecer un presupuesto máximo.

Referencia: [MDN — Performance.memory](https://developer.mozilla.org/en-US/docs/Web/API/Performance/memory).

### Reconocimiento OCR

En la primera página del documento Mozilla TraceMonkey, el OCR tardó aproximadamente **4.484 ms** y reconoció el título publicado después de normalizar mayúsculas, espacios y puntuación.

También se observaron errores en símbolos y nombres de autores.

No se calculó la precisión del documento completo. Esta muestra digital no representa documentos escaneados, manuscritos, inclinados o de baja calidad.

### Reproducción de las mediciones

Documentos originales:

- [Adobe PDF Reference 1.7](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.7old.pdf)
- [Mozilla TraceMonkey](https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf)

Los archivos de prueba se guardan localmente en:

`node_modules/.cache/e2e-tmp/public-samples/`

Nombres esperados:

- `adobe-pdf-reference.pdf`
- `mozilla-tracemonkey.pdf`

SHA-256 observados:

- Adobe: `4aa598e7e2cc88867565fae793db38c140a10ca2b5551dccdb45e2124282ce29`
- Mozilla: `3662ff519e485810520552bf301d8c3b2b917fd2f83303f4965d7abed367e113`

Con la compilación y Chromium local preparados, ejecutar:

```bash
node scripts/validate-samples.mjs
```

El informe se genera en la misma carpeta como `report.json`.

El script no descarga documentos ni instala dependencias. Su ejecución requiere disponer previamente de los archivos de prueba.

## Estado de las funcionalidades y validaciones

| Elemento | Estado |
|---|---|
| Actualización PWA y sincronización del service worker | Correcciones verificadas mediante E2E |
| Gestión de foco del aviso | Corrección verificada mediante E2E |
| Decodificación JPEG2000 | Verificada mediante OpenJPEG local, alternativa JavaScript y pruebas offline |
| Portada de PDF real de 764 páginas | Recuperación visual de imágenes y colores comprobada manualmente por el usuario |
| Navegación editorial y marcadores | Verificada mediante pruebas automatizadas y recorridos en Chromium |
| Equivalencia puntual de páginas | Verificada mediante pruebas automatizadas; permanece limitada a una página |
| Búsqueda sobre resultados OCR | No implementada |
| Conservación de PDF y OCR tras recargar | No implementada; los datos permanecen en memoria |
| Rendimiento en documentos extensos | Medición puntual con un PDF de 1.310 páginas |
| Calidad OCR general | Pendiente de evaluación con documentos escaneados y transcripciones revisadas |
| Diseño responsivo y aviso compacto | Diseño actualizado aprobado visualmente por el usuario; verificaciones técnicas en Chromium |
| Otros navegadores y dispositivos físicos | Pendientes de validación |
| Almacenamiento offline prolongado | Sin garantía de conservación permanente |
| Medición de mejoras de productividad | Sin evidencia cuantitativa concluyente |

**Alcance de la comprobación del PDF de 764 páginas:** se observó que la portada recuperó sus imágenes y colores después de configurar los recursos de decodificación JPEG2000. Esta revisión manual no equivale a una comparación automatizada de todas las páginas ni a una garantía de fidelidad universal.

## Revisión final del MVP — 29 de octubre de 2026

Tras unificar la denominación **PDF Studio Local** en la pestaña, la cabecera y el manifest, se repitieron:

- `npm run typecheck`
- `npm run build`
- `node --test`

**Resultado:** 41 pruebas aprobadas y 0 fallidas. La última ejecución de la suite duró 33,98 segundos.

La denominación del manifest sigue la [referencia oficial de MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/name).

No se modificaron los motores PDF/OCR, la navegación, la búsqueda ni las políticas de actualización durante esa revisión de denominación.

### Presentación, teclado y contraste

Se completaron diez recorridos adicionales en Chromium, utilizando los temas Claro y Oscuro y los siguientes tamaños:

- 1366 × 900
- 768 × 1024
- 667 × 375
- 393 × 852
- 320 × 240

Las comprobaciones incluyeron acceso a herramientas, desplazamiento del menú, búsqueda, equivalencia puntual, navegación mediante teclado y persistencia del tema.

En la revisión de 393 × 852 se utilizó DPR 2.

No se observaron excepciones no controladas ni desbordamientos horizontales en los recorridos registrados.

El manejo de Escape contempla el cierre de una ayuda contextual activa antes del cierre del menú. Se verificó el retorno del foco al control correspondiente.

Las pruebas automatizadas y la revisión visual no equivalen a una evaluación completa con lectores de pantalla o dispositivos físicos.

### Contraste

Se calcularon los siguientes contrastes sobre pares de colores base:

| Elementos | Tema Claro | Tema Oscuro |
|---|---:|---:|
| Texto / superficie | 16,41:1 | 14,34:1 |
| Texto secundario / superficie | 7,61:1 | 9,31:1 |
| Texto / botón secundario | 14,60:1 | 11,21:1 |
| Texto / botón principal | 6,18:1 | 5,80:1 |

Los cuatro pares superan la relación de contraste 4,5:1.

Estos resultados no constituyen una declaración de conformidad completa con WCAG 2.2, ya que no abarcan todos los controles, estados visuales, contenidos y tecnologías de asistencia.

Referencias:

- [W3C — WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
- [Playwright — Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

### Privacidad observada

En los diez recorridos de revisión no se detectaron solicitudes a orígenes externos.

Esta observación respalda el funcionamiento local de los flujos evaluados, pero no equivale a una auditoría exhaustiva de seguridad o privacidad.

Los informes y capturas temporales permanecen en `node_modules/.cache/e2e-tmp/mvp-review/`, fuera del control de versiones.

## Dependencias y seguridad

La revisión de dependencias con `npm audit` del 29 de octubre de 2026 identificó **cuatro avisos de gravedad baja**, relacionados con una cadena de herramientas de compilación:

`vite-plugin-pwa@2.0.0 → workbox-build@7.4.1 → @rollup/plugin-node-resolve@16.0.3 → deepmerge@4.3.1`

Referencia del aviso:

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)

La consulta `npm audit --omit=dev` registró **cero avisos en dependencias de producción**.

Esto no garantiza que no existan vulnerabilidades desconocidas.

En la fecha registrada, el aviso consultado no publicaba una versión corregida de `deepmerge`. La alternativa sugerida por npm implicaba degradar herramientas de manera potencialmente incompatible.

No se ejecutó `npm audit fix` ni se modificaron dependencias o archivos de bloqueo.

El aviso debe reevaluarse antes de publicar una nueva versión o actualizar herramientas cuando exista una corrección compatible.

Fuente: [documentación oficial de npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

## Conclusión y alcance de entrega

Las verificaciones registradas respaldan el uso de PDF Studio Local como **MVP funcional para demostraciones y pruebas controladas** dentro de los entornos comprobados.

Se cuenta con evidencia de:

- Lectura, navegación y búsqueda de documentos PDF.
- OCR en español.
- Decodificación JPEG2000 y recuperación visual de una portada real.
- Funcionamiento offline bajo condiciones preparadas.
- Actualización controlada de la PWA.
- Diseño responsivo y controles accesibles mediante teclado.
- Correcciones de errores y pruebas automatizadas satisfactorias.

**La aprobación visual del diseño actualizado corresponde al usuario del proyecto y está confirmada.**

Continúan fuera del alcance verificado la compatibilidad universal, la exactitud OCR general, el rendimiento en todos los dispositivos y la certificación completa de accesibilidad o seguridad.

La publicación oficial, el alojamiento HTTPS y la versión `v1.0.0` todavía no se presentan como realizados.

`npm run preview` se utiliza para consultar la compilación localmente y no debe considerarse un servidor de alojamiento de producción.

Referencia: [Vite — Deploying a Static Site](https://vite.dev/guide/static-deploy.html).