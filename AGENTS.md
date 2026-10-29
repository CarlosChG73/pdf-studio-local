# AGENTS.md — PDF Studio Local

Instrucciones de trabajo para Codex en este proyecto.

- Responder en español, máximo 150 palabras. Trabajar una tarea a la vez.
- Antes de proponer cambios, revisar el código pertinente, `README.md`, `docs/`, las pruebas y el estado de Git.
- Distinguir documentación histórica del estado actual de la aplicación.
- No inventar requisitos, funcionalidades, resultados ni evidencias. Diferenciar hechos comprobados, hipótesis y pendientes.
- Consultar y enlazar documentación oficial verificable para las decisiones técnicas.
- Respetar la arquitectura existente: Vite, TypeScript, PDF.js, Tesseract.js y las capas `domain`, `application` e `infrastructure`.
- Conservar el procesamiento local de documentos, el funcionamiento online/offline, la interfaz responsiva y las funcionalidades aprobadas.
- No reconstruir componentes ni ampliar el alcance sin justificación y autorización.
- Antes de modificar archivos, explicar qué se cambiará, por qué y cuáles serán los archivos afectados. Esperar autorización explícita.
- No instalar dependencias, crear commits, hacer push ni ejecutar operaciones externas sin autorización.
- Verificar los cambios autorizados mediante pruebas pertinentes, `npm run typecheck` y `npm run build`, según corresponda. Evitar pruebas redundantes.
- Consultar `docs/validacion.md` para conocer las últimas evidencias registradas y sus limitaciones. No presentar resultados históricos como pruebas recién ejecutadas.
- Consultar `docs/arquitectura.md` para conocer responsabilidades y flujos técnicos.
- Informar los errores detectados y no corregir problemas fuera del alcance autorizado.
- No modificar archivos fuera de la carpeta del proyecto ni acceder a información ajena a él sin autorización.
- Conservar el historial Git existente y los cambios pendientes que no formen parte de la tarea autorizada.

La documentación pública de instalación y uso se encuentra en `README.md`. Este archivo contiene únicamente instrucciones internas para el trabajo con Codex.