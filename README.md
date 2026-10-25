# Proyecto PDF

Aplicación local para consultar documentos PDF, con navegación, búsqueda, copia de texto y reconocimiento óptico de páginas escaneadas. Todo el procesamiento ocurre en el dispositivo.

## Estado

Paso 1 completado: esqueleto del proyecto, interfaz base y selección de archivo (sin lectura del PDF todavía).

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
index.html          Interfaz base (barra, visor, estado)
src/main.ts         Punto de entrada y lógica de interfaz
src/styles.css      Estilos y adaptación a tema claro/oscuro
src/vite-env.d.ts   Tipos de Vite
```

## Hoja de ruta

- [x] 1. Esqueleto del proyecto y selección de archivo
- [ ] 2. Abrir PDF y renderizar la primera página (RF-01)
- [ ] 3. Navegación por páginas (RF-02)
- [ ] 4. Zoom y ajuste de visualización
- [ ] 5. Búsqueda de texto (RF-03)
- [ ] 6. Selección y copia (RF-04)
- [ ] 7. Reconocimiento de una página en español (RF-09)
- [ ] 8. Ciclo de vida de resultados (RF-10)
- [ ] 9. Funcionamiento sin conexión (RC-01)
- [ ] 10. Adaptación a móviles y temas
- [ ] 11. Pruebas E2E y documentación de límites
