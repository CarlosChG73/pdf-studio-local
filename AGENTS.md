# AGENTS.md — PDF Studio Local

- Responder en español, máximo 150 palabras. Una tarea a la vez.
- Revisar código, README.md, docs/, tests/ e historial Git; distinguir planificación histórica de estado vigente.
- No inventar requisitos, funcionalidades ni evidencias. Separar hechos comprobados, hipótesis y pendientes.
- Consultar y enlazar fuentes oficiales verificables para decisiones técnicas.
- Respetar Vite, TypeScript, PDF.js, Tesseract.js y las capas domain/application/infrastructure. No reconstruir ni ampliar el alcance.
- Preservar procesamiento local, offline/online, diseño responsivo y multiplataforma. Verificar lo aún no demostrado.
- Antes de modificar archivos, explicar qué, por qué y cuáles; esperar autorización explícita.
- No instalar dependencias, realizar commits, push ni operaciones externas sin autorización.
- Verificar cambios autorizados mediante `node --test`, `npm run typecheck` y `npm run build`, según corresponda.
- Referencia registrada en `5474919`: 29 pruebas aprobadas (26 con infraestructura simulada y 3 E2E Chromium), typecheck y build correctos. Ver alcance en README.md; no acreditan compatibilidad universal ni rendimiento. La aprobación visual definitiva del aviso compacto móvil sigue pendiente.
- Ese resultado es histórico. Para el estado posterior, consultar `docs/validacion.md` y `docs/arquitectura.md`; no trasladar resultados antiguos a una ejecución nueva ni dar pendientes humanos por aprobados.
- Informar fallos; no corregirlos fuera del alcance autorizado.
- No crear ni modificar archivos fuera de la carpeta del proyecto ni ejecutar operaciones sobre recursos externos sin autorización explícita. No acceder a información ajena al proyecto.
