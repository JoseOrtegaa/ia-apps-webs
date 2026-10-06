# Koi Store

Catálogo público de juegos y apps: https://joseortegaa.github.io/ia-apps-webs/koi-store/

Elige Todos/Juegos/Apps, busca por nombre, descripción o etiquetas y pulsa Jugar/Abrir app. Abre en la misma pestaña para permitir volver al catálogo. Sin registro, almacenamiento, cookies, backend, fuentes externas ni llamadas periódicas. Cero dependencias de ejecución.

## Añadir un proyecto

1. Comprueba la URL pública y las funciones implementadas.
2. Captura una pantalla representativa funcionando (o usa un recurso propio si resulta imposible). Guarda una miniatura WebP 4:3, hasta 960 × 720, preferiblemente inferior a 100 KB, en `assets/`.
3. Añade una entrada a `projects.js` con un `id` único y estable, `name`, `type` (`juego`/`app`), `description`, URL HTTPS `url`, ruta relativa `thumbnail`, `alt` descriptivo, `tags` (array), `status` y `order` numérico. Estados: `testing`, `available`, `unavailable`. El último muestra «No disponible» y no genera enlace; no cambia automáticamente. Orden menor primero.
4. Ejecuta `node apps/koi-store/scripts/publish.mjs` desde la raíz y comprueba el resultado. Commit/push de fuentes y `docs/koi-store/` activa el Pages existente sin tocar otras apps.

No hay que copiar tarjetas ni cambiar lógica. El catálogo requiere JavaScript y muestra un aviso si está desactivado.

## Desarrollo y QA

No hay compilación ni instalación para usar la app. Desde la raíz: `python3 -m http.server 8173 --directory docs`; abre `http://localhost:8173/koi-store/`.

QA opcional: Playwright y Chromium. Instala Playwright en tu entorno de desarrollo y su navegador (`npx playwright install chromium`). `DEMO_URL=http://localhost:8173/koi-store/ node apps/koi-store/scripts/qa.mjs`. `PLAYWRIGHT_MODULE` permite una ruta absoluta a Playwright ya instalado; `CHROMIUM_EXECUTABLE`, navegador existente; `QA_OUTPUT`, capturas (por defecto `/tmp/koi-store-qa`). `DEMO_URL` también admite el sitio publicado. `QA_PROXY` solo para entornos de QA con proxy (habilita ignorar su certificado en ese proceso).

Comprueba 1440/390/320 px, búsqueda por nombre/descripción/etiquetas y acentos, combinación con categoría, vacío/restablecimiento, imágenes, enlaces, teclado/foco, movimiento reducido, recarga, desbordamiento, consola y ausencia de peticiones externas. No instala ni publica Playwright.

## Miniaturas y destinos

Capturas realizadas el 2026-10-06 desde las URLs públicas con interfaz en español; solo redimensionadas y codificadas a WebP, sin inventar imágenes. Capturas de las pantallas iniciales representativas; ambos juegos se iniciaron también para comprobar acceso. Las miniaturas suman aproximadamente 86 KB.

| Proyecto | URL y origen de captura | Alcance descrito |
| --- | --- | --- |
| Huroner Survivor | https://joseortegaa.github.io/ai-web-games-automata/huroner-survivor/ | Supervivencia, espada, mejoras y jefes |
| Ferret Jump | https://joseortegaa.github.io/ai-web-games-automata/huroner-platformer/dist/ | Plataformas, croquetas y pasadizos |
| MyTools | https://joseortegaa.github.io/ia-apps-webs/mytools/ | Utilidades PDF implementadas, procesamiento local |

Son prototipos en evolución; por eso se identifican como «En pruebas». No se anuncian conversiones Office pendientes. Las capturas contienen elementos propios de cada producto; la interfaz del catálogo usa SVG y no emojis.

## Validación de entrega

QA local completado en Chromium a 1440, 390 y 320 px, sirviendo bajo `/ia-apps-webs/koi-store/`: todas las comprobaciones del script pasan. Capturas de escritorio y móvil revisadas visualmente. Los tres destinos públicos devolvieron HTTP 200 y renderizaron sin errores de JavaScript; ambos juegos se iniciaron. No probado en Safari/iPhone físico. GitHub Pages desplegó correctamente el commit `63bab7e`. El 2026-10-06 se repitió el mismo QA sobre la URL pública a 1440/390/320 px: todo correcto, sin errores de consola ni recursos fallidos ni peticiones a terceros. También se abrió cada destino desde su botón y se volvió con Atrás; el acceso desde la portada raíz funciona. No se realiza una auditoría funcional completa de los tres productos ni se modifican sus implementaciones. La disponibilidad se verifica al integrar, no durante las visitas al catálogo.
