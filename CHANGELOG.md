# Changelog

Cambios relevantes para las personas que utilizan PDF Studio Local. El formato
sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y la versión prevista
seguirá [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

La versión declarada sigue siendo `0.1.0`. La primera versión oficial `v1.0.0`
está en preparación; no se ha publicado ni se le asigna una fecha aquí.

## Unreleased

### Added

- Visor de PDF locales con navegación, salto de página, zoom y ajustes de ancho o
  página completa.
- Búsqueda con resaltados y recorrido de coincidencias, selección y copia de texto.
- OCR local de una página en español, con progreso, confianza, copia y descarte.
- Barra lateral contraíble, menú móvil y temas Claro/Oscuro con preferencia local.
- Recursos PWA para consulta offline después de preparar la caché; recursos OCR
  locales almacenados bajo demanda.
- Aviso de actualización con consentimiento por pestaña y posibilidad de aplazar.
  En móvil, franja compacta con «Ver», detalles y cierre mediante botón o Escape.
- Pruebas de apertura, búsqueda, concurrencia, recuperación ante errores y
  recorridos E2E de actualización y funcionamiento offline en Chromium.

### Fixed

- Las aperturas simultáneas conservan el último PDF seleccionado y liberan cargas
  obsoletas.
- Borrar una búsqueda restaura la página original, incluso tras navegación manual.
- Las búsquedas anteriores no contaminan la caché de texto de otro documento;
  los errores de extracción restablecen el estado de búsqueda.
- Desplazamiento para acceder a herramientas y panel OCR en pantallas pequeñas.
- El aviso compacto móvil reserva espacio sin tapar herramientas ni visor;
  al cerrarlo o aplazarlo se recupera la altura disponible.

La aprobación visual definitiva de la franja móvil sigue pendiente. El alcance
de las comprobaciones y las limitaciones está en [README.md](README.md#verificación).
