# Skills para agentes de IA

**Por qué crearlas y cómo gobernarlas**

| | |
|---|---|
| Versión | 1.0 |
| Fecha | 27 de octubre de 2026 |
| Estado | Documento de referencia |
| Alcance | Cualquier agente compatible con el estándar Agent Skills |

---

## 1. Propósito

Explicar qué son las Skills, por qué conviene crearlas y bajo qué reglas deben escribirse, guardarse y combinarse, de modo que el equipo pueda reutilizarlas sin depender de instrucciones improvisadas en cada conversación.

---

## 2. Qué es una Skill

Una Skill es una **carpeta con un archivo `SKILL.md`** que contiene metadatos, instrucciones y, opcionalmente, scripts y materiales de referencia. El agente la descubre, decide si es relevante y la carga cuando la tarea lo requiere. [1]

> "Skills are reusable, filesystem-based resources that give Claude domain-specific expertise: workflows, context, and best practices that turn a general-purpose agent into a specialist." — Documentación oficial [1]

La analogía oficial es la de una **guía de incorporación para una persona nueva**: no se le explica todo cada día, se le entrega el manual y lo consulta cuando lo necesita. [1][2]

### 2.1. Anatomía

```markdown
---
name: revision-codigo
description: Revisa cambios de código, detecta errores y documenta hallazgos. Úsala al revisar un diff o preparar un commit.
---

# Revisión de código

1. Lee el diff completo.
2. Comprueba tipos y ejecuta las pruebas.
3. Registra los hallazgos por severidad.
```

- `name`: obligatorio, 1–64 caracteres, minúsculas, números y guiones simples. Debe coincidir con el nombre de la carpeta. [1][4]
- `description`: obligatorio, 1–1024 caracteres. Debe decir **qué hace y cuándo usarla**, porque es el texto contra el que el agente decide activarla. [1][4]
- El archivo debe llamarse exactamente `SKILL.md`. [4]

### 2.2. Divulgación progresiva

| Nivel | Contenido | Cuándo se carga | Coste |
|---|---|---|---|
| 1 | `name` y `description` | Siempre, al iniciar | ~100 tokens por Skill |
| 2 | Cuerpo de `SKILL.md` | Al activarse | menos de 5 000 tokens |
| 3 | Archivos y scripts | Solo si se consultan o ejecutan | 0 hasta su uso |

Este diseño permite instalar muchas Skills sin consumir contexto y es la razón principal de su eficiencia. [1][2]

### 2.3. Qué no es una Skill

- **No es entrenamiento.** No modifica el modelo ni crea memoria permanente: inyecta instrucciones en el contexto. [1]
- **No es un comando.** En OpenCode se carga mediante la herramienta `skill`, no como comando de barra; sus metadatos no controlan la selección automática de comandos. [4]
- **No es MCP.** MCP conecta herramientas y datos externos; una Skill enseña un procedimiento. [2]
- **No garantiza ejecución.** El agente decide si la usa; una `description` vaga impide que se active.

---

## 3. Por qué crearlas

### 3.1. Beneficios

| Beneficio | Qué significa | Matiz |
|---|---|---|
| **Tiempo** | Crear una vez y reutilizar sin repetir instrucciones | Requiere buena `description` para activarse [1] |
| **Organización** | Cada tarea tiene un procedimiento escrito | El orden lo sigue el agente, no un motor de flujos |
| **Consistencia** | Se aplican los mismos criterios de trabajo | No garantiza resultados idénticos; solo los scripts son deterministas [1][2] |
| **Reutilización** | Sirven en distintos proyectos y agentes | Estándar abierto desde diciembre de 2025 [5] |
| **Composición** | Varias Skills pueden encadenarse para tareas complejas | La coordinación la decide el agente [1] |

### 3.2. Ejemplo

Flujo de desarrollo: revisar código → detectar errores → ejecutar pruebas → documentar cambios.

Sin Skills, esas instrucciones se repiten en cada conversación y varían según cómo se escriban. Con Skills, el procedimiento queda en un archivo versionado y se carga solo cuando la tarea coincide.

### 3.3. En una frase

> Crear Skills es convertir nuestra forma de trabajar en procedimientos reutilizables que el agente puede cargar cuando los necesita, para desarrollar software con menos repetición, criterios homogéneos y resultados verificables.

### 3.4. Límites que deben declararse

- La Skill **no entrena** al modelo.
- La Skill **no garantiza** el mismo resultado en cada ejecución.
- La Skill **no orquesta** por sí sola: encadena tareas bajo decisión del agente.
- Las Skills personalizadas **no se sincronizan** entre superficies (claude.ai, API y Claude Code se gestionan por separado). [1]
- Una Skill puede **ejecutar código** y acceder a archivos: su origen debe ser confiable. [1][2]

---

## 4. Reglamento

Principio general: mantener un estándar práctico y adaptable a cualquier lenguaje, framework o agente compatible con Skills. Las rutas y las capacidades de ejecución deben verificarse según el entorno.

### 4.1. Skills globales

1. Usarlas para procesos transferibles entre proyectos: revisión general de código, documentación o preparación de commits.
2. Evitar rutas, nombres de ramas o comandos rígidos de una aplicación concreta; detectar el contexto antes de actuar.
3. Guardarlas en la ubicación personal admitida por el agente.
4. Versionar una copia privada de respaldo, sin secretos ni credenciales.

### 4.2. Skills del proyecto

1. Usarlas cuando el proceso dependa de la arquitectura, scripts, convenciones o reglas del repositorio.
2. Guardarlas con el proyecto y versionarlas junto con el código cuando deban compartirse.
3. Utilizar comandos reales del proyecto y revisarlos cuando cambien dependencias, estructura o pipeline.
4. Mantenerlas en la ruta que el agente reconozca para el proyecto, no en la personal.

### 4.3. Combinar Skills

1. Crear una Skill coordinadora cuando haga falta encadenar tareas: revisión → pruebas → preparación de entrega.
2. No duplicar procedimientos: describir el orden y los criterios de avance.
3. Verificar que el agente puede localizar e invocar las Skills mencionadas.
4. Si una fase falla, detener las siguientes que dependan de ella, registrar el problema y solicitar instrucciones cuando sea necesario.
5. Aclarar en la Skill coordinadora que la invocación la decide el agente; incluir una instrucción de respaldo si una Skill no está disponible.

### 4.4. Seguridad (nuevo)

1. Instalar Skills solo de fuentes propias o de confianza (Anthropic o el repositorio oficial).
2. Auditar antes de usar una Skill externa: revisar `SKILL.md`, scripts, imágenes y dependencias.
3. Rechazar Skills que realicen llamadas de red, accedan a archivos o ejecuten comandos no relacionados con su propósito declarado.
4. Tratarlas como software que se instala: una Skill maliciosa puede exfiltrar datos o ejecutar código. [1][2]
5. En OpenCode, restringir el acceso mediante permisos `allow`, `deny` o `ask` por patrón de nombre. [4]

### 4.5. Calidad y formato (nuevo)

1. Cumplir el formato: `SKILL.md` en mayúsculas, `name` válido y `description` de 1–1024 caracteres. [1][4]
2. Escribir la `description` con qué hace y cuándo usarla; es el criterio de activación.
3. Mantener el cuerpo breve; mover contenido extenso a archivos de referencia.
4. Usar scripts para operaciones que deban ser deterministas.
5. No incluir secretos, tokens ni datos personales.

### 4.6. Verificación (nuevo)

1. Probar la Skill con tareas representativas y comprobar que se activa cuando debe y no cuando no debe.
2. Registrar los fallos observados y ajustar instrucciones o `description`.
3. Revisar la Skill cuando cambien las herramientas, dependencias o el flujo de trabajo.
4. Mantener una lista de Skills activas y su propósito.

### 4.7. Ubicaciones según el agente

| Agente | Ámbito | Ruta |
|---|---|---|
| Claude Code | Personal | `~/.claude/skills/<nombre>/SKILL.md` |
| Claude Code | Proyecto | `.claude/skills/<nombre>/SKILL.md` |
| OpenCode | Personal | `~/.config/opencode/skills/<nombre>/SKILL.md` |
| OpenCode | Proyecto | `.opencode/skills/<nombre>/SKILL.md` |
| OpenCode | Compatible | `.claude/skills/` y `.agents/skills/` (también globales) |

Fuentes: Claude Code [1] y OpenCode [4]. Verificar la ruta antes de crear la Skill.

---

## 5. Lista de verificación

- [ ] La Skill resuelve un procedimiento repetible, no una consulta puntual.
- [ ] `SKILL.md` está en la carpeta correcta y con el nombre en mayúsculas.
- [ ] `name` cumple el formato y coincide con la carpeta.
- [ ] `description` explica qué hace y cuándo usarla.
- [ ] Las instrucciones usan comandos reales y detectan el contexto.
- [ ] No contiene secretos ni datos personales.
- [ ] Se probó con una tarea real y se activó correctamente.
- [ ] Se revisó el código y las dependencias si es de origen externo.
- [ ] Está versionada y documentada su finalidad.

---

## 6. Referencias

1. Anthropic. *Agent Skills — Overview*. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
2. Anthropic Engineering. *Equipping agents for the real world with Agent Skills* (16 de octubre de 2025). https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
3. Anthropic Support. *Teach Claude your way of working using Skills*. https://support.claude.com/en/articles/12580051-teach-claude-your-way-of-working-using-skills
4. OpenCode. *Agent Skills*. https://opencode.ai/docs/skills/
5. Agent Skills. *Open standard for cross-platform portability* (diciembre de 2025). https://agentskills.io/

> Nota: los documentos de Anthropic describen el comportamiento en Claude y en Claude Code; OpenCode implementa el mismo formato con sus propias rutas y permisos. Las rutas deben comprobarse en cada entorno antes de usarlas.
