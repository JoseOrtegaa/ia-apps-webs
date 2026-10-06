# Koi Store

## Producto
Catálogo público de juegos y apps de Jose Ortega. Explorar → filtrar/buscar → abrir el proyecto en su URL independiente. MVP estático, público y sin costes. Sin cuentas, pagos, backend, analítica ni precarga de destinos.

## Implementación
HTML/CSS/JavaScript nativos, cero dependencias de ejecución. `projects.js` centraliza identificador, nombre, tipo (`juego`/`app`), descripción, URL, miniatura, alt, etiquetas, estado y orden. `app.js` genera tarjetas y combina categoría con búsqueda local sin distinguir acentos/mayúsculas. Estados: `testing` (En pruebas), `available` (sin etiqueta), `unavailable` (sin enlace). No realizar comprobaciones periódicas de disponibilidad.

Miniaturas propias en `assets/`: capturas reales optimizadas WebP. No sustituir por imágenes genéricas. Verificar URLs y funciones existentes antes de añadir proyectos. Mantener documentación de origen en README.

## Diseño
Español, fondo marfil, verde oscuro y coral. Sin emojis. Iconos SVG. Tres columnas en escritorio, una en móvil; teclado, foco visible, estado vacío y movimiento reducido.

## Comandos
`node apps/koi-store/scripts/publish.mjs` copia solo los archivos públicos a `docs/koi-store/`. Pages existente: `main:/docs`. No modificar otras apps. QA con Playwright: `scripts/qa.mjs`; variables e instrucciones en README.

## Continuidad
Primera versión: Huroner Survivor, Ferret Jump y MyTools. El crecimiento del catálogo se hace añadiendo datos y una miniatura; mantener datos separados de presentación. Futuras cuentas/clientes solo con alcance explícito, sin implementar interfaces ficticias ni abstracciones preventivas. Gasto autorizado: 0 €.

QA local y publicado completado el 2026-10-06 en Chromium a 1440/390/320 px: filtros, vacío, teclado, imágenes, enlaces y ausencia de errores/overflow. Safari físico no probado. URL: https://joseortegaa.github.io/ia-apps-webs/koi-store/ . Siguiente paso: incorporar proyectos bajo petición.
