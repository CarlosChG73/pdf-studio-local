# Proyecto PDF

Aplicación local para consultar documentos PDF, con navegación, búsqueda, copia de texto y reconocimiento óptico de páginas escaneadas. Todo el procesamiento ocurre en el dispositivo.

## Estado

Paso 2 completado: apertura de PDF, render de la primera página, navegación por páginas, salto a página y zoom (ajuste al ancho, página completa y manual). Todo el procesamiento ocurre en el dispositivo.

## Requisitos

- Node.js 20 o superior (probado con Node 24).
- npm 10 o superior.

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run typecheck  # comprobación de tipos
npm run build      # comprobación de tipos + build de producción en dist/
npm run preview    # servir el build localmente
```

## Estructura

```
index.html              Interfaz base (barra, visor, estado)
src/main.ts             Punto de entrada: conecta la interfaz con el visor
src/app/viewer.ts       Estado del visor: documento, página, zoom y cancelación
src/pdf/load.ts         Apertura del PDF y mensajes de error
src/pdf/render.ts       Render de una página en el canvas (devicePixelRatio)
src/pdf/worker.ts       Configuración del worker de PDF.js
src/styles.css          Estilos y adaptación a tema claro/oscuro
src/vite-env.d.ts       Tipos de Vite
```

## Hoja de ruta

- [x] 1. Esqueleto del proyecto y selección de archivo
- [x] 2. Abrir PDF, renderizar páginas, navegar y zoom (RF-01, RF-02)
- [ ] 3. Búsqueda de texto (RF-03)
- [ ] 4. Selección y copia (RF-04)
- [ ] 5. Reconocimiento de una página en español (RF-09)
- [ ] 6. Ciclo de vida de resultados (RF-10)
- [ ] 7. Funcionamiento sin conexión (RC-01)
- [ ] 8. Adaptación a móviles y temas
- [ ] 9. Pruebas E2E y documentación de límites
