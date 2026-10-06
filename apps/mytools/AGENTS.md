# MyTools

Hereda AGENTS.md raíz y PROTOTYPE_FAST; un solo agente. Presupuesto **0 €**. No añadir backend, APIs, cuentas, analítica ni almacenamiento de documentos.

## Producto y aceptación
Colección ampliable de utilidades para archivos, móvil/escritorio. Flujo: elegir → previsualizar → ajustar → procesar → descargar/repetir. Validar salida real, errores claros, límites y ausencia de envíos de archivos.

## Implementación
React + TypeScript + Vite. `src/config.ts`: registro `TOOLS` (id, nombre, categoría, grupo, icono, descripción, ruta, estado) y límites centralizados. `App.tsx`: catálogo, búsqueda y rutas hash; `Workspace.tsx`: selección, miniaturas, orden táctil/teclado, configuración y estados; `engine.ts`: procesamiento cargado bajo demanda. Nuevas categorías/herramientas deben registrarse aquí sin duplicar la home.

pdf-lib modifica/crea; PDF.js legacy renderiza secuencialmente en worker; fflate descarga múltiples resultados en ZIP. Cinco dependencias de ejecución: excepción pequeña al objetivo de cuatro para evitar implementar ZIP a mano. Assets PDF locales, sin CDN. Datos exclusivamente en memoria; URLs revocadas, canvas y workers liberados.

Límites: 20 archivos; 15 MB/archivo; 40 MB total; 80 páginas; exportar máximo 30 páginas a imagen; 24 MP entrada; lado 2.400 px al crear PDF, 1.800 px al exportar; resultado 60 MB.

## Alcance
11 herramientas: imágenes JPG/PNG↔PDF; unir, dividir, extraer, eliminar, reordenar, rotar; numerar, marca de agua, recorte simétrico visual (no censura). Rechaza PDFs cifrados y edición de formularios/firmas interactivas. Office↔PDF, HTML, PDF/A y edición avanzada: pendientes, motivos en README.

## Operación
`npm ci`; `npm run dev`; `npm run build`; `npm test`; `npm run publish:files` actualiza únicamente `docs/mytools/`. Pages existente main:/docs; base `/ia-apps-webs/mytools/`.
Demo: https://joseortegaa.github.io/ia-apps-webs/mytools/.
QA y limitaciones de entorno: README. Siguiente paso: validar en Safari físico; ampliar solo a petición.
